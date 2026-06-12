import { Injectable, signal, computed } from '@angular/core';
import { AuditTab, AuditConfig, AuditProgress, AuditResult } from '../models/audit.models';

@Injectable({ providedIn: 'root' })
export class AuditStore {
  tabs = signal<AuditTab[]>([]);
  activeTabId = signal<string | null>(null);

  activeTab = computed(() => {
    const id = this.activeTabId();
    return this.tabs().find(t => t.id === id) || null;
  });

  createTab(config: AuditConfig): string {
    const id = crypto.randomUUID();
    let hostname: string;
    try { hostname = new URL(config.url).hostname; } catch { hostname = config.url; }

    const tab: AuditTab = {
      id,
      url: config.url,
      hostname,
      status: 'idle',
      config,
      progress: null,
      result: null,
      error: null
    };

    this.tabs.update(tabs => [...tabs, tab]);
    this.activeTabId.set(id);
    return id;
  }

  setActiveTab(id: string): void {
    this.activeTabId.set(id);
  }

  closeTab(id: string): void {
    this.tabs.update(tabs => tabs.filter(t => t.id !== id));
    if (this.activeTabId() === id) {
      const remaining = this.tabs();
      this.activeTabId.set(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  }

  updateTabStatus(id: string, status: AuditTab['status']): void {
    this.tabs.update(tabs => tabs.map(t => t.id === id ? { ...t, status } : t));
  }

  updateTabProgress(id: string, progress: AuditProgress): void {
    this.tabs.update(tabs => tabs.map(t => t.id === id ? { ...t, progress } : t));
  }

  updateTabResult(id: string, result: AuditResult): void {
    this.tabs.update(tabs => tabs.map(t => t.id === id ? { ...t, status: 'complete', result, error: null } : t));
  }

  updateTabError(id: string, error: string): void {
    this.tabs.update(tabs => tabs.map(t => t.id === id ? { ...t, status: 'error', error } : t));
  }
}
