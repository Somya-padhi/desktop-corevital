import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-score-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gauge-container">
      <svg viewBox="0 0 120 120" class="gauge-svg">
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-color)" stroke-width="6" opacity="0.3"/>
        <circle cx="60" cy="60" r="54" fill="none"
          [attr.stroke]="color()"
          stroke-width="6"
          stroke-linecap="round"
          [style.stroke-dasharray]="dashArray()"
          [style.stroke-dashoffset]="dashOffset()"
          transform="rotate(-90 60 60)"
          class="gauge-progress"/>
      </svg>
      <div class="gauge-value" [style.color]="color()">{{ score() }}</div>
      <div class="gauge-label">{{ label }}</div>
    </div>
  `,
  styles: [`
    .gauge-container { display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; }
    .gauge-svg { width: 100%; max-width: 100px; }
    .gauge-progress { transition: stroke-dashoffset 1s ease-out; }
    .gauge-value { position: relative; margin-top: -66px; font-size: 24px; font-weight: 700; }
    .gauge-label { font-size: 11px; color: var(--text-secondary); margin-top: 12px; text-align: center; }
  `]
})
export class ScoreGaugeComponent {
  @Input() set value(v: number) { this.score.set(v); }
  @Input() label = '';

  score = signal(0);
  circumference = 2 * Math.PI * 54;

  color = computed(() => {
    const s = this.score();
    if (s >= 90) return 'var(--score-good)';
    if (s >= 50) return 'var(--score-average)';
    return 'var(--score-poor)';
  });

  dashArray = computed(() => `${this.circumference}`);
  dashOffset = computed(() => `${this.circumference - (this.score() / 100) * this.circumference}`);
}
