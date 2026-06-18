# CoreVitals

A desktop application for auditing VPN-restricted internal websites locally. Produces **identical performance metrics** by using the Lighthouse Node API directly with chrome-launcher.

## How It Works

CoreVitals runs the same Lighthouse engine locally on your machine. This means you can audit internal/VPN-restricted sites that cloud-based tools can't reach.

```
chrome-launcher → launches local Chrome with --remote-debugging-port
lighthouse(url, { port }) → runs full audit via Chrome DevTools Protocol
@axe-core/playwright → deep accessibility scan after Lighthouse finishes
playwright → security header checks + mixed content detection
tracium + CDP tracing → deep diagnostics (long tasks, LCP attribution, CLS sources)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Runtime | Electron |
| Frontend | Angular 19 (Standalone Components, Signals) |
| Styling | TailwindCSS |
| Charts | Apache ECharts (ngx-echarts) |
| Performance Audit | Lighthouse Node API + chrome-launcher |
| Accessibility | @axe-core/playwright |
| Page Analysis | Playwright |
| Trace Analysis | tracium + CDP |
| Third-Party Detection | third-party-web |
| PDF Export | Electron printToPDF |

## Prerequisites

- **Node.js** >= 18
- **Google Chrome** installed locally (chrome-launcher will find it automatically)
- **npm** >= 8

## Installation

```bash
git clone <repo-url>
cd corevitals
npm install
```

Install Playwright browsers (needed for accessibility/security scans):

```bash
npx playwright install chromium
```

## Running Locally

### Development (with hot reload)

Terminal 1 — Angular dev server:
```bash
npx ng serve
```

Terminal 2 — Electron pointing at dev server:
```bash
electron . --dev
```

### Production build

```bash
npm run electron:dev
```

This builds Angular in production mode, then launches Electron loading the static files.

### Package for distribution

```bash
npm run build
```

Uses electron-builder to produce a distributable installer for your platform.

## Features

### Audit Engine
- **Lighthouse Node API** — industry-standard performance metrics engine
- Configurable throttling: No Throttling, Simulated (default), Applied Slow 4G, Applied Fast 4G
- Device emulation: Desktop, Tablet, Mobile
- `throttlingMethod: 'simulate'` matches industry-standard Lighthouse scoring behavior

### Multi-Tab Support
- Run multiple audits and keep all results open
- Tab bar shows hostname, performance score badge, and close button
- Switch between tabs without losing data

### Dashboard Sections
- **Summary** — Overall scores (Performance, Accessibility, Best Practices, SEO), issue counts, Core Web Vitals with threshold bars
- **Resources** — Weight and request count by resource type (JS, CSS, Images, Fonts, etc.)
- **Performance** — Render-blocking resources, unused JS/CSS, unminified assets, cache policy issues with savings estimates
- **Accessibility** — axe-core violations with severity, affected elements, suggested fixes, and help links
- **SEO** — Meta descriptions, title tags, canonical URLs, crawlability, structured data
- **Security** — Missing headers (CSP, HSTS, X-Frame-Options, etc.), mixed content, HTTPS status
- **Quality** — Deprecated APIs, console errors, image aspect ratios, HTTP/2 usage
- **Diagnostics** — Trace-level deep analysis: long tasks with script attribution, LCP element identification and render delay, LCP discoverability (HTML vs JS-injected), layout shift sources with element identity, third-party blocking impact
- **Recommendations** — Prioritized list from all categories, filterable by type, with severity and fix suggestions

### Core Web Vitals Measured
| Metric | Source | Good | Poor |
|--------|--------|------|------|
| LCP | `lhr.audits['largest-contentful-paint']` | ≤2500ms | >4000ms |
| FCP | `lhr.audits['first-contentful-paint']` | ≤1800ms | >3000ms |
| TBT | `lhr.audits['total-blocking-time']` | ≤200ms | >600ms |
| CLS | `lhr.audits['cumulative-layout-shift']` | ≤0.1 | >0.25 |
| Speed Index | `lhr.audits['speed-index']` | ≤3400ms | >5800ms |
| TTFB | `lhr.audits['server-response-time']` | ≤800ms | >1800ms |

### PDF Export
- Full multi-page report with executive summary
- Core Web Vitals, accessibility violations, security headers
- Generated via Electron's `printToPDF` — no external dependencies

### Theme
- Dark mode (default) + Light mode
- Toggle via header button
- Persisted in localStorage

## Project Structure

```
corevitals/
├── electron/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Context bridge (IPC)
│   └── ipc/
│       ├── audit-handler.js      # chrome-launcher + lighthouse + playwright
│       ├── diagnostics-handler.js # CDP tracing + tracium + web-vitals attribution
│       └── pdf-handler.js        # PDF report generation
├── src/
│   ├── index.html
│   ├── main.ts
│   ├── styles.css           # TailwindCSS + CSS variables
│   └── app/
│       ├── app.component.ts
│       ├── core/
│       │   ├── models/      # TypeScript interfaces
│       │   ├── store/       # Signal-based state (multi-tab)
│       │   └── services/    # Electron bridge, theme, recommendations
│       ├── features/        # Lazy-loaded standalone components
│       │   ├── tab-bar/
│       │   ├── audit-config/
│       │   ├── audit-progress/
│       │   ├── dashboard/
│       │   ├── resource-analysis/
│       │   ├── performance-analysis/
│       │   ├── diagnostics/
│       │   ├── accessibility-analysis/
│       │   ├── seo-analysis/
│       │   ├── security-analysis/
│       │   ├── quality-analysis/
│       │   └── recommendations/
│       └── shared/          # Reusable UI components
│           ├── score-gauge/
│           └── metric-card/
├── angular.json
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npx ng serve` | Start Angular dev server (port 4200) |
| `npx ng build` | Build Angular for production |
| `npm run electron:dev` | Build + launch Electron |
| `npm start` | Launch Electron (assumes build exists) |
| `npm run build` | Full production build + package |

## Why Accurate Performance Metrics?

The audit uses the exact same Lighthouse engine and scoring methodology used by Google's cloud tools:

1. Chrome is launched locally via `chrome-launcher`
2. Lighthouse connects to Chrome's DevTools port
3. Lighthouse handles all metric collection internally (network interception, trace recording, paint timing)
4. Simulated throttling (`throttlingMethod: 'simulate'`) applies the same network/CPU models as Lighthouse's standard configuration
5. Scores are calculated using Lighthouse's built-in scoring curves

The only difference is the network path — your machine fetches the page directly instead of a remote server doing it. For internal/VPN sites, this is the only way to get accurate Lighthouse scores.

## License

MIT
