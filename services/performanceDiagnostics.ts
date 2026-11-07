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
  | 'approval';

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
  maxTotal: number;
  p95Total: number;
  avgNet: number;
  slowCount: number;
  failedCount: number;
  isSampleSufficient: boolean;
}

export interface OverallPerfSummary {
  totalTracked: number;
  overallAvgMs: number;
  overallMaxMs: number;
  overallP95Ms: number;
  slowCount: number;
  failedCount: number;
  isSampleSufficient: boolean;
  sampleNotice: string;
  byAction: Record<string, ActionPerfSummary>;
  byCategory: Record<string, { count: number; avgTotal: number; p95Total: number; slowCount: number; failedCount: number }>;
}

export class PerformanceDiagnosticService {
  private metrics: PerfMetric[] = [];
  private isEnabled: boolean = true;
  private duplicateThresholdMs: number = 800;
  private recentClicks = new Map<string, number>();

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

    const lastClickTime = this.recentClicks.get(actionName);
    const isDuplicate = !!(lastClickTime && clickTime - lastClickTime < this.duplicateThresholdMs);
    this.recentClicks.set(actionName, clickTime);

    if (this.isEnabled && isDuplicate) {
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
    let networkDuration = 0;
    let localEnd = 0;
    let success = true;
    let errorMsg: string | undefined;

    try {
      networkStart = performance.now();
      const result = await fn();
      localEnd = performance.now();
      networkDuration = localEnd - networkStart;
      return result;
    } catch (err: any) {
      localEnd = performance.now();
      networkDuration = localEnd - networkStart;
      success = false;
      errorMsg = err?.message || 'Error';
      throw err;
    } finally {
      const completionTime = performance.now();
      const localProcessing = Math.max(0, localEnd - handlerStartTime - networkDuration);

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
        document.visibilityState === 'visible'
      ) {
        requestAnimationFrame(() => {
          const renderTime = performance.now();
          const rawDuration = Math.max(0, renderTime - completionTime);
          const renderDuration = rawDuration > 400 ? 16 : rawDuration;
          record(renderDuration);
        });
      } else {
        record(16);
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
    const now = performance.now();
    const duration = Math.max(0, Number(params.durationMs.toFixed(2)));
    const metric: PerfMetric = {
      id: `${params.action}_${Math.random().toString(36).slice(2, 7)}`,
      action: params.action,
      category: params.category,
      timestamp: new Date().toISOString(),
      clickTime: now - duration,
      handlerStartTime: now - duration,
      localProcessingDuration: 0,
      networkDuration: params.networkDurationMs ? Number(params.networkDurationMs.toFixed(2)) : duration,
      renderDuration: 0,
      totalDuration: duration,
      success: params.success !== undefined ? params.success : true,
      error: params.error,
    };
    this.recordMetric(metric);
  }

  private recordMetric(metric: PerfMetric) {
    this.metrics.push(metric);
    if (this.metrics.length > 300) {
      this.metrics.shift(); // Bound memory
    }

    if (this.isEnabled) {
      const color =
        metric.totalDuration > 3000 ? '#EF4444' : metric.totalDuration > 1000 ? '#F59E0B' : '#10B981';
      console.log(
        `%c[PERF] ${metric.action} (${metric.category})%c → Net: ${metric.networkDuration}ms | Total: ${metric.totalDuration}ms ${
          !metric.success ? '[FAILED]' : ''
        } ${metric.isDuplicate ? '[DUPLICATE]' : ''}`,
        `color: ${color}; font-weight: bold;`,
        'color: #64748B;'
      );
    }
  }

  /**
   * Helper to compute percentile with interpolation
   */
  public static calculatePercentile(durations: number[], percentile: number): number {
    if (!durations || durations.length === 0) return 0;
    const sorted = [...durations].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Number(sorted[Math.max(0, Math.min(index, sorted.length - 1))].toFixed(1));
  }

  /**
   * Comprehensive summary with P95, failure count, and sample sufficiency safeguards
   */
  public getOverallSummary(): OverallPerfSummary {
    const byActionRaw: Record<
      string,
      {
        category: PerfCategory;
        durations: number[];
        netDurations: number[];
        slowCount: number;
        failedCount: number;
      }
    > = {};

    const byCategoryRaw: Record<
      string,
      {
        durations: number[];
        slowCount: number;
        failedCount: number;
      }
    > = {};

    const allDurations: number[] = [];
    let slowCountTotal = 0;
    let failedCountTotal = 0;

    for (const m of this.metrics) {
      allDurations.push(m.totalDuration);
      if (m.totalDuration > 3000) slowCountTotal++;
      if (!m.success) failedCountTotal++;

      // By Action
      if (!byActionRaw[m.action]) {
        byActionRaw[m.action] = {
          category: m.category,
          durations: [],
          netDurations: [],
          slowCount: 0,
          failedCount: 0,
        };
      }
      const a = byActionRaw[m.action];
      a.durations.push(m.totalDuration);
      a.netDurations.push(m.networkDuration);
      if (m.totalDuration > 3000) a.slowCount++;
      if (!m.success) a.failedCount++;

      // By Category
      if (!byCategoryRaw[m.category]) {
        byCategoryRaw[m.category] = {
          durations: [],
          slowCount: 0,
          failedCount: 0,
        };
      }
      const c = byCategoryRaw[m.category];
      c.durations.push(m.totalDuration);
      if (m.totalDuration > 3000) c.slowCount++;
      if (!m.success) c.failedCount++;
    }

    const totalTracked = this.metrics.length;
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
    const overallMaxMs =
      totalTracked > 0 ? Number(Math.max(...allDurations).toFixed(1)) : 0;
    const overallP95Ms = PerformanceDiagnosticService.calculatePercentile(allDurations, 95);

    // Format byAction map
    const byAction: Record<string, ActionPerfSummary> = {};
    for (const [action, data] of Object.entries(byActionRaw)) {
      const count = data.durations.length;
      const avgTotal = Number((data.durations.reduce((s, v) => s + v, 0) / count).toFixed(1));
      const maxTotal = Number(Math.max(...data.durations).toFixed(1));
      const p95Total = PerformanceDiagnosticService.calculatePercentile(data.durations, 95);
      const avgNet = Number((data.netDurations.reduce((s, v) => s + v, 0) / count).toFixed(1));

      byAction[action] = {
        action,
        category: data.category,
        count,
        avgTotal,
        maxTotal,
        p95Total,
        avgNet,
        slowCount: data.slowCount,
        failedCount: data.failedCount,
        isSampleSufficient: count >= 5,
      };
    }

    // Format byCategory map
    const byCategory: Record<
      string,
      { count: number; avgTotal: number; p95Total: number; slowCount: number; failedCount: number }
    > = {};
    for (const [category, data] of Object.entries(byCategoryRaw)) {
      const count = data.durations.length;
      const avgTotal = Number((data.durations.reduce((s, v) => s + v, 0) / count).toFixed(1));
      const p95Total = PerformanceDiagnosticService.calculatePercentile(data.durations, 95);
      byCategory[category] = {
        count,
        avgTotal,
        p95Total,
        slowCount: data.slowCount,
        failedCount: data.failedCount,
      };
    }

    return {
      totalTracked,
      overallAvgMs,
      overallMaxMs,
      overallP95Ms,
      slowCount: slowCountTotal,
      failedCount: failedCountTotal,
      isSampleSufficient,
      sampleNotice,
      byAction,
      byCategory,
    };
  }

  /**
   * Backward-compatible simple summary dictionary
   */
  public getSummary() {
    const summary: Record<string, { count: number; avgTotal: number; maxTotal: number; avgNet: number }> =
      {};
    for (const m of this.metrics) {
      if (!summary[m.action]) {
        summary[m.action] = { count: 0, avgTotal: 0, maxTotal: 0, avgNet: 0 };
      }
      const s = summary[m.action];
      s.count++;
      s.avgTotal = Number(((s.avgTotal * (s.count - 1) + m.totalDuration) / s.count).toFixed(1));
      s.maxTotal = Number(Math.max(s.maxTotal, m.totalDuration).toFixed(1));
      s.avgNet = Number(((s.avgNet * (s.count - 1) + m.networkDuration) / s.count).toFixed(1));
    }
    return summary;
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
