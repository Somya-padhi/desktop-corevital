import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card metric-card">
      <div class="metric-label">{{ label }}</div>
      <div class="metric-value" [class]="scoreClass">{{ displayValue || '-' }}</div>
      <div class="threshold-bar">
        <div class="threshold-segment good" [style.width]="goodWidth"></div>
        <div class="threshold-segment average" [style.width]="avgWidth"></div>
        <div class="threshold-segment poor" [style.width]="poorWidth"></div>
        <div class="threshold-marker" [style.left]="markerPosition"></div>
      </div>
      <div class="threshold-labels">
        <span class="good-label">{{ goodLabel }}</span>
        <span class="avg-label">{{ avgLabel }}</span>
        <span class="poor-label">{{ poorLabel }}</span>
      </div>
    </div>
  `,
  styles: [`
    .metric-card { padding: 16px; }
    .metric-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 500; }
    .metric-value { font-size: 24px; font-weight: 700; margin: 6px 0 12px; }
    .metric-value.good { color: var(--score-good); }
    .metric-value.average { color: var(--score-average); }
    .metric-value.poor { color: var(--score-poor); }
    .threshold-bar { position: relative; height: 4px; border-radius: 2px; display: flex; overflow: hidden; }
    .threshold-segment { height: 100%; }
    .threshold-segment.good { background: var(--score-good); }
    .threshold-segment.average { background: var(--score-average); }
    .threshold-segment.poor { background: var(--score-poor); }
    .threshold-marker { position: absolute; top: -3px; width: 3px; height: 10px; background: var(--text-primary); border-radius: 1px; transform: translateX(-50%); }
    .threshold-labels { display: flex; justify-content: space-between; margin-top: 6px; font-size: 9px; color: var(--text-secondary); }
  `]
})
export class MetricCardComponent {
  @Input() label = '';
  @Input() displayValue: string | null = null;
  @Input() score: number | null = null;
  @Input() thresholds: [number, number] = [0, 0]; // [good, poor]
  @Input() value: number | null = null;
  @Input() unit = '';

  get scoreClass(): string {
    if (this.score === null) return '';
    if (this.score >= 0.9) return 'good';
    if (this.score >= 0.5) return 'average';
    return 'poor';
  }

  get goodWidth(): string { return '33.3%'; }
  get avgWidth(): string { return '33.3%'; }
  get poorWidth(): string { return '33.4%'; }

  get goodLabel(): string { return this.thresholds[0] ? `≤${this.thresholds[0]}${this.unit}` : ''; }
  get avgLabel(): string { return this.thresholds[0] && this.thresholds[1] ? `≤${this.thresholds[1]}${this.unit}` : ''; }
  get poorLabel(): string { return this.thresholds[1] ? `>${this.thresholds[1]}${this.unit}` : ''; }

  get markerPosition(): string {
    if (!this.value || !this.thresholds[1]) return '0%';
    const max = this.thresholds[1] * 1.5;
    const pct = Math.min((this.value / max) * 100, 100);
    return `${pct}%`;
  }
}
