# CoreVitals — Technical Overview

## Elevator Pitch

CoreVitals is a desktop app that runs Google Lighthouse audits on internal/VPN-restricted websites that cloud tools like PageSpeed Insights can't reach. It produces identical metrics because it uses the exact same Lighthouse Node API — the only difference is the network path runs locally.

---

## Architecture

**Electron** wraps an **Angular 19** frontend. The audit engine lives in Electron's main process; the UI is the renderer process. They communicate over **IPC** (Inter-Process Communication) via a secure context bridge (preload.js).

### Audit Pipeline

1. `chrome-launcher` spawns a headless Chrome with a remote debugging port
2. `lighthouse` connects via Chrome DevTools Protocol and runs the full PSI audit
3. `@axe-core/playwright` does a deep WCAG 2.1 accessibility scan
4. `playwright` inspects security headers and mixed content

---

## Key Concepts

### Signal-Based State Management

No NgRx, no RxJS BehaviorSubjects for state. The app uses Angular 19's native `signal()` and `computed()` in a custom `AuditStore`. This keeps state reactive without the ceremony of a full state library. The store holds multiple tabs, each with its own lifecycle: idle → running → complete/error.

### Standalone Components

Every component uses `standalone: true`. No NgModules anywhere. This is the modern Angular approach — components declare their own imports.

### Electron IPC with Context Isolation

- `contextIsolation: true` and `nodeIntegration: false` in BrowserWindow config
- The preload script uses `contextBridge.exposeInMainWorld()` to safely expose only specific API methods
- This is a security best practice — the renderer never has direct access to Node.js

### ESM Dynamic Imports for Lighthouse

Lighthouse 12+ is ESM-only, but Electron's main process is CommonJS. Solved with `await import('lighthouse')` at runtime rather than at module load time.

### Simulated Throttling

`throttlingMethod: 'simulate'` applies the same network/CPU models PSI uses. This is why the scores match cloud-based audits. The app also supports applied throttling (actual DevTools network/CPU constraints) for slow/fast 4G profiles.

### Multi-Tab Architecture

Each audit gets its own tab with isolated state (config, progress, result, error). Tabs are tracked by UUID, and the store handles the full lifecycle.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop Runtime | Electron | Access VPN networks, launch local Chrome |
| Frontend | Angular 19 (Signals) | Fine-grained reactivity, no zone.js overhead |
| Styling | TailwindCSS | Utility-first, fast iteration |
| Charts | Apache ECharts (ngx-echarts) | Rich data visualization |
| Performance Audit | Lighthouse Node API + chrome-launcher | Same engine as PSI |
| Accessibility | @axe-core/playwright | WCAG 2.1 AA compliance |
| Page Analysis | Playwright | Security headers, mixed content |
| PDF Export | Electron printToPDF | Zero external dependencies |

---

## Why Not Just Use PageSpeed Insights?

PSI runs from Google's servers. If your site is behind a VPN or on an internal network, Google can't reach it. CoreVitals runs the same engine locally, so you get identical scoring methodology for sites that are otherwise un-auditable by cloud tools.

---

## Security Design

- Context isolation prevents the renderer from accessing Node.js APIs directly
- Preload script exposes only a whitelist of IPC methods
- Security header auditing checks for CSP, HSTS, X-Frame-Options, COOP, CORP, etc.
- Mixed content detection flags HTTP resources on HTTPS pages

---

## Key Numbers

- **6 Core Web Vitals**: LCP, FCP, TBT, CLS, Speed Index, TTFB
- **9 security headers** checked
- **WCAG 2.1 Level AA** testing
- **4 throttling profiles**: None, Simulated (PSI default), Slow 4G, Fast 4G
- **3 device modes**: Desktop, Tablet, Mobile
- **Full PDF report** generation with executive summary

---

## Core Web Vitals Thresholds

| Metric | Good | Poor |
|--------|------|------|
| LCP (Largest Contentful Paint) | ≤ 2500ms | > 4000ms |
| FCP (First Contentful Paint) | ≤ 1800ms | > 3000ms |
| TBT (Total Blocking Time) | ≤ 200ms | > 600ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | > 0.25 |
| Speed Index | ≤ 3400ms | > 5800ms |
| TTFB (Time to First Byte) | ≤ 800ms | > 1800ms |

---

## Deep Diagnostics (Trace-Level Analysis)

Beyond Lighthouse scores, CoreVitals now collects trace-level insights that explain *why* metrics are what they are. This runs as an additional step after the standard audit pipeline and appears in a dedicated "Diagnostics" tab — separate from the existing Performance tab which shows Lighthouse audit results.

### How It Works

