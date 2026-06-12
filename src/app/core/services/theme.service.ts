import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'dark' | 'light'>('dark');

  constructor() {
    const stored = localStorage.getItem('cv-theme') as 'dark' | 'light';
    if (stored) this.setTheme(stored);
  }

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(t: 'dark' | 'light'): void {
    this.theme.set(t);
    document.body.className = t;
    localStorage.setItem('cv-theme', t);
  }
}
