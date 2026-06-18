const { BrowserWindow } = require('electron');

let tracium;
let thirdPartyWeb;

async function loadDiagnosticsModules() {
  if (!tracium) {
    tracium = require('tracium');
  }
  try {
    thirdPartyWeb = require('third-party-web');
  } catch {
    thirdPartyWeb = null;
  }
}

function sendProgress(step, percentage, log) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send('audit:progress', { step, percentage, log });
  }
}

/**
 * Runs deep diagnostics using CDP tracing and Playwright.
 * Returns diagnostics object or { error } if it fails — never throws.
 */
async function runDiagnostics(url, playwright) {
  const errors = [];
  const result = {
    longTasks: [],
    lcpAttribution: null,
    layoutShifts: [],
    thirdPartyBlocking: [],
    lcpDiscoverability: null,
    traceWarnings: []
  };

  try {
    await loadDiagnosticsModules();
  } catch (e) {
    return { error: `Failed to load diagnostics modules: ${e.message}`, partial: result, retryable: true };
  }

  let browser, context, page;
  try {
    sendProgress('Running deep diagnostics...', 82, 'Launching browser for trace collection');
    browser = await playwright.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
  } catch (e) {
    return { error: `Failed to launch browser for diagnostics: ${e.message}`, partial: result, retryable: true };
  }

  try {
    // Start CDP session for tracing
    const cdp = await context.newCDPSession(page);

    // Start trace
    sendProgress('Collecting performance trace...', 84, 'Recording CDP trace for long task analysis');
    await cdp.send('Tracing.start', {
      categories: [
        'devtools.timeline',
        'v8.execute',
        'blink.user_timing',
        'loading',
        'rail'
      ].join(','),
      options: 'sampling-frequency=10000'
    });

    // Navigate
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    // Wait a bit for late layout shifts
    await page.waitForTimeout(3000);

    // Stop trace and collect
    const traceChunks = [];
    cdp.on('Tracing.dataCollected', (data) => {
      traceChunks.push(...data.value);
    });

    await cdp.send('Tracing.end');
    // Wait for trace to flush
    await new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));

    const traceEvents = traceChunks;

    // Parse trace with tracium for long tasks
    sendProgress('Analyzing trace data...', 87, 'Extracting long tasks and script attribution');
    try {
      const tasks = tracium.computeMainThreadTasks({ traceEvents });
      const longTasks = tasks
        .filter(t => t.duration > 50)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 20)
        .map(t => ({
          duration: Math.round(t.duration),
          startTime: Math.round(t.startTime),
          attribution: extractTaskAttribution(t),
          kind: t.kind || 'other'
        }));
      result.longTasks = longTasks;
    } catch (e) {
      errors.push(`Trace parsing: ${e.message}`);
      result.traceWarnings.push('Long task analysis failed — trace data may be incomplete');
    }

    // Collect web-vitals attribution via page evaluation
    sendProgress('Collecting LCP attribution...', 89, 'Gathering web-vitals attribution data');
    try {
      const lcpData = await page.evaluate(() => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000);
          try {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length === 0) { resolve(null); return; }
              const last = entries[entries.length - 1];
              clearTimeout(timeout);
              resolve({
                element: last.element ? last.element.tagName + (last.element.id ? '#' + last.element.id : '') + (last.element.className ? '.' + last.element.className.split(' ')[0] : '') : null,
                url: last.url || null,
                renderTime: last.renderTime,
                loadTime: last.loadTime,
                size: last.size,
                renderDelay: last.renderTime > 0 ? last.renderTime - last.loadTime : null
              });
            }).observe({ type: 'largest-contentful-paint', buffered: true });
          } catch { clearTimeout(timeout); resolve(null); }
        });
      });
      result.lcpAttribution = lcpData;
    } catch (e) {
      errors.push(`LCP attribution: ${e.message}`);
    }

    // Collect layout shift attribution
    sendProgress('Analyzing layout shifts...', 91, 'Identifying CLS-contributing elements');
    try {
      const clsData = await page.evaluate(() => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve([]), 4000);
          try {
            const shifts = [];
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  const sources = (entry.sources || []).map(s => ({
                    node: s.node ? s.node.tagName + (s.node.id ? '#' + s.node.id : '') : 'unknown',
                    previousRect: s.previousRect ? `${s.previousRect.width}x${s.previousRect.height}` : null,
                    currentRect: s.currentRect ? `${s.currentRect.width}x${s.currentRect.height}` : null
                  }));
                  shifts.push({ value: entry.value, sources });
                }
              }
              clearTimeout(timeout);
              setTimeout(() => resolve(shifts), 2000);
            }).observe({ type: 'layout-shift', buffered: true });
          } catch { clearTimeout(timeout); resolve([]); }
        });
      });
      result.layoutShifts = clsData.slice(0, 10);
    } catch (e) {
      errors.push(`CLS attribution: ${e.message}`);
    }

    // Check LCP discoverability in raw HTML
    sendProgress('Checking LCP discoverability...', 93, 'Verifying if LCP element is in initial HTML');
    try {
      const rawHtml = await page.evaluate(() => {
        return fetch(location.href).then(r => r.text());
      });
      const lcpUrl = result.lcpAttribution?.url;
      if (lcpUrl) {
        const inHtml = rawHtml.includes(lcpUrl);
        result.lcpDiscoverability = {
          url: lcpUrl,
          inInitialHtml: inHtml,
          recommendation: inHtml
            ? 'LCP resource is discoverable in initial HTML — good for preload scanner'
            : 'LCP resource is NOT in initial HTML — likely injected by JavaScript. Consider adding a <link rel="preload"> or inlining it in the HTML'
        };
      } else if (result.lcpAttribution?.element) {
        result.lcpDiscoverability = {
          url: null,
          inInitialHtml: null,
          recommendation: 'LCP element is text/inline content — no external resource to discover'
        };
      }
    } catch (e) {
      errors.push(`LCP discoverability: ${e.message}`);
    }

    // Third-party blocking analysis
    sendProgress('Analyzing third-party impact...', 95, 'Identifying blocking third-party scripts');
    try {
      const requests = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(r => ({
          name: r.name,
          duration: r.duration,
          transferSize: r.transferSize,
          initiatorType: r.initiatorType,
          renderBlockingStatus: r.renderBlockingStatus || 'unknown',
          startTime: r.startTime
        }));
      });

      const pageOrigin = new URL(url).origin;
      const thirdPartyRequests = requests
        .filter(r => {
          try { return new URL(r.name).origin !== pageOrigin; } catch { return false; }
        })
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 15)
        .map(r => {
          let entity = null;
          if (thirdPartyWeb && thirdPartyWeb.getEntity) {
            try { entity = thirdPartyWeb.getEntity(r.name); } catch {}
          }
          return {
            url: r.name,
            duration: Math.round(r.duration),
            transferSize: r.transferSize,
            initiatorType: r.initiatorType,
            renderBlocking: r.renderBlockingStatus,
            entity: entity ? entity.name : guessEntity(r.name),
            startTime: Math.round(r.startTime)
          };
        });
      result.thirdPartyBlocking = thirdPartyRequests;
    } catch (e) {
      errors.push(`Third-party analysis: ${e.message}`);
    }

  } catch (e) {
    errors.push(`Diagnostics navigation/trace: ${e.message}`);
  } finally {
    try { await context.close(); } catch {}
    try { await browser.close(); } catch {}
  }

  if (errors.length > 0) {
    return { partial: result, warnings: errors, retryable: true };
  }
  return { data: result, warnings: [], retryable: false };
}

function extractTaskAttribution(task) {
  if (!task.children || task.children.length === 0) {
    return task.event?.args?.data?.url || task.event?.args?.data?.functionName || 'anonymous';
  }
  // Find the heaviest child
  const heaviest = task.children.sort((a, b) => b.duration - a.duration)[0];
  const url = heaviest?.event?.args?.data?.url || '';
  const fn = heaviest?.event?.args?.data?.functionName || '';
  if (url) return url + (fn ? ` (${fn})` : '');
  if (fn) return fn;
  return 'internal';
}

function guessEntity(url) {
  try {
    const host = new URL(url).hostname;
    const parts = host.split('.');
    if (parts.length >= 2) return parts[parts.length - 2];
    return host;
  } catch { return 'unknown'; }
}

module.exports = { runDiagnostics };
