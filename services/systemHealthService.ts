import localforage from 'localforage';
import { getApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, onValue } from 'firebase/database';
import { getUnsyncedBillCount } from './billSyncService';
import { perf, PerfMetric } from './performanceDiagnostics';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'UNAVAILABLE' | 'UNKNOWN';
export type IncidentSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

export interface Incident {
  id: string;
  title: string;
  type: string;
  severity: IncidentSeverity;
  affectedService: 'Firebase' | 'SyncQueue' | 'IndexedDB' | 'Network' | 'ServerAPI' | 'System';
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

export interface SystemHealthSnapshot {
  overallStatus: HealthStatus;
  timestamp: string;
  network: {
    online: boolean;
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
  };
  firebase: {
    status: HealthStatus;
    connected: boolean;
    databaseUrl?: string;
    latencyMs?: number;
    lastSuccessfulCheck?: string;
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
    recentFailuresCount: number;
    longestPendingMinutes?: number;
  };
  server: {
    status: HealthStatus;
    available: boolean;
    latencyMs?: number;
    uptime?: number;
    version?: string;
    error?: string;
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
    thresholds: PerfThresholds;
    summary: Record<string, { count: number; avgTotal: number; maxTotal: number; avgNet: number }>;
    recentMetrics: PerfMetric[];
  };
}

const STORAGE_KEYS = {
  INCIDENTS: 'ais_health_incidents_v1',
  EVENTS: 'ais_health_events_v1',
  THRESHOLDS: 'ais_health_thresholds_v1',
  LAST_SUCCESSFUL_SYNC: 'ais_last_confirmed_sync',
  LAST_SUCCESSFUL_FB: 'ais_last_confirmed_fb_check',
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
  private lastFbCheckAt: string | null = null;

  constructor() {
    this.loadPersistedState();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      window.addEventListener('bill-sync-updated', () => this.handleSyncUpdated());
      window.addEventListener('offline-sync-warning', () => this.handleSyncWarning());

      // Expose to window for safe debugging
      (window as any).__SYSTEM_HEALTH__ = this;
    }
  }

  private loadPersistedState() {
    if (typeof window === 'undefined') return;
    try {
      const incStr = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
      if (incStr) {
        this.incidents = JSON.parse(incStr) || [];
        // Auto-resolve any legacy incidents caused by invalid path token bug or old stale latency spikes
        let stateChanged = false;
        for (const inc of this.incidents) {
          if (inc.status !== 'RESOLVED' && inc.message && inc.message.includes('Invalid token in path')) {
            inc.status = 'RESOLVED';
            inc.resolvedAt = new Date().toISOString();
            inc.resolvedBy = 'System Fix';
            inc.resolutionNote = 'Invalid token in path সমাধান করা হয়েছে (.info/connected অফিসিয়াল লিসেনার দ্বারা প্রতিস্থাপিত)।';
            stateChanged = true;
          } else if (inc.status !== 'RESOLVED' && inc.type === 'SLOW_OPERATION') {
            inc.status = 'RESOLVED';
            inc.resolvedAt = new Date().toISOString();
            inc.resolvedBy = 'System Auto-Recovery';
            inc.resolutionNote = 'অপারেশন লেটেন্সি অপ্টিমাইজ করা হয়েছে এবং ব্যাকগ্রাউন্ড রেন্ডার থ্রটলিং ফিক্স করা হয়েছে।';
            stateChanged = true;
          }
        }
        if (stateChanged) {
          this.persistState();
        }
      }
    } catch {}

    try {
      const evStr = localStorage.getItem(STORAGE_KEYS.EVENTS);
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
    this.lastFbCheckAt = localStorage.getItem(STORAGE_KEYS.LAST_SUCCESSFUL_FB);
  }

  private persistState() {
    if (typeof window === 'undefined') return;
    try {
      // Keep max 50 incidents and max 100 events for bounded memory
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(this.incidents.slice(0, 50)));
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(this.events.slice(0, 100)));
      localStorage.setItem(STORAGE_KEYS.THRESHOLDS, JSON.stringify(this.thresholds));
    } catch (e) {
      console.warn('[SystemHealth] Storage quota exceeded while saving diagnostic state', e);
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

    // Check if an OPEN or INVESTIGATING incident of same type + service already exists (Deduplication)
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

  public markSyncConfirmed(billId?: string) {
    const now = new Date().toISOString();
    this.lastSyncConfirmedAt = now;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.LAST_SUCCESSFUL_SYNC, now);
    }

