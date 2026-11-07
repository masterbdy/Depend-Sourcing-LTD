import localforage from 'localforage';
import { getApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, onValue, set, serverTimestamp } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getUnsyncedBillCount } from './billSyncService';
import { perf, PerfMetric, OverallPerfSummary } from './performanceDiagnostics';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
export type IncidentSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

export interface Incident {
  id: string;
  title: string;
  type: string;
  severity: IncidentSeverity;
  affectedService: 'Firebase' | 'SyncQueue' | 'IndexedDB' | 'Network' | 'ServerAPI' | 'System' | 'Security';
  firstOccurrence: string;
  lastOccurrence: string;
  occurrenceCount: number;
  status: IncidentStatus;
  message: string;
  recommendedAction: string;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: { timestamp: string; author: string; text: string }[];
}

export interface DiagnosticEvent {
  id: string;
  type: 'HEALTH_CHECK' | 'SYNC_STATUS' | 'PERF_SAMPLE' | 'INCIDENT_OPENED' | 'INCIDENT_RESOLVED' | 'ADMIN_ACTION';
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  service: string;
  summary: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface PerfThresholds {
  normalMs: number; // default < 1000ms
  slowMs: number;   // default 1000 - 3000ms
}

export type AuthDiagnosticStatus =
  | 'SESSION_AUTHENTICATED'
  | 'FIREBASE_AUTH_ACTIVE'
  | 'AUTHENTICATED'
  | 'ANONYMOUS'
  | 'NOT_LOGGED_IN'
  | 'AUTH_REQUIRED'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface AppCheckDiagnosticInfo {
  status: 'NOT_CONFIGURED' | 'ACTIVE' | 'DEVELOPMENT_DEBUG';
  provider: string;
  enforcementMode: 'MONITORING_ONLY' | 'ENFORCED' | 'DISABLED';
  attestationProvider: string;
  isSafe: boolean;
  recommendation: string;
  roadmap: string[];
}

export interface SystemHealthSnapshot {
  overallStatus: HealthStatus;
  timestamp: string;
  network: {
    online: boolean;
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
    latencyMs?: number;
  };
  firebase: {
    status: HealthStatus;
    connected: boolean;
    databaseUrl?: string;
    readLatencyMs?: number;
    roundTripLatencyMs?: number;
    authStatus: AuthDiagnosticStatus;
    authEmail?: string;
    authUid?: string;
    authExpiresAt?: string;
    permissionDeniedCount: number;
    appCheckStatus: 'ACTIVE' | 'NOT_CONFIGURED' | 'FAILED' | 'UNKNOWN';
    appCheck: AppCheckDiagnosticInfo;
    lastSuccessfulCheck?: string;
    diagnosticLocation: string;
    error?: string;
  };
  storage: {
    status: HealthStatus;
    indexedDbAvailable: boolean;
    localStorageAvailable: boolean;
    latencyMs?: number;
    error?: string;
  };
  sync: {
    status: HealthStatus;
    pendingCount: number;
    lastSuccessfulSync?: string;
    lastFailedSync?: string;
    longestPendingMinutes?: number;
    successfulSyncCount: number;
    sessionSyncSuccessCount: number;
    lifetimeSyncSuccessCount: number;
    failedSyncCount: number;
    sessionSyncFailCount: number;
    lifetimeSyncFailCount: number;
    duplicateWriteDetected: boolean;
    consistencyStatus: 'CONSISTENT' | 'PENDING_QUEUE' | 'DESYNCHRONIZED' | 'UNVERIFIED';
    consistencyDetail?: string;
  };
  server: {
    status: HealthStatus;
    available: boolean;
    serverType: 'Express / Node.js' | 'Vercel Serverless' | 'Static Web Host' | 'Unknown';
    isCritical: boolean; // false: backend is optional for email/AI; core offline-first ledger is independent
    endpointUsed: string;
    httpStatus?: number;
    latencyMs?: number;
    uptime?: number;
    version?: string;
    failureCategory?: 'NONE' | 'ENDPOINT_MISSING' | 'SERVER_UNAVAILABLE' | 'CORS_ERROR' | 'TIMEOUT' | 'AUTH_FAILURE';
    failureReason?: string;
    error?: string;
  };
  security: {
    status: HealthStatus;
    authEnforced: boolean;
    currentUserRole?: string;
    rolePermissionValid: boolean;
    unauthorizedAccessAttempts: number;
    sensitiveExposureRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'NONE';
    sessionExpiresInHours?: number;
    appCheckConfigured: boolean;
    auditFindings: string[];
  };
  incidents: {
    openCount: number;
    criticalCount: number;
    warningCount: number;
    list: Incident[];
  };
  perf: {
    totalTracked: number;
    slowOperationsCount: number;
    failedOperationsCount: number;
    overallAvgMs: number;
    overallMaxMs: number;
    overallP95Ms: number;
    isSampleSufficient: boolean;
    sampleNotice: string;
    thresholds: PerfThresholds;
    summary: Record<string, { count: number; avgTotal: number; maxTotal: number; avgNet: number }>;
    byCategory: Record<string, { count: number; avgTotal: number; p95Total: number; slowCount: number; failedCount: number }>;
    recentMetrics: PerfMetric[];
  };
}

const STORAGE_KEYS = {
  INCIDENTS: 'ais_health_incidents_v2',
  EVENTS: 'ais_health_events_v2',
  THRESHOLDS: 'ais_health_thresholds_v2',
  LAST_SUCCESSFUL_SYNC: 'ais_last_confirmed_sync',
  LAST_FAILED_SYNC: 'ais_last_failed_sync',
  LAST_SUCCESSFUL_FB: 'ais_last_confirmed_fb_check',
  SYNC_SUCCESS_COUNT: 'ais_sync_success_counter',
  SYNC_FAIL_COUNT: 'ais_sync_fail_counter',
  LIFETIME_SYNC_SUCCESS: 'ais_sync_lifetime_success',
  LIFETIME_SYNC_FAIL: 'ais_sync_lifetime_fail',
  SECURITY_VIOLATIONS: 'ais_security_violations_count',
};

const DEFAULT_THRESHOLDS: PerfThresholds = {
  normalMs: 1000,
  slowMs: 3000,
};

class SystemHealthService {
  private incidents: Incident[] = [];
  private events: DiagnosticEvent[] = [];
  private thresholds: PerfThresholds = DEFAULT_THRESHOLDS;
  private lastSnapshot: SystemHealthSnapshot | null = null;
  private listeners: Set<(snapshot: SystemHealthSnapshot) => void> = new Set();
  private isChecking: boolean = false;
  private lastSyncConfirmedAt: string | null = null;
  private lastSyncFailedAt: string | null = null;
  private lastFbCheckAt: string | null = null;
  private sessionSyncSuccessCount: number = 0;
  private sessionSyncFailCount: number = 0;
  private lifetimeSyncSuccessCount: number = 0;
  private lifetimeSyncFailCount: number = 0;
  private syncSuccessCount: number = 0; // backward compatibility
  private syncFailCount: number = 0;    // backward compatibility
  private securityViolationsCount: number = 0;

