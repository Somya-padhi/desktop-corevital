import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditStore } from '../../core/store/audit.store';
import { ElectronService } from '../../core/services/electron.service';
import { RecommendationService, Recommendation } from '../../core/services/recommendation.service';
import { ScoreGaugeComponent } from '../../shared/score-gauge/score-gauge.component';
import { MetricCardComponent } from '../../shared/metric-card/metric-card.component';
import { ResourceAnalysisComponent } from '../resource-analysis/resource-analysis.component';
import { PerformanceAnalysisComponent } from '../performance-analysis/performance-analysis.component';
import { AccessibilityAnalysisComponent } from '../accessibility-analysis/accessibility-analysis.component';
import { SeoAnalysisComponent } from '../seo-analysis/seo-analysis.component';
import { SecurityAnalysisComponent } from '../security-analysis/security-analysis.component';
import { QualityAnalysisComponent } from '../quality-analysis/quality-analysis.component';
import { RecommendationsComponent } from '../recommendations/recommendations.component';

type Section = 'summary' | 'resources' | 'performance' | 'accessibility' | 'seo' | 'security' | 'quality' | 'recommendations';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ScoreGaugeComponent, MetricCardComponent,
    ResourceAnalysisComponent, PerformanceAnalysisComponent, AccessibilityAnalysisComponent,
    SeoAnalysisComponent, SecurityAnalysisComponent, QualityAnalysisComponent, RecommendationsComponent
  ],
  template: `
    <div class="dashboard">
      <nav class="dash-nav">
        @for (item of navItems; track item.id) {
          <button class="nav-item" [class.active]="activeSection() === item.id" (click)="activeSection.set(item.id)">
            {{ item.label }}
          </button>
        }
        <div class="nav-spacer"></div>
        <button class="btn-retry" (click)="retryAudit()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Re-run
        </button>
        <button class="btn-primary export-btn" (click)="exportPDF()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export PDF
        </button>
      </nav>

      <div class="dash-content">
        @switch (activeSection()) {
          @case ('summary') {
            <section class="summary-section">
              <div class="scores-row">
                <app-score-gauge [value]="result()!.metrics.scores.performance" label="Performance" />
                <app-score-gauge [value]="result()!.metrics.scores.accessibility" label="Accessibility" />
                <app-score-gauge [value]="result()!.metrics.scores.bestPractices" label="Best Practices" />
                <app-score-gauge [value]="result()!.metrics.scores.seo" label="SEO" />
              </div>

              <div class="audit-meta">
                <span>{{ result()!.url }}</span>
                <span>{{ result()!.device | titlecase }}</span>
                <span>{{ result()!.throttling }} throttling</span>
                <span>Lighthouse {{ result()!.lighthouseVersion }}</span>
                <span>{{ result()!.timestamp | date:'medium' }}</span>
              </div>

              <div class="counts-row">
                <div class="count-card issues">
                  <span class="count-num">{{ issueCount() }}</span>
                  <span class="count-label">Issues</span>
                </div>
                <div class="count-card improvements">
                  <span class="count-num">{{ improvementCount() }}</span>
                  <span class="count-label">Improvements</span>
                </div>
                <div class="count-card passed">
                  <span class="count-num">{{ passedCount() }}</span>
                  <span class="count-label">Passed</span>
                </div>
              </div>

              <h3 class="section-title">Core Web Vitals</h3>
              <div class="metrics-grid">
                <app-metric-card label="LCP" [displayValue]="cwv().lcp.display" [score]="cwv().lcp.score" [value]="cwv().lcp.value" [thresholds]="[2500, 4000]" unit="ms" />
                <app-metric-card label="FCP" [displayValue]="cwv().fcp.display" [score]="cwv().fcp.score" [value]="cwv().fcp.value" [thresholds]="[1800, 3000]" unit="ms" />
                <app-metric-card label="TBT" [displayValue]="cwv().tbt.display" [score]="cwv().tbt.score" [value]="cwv().tbt.value" [thresholds]="[200, 600]" unit="ms" />
                <app-metric-card label="CLS" [displayValue]="cwv().cls.display" [score]="cwv().cls.score" [value]="cwv().cls.value" [thresholds]="[0.1, 0.25]" unit="" />
                <app-metric-card label="Speed Index" [displayValue]="cwv().si.display" [score]="cwv().si.score" [value]="cwv().si.value" [thresholds]="[3400, 5800]" unit="ms" />
                <app-metric-card label="TTFB" [displayValue]="cwv().ttfb.display" [score]="cwv().ttfb.score" [value]="cwv().ttfb.value" [thresholds]="[800, 1800]" unit="ms" />
              </div>

              @if (issues().length > 0) {
                <h3 class="section-title summary-list-title issues-title">Issues ({{ issues().length }})</h3>
                <div class="summary-list">
                  @for (item of issues(); track $index) {
                    <div class="summary-list-item issues-item">
                      <span class="summary-item-badge critical">{{ item.severity }}</span>
                      <div class="summary-item-content">
                        <span class="summary-item-title">{{ item.title }}</span>
                        <span class="summary-item-fix">{{ item.fix }}</span>
                      </div>
                      <span class="summary-item-category">{{ item.category }}</span>
                    </div>
                  }
                </div>
              }

              @if (improvements().length > 0) {
                <h3 class="section-title summary-list-title improvements-title">Improvements ({{ improvements().length }})</h3>
                <div class="summary-list">
                  @for (item of improvements(); track $index) {
                    <div class="summary-list-item improvements-item">
                      <span class="summary-item-badge moderate">{{ item.severity }}</span>
                      <div class="summary-item-content">
                        <span class="summary-item-title">{{ item.title }}</span>
                        <span class="summary-item-fix">{{ item.fix }}</span>
                      </div>
                      <span class="summary-item-category">{{ item.category }}</span>
                    </div>
                  }
                </div>
              }
            </section>
          }
          @case ('resources') { <app-resource-analysis [resources]="result()!.metrics.resourceSummary" /> }
          @case ('performance') { <app-performance-analysis [audits]="result()!.metrics.performanceAudits" /> }
          @case ('accessibility') { <app-accessibility-analysis [data]="result()!.accessibility" /> }
          @case ('seo') { <app-seo-analysis [audits]="result()!.metrics.seoAudits" /> }
          @case ('security') { <app-security-analysis [data]="result()!.security" /> }
          @case ('quality') { <app-quality-analysis [audits]="result()!.metrics.bestPracticesAudits" /> }
          @case ('recommendations') { <app-recommendations [recommendations]="recommendations()" /> }
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; gap: 0; height: 100%; }
    .dash-nav { display: flex; align-items: center; gap: 4px; padding: 8px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 20px; overflow-x: auto; flex-shrink: 0; }
    .nav-item { background: none; border: none; padding: 8px 14px; font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; border-radius: 6px; white-space: nowrap; transition: all 0.15s; }
    .nav-item:hover { background: var(--border-color); color: var(--text-primary); }
    .nav-item.active { background: var(--accent); color: white; }
    .nav-spacer { flex: 1; }
    .btn-retry { font-size: 12px; padding: 6px 14px; display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--border-color); color: var(--text-secondary); border-radius: 6px; cursor: pointer; margin-right: 8px; transition: all 0.15s; }
    .btn-retry:hover { border-color: var(--accent); color: var(--accent); }
    .export-btn { font-size: 12px; padding: 6px 14px; display: flex; align-items: center; gap: 6px; }
    .dash-content { flex: 1; overflow-y: auto; }
    .scores-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; max-width: 600px; margin-left: auto; margin-right: auto; }
    .audit-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--text-secondary); padding: 12px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 20px; }
    .counts-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
    .count-card { padding: 16px; border-radius: 10px; text-align: center; }
    .count-card.issues { background: rgba(255,78,66,0.08); border: 1px solid rgba(255,78,66,0.2); }
    .count-card.improvements { background: rgba(255,164,0,0.08); border: 1px solid rgba(255,164,0,0.2); }
    .count-card.passed { background: rgba(12,206,107,0.08); border: 1px solid rgba(12,206,107,0.2); }
    .count-num { font-size: 28px; font-weight: 700; display: block; }
    .count-card.issues .count-num { color: var(--score-poor); }
    .count-card.improvements .count-num { color: var(--score-average); }
    .count-card.passed .count-num { color: var(--score-good); }
    .count-label { font-size: 11px; color: var(--text-secondary); }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .summary-list-title { margin-top: 28px; }
    .issues-title { color: var(--score-poor); }
    .improvements-title { color: var(--score-average); }
    .summary-list { display: flex; flex-direction: column; gap: 6px; }
    .summary-list-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; background: var(--bg-secondary); border: 1px solid var(--border-color); }
    .summary-list-item.issues-item { border-left: 3px solid var(--score-poor); }
    .summary-list-item.improvements-item { border-left: 3px solid var(--score-average); }
    .summary-item-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; white-space: nowrap; margin-top: 2px; }
    .summary-item-badge.critical { background: rgba(255,78,66,0.12); color: var(--score-poor); }
    .summary-item-badge.moderate { background: rgba(255,164,0,0.12); color: var(--score-average); }
    .summary-item-content { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .summary-item-title { font-size: 12px; font-weight: 500; }
    .summary-item-fix { font-size: 11px; color: var(--text-secondary); }
    .summary-item-category { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
  `]
})
export class DashboardComponent {
  private store = inject(AuditStore);
  private electron = inject(ElectronService);
  private recService = inject(RecommendationService);

