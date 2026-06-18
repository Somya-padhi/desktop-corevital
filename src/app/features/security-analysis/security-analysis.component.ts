import { Component, Input, signal } from '@angular/core';
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
        @for (h of data.headers; track h.header; let i = $index) {
          <div class="card header-item" [class.present]="h.present" [class.missing]="!h.present" (click)="toggle(i)">
            <div class="h-row">
              <span class="h-status">{{ h.present ? '✓' : '✗' }}</span>
              <span class="h-name">{{ h.header }}</span>
              <span class="risk-badge" [class]="h.risk">{{ h.risk }}</span>
              <span class="h-chevron">{{ expandedIdx() === i ? '▾' : '▸' }}</span>
            </div>
            @if (expandedIdx() === i) {
              <div class="h-details">
                <p class="h-explanation">{{ getExplanation(h.header) }}</p>
                @if (h.present && h.value) {
                  <div class="h-value-row">
                    <span class="h-value-label">Current value:</span>
                    <code class="h-value">{{ h.value }}</code>
                  </div>
                }
                @if (!h.present && h.recommendation) {
                  <div class="h-rec">💡 {{ h.recommendation }}</div>
                }
              </div>
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
    .header-item { padding: 14px 16px; cursor: pointer; transition: all 0.15s; }
    .header-item:hover { box-shadow: var(--shadow-lg); }
    .header-item.missing { border-left: 3px solid var(--score-poor); }
    .header-item.present { border-left: 3px solid var(--score-good); }
    .h-row { display: flex; align-items: center; gap: 10px; }
    .h-status { font-weight: 700; }
    .header-item.present .h-status { color: var(--score-good); }
    .header-item.missing .h-status { color: var(--score-poor); }
    .h-name { flex: 1; font-size: 13px; font-weight: 500; }
    .h-chevron { color: var(--text-secondary); font-size: 12px; }
    .risk-badge { font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-weight: 600; }
    .risk-badge.high { background: rgba(255,78,66,0.15); color: var(--score-poor); }
    .risk-badge.medium { background: rgba(255,164,0,0.15); color: var(--score-average); }
    .risk-badge.low { background: rgba(12,206,107,0.15); color: var(--score-good); }
    .h-details { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); }
    .h-explanation { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px; }
    .h-value-row { margin-top: 8px; }
    .h-value-label { font-size: 11px; color: var(--text-secondary); margin-right: 6px; }
    .h-value { font-size: 11px; color: var(--text-primary); font-family: monospace; word-break: break-all; background: var(--bg-secondary); padding: 4px 8px; border-radius: 4px; }
    .h-rec { font-size: 12px; color: var(--score-average); margin-top: 8px; }
    .mixed-list { padding: 12px; }
    .mixed-item { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 12px; }
    .mixed-tag { font-weight: 600; color: var(--score-poor); }
    .mixed-url { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `]
})
export class SecurityAnalysisComponent {
  @Input() data!: SecurityResult;
  expandedIdx = signal<number | null>(null);

  toggle(idx: number): void {
    this.expandedIdx.set(this.expandedIdx() === idx ? null : idx);
  }

  private explanations: Record<string, string> = {
    'Content-Security-Policy': 'Prevents XSS attacks by specifying which dynamic resources are allowed to load. It restricts the sources for scripts, styles, images, and other resources, significantly reducing the attack surface for injection vulnerabilities.',
    'Strict-Transport-Security (HSTS)': 'Forces browsers to only connect via HTTPS for a specified duration. This prevents protocol downgrade attacks and cookie hijacking by ensuring all communication is encrypted.',
    'X-Frame-Options': 'Prevents your page from being embedded in iframes on other sites, protecting against clickjacking attacks where users are tricked into clicking hidden elements.',
    'X-Content-Type-Options': 'Prevents browsers from MIME-sniffing a response away from the declared content type. This reduces drive-by download attacks and prevents files from being interpreted as a different type.',
    'Referrer-Policy': 'Controls how much referrer information is sent with requests. Helps prevent leaking sensitive URL paths or query parameters to third-party sites.',
    'Permissions-Policy': 'Controls which browser features and APIs can be used on the page (camera, microphone, geolocation, etc.). Limits what embedded content can access.',
    'X-XSS-Protection': 'Legacy header that enabled the browser\'s built-in XSS filter. While mostly superseded by CSP, it provides a defense-in-depth layer for older browsers.',
    'Cross-Origin-Opener-Policy': 'Isolates your browsing context from cross-origin documents, preventing them from accessing your window object. Protects against Spectre-like side-channel attacks.',
    'Cross-Origin-Resource-Policy': 'Prevents other origins from reading your resources. Blocks cross-origin no-cors requests from embedding your resources, protecting against data leaks.'
  };

  getExplanation(header: string): string {
    return this.explanations[header] || 'This security header helps protect your site from common web vulnerabilities.';
  }
}
