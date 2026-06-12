import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditStore } from '../../core/store/audit.store';

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (store.tabs().length > 0) {
      <div class="tab-bar">
        @for (tab of store.tabs(); track tab.id) {
          <div class="tab" [class.active]="tab.id === store.activeTabId()" (click)="store.setActiveTab(tab.id)">
            <span class="tab-indicator" [class.active]="tab.id === store.activeTabId()"></span>
            <span class="tab-score" [class]="getScoreClass(tab)">
              {{ getScoreLabel(tab) }}
            </span>
            <span class="tab-hostname">{{ tab.hostname }}</span>
            <button class="tab-close" (click)="closeTab($event, tab.id)" aria-label="Close tab">×</button>
          </div>
        }
        <button class="tab-new" (click)="newTab()" aria-label="New audit">+</button>
      </div>
    }
  `,
  styles: [`
    .tab-bar { display: flex; align-items: center; gap: 2px; padding: 4px 12px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); overflow-x: auto; -webkit-app-region: no-drag; }
    .tab { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 12px; transition: all 0.2s; max-width: 220px; position: relative; border: 1px solid transparent; }
    .tab:hover { background: var(--border-color); }
    .tab.active { background: var(--bg-card); border: 1px solid var(--accent); box-shadow: 0 0 8px rgba(59, 130, 246, 0.2); }
    .tab-indicator { display: none; }
    .tab.active .tab-indicator { display: block; position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); width: 20px; height: 3px; background: var(--accent); border-radius: 2px; }
    .tab.active .tab-hostname { color: var(--accent); font-weight: 600; }
    .tab-score { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .tab-score.good { background: rgba(12,206,107,0.15); color: var(--score-good); }
    .tab-score.average { background: rgba(255,164,0,0.15); color: var(--score-average); }
    .tab-score.poor { background: rgba(255,78,66,0.15); color: var(--score-poor); }
    .tab-score.none { background: var(--border-color); color: var(--text-secondary); }
    .tab-hostname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.2s; }
    .tab-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; padding: 0 2px; line-height: 1; border-radius: 3px; }
    .tab-close:hover { background: var(--border-color); color: var(--score-poor); }
    .tab-new { background: none; border: 1px dashed var(--border-color); color: var(--text-secondary); cursor: pointer; font-size: 16px; padding: 4px 10px; border-radius: 6px; }
    .tab-new:hover { background: var(--border-color); color: var(--text-primary); }
  `]
})
export class TabBarComponent {
  store = inject(AuditStore);

  getScoreClass(tab: any): string {
    if (!tab.result) return 'none';
    const s = tab.result.metrics.scores.performance;
    if (s >= 90) return 'good';
    if (s >= 50) return 'average';
    return 'poor';
  }

  getScoreLabel(tab: any): string {
    if (tab.status === 'running') return '...';
    if (!tab.result) return '—';
    return `${tab.result.metrics.scores.performance}`;
  }

  closeTab(e: Event, id: string): void {
    e.stopPropagation();
    this.store.closeTab(id);
  }

  newTab(): void {
    this.store.activeTabId.set(null);
  }
}
