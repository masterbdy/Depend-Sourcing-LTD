import localforage from 'localforage';
import { getApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, serverTimestamp } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getUnsyncedBillCount } from './billSyncService';
import {
  perf,
  PerfMetric,
  OverallPerfSummary,
  ActionPerfSummary,
  SlowOperationRecord,
  CanonicalOperationReport,
} from './performanceDiagnostics';

export type { ActionPerfSummary, SlowOperationRecord, CanonicalOperationReport };

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' | 'OFFLINE' | 'UNAVAILABLE';
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

export interface DiagnosticProbeTrace {
  probe: 'storage' | 'backendApi' | 'firebaseConnect' | 'firebaseRead' | 'firebaseAuth' | 'syncQueue';
  label: string;
  startTimeIso: string;
  endTimeIso: string;
  durationMs: number;
  timeoutMs: number | null;
  timedOut: boolean;
  skipped?: boolean;
  status: HealthStatus;
  error?: string;
}

export interface DiagnosticExecutionMeta {
  runId: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  parallelized: boolean;
  deduplicatedInFlight: boolean;
  timedOutProbesCount: number;
  failedProbesCount: number;
  failureSummary?: string;
  probes: DiagnosticProbeTrace[];
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
    successCount: number;
    overallAvgMs: number;
    overallMinMs: number;
    overallMaxMs: number;
    overallP50Ms: number;
    overallP95Ms: number;
    overallP99Ms: number | null;
    isSampleSufficient: boolean;
    sampleNotice: string;
    thresholds: PerfThresholds;
    summary: Record<string, ActionPerfSummary>;
    byAction: Record<string, ActionPerfSummary>;
    byCategory: Record<
      string,
      { count: number; avgTotal: number; minTotal: number; maxTotal: number; p95Total: number; slowCount: number; failedCount: number }
    >;
    slowOperations: SlowOperationRecord[];
    canonicalOperations: CanonicalOperationReport[];
    recentMetrics: PerfMetric[];
  };
  diagnostics?: DiagnosticExecutionMeta;
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
  private inFlightDiagnosticPromise: Promise<SystemHealthSnapshot> | null = null;
  private inFlightCallerCount: number = 0;
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
      perf.setThresholds(this.thresholds);
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
    perf.setThresholds(this.thresholds);
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
    isPeriodicScan?: boolean;
  }): Incident {
    const now = new Date().toISOString();

    const existing = this.incidents.find(
      (inc) =>
        inc.type === params.type &&
        inc.affectedService === params.affectedService &&
        inc.status !== 'RESOLVED'
    );

    if (existing) {
      if (!params.isPeriodicScan) {
        existing.occurrenceCount += 1;
      }
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
   * Reads a Firebase RTDB diagnostic node (e.g. '.info/serverTimeOffset') safely via onValue({ onlyOnce: true }).
   * Note: Firebase Modular SDK get() bypasses repo.infoSyncTree_ and sends a wire GET request to RTDB servers,
   * which rejects '.info/*' paths with "Invalid token in path". onValue() correctly reads repo.infoSyncTree_.
   */
  public async probeFirebaseInfoRead(
    db: any,
    targetPath: string = '.info/serverTimeOffset',
    timeoutMs: number = 2000
  ): Promise<{
    ok: boolean;
    value: any;
    durationMs: number;
    timedOut: boolean;
    permissionDenied: boolean;
    error?: string;
  }> {
    const queryStart = performance.now();
    try {
      const targetRef = ref(db, targetPath);

      const snap = await new Promise<any>((resolve, reject) => {
        let settled = false;
        let readUnsub: (() => void) | null = null;

        const timerId = setTimeout(() => {
          if (settled) return;
          settled = true;
          if (readUnsub) readUnsub();
          const timeoutErr: any = new Error(`OFFSET_TIMEOUT (${timeoutMs}ms)`);
          timeoutErr.isTimeout = true;
          reject(timeoutErr);
        }, timeoutMs);

        const unsubFn = onValue(
          targetRef,
          (snapshot) => {
            if (settled) return;
            settled = true;
            clearTimeout(timerId);
            resolve(snapshot);
          },
          (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timerId);
            reject(err);
          },
          { onlyOnce: true }
        );

        if (settled) {
          unsubFn();
        } else {
          readUnsub = unsubFn;
        }
      });

      const durationMs = Number((performance.now() - queryStart).toFixed(1));
      if (!snap || !snap.exists()) {
        return {
          ok: false,
          value: null,
          durationMs,
          timedOut: false,
          permissionDenied: false,
          error: `${targetPath} snapshot empty`,
        };
      }

      return {
        ok: true,
        value: snap.val(),
        durationMs,
        timedOut: false,
        permissionDenied: false,
      };
    } catch (readErr: any) {
      const durationMs = Number((performance.now() - queryStart).toFixed(1));
      const errMsg = readErr?.message || 'Firebase read probe failed';
      return {
        ok: false,
        value: null,
        durationMs,
        timedOut: Boolean(readErr?.isTimeout || String(errMsg).includes('TIMEOUT')),
        permissionDenied: String(errMsg).includes('Permission denied') || String(errMsg).includes('permission_denied'),
        error: errMsg,
      };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutCode: string): Promise<T> {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timerId = setTimeout(() => {
            const err: any = new Error(`${timeoutCode} (${timeoutMs}ms)`);
            err.isTimeout = true;
            reject(err);
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
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
    timedOut: boolean;
    failureCategory: SystemHealthSnapshot['server']['failureCategory'];
    failureReason?: string;
    error?: string;
  }> {
    const candidateEndpoints = [
      '/api/health',
      '/api/system-health/status',
      '/api/app-version',
    ];

    let lastError: any = null;
    const probeStart = performance.now();

    for (const ep of candidateEndpoints) {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      try {
        const epStart = performance.now();
        const PROBE_TIMEOUT_MS = 2500;
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

        const res = await fetch(ep, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });
        if (timeoutId !== null) clearTimeout(timeoutId);

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
            timedOut: false,
            failureCategory: 'NONE',
            failureReason: undefined,
          };
        } else if (res.status === 404) {
          // Endpoint missing on this route - continue to next candidate
          lastError = { category: 'ENDPOINT_MISSING', status: 404, ep, latency, msg: 'HTTP 404' };
        } else if (res.status === 401 || res.status === 403) {
          return {
            available: true,
            status: 'WARNING',
            serverType: 'Express / Node.js',
            endpointUsed: ep,
            httpStatus: res.status,
            latencyMs: latency,
            timedOut: false,
            failureCategory: 'AUTH_FAILURE',
            failureReason: `API অথেনটিকেশন প্রত্যাখ্যান (HTTP ${res.status})`,
            error: `HTTP ${res.status}`,
          };
        } else {
          // 5xx or unexpected HTTP error status
          lastError = {
            category: 'SERVER_UNAVAILABLE',
            status: res.status,
            ep,
            latency,
            msg: `HTTP ${res.status} from ${ep}`,
          };
          if (res.status >= 500) {
            break; // Fast-fail when backend itself returned HTTP 5xx
          }
        }
      } catch (err: any) {
        if (timeoutId !== null) clearTimeout(timeoutId);
        if (err?.name === 'AbortError') {
          lastError = { category: 'TIMEOUT', ep, msg: 'API রিকোয়েস্ট ২.৫ সেকেন্ডে টাইমআউট হয়েছে', timedOut: true };
          break; // Do not waste extra timeout cycles on secondary candidates when primary endpoint timed out
        } else if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
          lastError = { category: 'SERVER_UNAVAILABLE', ep, msg: 'সার্ভার সংযোগ বিচ্ছিন্ন বা CORS কনফিগারেশন অনুপস্থিত' };
          break; // Fail fast if server is unreachable
        } else {
          lastError = { category: 'CORS_ERROR', ep, msg: err?.message || 'অজ্ঞাত ত্রুটি' };
        }
      }
    }

    // Secondary fallback: probe email endpoint via OPTIONS ONLY if not already timed out/5xx, guarded by 1.5s AbortController
    if (lastError?.category !== 'TIMEOUT' && !(typeof lastError?.status === 'number' && lastError.status >= 500)) {
      let optTimeoutId: ReturnType<typeof setTimeout> | null = null;
      try {
        const optStart = performance.now();
        const optController = new AbortController();
        const OPT_TIMEOUT_MS = 1500;
        optTimeoutId = setTimeout(() => optController.abort(), OPT_TIMEOUT_MS);

        const optRes = await fetch('/api/send-email', {
          method: 'OPTIONS',
          signal: optController.signal,
        });
        if (optTimeoutId !== null) clearTimeout(optTimeoutId);

        if (optRes && (optRes.ok || optRes.status === 200 || optRes.status === 204)) {
          const latency = Number((performance.now() - optStart).toFixed(1));
          return {
            available: true,
            status: 'DEGRADED',
            serverType: 'Vercel Serverless',
            endpointUsed: '/api/send-email (OPTIONS probe)',
            httpStatus: optRes.status,
            latencyMs: latency,
            timedOut: false,
            failureCategory: 'ENDPOINT_MISSING',
            failureReason: 'ইমেইল API কার্যকর, তবে ডেডিকেটেড হেলথ চেক রাউট ৪MD রেসপন্স করেনি।',
          };
        }
      } catch (optErr: any) {
        if (optTimeoutId !== null) clearTimeout(optTimeoutId);
        if (optErr?.name === 'AbortError') {
          lastError = {
            category: 'TIMEOUT',
            ep: '/api/send-email (OPTIONS)',
            msg: 'OPTIONS রিকোয়েস্ট ১.৫ সেকেন্ডে টাইমআউট হয়েছে',
            timedOut: true,
          };
        }
      }
    }

    const totalLatency = Number((performance.now() - probeStart).toFixed(1));
    const failureCategory = lastError?.category || 'SERVER_UNAVAILABLE';
    const isTimedOut = Boolean(lastError?.timedOut || failureCategory === 'TIMEOUT');
    const failureReason =
      failureCategory === 'ENDPOINT_MISSING'
        ? 'হেলথ ডায়াগনস্টিক এন্ডপয়েন্ট অনুপস্থিত (HTTP 404)'
        : failureCategory === 'TIMEOUT'
        ? 'সার্ভার রেসপন্স টাইমআউট (>২.৫ সেকেন্ড)'
        : typeof lastError?.status === 'number' && lastError.status >= 500
        ? `ব্যাকএন্ড সার্ভার ত্রুটি (HTTP ${lastError.status})`
        : 'সার্ভার কানেকশন পাওয়া যায়নি (অফলাইন বা পোর্ট অমিল)';

    return {
      available: false,
      status: 'DEGRADED', // Non-critical: core offline billing & vouchers are independent!
      serverType: 'Unknown',
      endpointUsed: lastError?.ep || '/api/health',
      httpStatus: lastError?.status,
      latencyMs: totalLatency,
      timedOut: isTimedOut,
      failureCategory,
      failureReason,
      error: lastError?.msg || failureReason,
    };
  }

  /**
   * Safe, strictly read-only diagnostics execution.
   * Deduplicates concurrent in-flight invocations and runs independent probes in parallel.
   * Does NOT alter business data, does NOT write test bills, does NOT scan entire tables.
   */
  public async runSafeDiagnostics(
    firebaseConfig?: any,
    userContext?: { currentUser?: string | null; role?: string | null; email?: string | null }
  ): Promise<SystemHealthSnapshot> {
    if (this.inFlightDiagnosticPromise) {
      this.inFlightCallerCount += 1;
      return this.inFlightDiagnosticPromise;
    }

    this.isChecking = true;
    this.inFlightCallerCount = 1;

    const promise = this.executeSafeDiagnostics(firebaseConfig, userContext).finally(() => {
      this.isChecking = false;
      this.inFlightDiagnosticPromise = null;
      this.inFlightCallerCount = 0;
    });

    this.inFlightDiagnosticPromise = promise;
    return promise;
  }

  private async executeSafeDiagnostics(
    firebaseConfig?: any,
    userContext?: { currentUser?: string | null; role?: string | null; email?: string | null }
  ): Promise<SystemHealthSnapshot> {
    const runId = `diag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const runStartPerf = performance.now();
    const runStartedAt = new Date().toISOString();
    const probes: DiagnosticProbeTrace[] = [];

    try {
      const timestamp = runStartedAt;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;

      // 1. Network Quality Diagnostics
      const navConn = (navigator as any)?.connection;
      const networkInfo = {
        online: isOnline,
        effectiveType: navConn?.effectiveType || (isOnline ? '4g' : 'offline'),
        rtt: navConn?.rtt,
        downlink: navConn?.downlink,
        latencyMs: navConn?.rtt ? Number(navConn.rtt) : undefined,
      };

      const appCheckSiteKey =
        firebaseConfig?.appCheckSiteKey ||
        (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_FIREBASE_APP_CHECK_SITE_KEY : undefined);
      const isAppCheckConfigured = Boolean(appCheckSiteKey && String(appCheckSiteKey).trim().length > 0);
      const appCheckStatus: SystemHealthSnapshot['firebase']['appCheckStatus'] = isAppCheckConfigured ? 'ACTIVE' : 'NOT_CONFIGURED';
      const diagnosticLocation = '.info/serverTimeOffset & .info/connected';

      const appCheckInfo: AppCheckDiagnosticInfo = {
        status: isAppCheckConfigured ? 'ACTIVE' : 'NOT_CONFIGURED',
        provider: 'reCAPTCHA v3 (Web)',
        enforcementMode: 'MONITORING_ONLY', // Never enable enforcement automatically
        attestationProvider: 'ReCaptchaV3Provider',
        isSafe: true, // Non-enforced ensures legitimate staff devices will not be blocked
        recommendation: isAppCheckConfigured
          ? 'App Check সাইট কী কনফিগার করা আছে। মনিটরিং মোডে ভ্যালিড রিকোয়েস্ট মেট্রিক পর্যবেক্ষণ অব্যাহত রাখুন।'
          : 'কনসোল থেকে reCAPTCHA v3 সাইট কী যুক্ত করে মনিটরিং মোডে পর্যবেক্ষণ করার পরামর্শ দেওয়া হচ্ছে।',
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

      // Parallel Branch A: Storage & IndexedDB Probe (1500ms timeout guard)
      const storagePromise = (async () => {
        const STORAGE_TIMEOUT_MS = 1500;
        const probeStartIso = new Date().toISOString();
        const probeStart = performance.now();
        let localStorageAvailable = false;
        let indexedDbAvailable = false;
        let storageError: string | undefined;
        let storageTimedOut = false;

        try {
          const testKey = '__ais_safe_health_probe__';
          localStorage.setItem(testKey, '1');
          localStorage.removeItem(testKey);
          localStorageAvailable = true;

          await this.withTimeout(
            (async () => {
              await localforage.setItem(testKey, { ping: true });
              await localforage.removeItem(testKey);
            })(),
            STORAGE_TIMEOUT_MS,
            'INDEXEDDB_PROBE_TIMEOUT'
          );
          indexedDbAvailable = true;

          if (localStorageAvailable && indexedDbAvailable) {
            const openStorageIncidents = this.incidents.filter(
              (i) => i.type === 'STORAGE_FAILURE' && i.status !== 'RESOLVED'
            );
            for (const storageInc of openStorageIncidents) {
              this.resolveIncident(
                storageInc.id,
                'লোকাল IndexedDB ও LocalStorage রিড-রাইট সফলভাবে পুনরুদ্ধার হয়েছে এবং স্বাভাবিক রয়েছে।',
                'System Auto-Recovery'
              );
            }
          }
        } catch (err: any) {
          storageTimedOut = Boolean(err?.isTimeout || String(err?.message || '').includes('TIMEOUT'));
          storageError = err?.message || 'Storage unavailable';
          this.recordIncident({
            type: 'STORAGE_FAILURE',
            title: 'লোকাল স্টোরেজ ব্যর্থতা (Storage Failure)',
            severity: 'CRITICAL',
            affectedService: 'IndexedDB',
            message: `লোকাল IndexedDB/LocalStorage রিড-রাইট ব্যর্থ হয়েছে: ${storageError}`,
            recommendedAction: 'ব্রাউজার প্রাইভেট মোড অথবা স্টোরেজ পারমিশন পরীক্ষা করুন।',
            isPeriodicScan: true,
          });
        }

        const durationMs = Number((performance.now() - probeStart).toFixed(1));
        probes.push({
          probe: 'storage',
          label: 'LocalStorage & IndexedDB',
          startTimeIso: probeStartIso,
          endTimeIso: new Date().toISOString(),
          durationMs,
          timeoutMs: STORAGE_TIMEOUT_MS,
          timedOut: storageTimedOut,
          status: indexedDbAvailable && localStorageAvailable ? 'HEALTHY' : 'CRITICAL',
          error: storageError,
        });

        return {
          localStorageAvailable,
          indexedDbAvailable,
          storageLatencyMs: durationMs,
          storageError,
          storageTimedOut,
        };
      })();

      // Parallel Branch B: Express / Vercel Serverless Backend Probe (fast-skip if offline)
      const serverPromise = (async () => {
        const probeStartIso = new Date().toISOString();
        const probeStart = performance.now();

        if (!isOnline) {
          const offlineResult = {
            available: false,
            status: 'OFFLINE' as HealthStatus,
            serverType: 'Unknown' as SystemHealthSnapshot['server']['serverType'],
            endpointUsed: '/api/health',
            httpStatus: undefined,
            latencyMs: 0,
            uptime: undefined,
            version: undefined,
            timedOut: false,
            failureCategory: 'SERVER_UNAVAILABLE' as SystemHealthSnapshot['server']['failureCategory'],
            failureReason: 'ডিভাইস নেটওয়ার্ক অফলাইন',
            error: 'Device offline',
          };
          probes.push({
            probe: 'backendApi',
            label: 'Express / API Backend',
            startTimeIso: probeStartIso,
            endTimeIso: new Date().toISOString(),
            durationMs: Number((performance.now() - probeStart).toFixed(1)),
            timeoutMs: 2500,
            timedOut: false,
            skipped: true,
            status: 'OFFLINE',
            error: 'Skipped: Device offline',
          });
          return offlineResult;
        }

        const res = await this.probeBackendServer();
        const durationMs = Number((performance.now() - probeStart).toFixed(1));
        probes.push({
          probe: 'backendApi',
          label: `Backend API (${res.endpointUsed})`,
          startTimeIso: probeStartIso,
          endTimeIso: new Date().toISOString(),
          durationMs,
          timeoutMs: 2500,
          timedOut: res.timedOut,
          status: res.status,
          error: res.available ? undefined : res.error || res.failureReason,
        });
        return res;
      })();

      // Parallel Branch C: Firebase Auth Session / Token Probe (1500ms timeout guard)
      const authPromise = (async () => {
        const AUTH_TIMEOUT_MS = 1500;
        const probeStartIso = new Date().toISOString();
        const probeStart = performance.now();
        let authStatus: AuthDiagnosticStatus = 'UNKNOWN';
        let authEmail: string | undefined;
        let authUid: string | undefined;
        let authExpiresAt: string | undefined;
        let authTimedOut = false;
        let authError: string | undefined;

        try {
          const apps = getApps();
          const app = apps.length > 0 ? getApp() : null;
          if (app) {
            const auth = getAuth(app);
            const user = auth.currentUser;
            if (user) {
              authStatus = user.isAnonymous ? 'ANONYMOUS' : 'FIREBASE_AUTH_ACTIVE';
              authEmail = user.email || (user.isAnonymous ? 'Anonymous Kiosk' : undefined);
              authUid = user.uid;
              try {
                const tokenRes = await this.withTimeout(
                  user.getIdTokenResult(),
                  AUTH_TIMEOUT_MS,
                  'FIREBASE_AUTH_TOKEN_TIMEOUT'
                );
                authExpiresAt = tokenRes.expirationTime;
              } catch (tokenErr: any) {
                authTimedOut = Boolean(tokenErr?.isTimeout || String(tokenErr?.message || '').includes('TIMEOUT'));
                authError = tokenErr?.message || 'Token verification failed';
              }
            }
          }

          if (authStatus === 'UNKNOWN') {
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
        } catch (err: any) {
          authStatus = 'UNKNOWN';
          authError = err?.message || 'Auth diagnostic check failed';
        }

        const durationMs = Number((performance.now() - probeStart).toFixed(1));
        probes.push({
          probe: 'firebaseAuth',
          label: 'Authentication Check',
          startTimeIso: probeStartIso,
          endTimeIso: new Date().toISOString(),
          durationMs,
          timeoutMs: AUTH_TIMEOUT_MS,
          timedOut: authTimedOut,
          status: authTimedOut || authError ? 'DEGRADED' : 'HEALTHY',
          error: authError,
        });

        return { authStatus, authEmail, authUid, authExpiresAt, authTimedOut, authError };
      })();

      // Parallel Branch D: Firebase RTDB Connectivity (.info/connected) + Read Latency (.info/serverTimeOffset)
      const firebasePromise = (async () => {
        const CONNECT_TIMEOUT_MS = 3000;
        const READ_TIMEOUT_MS = 2000;
        let fbStatus: HealthStatus = 'UNKNOWN';
        let fbConnected = false;
        let fbReadLatencyMs = 0;
        let fbRoundTripLatencyMs = 0;
        let fbError: string | undefined;
        let permissionDeniedCount = 0;
        let fbConnectTimedOut = false;
        let fbReadTimedOut = false;
        let fbReadError: string | undefined;

        const connStartIso = new Date().toISOString();
        const connStartPerf = performance.now();

        if (!isOnline) {
          fbStatus = 'OFFLINE';
          fbError = 'ডিভাইস নেটওয়ার্ক অফলাইন';
          const endIso = new Date().toISOString();
          probes.push({
            probe: 'firebaseConnect',
            label: 'Firebase RTDB (.info/connected)',
            startTimeIso: connStartIso,
            endTimeIso: endIso,
            durationMs: 0,
            timeoutMs: CONNECT_TIMEOUT_MS,
            timedOut: false,
            skipped: true,
            status: 'OFFLINE',
            error: 'Skipped: Device offline',
          });
          probes.push({
            probe: 'firebaseRead',
            label: 'Firebase Read (.info/serverTimeOffset)',
            startTimeIso: connStartIso,
            endTimeIso: endIso,
            durationMs: 0,
            timeoutMs: READ_TIMEOUT_MS,
            timedOut: false,
            skipped: true,
            status: 'OFFLINE',
            error: 'Skipped: Device offline',
          });
        } else if (!dbUrl) {
          fbStatus = 'UNAVAILABLE';
          fbError = 'Firebase Database URL কনফিগার করা নেই';
          const endIso = new Date().toISOString();
          probes.push({
            probe: 'firebaseConnect',
            label: 'Firebase RTDB (.info/connected)',
            startTimeIso: connStartIso,
            endTimeIso: endIso,
            durationMs: 0,
            timeoutMs: CONNECT_TIMEOUT_MS,
            timedOut: false,
            skipped: true,
            status: 'UNAVAILABLE',
            error: fbError,
          });
          probes.push({
            probe: 'firebaseRead',
            label: 'Firebase Read (.info/serverTimeOffset)',
            startTimeIso: connStartIso,
            endTimeIso: endIso,
            durationMs: 0,
            timeoutMs: READ_TIMEOUT_MS,
            timedOut: false,
            skipped: true,
            status: 'UNAVAILABLE',
            error: fbError,
          });
        } else {
          try {
            const apps = getApps();
            const app = apps.length > 0 ? getApp() : null;
            if (app) {
              const db = getDatabase(app, dbUrl);
              const connectedRef = ref(db, '.info/connected');

              let unsub: (() => void) | null = null;
              let connErrMsg: string | undefined;
              const isConnected = await new Promise<boolean>((resolve) => {
                const timeoutId = setTimeout(() => {
                  fbConnectTimedOut = true;
                  connErrMsg = `RTDB connection probe timed out (${CONNECT_TIMEOUT_MS}ms)`;
                  if (unsub) unsub();
                  resolve(false);
                }, CONNECT_TIMEOUT_MS);

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
                    connErrMsg = err?.message || 'RTDB listener error';
                    if (err?.message?.includes('Permission denied')) {
                      permissionDeniedCount++;
                    }
                    resolve(false);
                  }
                );
              });

              const connDuration = Number((performance.now() - connStartPerf).toFixed(1));
              probes.push({
                probe: 'firebaseConnect',
                label: 'Firebase RTDB (.info/connected)',
                startTimeIso: connStartIso,
                endTimeIso: new Date().toISOString(),
                durationMs: connDuration,
                timeoutMs: CONNECT_TIMEOUT_MS,
                timedOut: fbConnectTimedOut,
                status: isConnected ? 'HEALTHY' : isOnline ? 'DEGRADED' : 'OFFLINE',
                error: isConnected ? undefined : connErrMsg,
              });

              // Read .info/serverTimeOffset ONLY when connected using onValue({ onlyOnce: true })
              // (avoids wire get() sending '/.info/serverTimeOffset' which RTDB rejects as 'Invalid token in path')
              const readStartIso = new Date().toISOString();
              const probeReadPath = (firebaseConfig as any)?.__probeReadPath || '.info/serverTimeOffset';
              if (isConnected) {
                const readOutcome = await this.probeFirebaseInfoRead(db, probeReadPath, READ_TIMEOUT_MS);
                fbReadLatencyMs = readOutcome.durationMs;
                if (readOutcome.permissionDenied) {
                  permissionDeniedCount++;
                }
                if (readOutcome.ok) {
                  fbRoundTripLatencyMs = readOutcome.durationMs;
                } else {
                  fbReadTimedOut = readOutcome.timedOut;
                  fbReadError = readOutcome.error || 'Firebase read probe failed';
                }

                probes.push({
                  probe: 'firebaseRead',
                  label: `Firebase Read (${probeReadPath})`,
                  startTimeIso: readStartIso,
                  endTimeIso: new Date().toISOString(),
                  durationMs: fbReadLatencyMs,
                  timeoutMs: READ_TIMEOUT_MS,
                  timedOut: fbReadTimedOut,
                  status: fbReadTimedOut || fbReadError ? 'DEGRADED' : 'HEALTHY',
                  error: fbReadError,
                });
              } else {
                probes.push({
                  probe: 'firebaseRead',
                  label: 'Firebase Read (.info/serverTimeOffset)',
                  startTimeIso: readStartIso,
                  endTimeIso: new Date().toISOString(),
                  durationMs: 0,
                  timeoutMs: READ_TIMEOUT_MS,
                  timedOut: false,
                  skipped: true,
                  status: isOnline ? 'DEGRADED' : 'OFFLINE',
                  error: 'Skipped: RTDB connection not active',
                });
              }

              if (isConnected && !fbReadTimedOut && !fbReadError) {
                fbConnected = true;
                fbStatus = 'HEALTHY';
                this.lastFbCheckAt = new Date().toISOString();
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem(STORAGE_KEYS.LAST_SUCCESSFUL_FB, this.lastFbCheckAt);
                }

                const fbInc = this.incidents.find((i) => i.type === 'FIREBASE_DISCONNECTED' && i.status !== 'RESOLVED');
                if (fbInc) {
                  this.resolveIncident(fbInc.id, 'Firebase Realtime Database সংযোগ সফলভাবে নিশ্চিত ও সক্রিয় রয়েছে।', 'System Auto-Recovery');
                }
              } else if (isConnected && (fbReadTimedOut || fbReadError)) {
                fbConnected = true;
                fbStatus = 'DEGRADED';
                fbError = fbReadTimedOut
                  ? 'Firebase রিড প্রোব ২ সেকেন্ডে টাইমআউট হয়েছে (.info/serverTimeOffset)'
                  : `Firebase রিড প্রোব ত্রুটি: ${fbReadError}`;
              } else {
                fbConnected = false;
                fbStatus = isOnline ? 'DEGRADED' : 'OFFLINE';
                fbError = isOnline ? 'Firebase সংযোগ নিশ্চিত হতে বিলম্ব হচ্ছে (টাইমআউট ৩ সেকেন্ড)' : 'ডিভাইস নেটওয়ার্ক অফলাইন';

                this.recordIncident({
                  type: 'FIREBASE_DISCONNECTED',
                  title: 'ফায়ারবেস সংযোগে সমস্যা (Firebase Unreachable)',
                  severity: 'WARNING',
                  affectedService: 'Firebase',
                  message: `Firebase Realtime Database রেসপন্স দেয়নি: ${fbError}`,
                  recommendedAction: 'ইন্টারনেট প্রক্সি, ফায়ারওয়াল অথবা ফায়ারবেস কনফিগারেশন চেক করুন। অফলাইন কিউতে ডাটা নিরাপদ থাকবে।',
                  isPeriodicScan: true,
                });
              }
            } else {
              fbStatus = 'UNAVAILABLE';
              fbError = 'Firebase App ইনিশিয়ালাইজ হয়নি';
              const endIso = new Date().toISOString();
              probes.push({
                probe: 'firebaseConnect',
                label: 'Firebase RTDB (.info/connected)',
                startTimeIso: connStartIso,
                endTimeIso: endIso,
                durationMs: 0,
                timeoutMs: CONNECT_TIMEOUT_MS,
                timedOut: false,
                skipped: true,
                status: 'UNAVAILABLE',
                error: fbError,
              });
              probes.push({
                probe: 'firebaseRead',
                label: 'Firebase Read (.info/serverTimeOffset)',
                startTimeIso: connStartIso,
                endTimeIso: endIso,
                durationMs: 0,
                timeoutMs: READ_TIMEOUT_MS,
                timedOut: false,
                skipped: true,
                status: 'UNAVAILABLE',
                error: fbError,
              });
            }
          } catch (err: any) {
            fbReadLatencyMs = Number((performance.now() - connStartPerf).toFixed(1));
            fbConnected = false;
            fbStatus = isOnline ? 'DEGRADED' : 'OFFLINE';
            fbError = err?.message || 'সংযোগ ব্যর্থ';
            if (err?.message?.includes('Permission denied')) {
              permissionDeniedCount++;
            }
            probes.push({
              probe: 'firebaseConnect',
              label: 'Firebase RTDB (.info/connected)',
              startTimeIso: connStartIso,
              endTimeIso: new Date().toISOString(),
              durationMs: fbReadLatencyMs,
              timeoutMs: CONNECT_TIMEOUT_MS,
              timedOut: false,
              status: fbStatus,
              error: fbError,
            });
          }
        }

        return {
          fbStatus,
          fbConnected,
          fbReadLatencyMs,
          fbRoundTripLatencyMs,
          fbError,
          permissionDeniedCount,
          fbConnectTimedOut,
          fbReadTimedOut,
          fbReadError,
        };
      })();

      // Execute independent diagnostic probes in parallel
      const [storageRes, serverDiag, authRes, fbRes] = await Promise.all([
        storagePromise,
        serverPromise,
        authPromise,
        firebasePromise,
      ]);

      const { localStorageAvailable, indexedDbAvailable, storageLatencyMs, storageError } = storageRes;
      let { authStatus, authEmail } = authRes;
      const { authUid, authExpiresAt, authTimedOut, authError } = authRes;
      const {
        fbStatus,
        fbConnected,
        fbReadLatencyMs,
        fbRoundTripLatencyMs,
        fbError,
        permissionDeniedCount,
        fbConnectTimedOut,
        fbReadTimedOut,
        fbReadError,
      } = fbRes;

      // 5. Cloud Sync Verification & Duplicate-Write Detection
      const syncStartIso = new Date().toISOString();
      const syncStartPerf = performance.now();
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

      probes.push({
        probe: 'syncQueue',
        label: 'Offline Sync Queue Inspect',
        startTimeIso: syncStartIso,
        endTimeIso: new Date().toISOString(),
        durationMs: Number((performance.now() - syncStartPerf).toFixed(1)),
        timeoutMs: null,
        timedOut: false,
        status: syncStatus,
        error: duplicateWriteDetected ? 'Duplicate clientSubmissionId detected in queue' : undefined,
      });

      // Record this real diagnostic run in perf BEFORE taking overall perf summary
      const runTotalDurationMs = Number(Math.max(0, performance.now() - runStartPerf).toFixed(1));
      const timedOutProbesCount = probes.filter((p) => p.timedOut).length;
      const failedProbesCount = probes.filter(
        (p) => !p.skipped && (p.timedOut || Boolean(p.error) || p.status === 'CRITICAL' || p.status === 'UNAVAILABLE')
      ).length;

      const hasDiagnosticFailure =
        timedOutProbesCount > 0 ||
        authTimedOut ||
        Boolean(authError) ||
        !indexedDbAvailable ||
        !localStorageAvailable ||
        (Boolean(dbUrl) && isOnline && (!fbConnected || fbConnectTimedOut || fbReadTimedOut || Boolean(fbReadError))) ||
        serverDiag.failureCategory === 'TIMEOUT' ||
        (typeof serverDiag.httpStatus === 'number' && serverDiag.httpStatus >= 500);

      const maxNetDurationMs = Math.max(
        0,
        ...probes
          .filter((p) => !p.skipped && (p.probe === 'backendApi' || p.probe === 'firebaseConnect' || p.probe === 'firebaseRead' || p.probe === 'firebaseAuth'))
          .map((p) => p.durationMs)
      );

      const failedProbeDetails = probes
        .filter((p) => !p.skipped && (p.timedOut || Boolean(p.error) || p.status === 'CRITICAL' || p.status === 'UNAVAILABLE'))
        .map((p) => `${p.label} [${p.probe}]: ${p.error || (p.timedOut ? 'TIMEOUT' : p.status)}`);
      const failureSummary = failedProbeDetails.length > 0 ? failedProbeDetails.join(' | ') : undefined;

      perf.recordDirectMetric({
        action: 'System Health Diagnostic Run',
        category: 'dashboard',
        durationMs: runTotalDurationMs,
        networkDurationMs: Number(maxNetDurationMs.toFixed(1)),
        success: !hasDiagnosticFailure,
        error: hasDiagnosticFailure
          ? failureSummary ||
            probes
              .filter((p) => p.timedOut || (!p.skipped && p.error))
              .map((p) => `${p.probe}: ${p.error || 'TIMEOUT'}`)
              .join('; ')
          : undefined,
      });

      const diagnosticsMeta: DiagnosticExecutionMeta = {
        runId,
        startedAt: runStartedAt,
        completedAt: new Date().toISOString(),
        totalDurationMs: runTotalDurationMs,
        parallelized: true,
        deduplicatedInFlight: this.inFlightCallerCount > 1,
        timedOutProbesCount,
        failedProbesCount,
        failureSummary,
        probes,
      };

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
          message: `সাম্প্রতিক অপারেশনের মধ্যে ${slowCount} টি অপারেশনে ${this.thresholds.slowMs / 1000} সেকেন্ডের বেশি সময় লেগেছে (P95: ${perfSummary.overallP95Ms}ms)।`,
          recommendedAction: 'পারফরম্যান্স ট্যাবে ধীরগতির রুট বা অ্যাকশন পরীক্ষা করুন।',
          isPeriodicScan: true,
        });
      } else if (slowInc && slowCount <= 1) {
        this.resolveIncident(slowInc.id, `সাম্প্রতিক অপারেশনের গতি স্বাভাবিক মাত্রায় ফিরে এসেছে (<${this.thresholds.normalMs / 1000} সেকেন্ড)।`, 'System Auto-Recovery');
      }

      // Resolve local session role regardless of Firebase online status
      let sessionObj: any = null;
      if (typeof localStorage !== 'undefined') {
        try {
          const s = localStorage.getItem('active_session');
          if (s) sessionObj = JSON.parse(s);
        } catch {}
      }
      if (authStatus === 'UNKNOWN') {
        const fallbackUser = userContext?.currentUser || sessionObj?.username || sessionObj?.email;
        if (fallbackUser) {
          authStatus = 'SESSION_AUTHENTICATED';
          authEmail = fallbackUser;
        } else {
          authStatus = 'NOT_LOGGED_IN';
        }
      }

      // 7. Read-only Security Diagnostics
      const auditFindings: string[] = [];
      let sensitiveExposureRisk: SystemHealthSnapshot['security']['sensitiveExposureRisk'] = 'NONE';

      // Verify localStorage has no raw passwords or token leaks
      if (typeof localStorage !== 'undefined') {
        let suspiciousKeyFound = false;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '';
          const lk = k.toLowerCase();
          if (lk.includes('password') || lk.includes('secret_key') || lk.includes('database_secret')) {
            suspiciousKeyFound = true;
            auditFindings.push(`সন্দেহজনক স্টোরেজ কী শনাক্ত হয়েছে: ${k}`);
          }
        }
        if (suspiciousKeyFound) {
          sensitiveExposureRisk = 'MEDIUM';
        }
      }

      const authEnforced =
        authStatus === 'FIREBASE_AUTH_ACTIVE' ||
        authStatus === 'SESSION_AUTHENTICATED' ||
        authStatus === 'ANONYMOUS';
      const resolvedRole = userContext?.role || sessionObj?.role || undefined;
      const validRoles = ['ADMIN', 'MD', 'STAFF', 'KIOSK'];
      const rolePermissionValid = Boolean(
        authEnforced && resolvedRole && validRoles.includes(String(resolvedRole).toUpperCase())
      );

      if (!authEnforced) {
        auditFindings.push('সক্রিয় অথেনটিকেটেড সেশন শনাক্ত হয়নি (Unauthenticated context)');
      }
      if (permissionDeniedCount > 0) {
        auditFindings.push(`Firebase পারমিশন ডিনাইড ইভেন্ট: ${permissionDeniedCount} টি`);
      }

      let securityStatus: HealthStatus = 'HEALTHY';
      if (permissionDeniedCount > 0 || sensitiveExposureRisk === 'MEDIUM') {
        securityStatus = 'DEGRADED';
      } else if (this.securityViolationsCount > 0 || !authEnforced) {
        securityStatus = 'WARNING';
      }

      // 8. Overall System Status Determination
      const openIncidents = this.incidents.filter((i) => i.status !== 'RESOLVED');
      const criticalIncidents = openIncidents.filter((i) => i.severity === 'CRITICAL');
      const warningIncidents = openIncidents.filter((i) => i.severity === 'WARNING');

      let overallStatus: HealthStatus = 'HEALTHY';

      if (!isOnline) {
        overallStatus = 'OFFLINE';
      } else if (!indexedDbAvailable || !localStorageAvailable || criticalIncidents.length > 0) {
        overallStatus = 'CRITICAL';
      } else if (fbStatus === 'UNAVAILABLE') {
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
          authEnforced,
          currentUserRole: resolvedRole || (authEnforced ? 'Verified Session' : 'Unauthenticated Guard'),
          rolePermissionValid,
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
          successCount: perfSummary.successCount,
          overallAvgMs: perfSummary.overallAvgMs,
          overallMinMs: perfSummary.overallMinMs,
          overallMaxMs: perfSummary.overallMaxMs,
          overallP50Ms: perfSummary.overallP50Ms,
          overallP95Ms: perfSummary.overallP95Ms,
          overallP99Ms: perfSummary.overallP99Ms,
          isSampleSufficient: perfSummary.isSampleSufficient,
          sampleNotice: perfSummary.sampleNotice,
          thresholds: this.thresholds,
          summary: perfSummary.byAction,
          byAction: perfSummary.byAction,
          byCategory: perfSummary.byCategory,
          slowOperations: perfSummary.slowOperations,
          canonicalOperations: perfSummary.canonicalOperations,
          recentMetrics: perf.getMetrics().slice(-15).reverse(),
        },
        diagnostics: diagnosticsMeta,
      };

      this.lastSnapshot = snapshot;

      this.logEvent({
        type: 'HEALTH_CHECK',
        severity: overallStatus === 'HEALTHY' ? 'INFO' : 'WARNING',
        service: 'System',
        summary: `Health check (${runTotalDurationMs}ms, parallel): ${overallStatus} (Firebase: ${fbStatus}, Backend: ${serverDiag.serverType} ${serverDiag.available ? 'OK' : 'DEGRADED'}, IDB: ${indexedDbAvailable ? 'OK' : 'FAIL'}, Queue: ${pendingCount}, Timeouts: ${timedOutProbesCount})`,
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
    const livePerf = s ? s.perf : perf.getOverallSummary();
    const slowThresholdMs = s?.perf.thresholds?.slowMs || perf.getThresholds().slowMs;

    const scrub = (t: string): string =>
      String(t || '')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_IDENTITY]')
        .replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
        .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_JWT]')
        .replace(/\b(password|user_password|apiKey|databaseSecret|secret_key|access_token)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
        .replace(/(?:\+?88)?01[3-9]\d{8}\b/g, '[REDACTED_PHONE]');

    const canonicalRows = livePerf.canonicalOperations
      .map((op) => {
        const statusLabel =
          op.status === 'NOT_TRACKED'
            ? 'NOT TRACKED'
            : op.status === 'LIMITED_SAMPLE'
            ? 'LIMITED SAMPLE'
            : op.status;
        if (op.samples === 0) {
          return `${op.operation}| 0| N/A| N/A| N/A| N/A| 0| ${statusLabel}`;
        }
        return `${op.operation}| ${op.samples}| ${op.avgMs}ms| ${op.minMs}ms| ${op.maxMs}ms| ${op.p95Ms}ms| ${op.failedCount}| ${statusLabel}`;
      })
      .join('\n');

    const actionEntries = Object.values(livePerf.byAction || {});
    const detailedActionLines =
      actionEntries.length > 0
        ? actionEntries
            .map((a) => {
              const p99Text = a.p99Total !== null ? `${a.p99Total}ms` : 'N/A (<20 samples)';
              return `- ${scrub(a.action)} [${a.category}]: Samples=${a.count} (${a.sampleStatus}) | Avg=${a.avgTotal}ms | Min=${a.minTotal}ms | Max=${a.maxTotal}ms | P50=${a.p50Total}ms | P95=${a.p95Total}ms | P99=${p99Text} | Success=${a.successCount} | Failed=${a.failedCount} | Slow=${a.slowCount} | Last=${a.lastDurationMs}ms @ ${a.lastExecutedAt}`;
            })
            .join('\n')
        : '- No tracked operations recorded in the active session.';

    const slowOps = livePerf.slowOperations || [];
    const slowOpsSection =
      slowOps.length > 0
        ? slowOps
            .map(
              (so) =>
                `- ${scrub(so.action)} [${so.category}]: Threshold=${so.thresholdMs}ms | Occurrences=${so.occurrences} | Max=${so.maxDurationMs}ms | Last=${so.lastSlowDurationMs}ms | Recent=${so.lastOccurrenceAt}`
            )
            .join('\n')
        : `- No slow operations detected above ${slowThresholdMs}ms threshold.`;

    const totalTracked = 'totalTracked' in livePerf ? livePerf.totalTracked : 0;
    const overallSlowCount =
      'slowOperationsCount' in livePerf ? livePerf.slowOperationsCount : livePerf.slowCount;
    const overallFailedCount =
      'failedOperationsCount' in livePerf ? livePerf.failedOperationsCount : livePerf.failedCount;
    const overallP99Text =
      livePerf.overallP99Ms !== null && livePerf.overallP99Ms !== undefined
        ? `${livePerf.overallP99Ms}ms`
        : 'INSUFFICIENT_SAMPLE (<20 samples)';

    return scrub(`# Depend Sourcing - System Health Diagnostic Report
Generated: ${now}
Overall Status: ${s ? s.overallStatus : 'UNKNOWN'}

## 1. Environment & Connectivity
- Browser Online: ${s?.network.online ? 'YES' : 'NO'}
- Network RTT: ${s?.network.rtt || 'N/A'}ms (Downlink: ${s?.network.downlink || 'N/A'} Mbps)
- Firebase Connected: ${s?.firebase.connected ? 'YES' : 'NO'} (${s?.firebase.status || 'UNKNOWN'})
- Firebase Read Latency: ${s?.firebase.readLatencyMs || 0}ms
- Firebase RTDB Probe: ${s?.firebase.diagnosticLocation || '.info/serverTimeOffset'}
${s?.firebase.error ? `- Firebase Diagnosis: ${s.firebase.error}\n` : ''}- Auth Diagnostic State: ${s?.firebase.authStatus || 'UNKNOWN'}
- Session Access Level: [ROLE_CLASSIFIED: ${s?.security.currentUserRole || 'STANDARD'}]
- Backend API Server: ${s?.server.available ? 'OK' : 'DEGRADED'} (${s?.server.latencyMs || 0}ms)
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

### Last Diagnostic Run & Probe Breakdown
- Total Diagnostic Duration: ${s?.diagnostics?.totalDurationMs ?? 0}ms (Parallel: ${s?.diagnostics?.parallelized ? 'YES' : 'NO'}, Deduplicated: ${s?.diagnostics?.deduplicatedInFlight ? 'YES' : 'NO'})
- Timed Out Probes: ${s?.diagnostics?.timedOutProbesCount ?? 0} | Failed Probes: ${s?.diagnostics?.failedProbesCount ?? 0}
${s?.diagnostics?.failureSummary ? `- Failed Probe Cause: ${scrub(s.diagnostics.failureSummary)}\n` : ''}${
  s?.diagnostics?.probes?.length
    ? s.diagnostics.probes
        .map(
          (p) =>
            `- ${scrub(p.label)} [${p.probe}]: ${p.durationMs}ms (Timeout=${p.timeoutMs !== null ? `${p.timeoutMs}ms` : 'None'}, TimedOut=${p.timedOut ? 'YES' : 'NO'}, Skipped=${p.skipped ? 'YES' : 'NO'}, Status=${p.status})${p.error ? ` | Note: ${scrub(p.error)}` : ''}`
        )
        .join('\n')
    : '- No per-probe telemetry captured yet.'
}

## 3. Performance Metrics
### Overall Performance Summary
- Total Tracked Operations: ${totalTracked}
- Sample Sufficiency: ${livePerf.isSampleSufficient ? 'Sufficient' : 'Limited'} (${livePerf.sampleNotice})
- Overall Average Latency: ${livePerf.overallAvgMs}ms
- Overall Minimum Latency: ${livePerf.overallMinMs}ms
- Overall P50 Latency: ${livePerf.overallP50Ms}ms
- Overall Maximum Latency: ${livePerf.overallMaxMs}ms
- Overall P95 Latency: ${livePerf.overallP95Ms}ms
- Overall P99 Latency: ${overallP99Text}
- Total Successful Operations: ${livePerf.successCount}
- Total Failed Operations: ${overallFailedCount}
- Total Slow Operations (> ${slowThresholdMs}ms): ${overallSlowCount}

### Individual Operation Table
Operation| Samples| Average| Min| Max| P95| Failed| Status
${canonicalRows}

### Tracked Source Operations Detail
${detailedActionLines}

### Slow Operation Detection (> ${slowThresholdMs}ms)
${slowOpsSection}

## 4. Security & Access Audit
- Security Status: ${s?.security.status || 'UNKNOWN'}
- Authentication Enforced: ${s?.security.authEnforced ? 'YES' : 'NO'}
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
        .map((i) => {
          return `- [${i.severity}] #${i.id} (${i.affectedService}): ${scrub(i.title)}\n  Occurrences: ${i.occurrenceCount} | Status: ${i.status}\n  Action: ${scrub(i.recommendedAction)}`;
        })
        .join('\n')
    : 'No open incidents. All services operating normally.'
}

## 6. Security Confirmation
- Sanitized report strictly contains NO user passwords, vouchers, credentials, tokens, personal phone numbers, or financial records.
`);
  }
}

export const systemHealth = new SystemHealthService();
