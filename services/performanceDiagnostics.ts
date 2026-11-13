/**
 * Performance Diagnostic Instrumentation for Depend Sourcing System
 * Measures click-to-render latency, local processing, network operations,
 * and UI paint times with microsecond precision using performance.now().
 * Computes Avg, Max, P95, failure rates, and sample sufficiency.
 */

export type PerfCategory =
  | 'dashboard'
  | 'staff'
  | 'bills'
  | 'ledger'
  | 'attendance'
  | 'catalog'
  | 'voucher'
  | 'data_save'
  | 'firebase_io'
  | 'api'
  | 'navigation'
  | 'reports'
  | 'bill_submit'
  | 'bill_retry_submit'
  | 'approval'
  | 'auth'
  | 'sync';

export interface PerfMetric {
  id: string;
  action: string;
  category: PerfCategory;
  timestamp: string;
  clickTime: number;
  handlerStartTime: number;
  localProcessingDuration: number;
  networkDuration: number;
  renderDuration: number;
  totalDuration: number;
  success: boolean;
  error?: string;
  isDuplicate?: boolean;
}

export interface ActionPerfSummary {
  action: string;
  category: PerfCategory;
  count: number;
  avgTotal: number;
  minTotal: number;
  maxTotal: number;
  p50Total: number;
  p95Total: number;
  p99Total: number | null;
  avgNet: number;
  successCount: number;
  slowCount: number;
  failedCount: number;
  lastDurationMs: number;
  lastExecutedAt: string;
  isSampleSufficient: boolean;
  sampleStatus: 'SUFFICIENT' | 'LIMITED_SAMPLE';
}

export interface SlowOperationRecord {
  action: string;
  category: PerfCategory;
  thresholdMs: number;
  occurrences: number;
  maxDurationMs: number;
  lastSlowDurationMs: number;
  lastOccurrenceAt: string;
}

export interface CanonicalOperationReport {
  operation:
    | 'Login'
    | 'Bill Save'
    | 'Voucher Save'
    | 'Firebase Read'
    | 'Firebase Write'
    | 'Authentication'
    | 'API Request'
    | 'Data Synchronization'
    | 'Offline Queue Processing';
  matchedActions: string[];
  samples: number;
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  successCount: number;
  failedCount: number;
  slowCount: number;
  lastDurationMs: number | null;
  lastExecutedAt: string | null;
  status: 'NOT_TRACKED' | 'LIMITED_SAMPLE' | 'HEALTHY' | 'MODERATE' | 'SLOW';
}

export interface DiagnosticThresholds {
  normalMs: number;
  slowMs: number;
}

export interface OverallPerfSummary {
  totalTracked: number;
  overallAvgMs: number;
  overallMinMs: number;
  overallMaxMs: number;
  overallP50Ms: number;
  overallP95Ms: number;
  overallP99Ms: number | null;
  successCount: number;
  slowCount: number;
  failedCount: number;
  isSampleSufficient: boolean;
  sampleNotice: string;
  thresholds: DiagnosticThresholds;
  byAction: Record<string, ActionPerfSummary>;
  byCategory: Record<
    string,
    { count: number; avgTotal: number; minTotal: number; maxTotal: number; p95Total: number; slowCount: number; failedCount: number }
  >;
  slowOperations: SlowOperationRecord[];
  canonicalOperations: CanonicalOperationReport[];
}

