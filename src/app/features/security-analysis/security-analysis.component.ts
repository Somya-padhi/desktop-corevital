import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecurityResult } from '../../core/models/audit.models';

@Component({
  selector: 'app-security-analysis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="security-section">
      <h3 class="section-title">Security Analysis</h3>

      <div class="https-status card">
        <span class="https-icon" [class.secure]="data.isHttps">{{ data.isHttps ? '🔒' : '⚠️' }}</span>
        <span>{{ data.isHttps ? 'Site uses HTTPS' : 'Site does NOT use HTTPS' }}</span>
      </div>

      <h4>Security Headers</h4>
      <div class="headers-grid">
        @for (h of data.headers; track h.header) {
          <div class="card header-item" [class.present]="h.present" [class.missing]="!h.present">
            <div class="h-row">
              <span class="h-status">{{ h.present ? '✓' : '✗' }}</span>
              <span class="h-name">{{ h.header }}</span>
              <span class="risk-badge" [class]="h.risk">{{ h.risk }}</span>
            </div>
            @if (h.present && h.value) {
              <div class="h-value">{{ h.value }}</div>
            }
            @if (!h.present && h.recommendation) {
              <div class="h-rec">{{ h.recommendation }}</div>
            }
          </div>
        }
      </div>

      @if (data.mixedContent.length > 0) {
        <h4>Mixed Content ({{ data.mixedContent.length }} items)</h4>
        <div class="card mixed-list">
          @for (item of data.mixedContent; track $index) {
            <div class="mixed-item">
              <span class="mixed-tag">{{ item.tag }}</span>
              <span class="mixed-url">{{ item.url }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
    h4 { font-size: 14px; font-weight: 600; margin: 16px 0 10px; }
    .https-status { display: flex; align-items: center; gap: 10px; padding: 12px 16px; margin-bottom: 16px; }
    .https-icon { font-size: 18px; }
    .headers-grid { display: flex; flex-direction: column; gap: 6px; }
    .header-item { padding: 12px 16px; }
    .header-item.missing { border-left: 3px solid var(--score-poor); }
    .header-item.present { border-left: 3px solid var(--score-good); }
    .h-row { display: flex; align-items: center; gap: 10px; }
    .h-status { font-weight: 700; }
    .header-item.present .h-status { color: var(--score-good); }
    .header-item.missing .h-status { color: var(--score-poor); }
    .h-name { flex: 1; font-size: 13px; font-weight: 500; }
    .risk-badge { font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-weight: 600; }
    .risk-badge.high { background: rgba(255,78,66,0.15); color: var(--score-poor); }
    .risk-badge.medium { background: rgba(255,164,0,0.15); color: var(--score-average); }
    .risk-badge.low { background: rgba(12,206,107,0.15); color: var(--score-good); }
    .h-value { font-size: 11px; color: var(--text-secondary); margin-top: 6px; font-family: monospace; word-break: break-all; }
    .h-rec { font-size: 11px; color: var(--score-average); margin-top: 6px; }
    .mixed-list { padding: 12px; }
    .mixed-item { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 12px; }
    .mixed-tag { font-weight: 600; color: var(--score-poor); }
    .mixed-url { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `]
})
export class SecurityAnalysisComponent {
  @Input() data!: SecurityResult;
}