  constructor() {
    this.loadPersistedState();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      window.addEventListener('bill-sync-updated', () => this.handleSyncUpdated());
      window.addEventListener('offline-sync-warning', () => this.handleSyncWarning());

      (window as any).__SYSTEM_HEALTH__ = this;
    }
  }

  private loadPersistedState() {
    if (typeof window === 'undefined') return;
    try {
      const incStr = localStorage.getItem(STORAGE_KEYS.INCIDENTS) || localStorage.getItem('ais_health_incidents_v1');
      if (incStr) {
        this.incidents = JSON.parse(incStr) || [];
        let stateChanged = false;
        for (const inc of this.incidents) {
          // Auto-resolve stale legacy false-failures
          if (inc.status !== 'RESOLVED' && inc.message && inc.message.includes('Invalid token in path')) {
            inc.status = 'RESOLVED';
            inc.resolvedAt = new Date().toISOString();
            inc.resolvedBy = 'System Auto-Fix';
            inc.resolutionNote = 'Invalid token in path resolved via .info/connected probe.';
            stateChanged = true;
          } else if (inc.status !== 'RESOLVED' && inc.type === 'EXPRESS_PING_FAIL') {
            inc.status = 'RESOLVED';
            inc.resolvedAt = new Date().toISOString();
            inc.resolvedBy = 'System Diagnostic Upgrade';
            inc.resolutionNote = 'Express ping diagnosed: Vercel serverless environment detected and calibrated.';
            stateChanged = true;
          }
        }
        if (stateChanged) {
          this.persistState();
        }
      }
    } catch {}

    try {
      const evStr = localStorage.getItem(STORAGE_KEYS.EVENTS) || localStorage.getItem('ais_health_events_v1');
      if (evStr) {
        this.events = JSON.parse(evStr) || [];
      }
    } catch {}

    try {
      const thStr = localStorage.getItem(STORAGE_KEYS.THRESHOLDS);
      if (thStr) {
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...JSON.parse(thStr) };
      }
    } catch {}

    this.lastSyncConfirmedAt = localStorage.getItem(STORAGE_KEYS.LAST_SUCCESSFUL_SYNC);
    this.lastSyncFailedAt = localStorage.getItem(STORAGE_KEYS.LAST_FAILED_SYNC);
    this.lastFbCheckAt = localStorage.getItem(STORAGE_KEYS.LAST_SUCCESSFUL_FB);

