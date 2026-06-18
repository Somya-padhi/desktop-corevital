import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiagnosticsResult, LongTask, ThirdPartyRequest } from '../../core/models/audit.models';

@Component({
  selector: 'app-diagnostics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="diagnostics-section">
      <h3 class="section-title">Deep Diagnostics</h3>
      <p class="section-subtitle">Trace-level insights beyond Lighthouse scores</p>

      @if (hasError()) {
        <div class="diag-error-banner">
          <div class="error-icon">⚠</div>
          <div class="error-content">
            <span class="error-title">Diagnostics collection failed</span>
            <span class="error-msg">{{ data?.error }}</span>
            @if (data?.retryable) {
              <span class="error-retry">Re-running the audit may collect diagnostics successfully. Transient issues like page timeouts or browser resource limits can cause this.</span>
            }
          </div>
        </div>
      }

      @if (warnings().length > 0) {
        <div class="diag-warnings">
          <span class="warn-label">Partial results — some checks encountered issues:</span>
          @for (w of warnings(); track $index) {
            <span class="warn-item">• {{ w }}</span>
          }
        </div>
      }

      @if (diagnosticsData(); as dd) {
        <!-- LCP Attribution -->
        @if (dd.lcpAttribution) {
          <div class="diag-card">
            <div class="diag-card-header" (click)="toggleSection('lcp')">
              <span class="diag-card-title">LCP Element Attribution</span>
              <span class="diag-chevron">{{ expandedSection() === 'lcp' ? '▾' : '▸' }}</span>
            </div>
            @if (expandedSection() === 'lcp') {
              <div class="diag-card-body">
                <div class="lcp-grid">
                  @if (dd.lcpAttribution.element) {
                    <div class="lcp-row"><span class="lcp-label">Element</span><code class="lcp-value">{{ dd.lcpAttribution.element }}</code></div>
                  }
                  @if (dd.lcpAttribution.url) {
                    <div class="lcp-row"><span class="lcp-label">Resource URL</span><span class="lcp-value url-val" [title]="dd.lcpAttribution.url">{{ truncateUrl(dd.lcpAttribution.url) }}</span></div>
                  }
                  <div class="lcp-row"><span class="lcp-label">Load Time</span><span class="lcp-value">{{ formatMs(dd.lcpAttribution.loadTime) }}</span></div>
                  <div class="lcp-row"><span class="lcp-label">Render Time</span><span class="lcp-value">{{ formatMs(dd.lcpAttribution.renderTime) }}</span></div>
                  @if (dd.lcpAttribution.renderDelay !== null && dd.lcpAttribution.renderDelay > 0) {
                    <div class="lcp-row highlight"><span class="lcp-label">Render Delay (JS overhead)</span><span class="lcp-value poor">{{ formatMs(dd.lcpAttribution.renderDelay) }}</span></div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- LCP Discoverability -->
        @if (dd.lcpDiscoverability) {
          <div class="diag-card">
            <div class="diag-card-header" (click)="toggleSection('discover')">
              <span class="diag-card-title">LCP Discoverability</span>
              <span class="diag-badge" [class]="dd.lcpDiscoverability.inInitialHtml === true ? 'good' : dd.lcpDiscoverability.inInitialHtml === false ? 'poor' : 'neutral'">
                {{ dd.lcpDiscoverability.inInitialHtml === true ? 'In HTML' : dd.lcpDiscoverability.inInitialHtml === false ? 'JS-Injected' : 'N/A' }}
              </span>
              <span class="diag-chevron">{{ expandedSection() === 'discover' ? '▾' : '▸' }}</span>
            </div>
            @if (expandedSection() === 'discover') {
              <div class="diag-card-body">
                <p class="diag-explanation">{{ dd.lcpDiscoverability.recommendation }}</p>
                @if (dd.lcpDiscoverability.url) {
                  <code class="diag-code">{{ dd.lcpDiscoverability.url }}</code>
                }
              </div>
            }
          </div>
        }

        <!-- Long Tasks -->
        @if (dd.longTasks.length > 0) {
          <div class="diag-card">
            <div class="diag-card-header" (click)="toggleSection('longtasks')">
              <span class="diag-card-title">Long Tasks ({{ dd.longTasks.length }})</span>
              <span class="diag-badge" [class]="dd.longTasks[0].duration > 200 ? 'poor' : 'average'">
                Longest: {{ dd.longTasks[0].duration }}ms
              </span>
              <span class="diag-chevron">{{ expandedSection() === 'longtasks' ? '▾' : '▸' }}</span>
            </div>
            @if (expandedSection() === 'longtasks') {
              <div class="diag-card-body">
                <p class="diag-explanation">Tasks blocking the main thread for more than 50ms. These delay interactivity and can push FCP/LCP later.</p>
                <table class="diag-table">
                  <thead>
                    <tr><th>Duration</th><th>Script / Attribution</th><th>Type</th></tr>
                  </thead>
                  <tbody>
                    @for (task of dd.longTasks; track $index) {
                      <tr>
                        <td><span class="task-duration" [class]="getTaskSeverity(task)">{{ task.duration }}ms</span></td>
                        <td class="task-attr" [title]="task.attribution">{{ truncateUrl(task.attribution) }}</td>
                        <td class="task-kind">{{ task.kind }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- Layout Shifts -->
        @if (dd.layoutShifts.length > 0) {
          <div class="diag-card">
            <div class="diag-card-header" (click)="toggleSection('cls')">
              <span class="diag-card-title">Layout Shift Sources ({{ dd.layoutShifts.length }})</span>
              <span class="diag-chevron">{{ expandedSection() === 'cls' ? '▾' : '▸' }}</span>
            </div>
            @if (expandedSection() === 'cls') {
              <div class="diag-card-body">
                <p class="diag-explanation">Elements that shifted without user interaction, contributing to CLS score.</p>
                @for (shift of dd.layoutShifts; track $index) {
                  <div class="shift-entry">
                    <span class="shift-value">Shift: {{ (shift.value * 1000).toFixed(1) }}‰</span>
                    @for (source of shift.sources; track $index) {
                      <div class="shift-source">
                        <code>{{ source.node }}</code>
                        @if (source.previousRect) {
                          <span class="shift-rects">{{ source.previousRect }} → {{ source.currentRect }}</span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Third-Party Blocking -->
        @if (dd.thirdPartyBlocking.length > 0) {
          <div class="diag-card">
            <div class="diag-card-header" (click)="toggleSection('thirdparty')">
              <span class="diag-card-title">Third-Party Impact ({{ dd.thirdPartyBlocking.length }})</span>
              <span class="diag-chevron">{{ expandedSection() === 'thirdparty' ? '▾' : '▸' }}</span>
            </div>
            @if (expandedSection() === 'thirdparty') {
              <div class="diag-card-body">
                <p class="diag-explanation">External requests sorted by duration. Render-blocking third parties directly delay FCP/LCP.</p>
                <table class="diag-table">
                  <thead>
                    <tr><th>Entity</th><th>Duration</th><th>Size</th><th>Blocking</th></tr>
                  </thead>
                  <tbody>
                    @for (req of dd.thirdPartyBlocking; track $index) {
                      <tr>
                        <td class="tp-entity" [title]="req.url">{{ req.entity }}</td>
                        <td><span [class]="req.duration > 500 ? 'poor' : req.duration > 200 ? 'average' : ''">{{ req.duration }}ms</span></td>
                        <td>{{ formatSize(req.transferSize) }}</td>
                        <td><span class="blocking-badge" [class]="req.renderBlocking === 'blocking' ? 'render-blocking' : ''">{{ req.renderBlocking }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        @if (!dd.lcpAttribution && dd.longTasks.length === 0 && dd.layoutShifts.length === 0 && dd.thirdPartyBlocking.length === 0) {
          <p class="empty">No diagnostic issues detected. The page appears well-optimized at the trace level.</p>
        }
      }

      @if (!diagnosticsData() && !hasError()) {
        <p class="empty">No diagnostics data available. Run an audit to collect trace-level insights.</p>
      }
    </div>
  `,
  styles: [`
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .section-subtitle { font-size: 12px; color: var(--text-secondary); margin-bottom: 18px; }
    .diag-error-banner { display: flex; gap: 12px; padding: 16px; border-radius: 10px; background: rgba(255,78,66,0.06); border: 1px solid rgba(255,78,66,0.2); margin-bottom: 16px; }
    .error-icon { font-size: 20px; }
    .error-content { display: flex; flex-direction: column; gap: 4px; }
    .error-title { font-size: 13px; font-weight: 600; color: var(--score-poor); }
    .error-msg { font-size: 12px; color: var(--text-secondary); }
    .error-retry { font-size: 11px; color: var(--text-secondary); font-style: italic; margin-top: 4px; }
    .diag-warnings { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; background: rgba(255,164,0,0.06); border: 1px solid rgba(255,164,0,0.2); margin-bottom: 16px; font-size: 12px; }
    .warn-label { font-weight: 500; color: var(--score-average); margin-bottom: 4px; }
    .warn-item { color: var(--text-secondary); }
    .diag-card { border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
    .diag-card-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; cursor: pointer; transition: background 0.15s; }
    .diag-card-header:hover { background: var(--bg-secondary); }
    .diag-card-title { flex: 1; font-size: 13px; font-weight: 600; }
    .diag-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
    .diag-badge.good { background: rgba(12,206,107,0.12); color: var(--score-good); }
    .diag-badge.poor { background: rgba(255,78,66,0.12); color: var(--score-poor); }
    .diag-badge.average { background: rgba(255,164,0,0.12); color: var(--score-average); }
    .diag-badge.neutral { background: var(--bg-secondary); color: var(--text-secondary); }
    .diag-chevron { color: var(--text-secondary); font-size: 12px; }
    .diag-card-body { padding: 0 16px 16px; }
    .diag-explanation { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5; }
    .diag-code { display: block; font-size: 11px; background: var(--bg-secondary); padding: 8px 12px; border-radius: 6px; word-break: break-all; margin-top: 8px; }
    .lcp-grid { display: flex; flex-direction: column; gap: 8px; }
    .lcp-row { display: flex; align-items: center; gap: 12px; font-size: 12px; }
    .lcp-row.highlight { background: rgba(255,78,66,0.04); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,78,66,0.15); }
    .lcp-label { width: 180px; color: var(--text-secondary); flex-shrink: 0; }
    .lcp-value { font-weight: 500; word-break: break-all; }
    .lcp-value.poor { color: var(--score-poor); }
    .url-val { font-size: 11px; }
    .diag-table { width: 100%; font-size: 11px; border-collapse: collapse; }
    .diag-table th { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 500; }
    .diag-table td { padding: 6px 8px; border-bottom: 1px solid var(--border-color); }
    .task-duration { font-weight: 600; }
    .task-duration.poor { color: var(--score-poor); }
    .task-duration.average { color: var(--score-average); }
    .task-attr { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .task-kind { text-transform: capitalize; color: var(--text-secondary); }
    .shift-entry { padding: 8px 10px; border-radius: 6px; background: var(--bg-secondary); margin-bottom: 6px; }
    .shift-value { font-size: 11px; font-weight: 600; color: var(--score-average); }
    .shift-source { margin-top: 4px; font-size: 11px; display: flex; align-items: center; gap: 8px; }
    .shift-source code { background: var(--border-color); padding: 2px 6px; border-radius: 3px; }
    .shift-rects { color: var(--text-secondary); }
    .tp-entity { font-weight: 500; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .poor { color: var(--score-poor); }
    .average { color: var(--score-average); }
    .blocking-badge { font-size: 10px; padding: 2px 6px; border-radius: 3px; background: var(--bg-secondary); }
    .blocking-badge.render-blocking { background: rgba(255,78,66,0.1); color: var(--score-poor); font-weight: 600; }
    .empty { font-size: 13px; color: var(--text-secondary); text-align: center; padding: 40px; }
  `]
})
export class DiagnosticsComponent {
  @Input() data: DiagnosticsResult | null = null;

  expandedSection = signal<string | null>('lcp');

  hasError(): boolean {
    return !!this.data?.error && !this.data?.partial;
  }

  warnings(): string[] {
    return this.data?.warnings || [];
  }

  diagnosticsData() {
    return this.data?.data || this.data?.partial || null;
  }

  toggleSection(id: string): void {
    this.expandedSection.set(this.expandedSection() === id ? null : id);
  }

  formatMs(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  truncateUrl(url: string): string {
    if (!url) return '';
    if (url.length <= 60) return url;
    return url.substring(0, 57) + '...';
  }

  getTaskSeverity(task: LongTask): string {
    if (task.duration > 200) return 'poor';
    if (task.duration > 100) return 'average';
    return '';
  }
}
