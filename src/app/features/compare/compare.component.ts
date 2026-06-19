import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditStore } from '../../core/store/audit.store';
import { CompareStore } from '../../core/store/compare.store';

interface MetricComparison {
  label: string;
  leftValue: string;
  rightValue: string;
  leftScore: number | null;
  rightScore: number | null;
  delta: string;
  winner: 'left' | 'right' | 'tie';
}

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="compare-container">
      <!-- Compare tab bar -->
      <div class="compare-tabs">
        @for (tab of compareStore.tabs(); track tab.id) {
          <div class="ctab" [class.active]="tab.id === compareStore.activeTabId()" (click)="compareStore.setActiveTab(tab.id)">
            <span class="ctab-label">{{ tab.label }}</span>
            <button class="ctab-close" (click)="closeCompareTab($event, tab.id)" aria-label="Close comparison">×</button>
          </div>
        }
        <button class="ctab-new" (click)="compareStore.createTab()" aria-label="New comparison">+</button>
      </div>

      <!-- Active comparison content -->
      @if (compareStore.activeTab()) {
        <div class="compare-view">
          <div class="selector-row">
            <div class="selector">
              <label class="selector-label">Left</label>
              <select class="selector-dropdown" [ngModel]="leftId()" (ngModelChange)="onLeftChange($event)">
                <option [ngValue]="null" disabled>Select audit...</option>
                @for (tab of completedTabs(); track tab.id) {
                  <option [value]="tab.id">{{ tab.url }} ({{ tab.result!.metrics.scores.performance }})</option>
                }
              </select>
            </div>
            <div class="vs-badge">VS</div>
            <div class="selector">
              <label class="selector-label">Right</label>
              <select class="selector-dropdown" [ngModel]="rightId()" (ngModelChange)="onRightChange($event)">
                <option [ngValue]="null" disabled>Select audit...</option>
                @for (tab of completedTabs(); track tab.id) {
                  <option [value]="tab.id">{{ tab.url }} ({{ tab.result!.metrics.scores.performance }})</option>
                }
              </select>
            </div>
          </div>

          @if (canCompare()) {
            <div class="compare-section">
              <h3 class="section-label">Overall Scores</h3>
              <div class="scores-grid">
                @for (score of scoreComparisons(); track score.label) {
                  <div class="score-card">
                    <span class="score-label">{{ score.label }}</span>
                    <div class="score-values">
                      <span class="score-val" [class]="getScoreClass(score.leftScore)">{{ score.leftValue }}</span>
                      <span class="score-delta" [class]="score.winner === 'left' ? 'better-left' : score.winner === 'right' ? 'better-right' : ''">{{ score.delta }}</span>
                      <span class="score-val" [class]="getScoreClass(score.rightScore)">{{ score.rightValue }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="compare-section">
              <h3 class="section-label">Core Web Vitals</h3>
              <table class="compare-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th class="col-left">{{ leftTab()!.hostname }}</th>
                    <th class="col-delta">Delta</th>
                    <th class="col-right">{{ rightTab()!.hostname }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (metric of cwvComparisons(); track metric.label) {
                    <tr>
                      <td class="metric-name">{{ metric.label }}</td>
                      <td class="col-left"><span [class]="getMetricScoreClass(metric.leftScore)">{{ metric.leftValue }}</span></td>
                      <td class="col-delta"><span class="delta-badge" [class]="metric.winner">{{ metric.delta }}</span></td>
                      <td class="col-right"><span [class]="getMetricScoreClass(metric.rightScore)">{{ metric.rightValue }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="compare-section">
              <h3 class="section-label">Resource Weight</h3>
              <table class="compare-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th class="col-left">{{ leftTab()!.hostname }}</th>
                    <th class="col-delta">Delta</th>
                    <th class="col-right">{{ rightTab()!.hostname }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (res of resourceComparisons(); track res.label) {
                    <tr>
                      <td class="metric-name">{{ res.label }}</td>
                      <td class="col-left">{{ res.leftValue }}</td>
                      <td class="col-delta"><span class="delta-badge" [class]="res.winner">{{ res.delta }}</span></td>
                      <td class="col-right">{{ res.rightValue }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (hasDiagnostics()) {
              <div class="compare-section">
                <h3 class="section-label">Diagnostics Summary</h3>
                <table class="compare-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th class="col-left">{{ leftTab()!.hostname }}</th>
                      <th class="col-delta">Delta</th>
                      <th class="col-right">{{ rightTab()!.hostname }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of diagnosticsComparisons(); track d.label) {
                      <tr>
                        <td class="metric-name">{{ d.label }}</td>
                        <td class="col-left">{{ d.leftValue }}</td>
                        <td class="col-delta"><span class="delta-badge" [class]="d.winner">{{ d.delta }}</span></td>
                        <td class="col-right">{{ d.rightValue }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <div class="compare-section">
              <h3 class="section-label">Issue Counts</h3>
              <table class="compare-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th class="col-left">{{ leftTab()!.hostname }}</th>
                    <th class="col-delta">Delta</th>
                    <th class="col-right">{{ rightTab()!.hostname }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (issue of issueComparisons(); track issue.label) {
                    <tr>
                      <td class="metric-name">{{ issue.label }}</td>
                      <td class="col-left">{{ issue.leftValue }}</td>
                      <td class="col-delta"><span class="delta-badge" [class]="issue.winner">{{ issue.delta }}</span></td>
                      <td class="col-right">{{ issue.rightValue }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="compare-empty">
              <p>Select two different completed audits to compare.</p>
            </div>
          }
        </div>
      } @else {
        <div class="compare-empty">
          <p>Create a new comparison tab to get started.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .compare-container { display: flex; flex-direction: column; height: 100%; }
    .compare-tabs { display: flex; align-items: center; gap: 2px; padding: 8px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); overflow-x: auto; flex-shrink: 0; }
    .ctab { display: flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; border: 1px solid transparent; transition: all 0.15s; }
    .ctab:hover { background: var(--border-color); }
    .ctab.active { background: var(--bg-card); border-color: var(--accent); }
    .ctab.active .ctab-label { color: var(--accent); font-weight: 600; }
    .ctab-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
    .ctab-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; border-radius: 3px; }
    .ctab-close:hover { color: var(--score-poor); }
    .ctab-new { background: none; border: 1px dashed var(--border-color); color: var(--text-secondary); cursor: pointer; font-size: 14px; padding: 4px 10px; border-radius: 6px; }
    .ctab-new:hover { background: var(--border-color); color: var(--text-primary); }
    .compare-view { flex: 1; overflow-y: auto; padding: 24px; }
    .selector-row { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .selector { flex: 1; }
    .selector-label { display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
    .selector-dropdown { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 12px; }
    .vs-badge { font-size: 12px; font-weight: 700; color: var(--text-secondary); padding-top: 16px; }
    .compare-section { margin-bottom: 24px; }
    .section-label { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
    .scores-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .score-card { padding: 14px; border-radius: 8px; background: var(--bg-secondary); border: 1px solid var(--border-color); text-align: center; }
    .score-label { font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 8px; }
    .score-values { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .score-val { font-size: 18px; font-weight: 700; }
    .score-val.good { color: var(--score-good); }
    .score-val.average { color: var(--score-average); }
    .score-val.poor { color: var(--score-poor); }
    .score-delta { font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 3px; }
    .score-delta.better-left { background: rgba(12,206,107,0.1); color: var(--score-good); }
    .score-delta.better-right { background: rgba(255,78,66,0.1); color: var(--score-poor); }
    .compare-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .compare-table th { text-align: left; padding: 8px 10px; border-bottom: 2px solid var(--border-color); font-size: 11px; color: var(--text-secondary); font-weight: 500; }
    .compare-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); }
    .col-left, .col-right { text-align: center; width: 20%; }
    .col-delta { text-align: center; width: 15%; }
    .metric-name { font-weight: 500; }
    .delta-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
    .delta-badge.left { background: rgba(12,206,107,0.1); color: var(--score-good); }
    .delta-badge.right { background: rgba(255,78,66,0.1); color: var(--score-poor); }
    .delta-badge.tie { background: var(--bg-secondary); color: var(--text-secondary); }
    .good { color: var(--score-good); }
    .average { color: var(--score-average); }
    .poor { color: var(--score-poor); }
    .compare-empty { display: flex; align-items: center; justify-content: center; flex: 1; padding: 60px; color: var(--text-secondary); font-size: 14px; }
  `]
})
export class CompareComponent {
  private auditStore = inject(AuditStore);
  compareStore = inject(CompareStore);

  completedTabs = computed(() => this.auditStore.tabs().filter(t => t.status === 'complete' && t.result));

  leftId = computed(() => this.compareStore.activeTab()?.leftId || null);
  rightId = computed(() => this.compareStore.activeTab()?.rightId || null);

  leftTab = computed(() => this.completedTabs().find(t => t.id === this.leftId()) || null);
  rightTab = computed(() => this.completedTabs().find(t => t.id === this.rightId()) || null);

  canCompare = computed(() => {
    const l = this.leftTab();
    const r = this.rightTab();
    return l && r && l.id !== r.id;
  });

  constructor() {
    // Auto-create first tab if none exist
    effect(() => {
      if (this.compareStore.tabs().length === 0) {
        this.compareStore.createTab();
      }
    });
  }

  onLeftChange(id: string): void {
    const tab = this.compareStore.activeTab();
    if (!tab) return;
    const rightId = tab.rightId;
    const label = this.buildLabel(id, rightId);
    this.compareStore.updateSelection(tab.id, id, rightId, label);
  }

  onRightChange(id: string): void {
    const tab = this.compareStore.activeTab();
    if (!tab) return;
    const leftId = tab.leftId;
    const label = this.buildLabel(leftId, id);
    this.compareStore.updateSelection(tab.id, leftId, id, label);
  }

  closeCompareTab(e: Event, id: string): void {
    e.stopPropagation();
    this.compareStore.closeTab(id);
  }

  private buildLabel(leftId: string | null, rightId: string | null): string {
    const l = leftId ? this.completedTabs().find(t => t.id === leftId) : null;
    const r = rightId ? this.completedTabs().find(t => t.id === rightId) : null;
    if (l && r) return `${l.hostname} vs ${r.hostname}`;
    if (l) return `${l.hostname} vs ...`;
    if (r) return `... vs ${r.hostname}`;
    return 'New Comparison';
  }

  scoreComparisons = computed((): MetricComparison[] => {
    const l = this.leftTab()?.result?.metrics.scores;
    const r = this.rightTab()?.result?.metrics.scores;
    if (!l || !r) return [];
    return [
      this.compareScore('Performance', l.performance, r.performance),
      this.compareScore('Accessibility', l.accessibility, r.accessibility),
      this.compareScore('Best Practices', l.bestPractices, r.bestPractices),
      this.compareScore('SEO', l.seo, r.seo),
    ];
  });

  cwvComparisons = computed((): MetricComparison[] => {
    const l = this.leftTab()?.result?.metrics.coreWebVitals;
    const r = this.rightTab()?.result?.metrics.coreWebVitals;
    if (!l || !r) return [];
    return [
      this.compareCWV('LCP', l.lcp, r.lcp, 'ms', true),
      this.compareCWV('FCP', l.fcp, r.fcp, 'ms', true),
      this.compareCWV('TBT', l.tbt, r.tbt, 'ms', true),
      this.compareCWV('CLS', l.cls, r.cls, '', true),
      this.compareCWV('Speed Index', l.si, r.si, 'ms', true),
      this.compareCWV('TTFB', l.ttfb, r.ttfb, 'ms', true),
    ];
  });

  resourceComparisons = computed((): MetricComparison[] => {
    const l = this.leftTab()?.result?.metrics.resourceSummary;
    const r = this.rightTab()?.result?.metrics.resourceSummary;
    if (!l || !r) return [];
    const types = new Set([...l.map(x => x.label), ...r.map(x => x.label)]);
    return Array.from(types).map(type => {
      const lItem = l.find(x => x.label === type);
      const rItem = r.find(x => x.label === type);
      const lSize = lItem?.transferSize || 0;
      const rSize = rItem?.transferSize || 0;
      const diff = lSize - rSize;
      return {
        label: type,
        leftValue: this.formatSize(lSize),
        rightValue: this.formatSize(rSize),
        leftScore: null,
        rightScore: null,
        delta: diff === 0 ? '—' : (diff > 0 ? `+${this.formatSize(diff)}` : `-${this.formatSize(Math.abs(diff))}`),
        winner: diff === 0 ? 'tie' as const : diff > 0 ? 'right' as const : 'left' as const,
      };
    });
  });

  hasDiagnostics = computed(() => {
    const ld = this.leftTab()?.result?.diagnostics;
    const rd = this.rightTab()?.result?.diagnostics;
    return !!(ld?.data || ld?.partial) || !!(rd?.data || rd?.partial);
  });

  diagnosticsComparisons = computed((): MetricComparison[] => {
    const ld = this.leftTab()?.result?.diagnostics;
    const rd = this.rightTab()?.result?.diagnostics;
    const leftData = ld?.data || ld?.partial;
    const rightData = rd?.data || rd?.partial;
    const comparisons: MetricComparison[] = [];

    const lLong = leftData?.longTasks?.length || 0;
    const rLong = rightData?.longTasks?.length || 0;
    comparisons.push(this.compareCount('Long Tasks (>50ms)', lLong, rLong));

    const lMax = leftData?.longTasks?.[0]?.duration || 0;
    const rMax = rightData?.longTasks?.[0]?.duration || 0;
    comparisons.push(this.compareMs('Longest Task', lMax, rMax));

    const lShifts = leftData?.layoutShifts?.length || 0;
    const rShifts = rightData?.layoutShifts?.length || 0;
    comparisons.push(this.compareCount('Layout Shifts', lShifts, rShifts));

    const l3p = leftData?.thirdPartyBlocking?.length || 0;
    const r3p = rightData?.thirdPartyBlocking?.length || 0;
    comparisons.push(this.compareCount('Third-Party Requests', l3p, r3p));

    return comparisons;
  });

  issueComparisons = computed((): MetricComparison[] => {
    const l = this.leftTab()?.result;
    const r = this.rightTab()?.result;
    if (!l || !r) return [];
    return [
      this.compareCount('Performance Issues', l.metrics.performanceAudits.filter(a => a.score !== null && a.score < 0.5).length, r.metrics.performanceAudits.filter(a => a.score !== null && a.score < 0.5).length),
      this.compareCount('A11y Violations', l.accessibility.violations.length, r.accessibility.violations.length),
      this.compareCount('Missing Security Headers', l.security.headers.filter(h => !h.present).length, r.security.headers.filter(h => !h.present).length),
    ];
  });

  getScoreClass(score: number | null): string {
    if (score === null) return '';
    if (score >= 90) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  }

  getMetricScoreClass(score: number | null): string {
    if (score === null) return '';
    if (score >= 0.9) return 'good';
    if (score >= 0.5) return 'average';
    return 'poor';
  }

  private compareScore(label: string, left: number, right: number): MetricComparison {
    const diff = left - right;
    return {
      label,
      leftValue: `${left}`,
      rightValue: `${right}`,
      leftScore: left,
      rightScore: right,
      delta: diff === 0 ? '—' : (diff > 0 ? `+${diff}` : `${diff}`),
      winner: diff === 0 ? 'tie' : diff > 0 ? 'left' : 'right',
    };
  }

  private compareCWV(label: string, left: { value: number | null; display: string | null; score: number | null }, right: { value: number | null; display: string | null; score: number | null }, unit: string, lowerIsBetter: boolean): MetricComparison {
    const lv = left.value || 0;
    const rv = right.value || 0;
    const diff = lv - rv;
    const better = diff === 0 ? 'tie' as const : (lowerIsBetter ? (diff < 0 ? 'left' as const : 'right' as const) : (diff > 0 ? 'left' as const : 'right' as const));
    return {
      label,
      leftValue: left.display || '—',
      rightValue: right.display || '—',
      leftScore: left.score,
      rightScore: right.score,
      delta: diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${unit === 'ms' ? this.formatMs(diff) : diff.toFixed(3)}`,
      winner: better,
    };
  }

  private compareCount(label: string, left: number, right: number): MetricComparison {
    const diff = left - right;
    return {
      label,
      leftValue: `${left}`,
      rightValue: `${right}`,
      leftScore: null,
      rightScore: null,
      delta: diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${diff}`,
      winner: diff === 0 ? 'tie' : diff < 0 ? 'left' : 'right',
    };
  }

  private compareMs(label: string, left: number, right: number): MetricComparison {
    const diff = left - right;
    return {
      label,
      leftValue: left ? `${left}ms` : '—',
      rightValue: right ? `${right}ms` : '—',
      leftScore: null,
      rightScore: null,
      delta: diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${this.formatMs(diff)}`,
      winner: diff === 0 ? 'tie' : diff < 0 ? 'left' : 'right',
    };
  }

  private formatMs(ms: number): string {
    const abs = Math.abs(ms);
    if (abs < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}
