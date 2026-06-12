import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditStore } from '../../core/store/audit.store';
import { ElectronService } from '../../core/services/electron.service';

@Component({
  selector: 'app-audit-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-wrapper">
      <div class="progress-card card">
        <div class="progress-spinner"></div>
        <h3>{{ store.activeTab()?.progress?.step || 'Initializing...' }}</h3>
        <div class="progress-bar-container">
          <div class="progress-bar" [style.width.%]="store.activeTab()?.progress?.percentage || 0"></div>
        </div>
        <p class="progress-pct">{{ store.activeTab()?.progress?.percentage || 0 }}%</p>
        <p class="progress-log">{{ store.activeTab()?.progress?.log || 'Starting audit...' }}</p>
        <button class="cancel-btn" (click)="cancel()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .progress-wrapper { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
    .progress-card { max-width: 440px; width: 100%; padding: 40px; text-align: center; }
    .progress-spinner { width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    .progress-bar-container { height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, var(--accent), #8b5cf6); border-radius: 2px; transition: width 0.5s ease; }
    .progress-pct { font-size: 13px; font-weight: 600; color: var(--accent); }
    .progress-log { font-size: 12px; color: var(--text-secondary); margin-top: 12px; }
    .cancel-btn { margin-top: 24px; background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .cancel-btn:hover { border-color: var(--score-poor); color: var(--score-poor); }
  `]
})
export class AuditProgressComponent {
  store = inject(AuditStore);
  private electron = inject(ElectronService);

  async cancel(): Promise<void> {
    await this.electron.cancelAudit();
    const tab = this.store.activeTab();
    if (tab) this.store.updateTabError(tab.id, 'Audit cancelled by user');
  }
}