  activeSection = signal<Section>('summary');

  result = computed(() => this.store.activeTab()?.result);
  cwv = computed(() => this.result()!.metrics.coreWebVitals);

  recommendations = computed(() => {
    const r = this.result();
    return r ? this.recService.generate(r) : [];
  });

  issueCount = computed(() => {
    const r = this.result();
    if (!r) return 0;
    return r.metrics.performanceAudits.filter(a => a.score !== null && a.score < 0.5).length
      + r.accessibility.violations.length
      + r.security.headers.filter(h => !h.present && h.risk === 'high').length;
  });

  improvementCount = computed(() => {
    const r = this.result();
    if (!r) return 0;
    return r.metrics.performanceAudits.filter(a => a.score !== null && a.score >= 0.5 && a.score < 0.9).length;
  });

  passedCount = computed(() => {
    const r = this.result();
    if (!r) return 0;
    return r.metrics.performanceAudits.filter(a => a.score === null || a.score >= 0.9).length
      + r.accessibility.passes.length;
  });

  issues = computed(() => {
    const recs = this.recommendations();
    return recs.filter(r => r.severity === 'critical' || r.severity === 'serious');
  });

  improvements = computed(() => {
    const recs = this.recommendations();
    return recs.filter(r => r.severity === 'moderate' || r.severity === 'minor');
  });

  navItems: { id: Section; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'resources', label: 'Resources' },
    { id: 'performance', label: 'Performance' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'seo', label: 'SEO' },
    { id: 'security', label: 'Security' },
    { id: 'quality', label: 'Quality' },
    { id: 'recommendations', label: 'Recommendations' }
  ];

  async exportPDF(): Promise<void> {
    const r = this.result();
    if (r) await this.electron.exportPDF(r);
  }

  async retryAudit(): Promise<void> {
    const tab = this.store.activeTab();
    if (!tab) return;
    const config = tab.config;
    this.store.updateTabStatus(tab.id, 'running');
    this.store.updateTabProgress(tab.id, { step: 'Restarting...', percentage: 0, log: 'Re-running audit' });

    this.electron.onProgress(progress => {
      this.store.updateTabProgress(tab.id, progress);
    });

    try {
      const result = await this.electron.runAudit(config);
      if (result.error) {
        this.store.updateTabError(tab.id, result.error);
      } else {
        this.store.updateTabResult(tab.id, result);
      }
    } catch (err: any) {
      this.store.updateTabError(tab.id, err.message || 'Unknown error');
    } finally {
      this.electron.removeProgressListener();
    }
  }
}
