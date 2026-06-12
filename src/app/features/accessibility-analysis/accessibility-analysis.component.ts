import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibilityResult } from '../../core/models/audit.models';

@Component({
  selector: 'app-accessibility-analysis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="a11y-section">
      <h3 class="section-title">Accessibility Analysis</h3>

      <div class="a11y-summary">
        <div class="summary-card violations"><span class="num">{{ data.violations.length }}</span><span class="lbl">Violations</span></div>
        <div class="summary-card passes"><span class="num">{{ data.passes.length }}</span><span class="lbl">Passes</span></div>
        <div class="summary-card incomplete"><span class="num">{{ data.incomplete.length }}</span><span class="lbl">Incomplete</span></div>
      </div>

      @if (data.violations.length > 0) {
        <h4>Violations</h4>
        <div class="violation-list">
          @for (v of data.violations; track v.id) {
            <div class="card violation-item" (click)="toggle(v.id)">
              <div class="v-header">
                <span class="impact-badge" [class]="v.impact">{{ v.impact }}</span>
                <span class="v-title">{{ v.help }}</span>
                <span class="v-count">{{ v.nodes.length }} element(s)</span>
                <span class="v-chevron">{{ expandedId() === v.id ? '▾' : '▸' }}</span>
              </div>
              @if (expandedId() === v.id) {
                <div class="v-details">
                  <p class="v-desc">{{ v.description }}</p>
                  @for (node of v.nodes.slice(0, 5); track $index) {
                    <div class="node-item">
                      <code>{{ node.html }}</code>
                      <p class="fix-summary">{{ node.failureSummary }}</p>
                    </div>
                  }
                  @if (v.helpUrl) {
                    <a class="help-link" [href]="v.helpUrl" target="_blank">Learn more →</a>
                  }
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <p class="empty">No accessibility violations found. Great job!</p>
      }
    </div>
  `,
  styles: [`
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
    .a11y-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .summary-card { padding: 16px; border-radius: 8px; text-align: center; background: var(--bg-secondary); }
    .summary-card .num { display: block; font-size: 28px; font-weight: 700; }
    .summary-card.violations .num { color: var(--score-poor); }
    .summary-card.passes .num { color: var(--score-good); }
    .summary-card.incomplete .num { color: var(--score-average); }
    .summary-card .lbl { font-size: 11px; color: var(--text-secondary); }
    h4 { font-size: 14px; font-weight: 600; margin-bottom: 10px; }
    .violation-list { display: flex; flex-direction: column; gap: 8px; }
    .violation-item { padding: 14px; cursor: pointer; }
    .v-header { display: flex; align-items: center; gap: 10px; }
    .impact-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .impact-badge.critical { background: rgba(255,78,66,0.15); color: var(--score-poor); }
    .impact-badge.serious { background: rgba(255,78,66,0.1); color: #e53e3e; }
    .impact-badge.moderate { background: rgba(255,164,0,0.15); color: var(--score-average); }
    .impact-badge.minor { background: rgba(12,206,107,0.15); color: var(--score-good); }
    .v-title { flex: 1; font-size: 13px; font-weight: 500; }
    .v-count { font-size: 11px; color: var(--text-secondary); }
    .v-chevron { color: var(--text-secondary); }
    .v-details { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); }
    .v-desc { font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }
    .node-item { background: var(--bg-secondary); padding: 8px; border-radius: 4px; margin-bottom: 6px; }
    .node-item code { font-size: 11px; display: block; overflow-x: auto; margin-bottom: 4px; color: var(--score-average); }
    .fix-summary { font-size: 11px; color: var(--text-secondary); }
    .help-link { font-size: 12px; color: var(--accent); text-decoration: none; }
    .empty { font-size: 13px; color: var(--text-secondary); text-align: center; padding: 40px; }
  `]
})
export class AccessibilityAnalysisComponent {
  @Input() data!: AccessibilityResult;
  expandedId = signal<string | null>(null);

  toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }
}
