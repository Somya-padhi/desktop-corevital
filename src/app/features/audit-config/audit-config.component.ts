import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditStore } from '../../core/store/audit.store';
import { ElectronService } from '../../core/services/electron.service';
import { AuditConfig } from '../../core/models/audit.models';

@Component({
  selector: 'app-audit-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-wrapper">
      <div class="config-card card">
        <div class="config-header">
          <h2>New Audit</h2>
          <p>Enter a URL to analyze performance, accessibility, SEO, and security</p>
        </div>

        <div class="config-form">
          <div class="form-group">
            <label for="url-input">URL</label>
            <input id="url-input" type="url" class="input-field" [(ngModel)]="url" placeholder="https://example.com" (keydown.enter)="startAudit()" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="device-select">Device</label>
              <select id="device-select" class="select-field" [(ngModel)]="device">
                <option value="desktop">Desktop</option>
                <option value="tablet">Tablet</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>

            <div class="form-group">
              <label for="throttle-select">Throttling</label>
              <select id="throttle-select" class="select-field" [(ngModel)]="throttling">
                <option value="none">No Throttling</option>
                <option value="simulated">Simulated (PSI Default)</option>
                <option value="slow4g">Applied Slow 4G</option>
                <option value="fast4g">Applied Fast 4G</option>
              </select>
            </div>
          </div>

          <button class="btn-primary run-btn" (click)="startAudit()" [disabled]="!isValid()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Run Audit
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .config-wrapper { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
    .config-card { max-width: 520px; width: 100%; padding: 32px; }
    .config-header { margin-bottom: 24px; }
    .config-header h2 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .config-header p { font-size: 13px; color: var(--text-secondary); }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .run-btn { margin-top: 24px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; }
  `]
})
export class AuditConfigComponent {
  private store = inject(AuditStore);
  private electron = inject(ElectronService);

  url = '';
  device: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  throttling: 'none' | 'simulated' | 'slow4g' | 'fast4g' = 'simulated';

  isValid(): boolean {
    try {
      new URL(this.url);
      return true;
    } catch { return this.url.length > 0; }
  }

  async startAudit(): Promise<void> {
    if (!this.isValid()) return;

    let finalUrl = this.url;
    if (!finalUrl.startsWith('http')) finalUrl = `https://${finalUrl}`;

    const config: AuditConfig = { url: finalUrl, device: this.device, throttling: this.throttling };
    const tabId = this.store.createTab(config);
    this.store.updateTabStatus(tabId, 'running');

    this.electron.onProgress(progress => {
      this.store.updateTabProgress(tabId, progress);
    });

    try {
      const result = await this.electron.runAudit(config);
      if (result.error) {
        this.store.updateTabError(tabId, result.error);
      } else {
        this.store.updateTabResult(tabId, result);
      }
    } catch (err: any) {
      this.store.updateTabError(tabId, err.message || 'Unknown error');
    } finally {
      this.electron.removeProgressListener();
    }
  }
}
