import { Component, Input, signal } from '@angular/core';
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
          <div class="card audit-item" [class.expanded]="expandedId() === audit.id" (click)="toggle(audit.id)">
            <div class="audit-header">
              <span class="audit-status-badge" [class]="getScoreClass(audit.score)">
                {{ getStatusLabel(audit.score) }}
              </span>
              <span class="audit-title">{{ audit.title }}</span>
              @if (audit.displayValue) {
                <span class="audit-value">{{ audit.displayValue }}</span>
              }
              <span class="audit-chevron">{{ expandedId() === audit.id ? '▾' : '▸' }}</span>
            </div>
            @if (expandedId() === audit.id) {
              <div class="audit-details">
                <p class="audit-desc">{{ stripHtml(audit.description) }}</p>
                @if (getDetailRows(audit).length > 0) {
                  <table class="details-table">
                    <tbody>
                      @for (row of getDetailRows(audit); track $index) {
                        <tr>
                          <td [title]="row.primary">{{ row.primary }}</td>
                          <td>{{ row.secondary }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </div>
            }
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
    .audit-list { display: flex; flex-direction: column; gap: 8px; }
    .audit-item { padding: 14px; cursor: pointer; transition: all 0.15s; }
    .audit-item:hover { box-shadow: var(--shadow-lg); }
    .audit-header { display: flex; align-items: center; gap: 10px; }
    .audit-status-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
    .audit-status-badge.good { background: rgba(12,206,107,0.12); color: var(--score-good); }
    .audit-status-badge.average { background: rgba(255,164,0,0.12); color: var(--score-average); }
    .audit-status-badge.poor { background: rgba(255,78,66,0.12); color: var(--score-poor); }
    .audit-title { flex: 1; font-size: 13px; font-weight: 500; }
    .audit-value { font-size: 12px; color: var(--text-secondary); }
    .audit-chevron { color: var(--text-secondary); font-size: 12px; }
    .audit-details { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); }
    .audit-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 10px; }
    .details-table { width: 100%; font-size: 11px; }
    .details-table td { padding: 4px 8px; border-bottom: 1px solid var(--border-color); }
    .details-table td:first-child { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .details-table td:last-child { text-align: right; color: var(--text-secondary); white-space: nowrap; }
    .empty { font-size: 13px; color: var(--text-secondary); text-align: center; padding: 40px; }
  `]
})
export class SeoAnalysisComponent {
  @Input() audits: PerformanceAudit[] = [];
  expandedId = signal<string | null>(null);

  toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  getScoreClass(score: number | null): string {
    if (score === null) return 'average';
    if (score >= 0.9) return 'good';
    if (score >= 0.5) return 'average';
    return 'poor';
  }

  getStatusLabel(score: number | null): string {
    if (score === null) return 'Info';
    if (score >= 0.9) return 'Passed';
    if (score >= 0.5) return 'Needs Work';
    return 'Failed';
  }

  stripHtml(text: string): string {
    return text?.replace(/<[^>]*>/g, '') || '';
  }

  getDetailRows(audit: PerformanceAudit): { primary: string; secondary: string }[] {
    if (!audit.details?.items) return [];
    return audit.details.items.slice(0, 15).map((item: any) => ({
      primary: this.extractPrimary(item),
      secondary: this.extractSecondary(item)
    })).filter((r: any) => r.primary !== 'Item');
  }

  private extractPrimary(item: any): string {
    // Handle node/link references (SEO link-text, crawlable-anchors, etc.)
    if (item.node) {
      return item.node.snippet || item.node.nodeLabel || item.node.selector || '';
    }
    if (item.href) return item.href;
    if (item.url) return typeof item.url === 'string' ? item.url : '';
    if (item.source) {
      if (typeof item.source === 'object') return item.source.url || item.source.snippet || JSON.stringify(item.source);
      return item.source;
    }
    if (item.selector) return item.selector;
    if (item.label) return item.label;
    if (item.description) return typeof item.description === 'string' ? item.description : '';
    return 'Item';
  }

  private extractSecondary(item: any): string {
    if (item.explanation) return item.explanation;
    if (item.failureReason) return item.failureReason;
    // For link-text audit, show the link text
    if (item.text) return `text: "${item.text}"`;
    if (item.node?.nodeLabel) return item.node.nodeLabel;
    return '';
  }
}
