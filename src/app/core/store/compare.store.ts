import { Injectable, signal, computed } from '@angular/core';

export interface CompareTab {
  id: string;
  leftId: string | null;
  rightId: string | null;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class CompareStore {
  tabs = signal<CompareTab[]>([]);
  activeTabId = signal<string | null>(null);

  activeTab = computed(() => {
    const id = this.activeTabId();
    return this.tabs().find(t => t.id === id) || null;
  });

  createTab(): string {
    const id = crypto.randomUUID();
    const tab: CompareTab = { id, leftId: null, rightId: null, label: 'New Comparison' };
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

  updateSelection(id: string, leftId: string | null, rightId: string | null, label: string): void {
    this.tabs.update(tabs => tabs.map(t => t.id === id ? { ...t, leftId, rightId, label } : t));
  }
}
