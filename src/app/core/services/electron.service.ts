import { Injectable } from '@angular/core';
import { AuditConfig, AuditProgress, AuditResult } from '../models/audit.models';

declare global {
  interface Window {
    electronAPI: {
      runAudit: (config: AuditConfig) => Promise<AuditResult>;
      cancelAudit: () => Promise<{ success: boolean }>;
      exportPDF: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
      onAuditProgress: (callback: (progress: AuditProgress) => void) => () => void;
      getTheme: () => Promise<string>;
      setTheme: (theme: string) => Promise<void>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ElectronService {
  private progressUnsubscribe: (() => void) | null = null;

  get isElectron(): boolean {
    return !!(window as any).electronAPI;
  }

  async runAudit(config: AuditConfig): Promise<AuditResult> {
    if (!this.isElectron) return this.getMockResult(config);
    return window.electronAPI.runAudit(config);
  }

  async cancelAudit(): Promise<void> {
    if (this.isElectron) await window.electronAPI.cancelAudit();
  }

  async exportPDF(data: any): Promise<{ success: boolean; path?: string }> {
    if (!this.isElectron) return { success: false };
    return window.electronAPI.exportPDF(data);
  }

  onProgress(callback: (progress: AuditProgress) => void): void {
    if (this.isElectron) {
      this.progressUnsubscribe = window.electronAPI.onAuditProgress(callback);
    }
  }

  removeProgressListener(): void {
    if (this.progressUnsubscribe) {
      this.progressUnsubscribe();
      this.progressUnsubscribe = null;
    }
  }

  private getMockResult(config: AuditConfig): Promise<AuditResult> {
    return new Promise(resolve => {
      setTimeout(() => resolve({
        success: true,
        url: config.url,
        device: config.device,
        throttling: config.throttling,
        timestamp: new Date().toISOString(),
        metrics: {
          scores: { performance: 72, accessibility: 88, bestPractices: 92, seo: 85 },
          coreWebVitals: {
            lcp: { value: 2540, display: '2.5 s', score: 0.64 },
            fcp: { value: 1820, display: '1.8 s', score: 0.72 },
            tbt: { value: 340, display: '340 ms', score: 0.6 },
            cls: { value: 0.08, display: '0.08', score: 0.85 },
            si: { value: 3200, display: '3.2 s', score: 0.68 },
            ttfb: { value: 620, display: '620 ms', score: 0.55 }
          },
          performanceAudits: [],
          seoAudits: [],
          bestPracticesAudits: [],
          resourceSummary: [
            { resourceType: 'script', label: 'JavaScript', requestCount: 12, transferSize: 524288 },
            { resourceType: 'stylesheet', label: 'CSS', requestCount: 4, transferSize: 65536 },
            { resourceType: 'image', label: 'Images', requestCount: 8, transferSize: 262144 },
            { resourceType: 'font', label: 'Fonts', requestCount: 3, transferSize: 98304 }
          ],
          individualResources: [
            { url: 'https://example.com/assets/main.js', resourceType: 'Script', transferSize: 210000, resourceSize: 680000, statusCode: 200, mimeType: 'application/javascript', protocol: 'h2' },
            { url: 'https://example.com/assets/vendor.js', resourceType: 'Script', transferSize: 185000, resourceSize: 520000, statusCode: 200, mimeType: 'application/javascript', protocol: 'h2' },
            { url: 'https://example.com/assets/polyfills.js', resourceType: 'Script', transferSize: 42000, resourceSize: 130000, statusCode: 200, mimeType: 'application/javascript', protocol: 'h2' },
            { url: 'https://example.com/assets/styles.css', resourceType: 'Stylesheet', transferSize: 38000, resourceSize: 145000, statusCode: 200, mimeType: 'text/css', protocol: 'h2' },
            { url: 'https://example.com/assets/hero.webp', resourceType: 'Image', transferSize: 125000, resourceSize: 125000, statusCode: 200, mimeType: 'image/webp', protocol: 'h2' },
            { url: 'https://example.com/assets/logo.svg', resourceType: 'Image', transferSize: 4200, resourceSize: 4200, statusCode: 200, mimeType: 'image/svg+xml', protocol: 'h2' },
            { url: 'https://example.com/assets/inter.woff2', resourceType: 'Font', transferSize: 48000, resourceSize: 48000, statusCode: 200, mimeType: 'font/woff2', protocol: 'h2' },
            { url: 'https://example.com/', resourceType: 'Document', transferSize: 12000, resourceSize: 45000, statusCode: 200, mimeType: 'text/html', protocol: 'h2' }
          ]
        },
        accessibility: { violations: [], passes: [], incomplete: [], inapplicable: [] },
        security: { headers: [], mixedContent: [], isHttps: true },
        diagnostics: null,
        lighthouseVersion: '12.0.0',
        fetchTime: new Date().toISOString()
      }), 2000);
    });
  }
}