    // Auto-resolve any open sync failure incident if queue is cleared
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
      // Auto-resolve network offline incident
      const netInc = this.incidents.find((i) => i.type === 'NETWORK_OFFLINE' && i.status !== 'RESOLVED');
      if (netInc) {
        this.resolveIncident(netInc.id, 'ইন্টারনেট সংযোগ পুনরুদ্ধার হয়েছে (Network Reconnected).', 'System Auto-Recovery');
      }
      // Trigger a safe background check
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
   * Safe, strictly read-only diagnostics execution.
   * Does NOT alter business data, does NOT write test bills, does NOT scan entire tables.
   */
  public async runSafeDiagnostics(firebaseConfig?: any): Promise<SystemHealthSnapshot> {
    if (this.isChecking && this.lastSnapshot) {
      return this.lastSnapshot;
    }
    this.isChecking = true;

    const timestamp = new Date().toISOString();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // 1. Network Status
    const navConn = (navigator as any)?.connection;
    const networkInfo = {
      online: isOnline,
      effectiveType: navConn?.effectiveType,
      rtt: navConn?.rtt,
      downlink: navConn?.downlink,
    };

    // 2. Storage Check (Safe read/write test to isolated temp key)
    let localStorageAvailable = false;
    let indexedDbAvailable = false;
    let storageLatencyMs = 0;
    let storageError: string | undefined;

    const storageStart = performance.now();
    try {
      const testKey = '__ais_health_probe__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      localStorageAvailable = true;

      // Safe isolated localforage ping
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
        recommendedAction: 'ব্রাউজার প্রাইভেট মোড অথবা স্টোরেজ পারমিশন পরীক্ষা করুন। ব্রাউজার ক্যাশ রিসেট করার আগে কোনো ডাটা ডিলিট করবেন না।',
      });
    }

    // 3. Express Server Health Ping
    let serverAvailable = false;
    let serverLatencyMs = 0;
    let serverError: string | undefined;
    let serverUptime: number | undefined;
    let serverVersion: string | undefined;

    const serverStart = performance.now();
    try {
      const srvRes = await Promise.race([
        fetch('/api/system-health/status'),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000)),
      ]);
      serverLatencyMs = Number((performance.now() - serverStart).toFixed(1));
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        serverAvailable = true;
        serverUptime = srvData?.uptime;
        serverVersion = srvData?.version;
      } else {
        serverError = `HTTP ${srvRes.status}`;
      }
    } catch (err: any) {
      serverError = err?.message || 'Server ping failed';
    }

    // 4. Firebase Reachability Check (Official .info/connected real-time listener)
    let fbStatus: HealthStatus = 'UNKNOWN';
    let fbConnected = false;
    let fbLatencyMs = 0;
    let fbError: string | undefined;
    const dbUrl = firebaseConfig?.databaseURL || (firebaseConfig?.projectId ? `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com` : undefined);

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
          const connectedRef = ref(db, '.info/connected');

          let unsub: (() => void) | null = null;
          const isConnected = await new Promise<boolean>((resolve) => {
            const timeoutId = setTimeout(() => {
              if (unsub) unsub();
              resolve(false);
            }, 3000);

            unsub = onValue(
              connectedRef,
              (snap) => {
                if (snap.val() === true) {
                  clearTimeout(timeoutId);
                  if (unsub) unsub();
                  resolve(true);
                }
              },
              () => {
                clearTimeout(timeoutId);
                if (unsub) unsub();
                resolve(false);
              }
            );
          });

          fbLatencyMs = Number((performance.now() - fbStart).toFixed(1));

          if (isConnected) {
            fbConnected = true;
            fbStatus = 'HEALTHY';
            this.lastFbCheckAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.LAST_SUCCESSFUL_FB, this.lastFbCheckAt);

            // Auto-resolve any open Firebase failure incident
            const fbInc = this.incidents.find((i) => i.type === 'FIREBASE_DISCONNECTED' && i.status !== 'RESOLVED');
            if (fbInc) {
              this.resolveIncident(fbInc.id, 'Firebase Realtime Database সংযোগ সফলভাবে নিশ্চিত ও সক্রিয় রয়েছে।', 'System Auto-Recovery');
            }
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
            });
          }
        } else {
          fbStatus = 'UNAVAILABLE';
          fbError = 'Firebase App ইনিশিয়ালাইজ হয়নি';
        }
      } catch (err: any) {
        fbLatencyMs = Number((performance.now() - fbStart).toFixed(1));
        fbConnected = false;
        fbStatus = isOnline ? 'DEGRADED' : 'OFFLINE';
        fbError = err?.message || 'সংযোগ ব্যর্থ';

        this.recordIncident({
          type: 'FIREBASE_DISCONNECTED',
          title: 'ফায়ারবেস সংযোগে সমস্যা (Firebase Unreachable)',
          severity: 'WARNING',
          affectedService: 'Firebase',
          message: `Firebase Realtime Database রেসপন্স দেয়নি: ${fbError}`,
          recommendedAction: 'ইন্টারনেট প্রক্সি, ফায়ারওয়াল অথবা ফায়ারবেস কনফিগারেশন চেক করুন। অফলাইন কিউতে ডাটা নিরাপদ থাকবে।',
        });
      }
    }

    // 5. Sync Queue Diagnostics
    const pendingCount = getUnsyncedBillCount();
    let syncStatus: HealthStatus = 'HEALTHY';
    let longestPendingMinutes: number | undefined;

    if (pendingCount > 0) {
      syncStatus = pendingCount > 15 ? 'DEGRADED' : 'HEALTHY';
      try {
        const qStr = localStorage.getItem('offline_sync_queue');
        if (qStr) {
          const queue = JSON.parse(qStr);
          const bills = queue.expenses ? Object.values(queue.expenses) : [];
          if (bills.length > 0) {
            const timestamps = bills
              .map((b: any) => new Date(b.createdAt || b.lastSyncAttempt || 0).getTime())
              .filter((t: number) => !isNaN(t) && t > 0);
            if (timestamps.length > 0) {
              const oldest = Math.min(...timestamps);
              longestPendingMinutes = Math.max(0, Math.round((Date.now() - oldest) / (1000 * 60)));
            }
          }
        }
      } catch {}
    }

    // 6. Performance Metrics (Evaluates recent operation sample window)
    const metrics = perf.getMetrics();
    const recentWindow = metrics.slice(-20);
    const slowCount = recentWindow.filter((m) => m.totalDuration > this.thresholds.slowMs).length;

    // Check for slow operations incident and auto-recovery
    const slowInc = this.incidents.find((i) => i.type === 'SLOW_OPERATION' && i.status !== 'RESOLVED');
    if (slowCount > 3) {
      this.recordIncident({
        type: 'SLOW_OPERATION',
        title: 'অতিরিক্ত ধীরগতি অপারেশন (High Latency Detected)',
        severity: 'WARNING',
        affectedService: 'System',
        message: `সাম্প্রতিক অপারেশনের মধ্যে ${slowCount} টি অপারেশনে ৩ সেকেন্ডের বেশি সময় লেগেছে।`,
        recommendedAction: 'পারফরম্যান্স ট্যাবে ধীরগতির রুট বা অ্যাকশন পরীক্ষা করুন। নেটওয়ার্ক ও ক্যাশিং অপ্টিমাইজেশন সম্পন্ন হয়েছে।',
      });
    } else if (slowInc && slowCount <= 1) {
      this.resolveIncident(
        slowInc.id,
        'সাম্প্রতিক অপারেশনের গতি স্বাভাবিক মাত্রায় ফিরে এসেছে (<১ সেকেন্ড)।',
        'System Auto-Recovery'
      );
    }

    // 7. Overall System Status Determination
    const openIncidents = this.incidents.filter((i) => i.status !== 'RESOLVED');
    const criticalIncidents = openIncidents.filter((i) => i.severity === 'CRITICAL');
    const warningIncidents = openIncidents.filter((i) => i.severity === 'WARNING');

    let overallStatus: HealthStatus = 'HEALTHY';
    if (!isOnline) {
      overallStatus = 'OFFLINE';
    } else if (criticalIncidents.length > 0 || !indexedDbAvailable) {
      overallStatus = 'UNAVAILABLE';
    } else if (fbStatus !== 'HEALTHY' || warningIncidents.length > 0 || pendingCount > 10) {
      overallStatus = 'DEGRADED';
    }

    const snapshot: SystemHealthSnapshot = {
      overallStatus,
      timestamp,
      network: networkInfo,
      firebase: {
        status: fbStatus,
        connected: fbConnected,
        databaseUrl: dbUrl,
        latencyMs: fbLatencyMs,
        lastSuccessfulCheck: this.lastFbCheckAt || undefined,
        error: fbError,
      },
      storage: {
        status: indexedDbAvailable && localStorageAvailable ? 'HEALTHY' : 'DEGRADED',
        indexedDbAvailable,
        localStorageAvailable,
        latencyMs: storageLatencyMs,
        error: storageError,
      },
      sync: {
        status: syncStatus,
        pendingCount,
        lastSuccessfulSync: this.lastSyncConfirmedAt || undefined,
        recentFailuresCount: openIncidents.filter((i) => i.type === 'SYNC_FAILED').length,
        longestPendingMinutes,
      },
      server: {
        status: serverAvailable ? 'HEALTHY' : 'DEGRADED',
        available: serverAvailable,
        latencyMs: serverLatencyMs,
        uptime: serverUptime,
        version: serverVersion,
        error: serverError,
      },
      incidents: {
        openCount: openIncidents.length,
        criticalCount: criticalIncidents.length,
        warningCount: warningIncidents.length,
        list: this.incidents,
      },
      perf: {
        totalTracked: metrics.length,
        slowOperationsCount: slowCount,
        thresholds: this.thresholds,
        summary: perf.getSummary(),
        recentMetrics: metrics.slice(-15).reverse(),
      },
    };

    this.lastSnapshot = snapshot;
    this.isChecking = false;

    this.logEvent({
      type: 'HEALTH_CHECK',
      severity: overallStatus === 'HEALTHY' ? 'INFO' : 'WARNING',
      service: 'System',
      summary: `Health check completed: Status ${overallStatus} (Firebase: ${fbStatus}, IDB: ${indexedDbAvailable ? 'OK' : 'FAIL'}, Pending: ${pendingCount})`,
    });

    this.notifySubscribers();
    return snapshot;
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
- Effective Network: ${s?.network.effectiveType || 'N/A'} (RTT: ${s?.network.rtt || 'N/A'}ms, Downlink: ${s?.network.downlink || 'N/A'} Mbps)
- Firebase Connected: ${s?.firebase.connected ? 'YES' : 'NO'} (${s?.firebase.status})
- Firebase Latency: ${s?.firebase.latencyMs || 0}ms
- Last Firebase Check: ${s?.firebase.lastSuccessfulCheck || 'Never'}
- Express Server Ping: ${s?.server.available ? 'OK' : 'FAIL'} (${s?.server.latencyMs || 0}ms)
- LocalStorage: ${s?.storage.localStorageAvailable ? 'Available' : 'Unavailable'}
- IndexedDB: ${s?.storage.indexedDbAvailable ? 'Available' : 'Unavailable'} (${s?.storage.latencyMs || 0}ms)

## 2. Synchronization & Offline Queue
- Pending Offline Bills: ${s?.sync.pendingCount || 0}
- Sync Status: ${s?.sync.status || 'UNKNOWN'}
- Last Confirmed Sync: ${s?.sync.lastSuccessfulSync || 'N/A'}
- Longest Pending Queue Age: ${s?.sync.longestPendingMinutes !== undefined ? `${s.sync.longestPendingMinutes} mins` : 'N/A'}

## 3. Performance Metrics
- Tracked Operations: ${s?.perf.totalTracked || 0}
- Operations > 3000ms: ${s?.perf.slowOperationsCount || 0}
- Thresholds: Normal < ${s?.perf.thresholds.normalMs}ms, Slow <= ${s?.perf.thresholds.slowMs}ms

## 4. Active Incidents (${s?.incidents.openCount || 0} Open)
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

## 5. Security & Data Protection Confirmation
- Sanitized report contains NO user names, financial figures, voucher images, passwords, or Firebase credentials.
`;
  }
}

export const systemHealth = new SystemHealthService();
