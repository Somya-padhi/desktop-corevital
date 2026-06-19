import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditStore } from './core/store/audit.store';
import { ThemeService } from './core/services/theme.service';
import { TabBarComponent } from './features/tab-bar/tab-bar.component';
import { AuditConfigComponent } from './features/audit-config/audit-config.component';
import { AuditProgressComponent } from './features/audit-progress/audit-progress.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CompareComponent } from './features/compare/compare.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TabBarComponent, AuditConfigComponent, AuditProgressComponent, DashboardComponent, CompareComponent],
  template: `
    <div class="app-shell">
      <header class="app-header drag-region">
        <div class="header-left">
          <span class="app-logo">◆</span>
          <span class="app-title">CoreVitals</span>
        </div>
        <div class="header-right no-drag">
          <button class="theme-toggle" (click)="theme.toggle()" [attr.aria-label]="'Toggle theme'">
            @if (theme.theme() === 'dark') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>
        </div>
      </header>

      <div class="app-body">
        <nav class="tools-sidebar">
          <div class="sidebar-title">Tools</div>
          @for (item of toolsMenu; track item.id) {
            <button class="sidebar-item" [class.active]="activeTool() === item.id" (click)="activeTool.set(item.id)">
              <span class="sidebar-icon" [innerHTML]="item.icon"></span>
              <span class="sidebar-label">{{ item.label }}</span>
            </button>
          }
        </nav>

        <div class="app-content">
          @switch (activeTool()) {
            @case ('audit') {
              <app-tab-bar />
              <main class="content-main">
                @if (!store.activeTab()) {
                  <app-audit-config />
                } @else if (store.activeTab()?.status === 'running') {
                  <app-audit-progress />
                } @else if (store.activeTab()?.status === 'complete') {
                  <app-dashboard />
                } @else if (store.activeTab()?.status === 'error') {
                  <div class="error-view">
                    <div class="card error-card">
                      <h3>Audit Failed</h3>
                      <p>{{ store.activeTab()?.error }}</p>
                      <button class="btn-primary" (click)="retryAudit()">Retry</button>
                    </div>
                  </div>
                } @else {
                  <app-audit-config />
                }
              </main>
            }
            @case ('compare') {
              <main class="content-main">
                <app-compare />
              </main>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100vh; }
    .app-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); }
    .drag-region { -webkit-app-region: drag; }
    .no-drag { -webkit-app-region: no-drag; }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .app-logo { font-size: 18px; color: var(--accent); }
    .app-title { font-size: 14px; font-weight: 600; letter-spacing: -0.3px; }
    .header-right { display: flex; align-items: center; gap: 8px; }
    .theme-toggle { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; }
    .theme-toggle:hover { background: var(--border-color); color: var(--text-primary); }
    .app-body { display: flex; flex: 1; overflow: hidden; }
    .tools-sidebar { width: 180px; flex-shrink: 0; background: var(--bg-secondary); border-right: 1px solid var(--border-color); padding: 16px 8px; display: flex; flex-direction: column; gap: 4px; }
    .sidebar-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); padding: 8px 12px; margin-bottom: 4px; }
    .sidebar-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: none; background: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--text-secondary); text-align: left; transition: all 0.15s; }
    .sidebar-item:hover { background: var(--border-color); color: var(--text-primary); }
    .sidebar-item.active { background: var(--accent); color: white; }
    .sidebar-item.active .sidebar-icon svg { stroke: white; }
    .sidebar-icon { display: flex; align-items: center; }
    .app-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .content-main { flex: 1; overflow-y: auto; padding: 24px; }
    .error-view { display: flex; justify-content: center; align-items: center; height: 100%; }
    .error-card { max-width: 400px; text-align: center; }
    .error-card h3 { color: var(--score-poor); margin-bottom: 12px; }
    .error-card p { color: var(--text-secondary); margin-bottom: 20px; }
  `]
})
export class AppComponent {
  store = inject(AuditStore);
  theme = inject(ThemeService);

  activeTool = signal<string>('audit');

  toolsMenu = [
    { id: 'audit', label: 'Performance Check', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' },
    { id: 'compare', label: 'Compare', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>' },
  ];

  retryAudit(): void {
    const tab = this.store.activeTab();
    if (tab) this.store.updateTabStatus(tab.id, 'idle');
  }
}