After the Lighthouse + axe-core + security audits complete, the diagnostics handler:

1. Launches a new Playwright browser session
2. Opens a CDP (Chrome DevTools Protocol) session on the page
3. Starts a performance trace (`Tracing.start`) with timeline + V8 + loading categories
4. Navigates to the URL and waits for network idle + 3s for late layout shifts
5. Stops the trace and parses it with `tracium` to extract main-thread task breakdowns
6. Collects `PerformanceObserver` entries for LCP attribution and layout shift sources
7. Checks if the LCP resource exists in the raw HTML (discoverability)
8. Analyzes third-party requests using `Resource Timing API` + the `third-party-web` dataset

### Diagnostics Sections

#### LCP Element Attribution

Shows exactly which DOM element is the Largest Contentful Paint and breaks down its timing:

- **Element**: The tag + ID/class of the LCP element (e.g., `IMG#hero.banner`)
- **Resource URL**: If LCP is an image/video, the URL of that resource
- **Load Time**: When the resource finished downloading
- **Render Time**: When the element was actually painted to screen
- **Render Delay**: The gap between load and render — indicates JavaScript blocking the paint after the resource is already available

#### LCP Discoverability

Determines whether the LCP resource is present in the initial HTML response or injected by JavaScript at runtime:

- **In HTML** (good): The browser's preload scanner can discover and fetch it immediately during HTML parsing
- **JS-Injected** (bad): The browser can't start loading the LCP resource until JavaScript executes, adding a full round-trip delay
- **Recommendation**: If JS-injected, suggests adding `<link rel="preload">` or inlining the resource reference in HTML

#### Long Tasks

Lists every main-thread task exceeding 50ms (up to the top 20, sorted by duration):

- **Duration**: How long the task blocked the main thread
- **Script Attribution**: Which JavaScript file or function triggered the task (extracted from trace events)
- **Type**: The kind of work (scripting, layout, paint, etc.)

Tasks over 50ms delay interactivity (TBT) and can push FCP/LCP later if they occur during page load. Tasks over 200ms are flagged as critical.

#### Layout Shift Sources

Identifies which elements caused Cumulative Layout Shift:

- **Shift Value**: The CLS contribution of each shift event
- **Source Elements**: Which DOM nodes moved
- **Rect Changes**: Previous and current dimensions of shifted elements

Only captures non-input-driven shifts (user scrolling/clicking doesn't count). This tells you exactly which elements to stabilize with explicit dimensions.

#### Third-Party Impact

Analyzes external requests to identify blocking third-party scripts:

- **Entity**: The recognized third-party (Google Analytics, Facebook SDK, Stripe, etc.) via the `third-party-web` dataset
- **Duration**: Total request time
- **Transfer Size**: Bytes downloaded
- **Render Blocking**: Whether the resource blocks first paint
- **Start Time**: When the request began relative to navigation

Sorted by duration — the slowest third parties appear first.

### Error Handling & Resilience

Diagnostics collection is entirely non-blocking:

- If diagnostics fails completely, the audit still returns successfully with all Lighthouse/accessibility/security data intact
- The Diagnostics tab shows an error banner explaining what went wrong
- A "retryable" flag indicates whether re-running the audit might succeed (transient issues like page timeouts, browser resource limits)
- If some checks succeed and others fail, partial results are displayed alongside warnings listing which specific checks encountered issues

### Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `tracium` | ^0.2.1 | Parses Chrome trace JSON into structured main-thread task data |
| `third-party-web` | ^0.29.2 | Maps request URLs to known third-party entities |

### File Structure

```
electron/ipc/diagnostics-handler.js   — Trace collection and analysis logic
src/app/features/diagnostics/         — Angular component for the Diagnostics tab
src/app/core/models/audit.models.ts   — DiagnosticsResult, DiagnosticsData, LongTask,
                                        LcpAttribution, LayoutShiftEntry,
                                        ThirdPartyRequest, LcpDiscoverability interfaces
```

### Relationship to Lighthouse Performance Tab

| Aspect | Performance Tab (Lighthouse) | Diagnostics Tab (Trace-Level) |
|--------|------------------------------|-------------------------------|
| Data source | Lighthouse audit recommendations | CDP trace + PerformanceObserver |
| Tells you | What's wrong (scores, audit items) | Why it's wrong (specific scripts, elements, timing) |
| Granularity | Audit-level (e.g., "render-blocking resources") | Task-level (e.g., "main.js took 340ms in this function") |
| Third-party info | Lists slow resources | Identifies entities + render-blocking status |
| CLS | Score + overall value | Per-element shift attribution |
| LCP | Score + display value | Element identity + load vs render breakdown + HTML discoverability |
