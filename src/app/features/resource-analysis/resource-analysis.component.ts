import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceItem, IndividualResource } from '../../core/models/audit.models';

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

      <!-- Individual Resources Breakdown -->
      @if (individualResources.length > 0) {
        <div class="individual-section">
          <h3 class="section-title">Individual Resources</h3>
          <div class="filter-bar">
            <button class="filter-btn" [class.active]="activeFilter() === 'all'" (click)="activeFilter.set('all')">
              All ({{ individualResources.length }})
            </button>
            @for (type of resourceTypes(); track type.key) {
              <button class="filter-btn" [class.active]="activeFilter() === type.key" (click)="activeFilter.set(type.key)">
                <span class="filter-dot" [style.background]="getColor(type.key)"></span>
                {{ type.label }} ({{ type.count }})
              </button>
            }
          </div>
          <div class="details-table-wrapper">
            <table class="details-table">
              <thead>
                <tr>
                  <th class="col-url">Resource</th>
                  <th class="col-type">Type</th>
                  <th class="col-size">Transfer Size</th>
                  <th class="col-size">Resource Size</th>
                  <th class="col-status">Status</th>
                  <th class="col-protocol">Protocol</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredResources(); track item.url) {
                  <tr>
                    <td class="col-url" [title]="item.url">
                      <span class="resource-dot" [style.background]="getColor(item.resourceType)"></span>
                      <span class="url-text">{{ getFilename(item.url) }}</span>
                    </td>
                    <td class="col-type">{{ formatType(item.resourceType) }}</td>
                    <td class="col-size">{{ formatSize(item.transferSize) }}</td>
                    <td class="col-size">{{ formatSize(item.resourceSize) }}</td>
                    <td class="col-status">
                      <span class="status-badge" [class.ok]="item.statusCode >= 200 && item.statusCode < 300" [class.redirect]="item.statusCode >= 300 && item.statusCode < 400" [class.error]="item.statusCode >= 400">{{ item.statusCode }}</span>
                    </td>
                    <td class="col-protocol">{{ item.protocol }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="total-bar">
            <span>Showing {{ filteredResources().length }} resources</span>
            <span>Total transfer: {{ formatSize(filteredTotalSize()) }}</span>
          </div>
        </div>
      }
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

    .individual-section { margin-top: 28px; }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .filter-btn { display: flex; align-items: center; gap: 5px; padding: 5px 12px; font-size: 11px; font-weight: 500; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-secondary); border-radius: 14px; cursor: pointer; transition: all 0.15s; }
    .filter-btn:hover { border-color: var(--accent); color: var(--text-primary); }
    .filter-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
    .filter-dot { width: 8px; height: 8px; border-radius: 50%; }
    .details-table-wrapper { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 8px; }
    .details-table { width: 100%; font-size: 11px; border-collapse: collapse; }
    .details-table th { background: var(--bg-secondary); font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; padding: 10px 12px; }
    .details-table td { padding: 8px 12px; border-bottom: 1px solid var(--border-color); }
    .details-table tbody tr:hover { background: var(--bg-secondary); }
    .details-table tbody tr:last-child td { border-bottom: none; }
    .col-url { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .col-type { width: 80px; }
    .col-size { width: 100px; text-align: right; font-variant-numeric: tabular-nums; }
    .col-status { width: 60px; text-align: center; }
    .col-protocol { width: 70px; }
    .resource-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; flex-shrink: 0; }
    .url-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; }
    .status-badge.ok { background: rgba(12,206,107,0.1); color: #0cce6b; }
    .status-badge.redirect { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .status-badge.error { background: rgba(255,78,66,0.1); color: #ff4e42; }
    .total-bar { display: flex; justify-content: space-between; padding: 10px 12px; font-size: 11px; color: var(--text-secondary); background: var(--bg-secondary); border-radius: 0 0 8px 8px; border: 1px solid var(--border-color); border-top: none; }
  `]
})
export class ResourceAnalysisComponent {
  @Input() resources: ResourceItem[] = [];
  @Input() individualResources: IndividualResource[] = [];

  activeFilter = signal<string>('all');

  private colors: Record<string, string> = {
    script: '#f59e0b', stylesheet: '#8b5cf6', image: '#10b981',
    font: '#3b82f6', document: '#ef4444', other: '#6b7280',
    'third-party': '#ec4899', media: '#06b6d4', total: '#64748b',
    Script: '#f59e0b', Stylesheet: '#8b5cf6', Image: '#10b981',
    Font: '#3b82f6', Document: '#ef4444', Other: '#6b7280',
    Media: '#06b6d4', XHR: '#ec4899', Fetch: '#ec4899'
  };

  resourceTypes = computed(() => {
    const types = new Map<string, number>();
    for (const r of this.individualResources) {
      types.set(r.resourceType, (types.get(r.resourceType) || 0) + 1);
    }
    return Array.from(types.entries()).map(([key, count]) => ({
      key,
      label: this.formatType(key),
      count
    }));
  });

  filteredResources = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.individualResources;
    return this.individualResources.filter(r => r.resourceType === filter);
  });

  filteredTotalSize = computed(() => {
    return this.filteredResources().reduce((sum, r) => sum + r.transferSize, 0);
  });

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

  getFilename(url: string): string {
    try {
      const u = new URL(url);
      const path = u.pathname.split('/').pop() || u.hostname;
      return path.length > 50 ? path.slice(0, 47) + '...' : path;
    } catch {
      return url.length > 50 ? url.slice(0, 47) + '...' : url;
    }
  }

  formatType(type: string): string {
    const map: Record<string, string> = {
      Script: 'JS', Stylesheet: 'CSS', Image: 'Image', Font: 'Font',
      Document: 'Doc', Media: 'Media', XHR: 'XHR', Fetch: 'Fetch',
      script: 'JS', stylesheet: 'CSS', image: 'Image', font: 'Font',
      document: 'Doc', media: 'Media', other: 'Other', Other: 'Other'
    };
    return map[type] || type;
  }
}
