import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceItem } from '../../core/models/audit.models';

@Component({
  selector: 'app-resource-analysis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="resource-section">
      <h3 class="section-title">Resource Analysis</h3>
      <div class="resource-grid">
        <div class="card resource-table">
          <h4>Weight by Resource Type</h4>
          <table>
            <thead><tr><th>Type</th><th>Requests</th><th>Size</th></tr></thead>
            <tbody>
              @for (r of resources; track r.resourceType) {
                <tr>
                  <td><span class="resource-badge" [style.background]="getColor(r.resourceType)"></span>{{ r.label }}</td>
                  <td>{{ r.requestCount }}</td>
                  <td>{{ formatSize(r.transferSize) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="card resource-chart">
          <h4>Distribution</h4>
          <div class="bar-chart">
            @for (r of resources; track r.resourceType) {
              <div class="bar-row">
                <span class="bar-label">{{ r.label }}</span>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="getPercentage(r.transferSize)" [style.background]="getColor(r.resourceType)"></div>
                </div>
                <span class="bar-value">{{ formatSize(r.transferSize) }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
    .resource-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    h4 { font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    table { width: 100%; font-size: 12px; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid var(--border-color); }
    th { color: var(--text-secondary); font-weight: 500; font-size: 11px; }
    .resource-badge { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 8px; }
    .bar-chart { display: flex; flex-direction: column; gap: 10px; }
    .bar-row { display: grid; grid-template-columns: 80px 1fr 60px; gap: 8px; align-items: center; }
    .bar-label { font-size: 11px; color: var(--text-secondary); }
    .bar-track { height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
    .bar-value { font-size: 11px; text-align: right; }
  `]
})
export class ResourceAnalysisComponent {
  @Input() resources: ResourceItem[] = [];

  private colors: Record<string, string> = {
    script: '#f59e0b', stylesheet: '#8b5cf6', image: '#10b981',
    font: '#3b82f6', document: '#ef4444', other: '#6b7280',
    'third-party': '#ec4899', media: '#06b6d4', total: '#64748b'
  };

  getColor(type: string): string { return this.colors[type] || '#6b7280'; }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  getPercentage(size: number): number {
    const max = Math.max(...this.resources.map(r => r.transferSize), 1);
    return (size / max) * 100;
  }
}
