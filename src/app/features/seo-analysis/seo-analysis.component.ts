import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceAudit } from '../../core/models/audit.models';

@Component({
  selector: 'app-seo-analysis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="seo-section">
      <h3 class="section-title">SEO Analysis</h3>
      <div class="audit-list">
        @for (audit of audits; track audit.id) {
          <div class="card audit-row">
            <span class="status-icon" [class]="getStatus(audit.score)">
              {{ audit.score === 1 ? '✓' : audit.score === 0 ? '✗' : '!' }}
            </span>
            <div class="audit-info">
              <span class="audit-title">{{ audit.title }}</span>
              <span class="audit-desc">{{ stripHtml(audit.description) }}</span>
            </div>
          </div>
        }
        @if (audits.length === 0) {
          <p class="empty">No SEO audits available.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
    .audit-list { display: flex; flex-direction: column; gap: 6px; }
    .audit-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; }
    .status-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .status-icon.pass { background: rgba(12,206,107,0.15); color: var(--score-good); }
    .status-icon.fail { background: rgba(255,78,66,0.15); color: var(--score-poor); }
    .status-icon.warn { background: rgba(255,164,0,0.15); color: var(--score-average); }
    .audit-info { display: flex; flex-direction: column; gap: 2px; }
    .audit-title { font-size: 13px; font-weight: 500; }
    .audit-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }
    .empty { font-size: 13px; color: var(--text-secondary); text-align: center; padding: 40px; }
  `]
})
export class SeoAnalysisComponent {
  @Input() audits: PerformanceAudit[] = [];

  getStatus(score: number | null): string {
    if (score === 1 || score === null) return 'pass';
    if (score === 0) return 'fail';
    return 'warn';
  }

  stripHtml(text: string): string {
    return text?.replace(/<[^>]*>/g, '') || '';
  }
}
