/**
 * Performance Diagnostic Instrumentation for Depend Sourcing System
 * Measures click-to-render latency, local processing, network operations,
 * and UI paint times with microsecond precision using performance.now().
 */

export interface PerfMetric {
  id: string;
  action: string;
  category: 'navigation' | 'bill_submit' | 'approval' | 'staff' | 'ledger' | 'voucher' | 'reports';
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

class PerformanceDiagnosticService {
  private metrics: PerfMetric[] = [];
  private activeActions = new Map<string, number>();
  private isEnabled: boolean = true;
  private duplicateThresholdMs: number = 800;
  private recentClicks = new Map<string, number>();

  constructor() {
    if (typeof window !== 'undefined') {
      // Expose globally for diagnostics in DevTools console
      (window as any).__PERF_DIAGNOSTICS__ = this;
      // Allow enabling/disabling via localStorage
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
  public startClick(actionName: string, category: PerfMetric['category'] = 'navigation'): {
    actionId: string;
    clickTime: number;
    isDuplicate: boolean;
  } {
    const clickTime = performance.now();
    const actionId = `${actionName}_${Math.random().toString(36).slice(2, 7)}`;

    const lastClickTime = this.recentClicks.get(actionName);
    const isDuplicate = !!(lastClickTime && clickTime - lastClickTime < this.duplicateThresholdMs);
    this.recentClicks.set(actionName, clickTime);

    this.activeActions.set(actionId, clickTime);

    if (this.isEnabled && isDuplicate) {
      console.warn(`[PERF WARNING] Accidental double-click detected on "${actionName}" (${(clickTime - (lastClickTime || 0)).toFixed(1)}ms apart)`);
    }

    return { actionId, clickTime, isDuplicate };
  }

  /**
   * Wraps an action handler with complete performance breakdown:
   * Click -> Handler Start -> Local Process -> Network/Firebase -> Paint
   */
  public async measure<T>(
    actionName: string,
    category: PerfMetric['category'],
    fn: () => Promise<T> | T
  ): Promise<T> {
    const { actionId, clickTime, isDuplicate } = this.startClick(actionName, category);
    const handlerStartTime = performance.now();
    const clickToHandlerDelay = handlerStartTime - clickTime;

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

      // Measure time until next browser animation frame (paint)
      requestAnimationFrame(() => {
        const renderTime = performance.now();
        const renderDuration = Math.max(0, renderTime - completionTime);
        const totalDuration = renderTime - clickTime;

        const metric: PerfMetric = {
          id: actionId,
          action: actionName,
          category,
          timestamp: new Date().toISOString(),
          clickTime,
          handlerStartTime,
          localProcessingDuration: Number(localProcessing.toFixed(2)),
          networkDuration: Number(networkDuration.toFixed(2)),
          renderDuration: Number(renderDuration.toFixed(2)),
          totalDuration: Number(totalDuration.toFixed(2)),
          success,
          error: errorMsg,
          isDuplicate,
        };

        this.recordMetric(metric);
      });
    }
  }

  private recordMetric(metric: PerfMetric) {
    this.metrics.push(metric);
    if (this.metrics.length > 200) {
      this.metrics.shift(); // Bound memory
    }

    if (this.isEnabled) {
      const color = metric.totalDuration > 3000 ? '#EF4444' : metric.totalDuration > 800 ? '#F59E0B' : '#10B981';
      console.log(
        `%c[PERF] ${metric.action} (${metric.category})%c → Local: ${metric.localProcessingDuration}ms | Net: ${metric.networkDuration}ms | Paint: ${metric.renderDuration}ms | Total: ${metric.totalDuration}ms ${metric.isDuplicate ? '[DUPLICATE]' : ''}`,
        `color: ${color}; font-weight: bold;`,
        'color: #64748B;'
      );
    }
  }

  public getSummary() {
    const summary: Record<string, { count: number; avgTotal: number; maxTotal: number; avgNet: number }> = {};
    for (const m of this.metrics) {
      if (!summary[m.action]) {
        summary[m.action] = { count: 0, avgTotal: 0, maxTotal: 0, avgNet: 0 };
      }
      const s = summary[m.action];
      s.count++;
      s.avgTotal = (s.avgTotal * (s.count - 1) + m.totalDuration) / s.count;
      s.maxTotal = Math.max(s.maxTotal, m.totalDuration);
      s.avgNet = (s.avgNet * (s.count - 1) + m.networkDuration) / s.count;
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
