import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Recommendation } from '../../core/services/recommendation.service';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rec-section">
      <h3 class="section-title">Recommendations</h3>

      <div class="filters">
        @for (cat of categories; track cat.id) {
          <button class="filter-btn" [class.active]="activeFilter() === cat.id" (click)="activeFilter.set(cat.id)">
            {{ cat.label }} ({{ getCategoryCount(cat.id) }})
          </button>
        }
      </div>

      <div class="rec-list">
        @for (rec of filteredRecs(); track $index) {
          <div class="card rec-item">
            <div class="rec-header">
              <span class="severity-badge" [class]="rec.severity">{{ rec.severity }}</span>
              <span class="rec-category">{{ rec.category }}</span>
            </div>
            <h4 class="rec-title">{{ rec.title }}</h4>
            <p class="rec-desc">{{ rec.description }}</p>
            <div class="rec-meta">
              <span class="rec-impact">Impact: {{ rec.impact }}</span>
            </div>
            <div class="rec-fix">
              <strong>Fix:</strong> {{ rec.fix }}
            </div>
          </div>
        }
        @if (filteredRecs().length === 0) {
          <p class="empty">No recommendations for this category.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
    .filters { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
    .filter-btn { background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; transition: all 0.15s; }
    .filter-btn:hover { color: var(--text-primary); border-color: var(--accent); }
    .filter-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
    .rec-list { display: flex; flex-direction: column; gap: 10px; }
    .rec-item { padding: 16px; }
    .rec-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .severity-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .severity-badge.critical { background: rgba(255,78,66,0.15); color: var(--score-poor); }
    .severity-badge.serious { background: rgba(239,68,68,0.12); color: #ef4444; }
    .severity-badge.moderate { background: rgba(255,164,0,0.15); color: var(--score-average); }
    .severity-badge.minor { background: rgba(12,206,107,0.15); color: var(--score-good); }
    .rec-category { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .rec-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .rec-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px; }
    .rec-meta { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; }
    .rec-fix { font-size: 12px; background: var(--bg-secondary); padding: 10px; border-radius: 6px; line-height: 1.5; }
    .rec-fix strong { color: var(--accent); }
    .empty { font-size: 13px; color: var(--text-secondary); text-align: center; padding: 40px; }
  `]
})
export class RecommendationsComponent {
  @Input() recommendations: Recommendation[] = [];

  activeFilter = signal<string>('all');

  categories = [
    { id: 'all', label: 'All' },
    { id: 'performance', label: 'Performance' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'seo', label: 'SEO' },
    { id: 'security', label: 'Security' },
    { id: 'quality', label: 'Quality' }
  ];

  filteredRecs(): Recommendation[] {
    const f = this.activeFilter();
    if (f === 'all') return this.recommendations;
    return this.recommendations.filter(r => r.category === f);
  }

  getCategoryCount(cat: string): number {
    if (cat === 'all') return this.recommendations.length;
    return this.recommendations.filter(r => r.category === cat).length;
  }
}