export class PerformanceDiagnosticService {
  private metrics: PerfMetric[] = [];
  private isEnabled: boolean = true;
  private duplicateThresholdMs: number = 800;
  private recentClicks = new Map<string, number>();
  private thresholds: DiagnosticThresholds = { normalMs: 1000, slowMs: 3000 };

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__PERF_DIAGNOSTICS__ = this;
      const stored = localStorage.getItem('app_perf_diag');
      this.isEnabled = stored !== 'false';
    }
  }

  public setEnabled(val: boolean) {
    this.isEnabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_perf_diag', String(val));
    }
  }

  public setThresholds(t: Partial<DiagnosticThresholds>) {
    this.thresholds = {
      ...this.thresholds,
      ...t,
    };
  }

  public getThresholds(): DiagnosticThresholds {
    return { ...this.thresholds };
  }

  /**
   * Starts timing a button click or interaction.
   * Detects duplicate accidental clicks within threshold.
   */
  public startClick(actionName: string, category: PerfCategory = 'navigation'): {
    actionId: string;
    clickTime: number;
    isDuplicate: boolean;
  } {
    const clickTime = performance.now();
    const actionId = `${actionName}_${Math.random().toString(36).slice(2, 7)}`;

    if (!this.isEnabled) {
      return { actionId, clickTime, isDuplicate: false };
    }

    const lastClickTime = this.recentClicks.get(actionName);
    const isDuplicate = !!(lastClickTime && clickTime - lastClickTime < this.duplicateThresholdMs);
    this.recentClicks.set(actionName, clickTime);

    if (isDuplicate) {
      console.warn(
        `[PERF WARNING] Accidental double-click detected on "${actionName}" (${(
          clickTime - (lastClickTime || 0)
        ).toFixed(1)}ms apart)`
      );
    }

    return { actionId, clickTime, isDuplicate };
  }

  /**
   * Wraps an action handler with complete performance breakdown:
   * Click -> Handler Start -> Local Process -> Network/Firebase -> Paint
   */
  public async measure<T>(
    actionName: string,
    category: PerfCategory,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const { actionId, clickTime, isDuplicate } = this.startClick(actionName, category);
    const handlerStartTime = performance.now();

    let networkStart = 0;
    let localEnd = 0;
    let success = true;
    let errorMsg: string | undefined;

    try {
      networkStart = performance.now();
      const result = await fn();
      localEnd = performance.now();
      return result;
    } catch (err: any) {
      localEnd = performance.now();
      success = false;
      errorMsg = err?.message || 'Error';
      throw err;
    } finally {
      const completionTime = performance.now();
      const isNetworkCategory =
        category === 'firebase_io' ||
        category === 'api' ||
        category === 'bill_submit' ||
        category === 'bill_retry_submit' ||
        category === 'data_save' ||
        category === 'sync';

      const executionDuration = Math.max(0, localEnd - networkStart);
      const networkDuration = isNetworkCategory ? executionDuration : 0;
      const localProcessing = isNetworkCategory
        ? Math.max(0, networkStart - handlerStartTime)
        : Math.max(0, localEnd - handlerStartTime);

      const record = (renderDurationMs: number) => {
        const totalDuration = Math.max(0, completionTime - clickTime + renderDurationMs);

        const metric: PerfMetric = {
          id: actionId,
          action: actionName,
          category,
          timestamp: new Date().toISOString(),
          clickTime,
          handlerStartTime,
          localProcessingDuration: Number(localProcessing.toFixed(2)),
          networkDuration: Number(networkDuration.toFixed(2)),
          renderDuration: Number(renderDurationMs.toFixed(2)),
          totalDuration: Number(totalDuration.toFixed(2)),
          success,
          error: errorMsg,
          isDuplicate,
        };

        this.recordMetric(metric);
      };

      if (
        typeof window !== 'undefined' &&
        typeof requestAnimationFrame === 'function' &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        requestAnimationFrame(() => {
          const renderTime = performance.now();
          const rawDuration = Math.max(0, renderTime - completionTime);
          const renderDuration = rawDuration > 400 ? 0 : rawDuration;
          record(renderDuration);
        });
      } else {
        record(0);
      }
    }
  }

  /**
   * Records a standalone metric directly (e.g. for background data loads, query timings)
   */
  public recordDirectMetric(params: {
    action: string;
    category: PerfCategory;
    durationMs: number;
    success?: boolean;
    error?: string;
    networkDurationMs?: number;
  }) {
    if (!this.isEnabled) {
      return;
    }
    const rawDuration = Number(params.durationMs);
    if (!Number.isFinite(rawDuration) || rawDuration < 0) {
      return;
    }
    const now = performance.now();
    const duration = Number(rawDuration.toFixed(2));
    const isNetworkCategory =
      params.category === 'firebase_io' ||
      params.category === 'api' ||
      params.category === 'bill_submit' ||
      params.category === 'bill_retry_submit' ||
      params.category === 'data_save' ||
      params.category === 'sync';

    const resolvedNet =
      params.networkDurationMs !== undefined && Number.isFinite(params.networkDurationMs)
        ? Math.max(0, Number(params.networkDurationMs.toFixed(2)))
        : isNetworkCategory
        ? duration
        : 0;

    const metric: PerfMetric = {
      id: `${params.action}_${Math.random().toString(36).slice(2, 7)}`,
      action: params.action,
      category: params.category,
      timestamp: new Date().toISOString(),
      clickTime: Math.max(0, now - duration),
      handlerStartTime: Math.max(0, now - duration),
      localProcessingDuration: isNetworkCategory ? 0 : duration,
      networkDuration: resolvedNet,
      renderDuration: 0,
      totalDuration: duration,
      success: params.success !== undefined ? params.success : true,
      error: params.error,
    };
    this.recordMetric(metric);
  }

  private recordMetric(metric: PerfMetric) {
    if (!this.isEnabled) {
      return;
    }

    this.metrics.push(metric);
    if (this.metrics.length > 300) {
      this.metrics.shift(); // Bound memory
    }

    const color =
      metric.totalDuration > this.thresholds.slowMs
        ? '#EF4444'
        : metric.totalDuration > this.thresholds.normalMs
        ? '#F59E0B'
        : '#10B981';
    console.log(
      `%c[PERF] ${metric.action} (${metric.category})%c → Net: ${metric.networkDuration}ms | Total: ${metric.totalDuration}ms ${
        !metric.success ? '[FAILED]' : ''
      } ${metric.isDuplicate ? '[DUPLICATE]' : ''}`,
      `color: ${color}; font-weight: bold;`,
      'color: #64748B;'
    );
  }

  /**
   * Computes empirical percentile (nearest-rank method) over valid finite non-negative durations.
   */
  public static calculatePercentile(durations: number[], percentile: number): number {
    if (!durations || durations.length === 0) return 0;
    const valid = durations.filter((d) => typeof d === 'number' && Number.isFinite(d) && d >= 0);
    if (valid.length === 0) return 0;
    const clampedP = Math.max(0, Math.min(100, percentile));
    if (clampedP === 0) return Number(Math.min(...valid).toFixed(1));
    const sorted = [...valid].sort((a, b) => a - b);
    const index = Math.ceil((clampedP / 100) * sorted.length) - 1;
    return Number(sorted[Math.max(0, Math.min(index, sorted.length - 1))].toFixed(1));
  }

  private computeGroupStats(items: PerfMetric[]) {
    const durations = items.map((m) => m.totalDuration);
    const netDurations = items.map((m) => m.networkDuration);
    const count = items.length;
    const avgTotal = Number((durations.reduce((s, v) => s + v, 0) / count).toFixed(1));
    const minTotal = Number(Math.min(...durations).toFixed(1));
    const maxTotal = Number(Math.max(...durations).toFixed(1));
    const p50Total = PerformanceDiagnosticService.calculatePercentile(durations, 50);
    const p95Total = PerformanceDiagnosticService.calculatePercentile(durations, 95);
    const p99Total = count >= 20 ? PerformanceDiagnosticService.calculatePercentile(durations, 99) : null;
    const avgNet = Number((netDurations.reduce((s, v) => s + v, 0) / count).toFixed(1));
    const slowCount = items.filter((m) => m.totalDuration > this.thresholds.slowMs).length;
    const failedCount = items.filter((m) => !m.success).length;
    const successCount = count - failedCount;
    const last = items[items.length - 1];
    return {
      count,
      avgTotal,
      minTotal,
      maxTotal,
      p50Total,
      p95Total,
      p99Total,
      avgNet,
      successCount,
      slowCount,
      failedCount,
      lastDurationMs: Number(last.totalDuration.toFixed(1)),
      lastExecutedAt: last.timestamp,
      isSampleSufficient: count >= 5,
    };
  }

  private buildCanonicalOperations(metricsList: PerfMetric[]): CanonicalOperationReport[] {
    const definitions: Array<{
      operation: CanonicalOperationReport['operation'];
      match: (m: PerfMetric) => boolean;
    }> = [
      {
        operation: 'Login',
        match: (m) => m.action.toLowerCase() === 'login' || (m.category === 'auth' && m.action.toLowerCase().includes('login')),
      },
      {
        operation: 'Bill Save',
        match: (m) =>
          m.action === 'Bill submission/save' ||
          m.action.toLowerCase().includes('bill save') ||
          m.action.toLowerCase().includes('bill submission'),
      },
      {
        operation: 'Voucher Save',
        match: (m) =>
          m.action.toLowerCase().includes('voucher save') ||
          m.action.toLowerCase().includes('voucher print') ||
          m.action.toLowerCase().includes('voucher download'),
      },
      {
        operation: 'Firebase Read',
        match: (m) =>
          m.action === 'Staff profile loading' ||
          m.action.toLowerCase().includes('firebase read'),
      },
      {
        operation: 'Firebase Write',
        match: (m) =>
          m.action === 'Firebase writes' ||
          m.action.toLowerCase().includes('firebase write'),
      },
      {
        operation: 'Authentication',
        match: (m) =>
          m.action.toLowerCase() === 'authentication' ||
          (m.category === 'auth' && !m.action.toLowerCase().includes('login')),
      },
      {
        operation: 'API Request',
        match: (m) => m.category === 'api',
      },
      {
        operation: 'Data Synchronization',
        match: (m) =>
          m.action.startsWith('Firebase RTDB Sync:') ||
          m.category === 'sync' ||
          m.action.toLowerCase().includes('data synchronization'),
      },
      {
        operation: 'Offline Queue Processing',
        match: (m) =>
          m.category === 'bill_retry_submit' ||
          m.action.toLowerCase().includes('offline queue'),
      },
    ];

    return definitions.map((def) => {
      const matched = metricsList.filter(def.match);
      if (matched.length === 0) {
        return {
          operation: def.operation,
          matchedActions: [],
          samples: 0,
          avgMs: null,
          minMs: null,
          maxMs: null,
          p50Ms: null,
          p95Ms: null,
          p99Ms: null,
          successCount: 0,
          failedCount: 0,
          slowCount: 0,
          lastDurationMs: null,
          lastExecutedAt: null,
          status: 'NOT_TRACKED',
        };
      }

      const stats = this.computeGroupStats(matched);
      const matchedActions = Array.from(new Set(matched.map((m) => m.action)));
      let status: CanonicalOperationReport['status'] = 'HEALTHY';
      if (stats.slowCount > 0 || stats.avgTotal > this.thresholds.slowMs) {
        status = 'SLOW';
      } else if (!stats.isSampleSufficient) {
        status = 'LIMITED_SAMPLE';
      } else if (stats.avgTotal > this.thresholds.normalMs) {
        status = 'MODERATE';
      }

      return {
        operation: def.operation,
        matchedActions,
        samples: stats.count,
        avgMs: stats.avgTotal,
        minMs: stats.minTotal,
        maxMs: stats.maxTotal,
        p50Ms: stats.p50Total,
        p95Ms: stats.p95Total,
        p99Ms: stats.p99Total,
        successCount: stats.successCount,
        failedCount: stats.failedCount,
        slowCount: stats.slowCount,
        lastDurationMs: stats.lastDurationMs,
        lastExecutedAt: stats.lastExecutedAt,
        status,
      };
    });
  }

  /**
   * Comprehensive summary with Min/Avg/Max/P50/P95/P99, slow-operation detection,
   * failure counts, canonical operation breakdown, and sample sufficiency safeguards.
   */
  public getOverallSummary(): OverallPerfSummary {
    const byActionItems: Record<string, PerfMetric[]> = {};
    const byCategoryItems: Record<string, PerfMetric[]> = {};
    const slowByAction: Record<string, PerfMetric[]> = {};

    const allDurations: number[] = [];
    let slowCountTotal = 0;
    let failedCountTotal = 0;

    for (const m of this.metrics) {
      allDurations.push(m.totalDuration);
      const isSlow = m.totalDuration > this.thresholds.slowMs;
      if (isSlow) {
        slowCountTotal++;
        if (!slowByAction[m.action]) slowByAction[m.action] = [];
        slowByAction[m.action].push(m);
      }
      if (!m.success) failedCountTotal++;

      if (!byActionItems[m.action]) byActionItems[m.action] = [];
      byActionItems[m.action].push(m);

      if (!byCategoryItems[m.category]) byCategoryItems[m.category] = [];
      byCategoryItems[m.category].push(m);
    }

    const totalTracked = this.metrics.length;
    const successCountTotal = totalTracked - failedCountTotal;
    const isSampleSufficient = totalTracked >= 10;
    const sampleNotice =
      totalTracked === 0
        ? 'কোনো অপারেশন রেকর্ড করা হয়নি (No operations tracked yet)'
        : totalTracked < 10
        ? `নমুনা সংখ্যা সীমিত (${totalTracked} টি স্যাম্পল) — নিশ্চিত সিদ্ধান্তের জন্য কমপক্ষে ১০টি স্যাম্পল প্রয়োজন`
        : `পর্যাপ্ত স্যাম্পল (${totalTracked} টি অপারেশন মনিটর করা হয়েছে)`;

    const overallAvgMs =
      totalTracked > 0
        ? Number((allDurations.reduce((sum, d) => sum + d, 0) / totalTracked).toFixed(1))
        : 0;
    const overallMinMs = totalTracked > 0 ? Number(Math.min(...allDurations).toFixed(1)) : 0;
    const overallMaxMs = totalTracked > 0 ? Number(Math.max(...allDurations).toFixed(1)) : 0;
    const overallP50Ms = PerformanceDiagnosticService.calculatePercentile(allDurations, 50);
    const overallP95Ms = PerformanceDiagnosticService.calculatePercentile(allDurations, 95);
    const overallP99Ms =
      totalTracked >= 20 ? PerformanceDiagnosticService.calculatePercentile(allDurations, 99) : null;

    // Format byAction map
    const byAction: Record<string, ActionPerfSummary> = {};
    for (const [action, items] of Object.entries(byActionItems)) {
      const stats = this.computeGroupStats(items);
      byAction[action] = {
        action,
        category: items[0].category,
        ...stats,
        sampleStatus: stats.isSampleSufficient ? 'SUFFICIENT' : 'LIMITED_SAMPLE',
      };
    }

    // Format byCategory map
    const byCategory: Record<
      string,
      { count: number; avgTotal: number; minTotal: number; maxTotal: number; p95Total: number; slowCount: number; failedCount: number }
    > = {};
    for (const [category, items] of Object.entries(byCategoryItems)) {
      const stats = this.computeGroupStats(items);
      byCategory[category] = {
        count: stats.count,
        avgTotal: stats.avgTotal,
        minTotal: stats.minTotal,
        maxTotal: stats.maxTotal,
        p95Total: stats.p95Total,
        slowCount: stats.slowCount,
        failedCount: stats.failedCount,
      };
    }

    // Slow operation detection
    const slowOperations: SlowOperationRecord[] = Object.entries(slowByAction)
      .map(([action, items]) => {
        const lastSlow = items[items.length - 1];
        const maxDurationMs = Number(Math.max(...items.map((i) => i.totalDuration)).toFixed(1));
        return {
          action,
          category: items[0].category,
          thresholdMs: this.thresholds.slowMs,
          occurrences: items.length,
          maxDurationMs,
          lastSlowDurationMs: Number(lastSlow.totalDuration.toFixed(1)),
          lastOccurrenceAt: lastSlow.timestamp,
        };
      })
      .sort((a, b) => b.occurrences - a.occurrences || b.maxDurationMs - a.maxDurationMs);

    const canonicalOperations = this.buildCanonicalOperations(this.metrics);

    return {
      totalTracked,
      overallAvgMs,
      overallMinMs,
      overallMaxMs,
      overallP50Ms,
      overallP95Ms,
      overallP99Ms,
      successCount: successCountTotal,
      slowCount: slowCountTotal,
      failedCount: failedCountTotal,
      isSampleSufficient,
      sampleNotice,
      thresholds: { ...this.thresholds },
      byAction,
      byCategory,
      slowOperations,
      canonicalOperations,
    };
  }

  /**
   * Summary dictionary enriched with full per-operation metrics while preserving existing fields.
   */
  public getSummary(): Record<string, ActionPerfSummary> {
    return this.getOverallSummary().byAction;
  }

  public getMetrics(): PerfMetric[] {
    return [...this.metrics];
  }

  public clear() {
    this.metrics = [];
    this.recentClicks.clear();
  }
}

export const perf = new PerformanceDiagnosticService();