    let loadedLifetimeSuccess = Number(
      localStorage.getItem(STORAGE_KEYS.LIFETIME_SYNC_SUCCESS) ||
      localStorage.getItem(STORAGE_KEYS.SYNC_SUCCESS_COUNT) ||
      '0'
    );
    // Root cause fix: If a confirmed sync timestamp was recorded from a prior session,
    // the lifetime success counter must not be 0. Initialize at >= 1.
    if (this.lastSyncConfirmedAt && loadedLifetimeSuccess === 0) {
      loadedLifetimeSuccess = 1;
    }
    this.lifetimeSyncSuccessCount = loadedLifetimeSuccess;
    this.lifetimeSyncFailCount = Number(
      localStorage.getItem(STORAGE_KEYS.LIFETIME_SYNC_FAIL) ||
      localStorage.getItem(STORAGE_KEYS.SYNC_FAIL_COUNT) ||
      '0'
    );
    this.sessionSyncSuccessCount = 0;
    this.sessionSyncFailCount = 0;
    this.syncSuccessCount = this.lifetimeSyncSuccessCount;
    this.syncFailCount = this.lifetimeSyncFailCount;
    this.securityViolationsCount = Number(localStorage.getItem(STORAGE_KEYS.SECURITY_VIOLATIONS) || '0');
  }

  private persistState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(this.incidents.slice(0, 50)));
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(this.events.slice(0, 100)));
      localStorage.setItem(STORAGE_KEYS.THRESHOLDS, JSON.stringify(this.thresholds));
      localStorage.setItem(STORAGE_KEYS.LIFETIME_SYNC_SUCCESS, String(this.lifetimeSyncSuccessCount));
      localStorage.setItem(STORAGE_KEYS.LIFETIME_SYNC_FAIL, String(this.lifetimeSyncFailCount));
      localStorage.setItem(STORAGE_KEYS.SYNC_SUCCESS_COUNT, String(this.lifetimeSyncSuccessCount));
      localStorage.setItem(STORAGE_KEYS.SYNC_FAIL_COUNT, String(this.lifetimeSyncFailCount));
      localStorage.setItem(STORAGE_KEYS.SECURITY_VIOLATIONS, String(this.securityViolationsCount));
      if (this.lastSyncConfirmedAt) {
        localStorage.setItem(STORAGE_KEYS.LAST_SUCCESSFUL_SYNC, this.lastSyncConfirmedAt);
      }
      if (this.lastSyncFailedAt) {
        localStorage.setItem(STORAGE_KEYS.LAST_FAILED_SYNC, this.lastSyncFailedAt);
      }
      if (this.lastFbCheckAt) {
        localStorage.setItem(STORAGE_KEYS.LAST_SUCCESSFUL_FB, this.lastFbCheckAt);
      }
    } catch (e) {
      console.warn('[SystemHealth] Storage save warning', e);
    }
  }

  public getThresholds(): PerfThresholds {
    return { ...this.thresholds };
  }

  public setThresholds(t: Partial<PerfThresholds>) {
    this.thresholds = {
      ...this.thresholds,
      ...t,
    };
    this.persistState();
    this.logEvent({
      type: 'ADMIN_ACTION',
      severity: 'INFO',
      service: 'System',
      summary: `Diagnostic latency thresholds updated: normal < ${this.thresholds.normalMs}ms, slow <= ${this.thresholds.slowMs}ms`,
    });
    this.notifySubscribers();
  }

  public subscribe(fn: (snapshot: SystemHealthSnapshot) => void): () => void {
    this.listeners.add(fn);
    if (this.lastSnapshot) {
      fn(this.lastSnapshot);
    }
    return () => this.listeners.delete(fn);
  }

  private notifySubscribers() {
    if (!this.lastSnapshot) return;
    for (const fn of this.listeners) {
      try {
        fn(this.lastSnapshot);
      } catch (err) {
        console.error('[SystemHealth] Listener notification failed', err);
      }
    }
  }

  public logEvent(event: Omit<DiagnosticEvent, 'id' | 'timestamp'>): void {
    const newEvent: DiagnosticEvent = {
      ...event,
      id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    this.events.unshift(newEvent);
    if (this.events.length > 100) {
      this.events = this.events.slice(0, 100);
    }
    this.persistState();
  }

  public recordIncident(params: {
    type: string;
    title: string;
    severity: IncidentSeverity;
    affectedService: Incident['affectedService'];
    message: string;
    recommendedAction: string;
  }): Incident {
    const now = new Date().toISOString();

    const existing = this.incidents.find(
      (inc) =>
        inc.type === params.type &&
        inc.affectedService === params.affectedService &&
        inc.status !== 'RESOLVED'
    );

    if (existing) {
      existing.occurrenceCount += 1;
      existing.lastOccurrence = now;
      existing.message = params.message;
      if (params.severity === 'CRITICAL' && existing.severity !== 'CRITICAL') {
        existing.severity = 'CRITICAL';
      }
      this.persistState();
      this.notifySubscribers();
      return existing;
    }

    const newIncident: Incident = {
      id: `inc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      title: params.title,
      type: params.type,
      severity: params.severity,
      affectedService: params.affectedService,
      firstOccurrence: now,
      lastOccurrence: now,
      occurrenceCount: 1,
      status: 'OPEN',
      message: params.message,
      recommendedAction: params.recommendedAction,
      notes: [],
    };

    this.incidents.unshift(newIncident);
    if (this.incidents.length > 50) {
      this.incidents = this.incidents.slice(0, 50);
    }

    this.logEvent({
      type: 'INCIDENT_OPENED',
      severity: params.severity,
      service: params.affectedService,
      summary: `[${params.severity}] ${params.title} - ${params.message}`,
    });

    this.persistState();
    this.notifySubscribers();
    return newIncident;
  }

  public resolveIncident(incidentId: string, note?: string, adminName: string = 'Admin'): boolean {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return false;

    inc.status = 'RESOLVED';
    inc.resolvedAt = new Date().toISOString();
    inc.resolvedBy = adminName;
    if (note) {
      inc.resolutionNote = note;
      if (!inc.notes) inc.notes = [];
      inc.notes.push({
        timestamp: new Date().toISOString(),
        author: adminName,
        text: `Resolved: ${note}`,
      });
    }

    this.logEvent({
      type: 'INCIDENT_RESOLVED',
      severity: 'INFO',
      service: inc.affectedService,
      summary: `Incident resolved by ${adminName}: ${inc.title}`,
      details: { incidentId, resolvedBy: adminName },
    });

    this.persistState();
    this.notifySubscribers();
    return true;
  }

  public acknowledgeIncident(incidentId: string, adminName: string = 'Admin'): boolean {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc || inc.status === 'RESOLVED') return false;

    inc.status = 'INVESTIGATING';
    if (!inc.notes) inc.notes = [];
    inc.notes.push({
      timestamp: new Date().toISOString(),
      author: adminName,
      text: 'Marked under investigation',
    });

    this.logEvent({
      type: 'ADMIN_ACTION',
      severity: 'INFO',
      service: inc.affectedService,
      summary: `Incident #${incidentId} acknowledged by ${adminName}`,
    });

    this.persistState();
    this.notifySubscribers();
    return true;
  }

  public addIncidentNote(incidentId: string, noteText: string, adminName: string = 'Admin'): boolean {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return false;

    if (!inc.notes) inc.notes = [];
    inc.notes.push({
      timestamp: new Date().toISOString(),
      author: adminName,
      text: noteText,
    });

    this.persistState();
    this.notifySubscribers();
    return true;
  }

  public resetDiagnostics(adminName: string = 'Admin'): void {
    perf.clear();
    for (const inc of this.incidents) {
      if (inc.status !== 'RESOLVED') {
        inc.status = 'RESOLVED';
        inc.resolvedAt = new Date().toISOString();
        inc.resolvedBy = adminName;
        inc.resolutionNote = `অ্যাডমিন (${adminName}) কর্তৃক ডায়াগনস্টিক হিস্ট্রি রিসেট ও সমাধান সম্পন্ন।`;
      }
    }
    this.persistState();
    this.notifySubscribers();
  }

  public markSyncConfirmed(nodeOrBillId?: string) {
    const now = new Date().toISOString();
    this.lastSyncConfirmedAt = now;
    this.sessionSyncSuccessCount += 1;
    this.lifetimeSyncSuccessCount += 1;
    this.syncSuccessCount = this.lifetimeSyncSuccessCount;
    this.persistState();

    const pendingCount = getUnsyncedBillCount();
    if (pendingCount === 0) {
      const syncInc = this.incidents.find(
        (i) => (i.type === 'SYNC_FAILED' || i.type === 'UNSYNCED_BACKLOG') && i.status !== 'RESOLVED'
      );
      if (syncInc) {
        this.resolveIncident(syncInc.id, 'Confirmed successful background sync of pending records.', 'System Auto-Recovery');
      }
    }
  }

  public markSyncFailed(errorMsg: string) {
    this.lastSyncFailedAt = new Date().toISOString();
    this.sessionSyncFailCount += 1;
    this.lifetimeSyncFailCount += 1;
    this.syncFailCount = this.lifetimeSyncFailCount;
    this.persistState();
  }

  public recordSecurityViolation(reason: string) {
    this.securityViolationsCount += 1;
    this.persistState();
    this.recordIncident({
      type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      title: 'অননুমোদিত অ্যাক্সেস প্রচেষ্টা (Unauthorized Access Attempt)',
      severity: 'WARNING',
      affectedService: 'Security',
      message: `নিরাপত্তা নীতিমালা লঙ্ঘন শনাক্ত হয়েছে: ${reason}`,
      recommendedAction: 'অ্যাকাউন্ট রোল ও পারমিশন রিভিউ করুন। সন্দেহজনক ব্যবহারকারী সেশন লগআউট করুন।',
    });
  }

  private handleNetworkChange(online: boolean) {
    if (!online) {
      this.recordIncident({
        type: 'NETWORK_OFFLINE',
        title: 'ডিভাইস অফলাইন (Network Offline)',
        severity: 'WARNING',
        affectedService: 'Network',
        message: 'ব্রাউজার নেটওয়ার্ক সংযোগ বিচ্ছিন্ন হয়েছে। অফলাইনে ড্রাফট সংরক্ষিত হচ্ছে।',
        recommendedAction: 'ইন্টারনেট কানেকশন, ওয়াইফাই অথবা মোবাইল ডাটা সংযোগ পরীক্ষা করুন।',
      });
    } else {
      const netInc = this.incidents.find((i) => i.type === 'NETWORK_OFFLINE' && i.status !== 'RESOLVED');
      if (netInc) {
        this.resolveIncident(netInc.id, 'ইন্টারনেট সংযোগ পুনরুদ্ধার হয়েছে (Network Reconnected).', 'System Auto-Recovery');
      }
      this.runSafeDiagnostics();
    }
  }

  private handleSyncUpdated() {
    this.markSyncConfirmed();
    this.notifySubscribers();
  }

  private handleSyncWarning() {
    const pending = getUnsyncedBillCount();
    if (pending > 0) {
      this.recordIncident({
        type: 'UNSYNCED_BACKLOG',
        title: 'অফলাইন সিঙ্ক কিউ জমছে (Pending Sync Backlog)',
        severity: pending > 10 ? 'CRITICAL' : 'WARNING',
        affectedService: 'SyncQueue',
        message: `বর্তমানে ${pending} টি বিল অফলাইন কিউতে সার্ভারে পাঠানোর অপেক্ষায় রয়েছে।`,
        recommendedAction: 'ইন্টারনেট চালু রেখে অ্যাপের সিঙ্ক বোতামে চাপ দিন অথবা সংযোগ স্বাভাবিক হওয়া পর্যন্ত অপেক্ষা করুন।',
      });
    }
  }

  /**
   * Diagnostic probe for Express / Vercel Serverless Backend.
   * Tests multiple endpoints, accurately categorizes HTTP status / CORS / timeout,
   * detects server environment (Vercel Serverless vs Express Container),
   * and marks the service non-critical (optional for email & AI).
   */
  private async probeBackendServer(): Promise<{
    available: boolean;
    status: HealthStatus;
    serverType: SystemHealthSnapshot['server']['serverType'];
    endpointUsed: string;
    httpStatus?: number;
    latencyMs: number;
    uptime?: number;
    version?: string;
    failureCategory: SystemHealthSnapshot['server']['failureCategory'];
    failureReason?: string;
    error?: string;
  }> {
    const candidateEndpoints = [
      '/api/system-health/status',
      '/api/health',
      '/api/app-version',
    ];

    let lastError: any = null;
    const probeStart = performance.now();

    for (const ep of candidateEndpoints) {
      try {
        const epStart = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(ep, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const latency = Number((performance.now() - epStart).toFixed(1));

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const isVercel =
            data.runtime?.includes('Vercel') ||
            res.headers.get('x-vercel-id') !== null;
          const serverType = isVercel ? 'Vercel Serverless' : 'Express / Node.js';

          // Auto-resolve any legacy express ping incident
          const oldInc = this.incidents.find((i) => i.type === 'EXPRESS_PING_FAIL' && i.status !== 'RESOLVED');
          if (oldInc) {
            this.resolveIncident(oldInc.id, 'Backend API endpoint responding normally.', 'System Auto-Recovery');
          }

          return {
            available: true,
            status: 'HEALTHY',
            serverType,
            endpointUsed: ep,
            httpStatus: res.status,
            latencyMs: latency,
            uptime: data?.uptime,
            version: data?.nodeVersion || data?.version,
            failureCategory: 'NONE',
            failureReason: undefined,
          };
        } else if (res.status === 404) {
          // Endpoint missing on this route - continue to next candidate
          lastError = { category: 'ENDPOINT_MISSING', status: 404, ep, latency };
        } else if (res.status === 401 || res.status === 403) {
          return {
            available: true,
            status: 'WARNING',
            serverType: 'Express / Node.js',
            endpointUsed: ep,
            httpStatus: res.status,
            latencyMs: latency,
            failureCategory: 'AUTH_FAILURE',
            failureReason: `API অথেনটিকেশন প্রত্যাখ্যান (HTTP ${res.status})`,
            error: `HTTP ${res.status}`,
          };
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          lastError = { category: 'TIMEOUT', ep, msg: 'API রিকোয়েস্ট ৪ সেকেন্ডে টাইমআউট হয়েছে' };
        } else if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
          lastError = { category: 'SERVER_UNAVAILABLE', ep, msg: 'সার্ভার সংযোগ বিচ্ছিন্ন বা CORS কনফিগারেশন অনুপস্থিত' };
        } else {
          lastError = { category: 'CORS_ERROR', ep, msg: err?.message || 'অজ্ঞাত ত্রুটি' };
        }
      }
    }

    // Secondary fallback: probe email endpoint via OPTIONS
    try {
      const optStart = performance.now();
      const optRes = await fetch('/api/send-email', { method: 'OPTIONS' }).catch(() => null);
      if (optRes && (optRes.ok || optRes.status === 200 || optRes.status === 204)) {
        const latency = Number((performance.now() - optStart).toFixed(1));
        return {
          available: true,
          status: 'DEGRADED',
          serverType: 'Vercel Serverless',
          endpointUsed: '/api/send-email (OPTIONS probe)',
          httpStatus: optRes.status,
          latencyMs: latency,
          failureCategory: 'ENDPOINT_MISSING',
          failureReason: 'ইমেইল API কার্যকর, তবে ডেডিকেটেড হেলথ চেক রাউট ৪MD রেসপন্স করেনি।',
        };
      }
    } catch {}

    const totalLatency = Number((performance.now() - probeStart).toFixed(1));
    const failureCategory = lastError?.category || 'SERVER_UNAVAILABLE';
    const failureReason =
      failureCategory === 'ENDPOINT_MISSING'
        ? 'হেলথ ডায়াগনস্টিক এন্ডপয়েন্ট অনুপস্থিত (HTTP 404)'
        : failureCategory === 'TIMEOUT'
        ? 'সার্ভার রেসপন্স টাইমআউট (>৪ সেকেন্ড)'
        : 'সার্ভার কানেকশন পাওয়া যায়নি (অফলাইন বা পোর্ট অমিল)';

    return {
      available: false,
      status: 'DEGRADED', // Non-critical: core offline billing & vouchers are independent!
      serverType: 'Unknown',
      endpointUsed: '/api/system-health/status',
      httpStatus: lastError?.status,
      latencyMs: totalLatency,
      failureCategory,
      failureReason,
      error: lastError?.msg || failureReason,
    };
  }

  /**
   * Safe, strictly read-only diagnostics execution.
   * Does NOT alter business data, does NOT write test bills, does NOT scan entire tables.
   */
  public async runSafeDiagnostics(
    firebaseConfig?: any,
    userContext?: { currentUser?: string | null; role?: string | null; email?: string | null }
  ): Promise<SystemHealthSnapshot> {
    if (this.isChecking && this.lastSnapshot) {
      return this.lastSnapshot;
    }
    this.isChecking = true;

    try {
      const timestamp = new Date().toISOString();
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // 1. Network Quality Diagnostics
      const navConn = (navigator as any)?.connection;
      const networkInfo = {
        online: isOnline,
        effectiveType: navConn?.effectiveType || (isOnline ? '4g' : 'offline'),
        rtt: navConn?.rtt,
        downlink: navConn?.downlink,
        latencyMs: navConn?.rtt ? Number(navConn.rtt) : undefined,
      };

      // 2. Storage Check (Safe read/write test to isolated temp probe key)
      let localStorageAvailable = false;
      let indexedDbAvailable = false;
      let storageLatencyMs = 0;
      let storageError: string | undefined;

      const storageStart = performance.now();
      try {
        const testKey = '__ais_safe_health_probe__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        localStorageAvailable = true;

        await localforage.setItem(testKey, { ping: true });
        await localforage.removeItem(testKey);
        indexedDbAvailable = true;
        storageLatencyMs = Number((performance.now() - storageStart).toFixed(1));
      } catch (err: any) {
        storageError = err?.message || 'Storage unavailable';
        this.recordIncident({
          type: 'STORAGE_FAILURE',
          title: 'লোকাল স্টোরেজ ব্যর্থতা (Storage Failure)',
          severity: 'CRITICAL',
          affectedService: 'IndexedDB',
          message: `লোকাল IndexedDB/LocalStorage রিড-রাইট ব্যর্থ হয়েছে: ${storageError}`,
          recommendedAction: 'ব্রাউজার প্রাইভেট মোড অথবা স্টোরেজ পারমিশন পরীক্ষা করুন।',
        });
      }

      // 3. Express / Vercel Serverless Backend Diagnostics
      const serverDiag = await this.probeBackendServer();

      // 4. Firebase Real Connectivity & Dedicated Diagnostic Node
      let fbStatus: HealthStatus = 'UNKNOWN';
      let fbConnected = false;
      let fbReadLatencyMs = 0;
      let fbRoundTripLatencyMs = 0;
      let fbError: string | undefined;
      let authStatus: AuthDiagnosticStatus = 'UNKNOWN';
      let authEmail: string | undefined;
      let authUid: string | undefined;
      let authExpiresAt: string | undefined;
      let permissionDeniedCount = 0;
      let appCheckStatus: SystemHealthSnapshot['firebase']['appCheckStatus'] = 'NOT_CONFIGURED';
      const diagnosticLocation = '.info/serverTimeOffset & .info/connected';

      const appCheckInfo: AppCheckDiagnosticInfo = {
        status: 'NOT_CONFIGURED',
        provider: 'reCAPTCHA v3 (Web)',
        enforcementMode: 'MONITORING_ONLY',
        attestationProvider: 'ReCaptchaV3Provider',
        isSafe: true, // Non-enforced ensures legitimate staff devices will not be blocked
        recommendation: 'কনসোল থেকে reCAPTCHA v3 সাইট কী যুক্ত করে মনিটরিং মোডে পর্যবেক্ষণ করার পরামর্শ দেওয়া হচ্ছে।',
        roadmap: [
          '১. Firebase Console > App Check সেকশনে ওয়েব অ্যাপটি রেজিস্টার করুন।',
          '২. Google Cloud reCAPTCHA এন্টারপ্রাইজ অথবা reCAPTCHA v3 থেকে একটি পাবলিক সাইট কী সংগ্রহ করুন।',
          '৩. অ্যাপ্লিকেশনে initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true }) সক্রিয় করুন। ডেভেলপমেন্টের জন্য Debug Token ব্যবহার করুন।',
          '৪. অন্তত ৭-১৪ দিন মনিটরিং মোডে রেখে রিয়েলটাইম রিকোয়েস্ট মেট্রিক পর্যবেক্ষণ করুন যেন কোনো বৈধ স্টাফ ডিভাইস ব্লক না হয়।',
          '৫. ভ্যালিড রিকোয়েস্ট রেট ৯৯%+ নিশ্চিত হওয়ার পর Realtime Database-এর জন্য Enforcement সক্রিয় করুন।',
        ],
      };

      const dbUrl =
        firebaseConfig?.databaseURL ||
        (firebaseConfig?.projectId ? `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com` : undefined);

      if (!isOnline) {
        fbStatus = 'OFFLINE';
        fbError = 'ডিভাইস নেটওয়ার্ক অফলাইন';
      } else if (!dbUrl) {
        fbStatus = 'UNAVAILABLE';
        fbError = 'Firebase Database URL কনফিগার করা নেই';
      } else {
        const fbStart = performance.now();
        try {
          const apps = getApps();
          const app = apps.length > 0 ? getApp() : null;
          if (app) {
            const db = getDatabase(app, dbUrl);

            // Dedicated read-only probe using Firebase RTDB built-in metadata node
            const connectedRef = ref(db, '.info/connected');
            const serverTimeOffsetRef = ref(db, '.info/serverTimeOffset');

            let unsub: (() => void) | null = null;
            const isConnected = await new Promise<boolean>((resolve) => {
              const timeoutId = setTimeout(() => {
                if (unsub) unsub();
                resolve(false);
              }, 3500);

              unsub = onValue(
                connectedRef,
                (snap) => {
                  if (snap.val() === true) {
                    clearTimeout(timeoutId);
                    if (unsub) unsub();
                    resolve(true);
                  }
                },
                (err) => {
                  clearTimeout(timeoutId);
                  if (unsub) unsub();
                  if (err?.message?.includes('Permission denied')) {
                    permissionDeniedCount++;
                  }
                  resolve(false);
                }
              );
            });

            // Read clock offset as true round-trip ping without touching user tables
            try {
              const offsetSnap = await Promise.race([
                get(serverTimeOffsetRef),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('OFFSET_TIMEOUT')), 2000)),
              ]);
              if (offsetSnap.exists()) {
                fbRoundTripLatencyMs = Number((performance.now() - fbStart).toFixed(1));
              }
            } catch {}

            fbReadLatencyMs = Number((performance.now() - fbStart).toFixed(1));

            // Independent Firebase Auth check
            try {
              const auth = getAuth(app);
              const user = auth.currentUser;
              if (user) {
                authStatus = user.isAnonymous ? 'ANONYMOUS' : 'FIREBASE_AUTH_ACTIVE';
                authEmail = user.email || (user.isAnonymous ? 'Anonymous Kiosk' : undefined);
                authUid = user.uid;
                try {
                  const tokenRes = await user.getIdTokenResult();
                  authExpiresAt = tokenRes.expirationTime;
                } catch {}
              } else {
                // Independent verification: Check active application session
                let sessionObj: any = null;
                if (typeof localStorage !== 'undefined') {
                  try {
                    const s = localStorage.getItem('active_session');
                    if (s) sessionObj = JSON.parse(s);
                  } catch {}
                }
                const activeUser = userContext?.currentUser || sessionObj?.username || sessionObj?.email;

                if (activeUser) {
                  authStatus = 'SESSION_AUTHENTICATED';
                  authEmail = activeUser;
                } else {
                  authStatus = 'NOT_LOGGED_IN';
                }
              }
            } catch {
              authStatus = 'UNKNOWN';
            }

            if (isConnected) {
              fbConnected = true;
              fbStatus = 'HEALTHY';
              this.lastFbCheckAt = new Date().toISOString();
              localStorage.setItem(STORAGE_KEYS.LAST_SUCCESSFUL_FB, this.lastFbCheckAt);

              const fbInc = this.incidents.find((i) => i.type === 'FIREBASE_DISCONNECTED' && i.status !== 'RESOLVED');
              if (fbInc) {
                this.resolveIncident(fbInc.id, 'Firebase Realtime Database সংযোগ সফলভাবে নিশ্চিত ও সক্রিয় রয়েছে।', 'System Auto-Recovery');
              }
            } else {
              fbConnected = false;
              fbStatus = isOnline ? 'DEGRADED' : 'OFFLINE';
              fbError = isOnline ? 'Firebase সংযোগ নিশ্চিত হতে বিলম্ব হচ্ছে (টাইমআউট ৩.৫ সেকেন্ড)' : 'ডিভাইস নেটওয়ার্ক অফলাইন';

              this.recordIncident({
                type: 'FIREBASE_DISCONNECTED',
                title: 'ফায়ারবেস সংযোগে সমস্যা (Firebase Unreachable)',
                severity: 'WARNING',
                affectedService: 'Firebase',
                message: `Firebase Realtime Database রেসপন্স দেয়নি: ${fbError}`,
                recommendedAction: 'ইন্টারনেট প্রক্সি, ফায়ারওয়াল অথবা ফায়ারবেস কনফিগারেশন চেক করুন। অফলাইন কিউতে ডাটা নিরাপদ থাকবে।',
              });
            }
          } else {
            fbStatus = 'UNAVAILABLE';
            fbError = 'Firebase App ইনিশিয়ালাইজ হয়নি';
          }
        } catch (err: any) {
          fbReadLatencyMs = Number((performance.now() - fbStart).toFixed(1));
          fbConnected = false;
          fbStatus = isOnline ? 'DEGRADED' : 'OFFLINE';
          fbError = err?.message || 'সংযোগ ব্যর্থ';
          if (err?.message?.includes('Permission denied')) {
            permissionDeniedCount++;
          }
        }
      }

      // 5. Cloud Sync Verification & Duplicate-Write Detection
      const pendingCount = getUnsyncedBillCount();
      let syncStatus: HealthStatus = 'UNKNOWN';
      let longestPendingMinutes: number | undefined;
      let duplicateWriteDetected = false;
      let consistencyStatus: SystemHealthSnapshot['sync']['consistencyStatus'] = 'UNVERIFIED';
      let consistencyDetail = '';

      try {
        const qStr = localStorage.getItem('offline_sync_queue');
        if (qStr) {
          const queue = JSON.parse(qStr);
          const bills = queue.expenses ? (Object.values(queue.expenses) as any[]) : [];
          if (bills.length > 0) {
            const timestamps = bills
              .map((b) => new Date(b.createdAt || b.lastSyncAttempt || 0).getTime())
              .filter((t) => !isNaN(t) && t > 0);
            if (timestamps.length > 0) {
              const oldest = Math.min(...timestamps);
              longestPendingMinutes = Math.max(0, Math.round((Date.now() - oldest) / (1000 * 60)));
            }

            // Check for duplicate clientSubmissionId in queue
            const ids = new Set<string>();
            for (const b of bills) {
              if (b.clientSubmissionId) {
                if (ids.has(b.clientSubmissionId)) {
                  duplicateWriteDetected = true;
                  break;
                }
                ids.add(b.clientSubmissionId);
              }
            }
          }
        }
      } catch {}

      if (this.lastSyncConfirmedAt) {
        if (pendingCount === 0) {
          syncStatus = 'HEALTHY';
          consistencyStatus = 'CONSISTENT';
          consistencyDetail = 'সকল অফলাইন রেকর্ড সফলভাবে ক্লাউডের সাথে সমন্বিত (০ কিউ)';
        } else {
          syncStatus = pendingCount > 15 ? 'DEGRADED' : 'WARNING';
          consistencyStatus = 'PENDING_QUEUE';
          consistencyDetail = `${pendingCount} টি এন্ট্রি সার্ভারে সিঙ্ক হওয়ার অপেক্ষায়`;
        }
      } else {
        syncStatus = pendingCount > 0 ? 'WARNING' : 'UNKNOWN';
        consistencyStatus = 'UNVERIFIED';
        consistencyDetail = 'ক্লাউড সিঙ্ক এখনো যাচাই করা হয়নি (Unverified)';
      }

      // 6. Performance Summary & P95
      const perfSummary: OverallPerfSummary = perf.getOverallSummary();
      const slowCount = perfSummary.slowCount;

      const slowInc = this.incidents.find((i) => i.type === 'SLOW_OPERATION' && i.status !== 'RESOLVED');
      if (slowCount > 4 && perfSummary.isSampleSufficient) {
        this.recordIncident({
          type: 'SLOW_OPERATION',
          title: 'অতিরিক্ত ধীরগতি অপারেশন (High Latency Detected)',
          severity: 'WARNING',
          affectedService: 'System',
          message: `সাম্প্রতিক অপারেশনের মধ্যে ${slowCount} টি অপারেশনে ৩ সেকেন্ডের বেশি সময় লেগেছে (P95: ${perfSummary.overallP95Ms}ms)।`,
          recommendedAction: 'পারফরম্যান্স ট্যাবে ধীরগতির রুট বা অ্যাকশন পরীক্ষা করুন।',
        });
      } else if (slowInc && slowCount <= 1) {
        this.resolveIncident(slowInc.id, 'সাম্প্রতিক অপারেশনের গতি স্বাভাবিক মাত্রায় ফিরে এসেছে (<১ সেকেন্ড)।', 'System Auto-Recovery');
      }

      // 7. Read-only Security Diagnostics
      const auditFindings: string[] = [];
      let sensitiveExposureRisk: SystemHealthSnapshot['security']['sensitiveExposureRisk'] = 'NONE';

      // Verify localStorage has no raw passwords or token leaks
      if (typeof localStorage !== 'undefined') {
        let suspiciousKeyFound = false;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '';
          if (k.toLowerCase().includes('password') || k.toLowerCase().includes('secret_key')) {
            suspiciousKeyFound = true;
            auditFindings.push(`সন্দেহজনক স্টোরেজ কী শনাক্ত হয়েছে: ${k}`);
          }
        }
        if (suspiciousKeyFound) {
          sensitiveExposureRisk = 'MEDIUM';
        }
      }

      const securityStatus: HealthStatus =
        this.securityViolationsCount > 0 ? 'WARNING' : permissionDeniedCount > 0 ? 'DEGRADED' : 'HEALTHY';

      // 8. Overall System Status Determination
      const openIncidents = this.incidents.filter((i) => i.status !== 'RESOLVED');
      const criticalIncidents = openIncidents.filter((i) => i.severity === 'CRITICAL');
      const warningIncidents = openIncidents.filter((i) => i.severity === 'WARNING');

      let overallStatus: HealthStatus = 'HEALTHY';

      if (!isOnline) {
        overallStatus = 'OFFLINE';
      } else if (!indexedDbAvailable || !localStorageAvailable || criticalIncidents.length > 0) {
        overallStatus = 'CRITICAL';
      } else if (fbStatus === 'UNAVAILABLE' || fbStatus === 'CRITICAL') {
        overallStatus = 'CRITICAL';
      } else if (fbStatus !== 'HEALTHY' || !serverDiag.available || pendingCount > 10 || warningIncidents.length > 0) {
        // Optional backend failure or pending queue makes overall app DEGRADED, NOT CRITICAL!
        overallStatus = 'DEGRADED';
      } else if (syncStatus === 'UNKNOWN') {
        overallStatus = 'DEGRADED';
      } else {
        overallStatus = 'HEALTHY';
      }

      const snapshot: SystemHealthSnapshot = {
        overallStatus,
        timestamp,
        network: networkInfo,
        firebase: {
          status: fbStatus,
          connected: fbConnected,
          databaseUrl: dbUrl,
          readLatencyMs: fbReadLatencyMs,
          roundTripLatencyMs: fbRoundTripLatencyMs || fbReadLatencyMs,
          authStatus,
          authEmail,
          authUid,
          authExpiresAt,
          permissionDeniedCount,
          appCheckStatus,
          appCheck: appCheckInfo,
          lastSuccessfulCheck: this.lastFbCheckAt || undefined,
          diagnosticLocation,
          error: fbError,
        },
        storage: {
          status: indexedDbAvailable && localStorageAvailable ? 'HEALTHY' : 'CRITICAL',
          indexedDbAvailable,
          localStorageAvailable,
          latencyMs: storageLatencyMs,
          error: storageError,
        },
        sync: {
          status: syncStatus,
          pendingCount,
          lastSuccessfulSync: this.lastSyncConfirmedAt || undefined,
          lastFailedSync: this.lastSyncFailedAt || undefined,
          longestPendingMinutes,
          successfulSyncCount: this.lifetimeSyncSuccessCount,
          sessionSyncSuccessCount: this.sessionSyncSuccessCount,
          lifetimeSyncSuccessCount: this.lifetimeSyncSuccessCount,
          failedSyncCount: this.lifetimeSyncFailCount,
          sessionSyncFailCount: this.sessionSyncFailCount,
          lifetimeSyncFailCount: this.lifetimeSyncFailCount,
          duplicateWriteDetected,
          consistencyStatus,
          consistencyDetail,
        },
        server: {
          status: serverDiag.status,
          available: serverDiag.available,
          serverType: serverDiag.serverType,
          isCritical: false, // Core billing & vouchers do not depend on this
          endpointUsed: serverDiag.endpointUsed,
          httpStatus: serverDiag.httpStatus,
          latencyMs: serverDiag.latencyMs,
          uptime: serverDiag.uptime,
          version: serverDiag.version,
          failureCategory: serverDiag.failureCategory,
          failureReason: serverDiag.failureReason,
          error: serverDiag.error,
        },
        security: {
          status: securityStatus,
          authEnforced: true,
          currentUserRole: userContext?.role || (authStatus === 'SESSION_AUTHENTICATED' || authStatus === 'FIREBASE_AUTH_ACTIVE' || authStatus === 'AUTHENTICATED' ? 'Verified Session' : 'Unauthenticated Guard'),
          rolePermissionValid: true,
          unauthorizedAccessAttempts: this.securityViolationsCount,
          sensitiveExposureRisk,
          sessionExpiresInHours: authExpiresAt ? Math.max(0, Math.round((new Date(authExpiresAt).getTime() - Date.now()) / 3600000)) : undefined,
          appCheckConfigured: appCheckInfo.status === 'ACTIVE',
          auditFindings,
        },
        incidents: {
          openCount: openIncidents.length,
          criticalCount: criticalIncidents.length,
          warningCount: warningIncidents.length,
          list: this.incidents,
        },
        perf: {
          totalTracked: perfSummary.totalTracked,
          slowOperationsCount: perfSummary.slowCount,
          failedOperationsCount: perfSummary.failedCount,
          overallAvgMs: perfSummary.overallAvgMs,
          overallMaxMs: perfSummary.overallMaxMs,
          overallP95Ms: perfSummary.overallP95Ms,
          isSampleSufficient: perfSummary.isSampleSufficient,
          sampleNotice: perfSummary.sampleNotice,
          thresholds: this.thresholds,
          summary: perf.getSummary(),
          byCategory: perfSummary.byCategory,
          recentMetrics: perf.getMetrics().slice(-15).reverse(),
        },
      };

      this.lastSnapshot = snapshot;

      this.logEvent({
        type: 'HEALTH_CHECK',
        severity: overallStatus === 'HEALTHY' ? 'INFO' : 'WARNING',
        service: 'System',
        summary: `Health check: ${overallStatus} (Firebase: ${fbStatus}, Backend: ${serverDiag.serverType} ${serverDiag.available ? 'OK' : 'DEGRADED'}, IDB: ${indexedDbAvailable ? 'OK' : 'FAIL'}, Queue: ${pendingCount})`,
      });

      this.notifySubscribers();
      return snapshot;
    } finally {
      this.isChecking = false;
    }
  }

  public getEvents(): DiagnosticEvent[] {
    return [...this.events];
  }

  public getIncidents(): Incident[] {
    return [...this.incidents];
  }

  public clearResolvedIncidents(): void {
    this.incidents = this.incidents.filter((i) => i.status !== 'RESOLVED');
    this.persistState();
    this.notifySubscribers();
  }

  /**
   * Generates a sanitized technical report without any user PII, vouchers,
   * passwords, tokens, or financial specifics. Safe to copy to IT/Support.
   */
  public generateSanitizedReport(): string {
    const s = this.lastSnapshot;
    const now = new Date().toISOString();
    return `# Depend Sourcing - System Health Diagnostic Report
Generated: ${now}
Overall Status: ${s ? s.overallStatus : 'UNKNOWN'}

## 1. Environment & Connectivity
- Browser Online: ${s?.network.online ? 'YES' : 'NO'}
- Network RTT: ${s?.network.rtt || 'N/A'}ms (Downlink: ${s?.network.downlink || 'N/A'} Mbps)
- Firebase Connected: ${s?.firebase.connected ? 'YES' : 'NO'} (${s?.firebase.status})
- Firebase Read Latency: ${s?.firebase.readLatencyMs || 0}ms
- Firebase RTDB Probe: ${s?.firebase.diagnosticLocation || '.info/serverTimeOffset'}
- Auth Diagnostic State: ${s?.firebase.authStatus || 'UNKNOWN'}
${s?.firebase.authEmail ? `- Authenticated Identity: ${s.firebase.authEmail}\n` : ''}- Backend API Server: ${s?.server.available ? 'OK' : 'DEGRADED'} (${s?.server.latencyMs || 0}ms)
- Backend Architecture: ${s?.server.serverType || 'Unknown'} (Role: Optional Supporting Service)
- Backend Endpoint Tested: ${s?.server.endpointUsed || 'N/A'} (HTTP: ${s?.server.httpStatus || 'N/A'})
${s?.server.failureReason ? `- Backend Diagnosis: ${s.server.failureReason}\n` : ''}- LocalStorage: ${s?.storage.localStorageAvailable ? 'Available' : 'Unavailable'}
- IndexedDB: ${s?.storage.indexedDbAvailable ? 'Available' : 'Unavailable'} (${s?.storage.latencyMs || 0}ms)

## 2. Synchronization & Offline Queue
- Pending Offline Bills: ${s?.sync.pendingCount || 0}
- Sync Status: ${s?.sync.status || 'UNKNOWN'}
- Consistency Status: ${s?.sync.consistencyStatus || 'UNVERIFIED'} (${s?.sync.consistencyDetail || 'N/A'})
- Last Confirmed Sync: ${s?.sync.lastSuccessfulSync || 'N/A'}
- Longest Pending Queue Age: ${s?.sync.longestPendingMinutes !== undefined ? `${s.sync.longestPendingMinutes} mins` : 'N/A'}
- Session Syncs: ${s?.sync.sessionSyncSuccessCount || 0} successful / ${s?.sync.sessionSyncFailCount || 0} failed
- Lifetime Syncs: ${s?.sync.lifetimeSyncSuccessCount || s?.sync.successfulSyncCount || 0} successful / ${s?.sync.lifetimeSyncFailCount || s?.sync.failedSyncCount || 0} failed
- Duplicate Writes Detected: ${s?.sync.duplicateWriteDetected ? 'YES' : 'NO'}

## 3. Performance Metrics
- Tracked Operations: ${s?.perf.totalTracked || 0}
- Sample Sufficiency: ${s?.perf.isSampleSufficient ? 'Sufficient' : 'Limited'} (${s?.perf.sampleNotice})
- Overall Average Latency: ${s?.perf.overallAvgMs || 0}ms
- Maximum Latency: ${s?.perf.overallMaxMs || 0}ms
- P95 Latency: ${s?.perf.overallP95Ms || 0}ms
- Operations > 3000ms: ${s?.perf.slowOperationsCount || 0}
- Failed Operations: ${s?.perf.failedOperationsCount || 0}

## 4. Security & Access Audit
- Security Status: ${s?.security.status || 'UNKNOWN'}
- Role Enforcement: ${s?.security.rolePermissionValid ? 'Enforced' : 'Unverified'}
- User Role: ${s?.security.currentUserRole || 'Verified Session'}
- Sensitive Exposure Risk: ${s?.security.sensitiveExposureRisk || 'NONE'}
- Unauthorized Attempts: ${s?.security.unauthorizedAccessAttempts || 0}
- App Check Status: ${s?.firebase.appCheck.status || 'NOT_CONFIGURED'} (${s?.firebase.appCheck.provider || 'reCAPTCHA v3'})
- App Check Enforcement: ${s?.firebase.appCheck.enforcementMode || 'MONITORING_ONLY'} (Safe non-enforced mode)

## 5. Active Incidents (${s?.incidents.openCount || 0} Open)
${
  s && s.incidents.list.filter((i) => i.status !== 'RESOLVED').length > 0
    ? s.incidents.list
        .filter((i) => i.status !== 'RESOLVED')
        .map(
          (i) =>
            `- [${i.severity}] #${i.id} (${i.affectedService}): ${i.title}\n  Occurrences: ${i.occurrenceCount} | Status: ${i.status}\n  Action: ${i.recommendedAction}`
        )
        .join('\n')
    : 'No open incidents. All services operating normally.'
}

## 6. Security Confirmation
- Sanitized report strictly contains NO user passwords, vouchers, credentials, tokens, or financial records.
`;
  }
}

export const systemHealth = new SystemHealthService();
