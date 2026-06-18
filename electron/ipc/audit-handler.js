const path = require('path');
const { ipcMain, BrowserWindow } = require('electron');
const { runDiagnostics } = require('./diagnostics-handler');

let chromeLauncher;
let lighthouse;
let playwright;
let AxeBuilder;

let currentAudit = null;
let modulesLoaded = false;

async function loadModules() {
  if (modulesLoaded) return;
  // Lighthouse v12+ is ESM-only, must use dynamic import
  chromeLauncher = await import('chrome-launcher');
  lighthouse = (await import('lighthouse')).default;
  const pw = await import('playwright');
  playwright = pw.chromium;
  const axe = await import('@axe-core/playwright');
  AxeBuilder = axe.AxeBuilder;
  modulesLoaded = true;
}

function sendProgress(step, percentage, log) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send('audit:progress', { step, percentage, log });
  }
}

function getDeviceConfig(device) {
  const configs = {
    desktop: {
      formFactor: 'desktop',
      screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
      throttling: { cpuSlowdownMultiplier: 1 },
      emulatedUserAgent: ''
    },
    tablet: {
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 768, height: 1024, deviceScaleFactor: 2, disabled: false },
      throttling: { cpuSlowdownMultiplier: 2 }
    },
    mobile: {
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 2.625, disabled: false },
      throttling: { cpuSlowdownMultiplier: 4 }
    }
  };
  return configs[device] || configs.desktop;
}

function getThrottlingConfig(profile, device) {
  const base = device === 'desktop'
    ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }
    : { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 };

  const configs = {
    none: { throttlingMethod: 'provided', throttling: { rttMs: 0, throughputKbps: 0, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 } },
    simulated: { throttlingMethod: 'simulate', throttling: { ...base, requestLatencyMs: base.rttMs, downloadThroughputKbps: base.throughputKbps, uploadThroughputKbps: base.throughputKbps * 0.4 } },
    slow4g: { throttlingMethod: 'devtools', throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 150 * 3.75, downloadThroughputKbps: 1638.4 * 0.9, uploadThroughputKbps: 675 * 0.9 } },
    fast4g: { throttlingMethod: 'devtools', throttling: { rttMs: 60, throughputKbps: 4096, cpuSlowdownMultiplier: 2, requestLatencyMs: 60 * 3.75, downloadThroughputKbps: 4096 * 0.9, uploadThroughputKbps: 2048 * 0.9 } }
  };
  return configs[profile] || configs.simulated;
}

async function runLighthouseAudit(url, config) {
  sendProgress('Launching Chrome...', 5, 'Starting local Chrome instance');

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu']
  });

  try {
    sendProgress('Running Lighthouse audit...', 15, `Auditing ${url} on port ${chrome.port}`);

    const deviceConfig = getDeviceConfig(config.device);
    const throttlingConfig = getThrottlingConfig(config.throttling, config.device);

    const lighthouseFlags = {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      ...throttlingConfig,
      screenEmulation: deviceConfig.screenEmulation,
      formFactor: deviceConfig.formFactor,
      emulatedUserAgent: deviceConfig.emulatedUserAgent || undefined
    };

    sendProgress('Lighthouse analyzing performance...', 30, 'Collecting performance metrics, accessibility, SEO, best practices');

    const result = await lighthouse(url, lighthouseFlags);
    const lhr = result.lhr;

    sendProgress('Lighthouse complete', 60, 'Processing Lighthouse results');

    return lhr;
  } finally {
    // Small delay to let Chrome release file locks on Windows
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await chrome.kill();
    } catch (e) {
      // EBUSY errors on Windows during cleanup are non-fatal
      console.log('[CoreVitals] Chrome cleanup warning:', e.message);
    }
  }
}

async function runAccessibilityAudit(url) {
  sendProgress('Running accessibility audit...', 65, 'Launching Playwright for axe-core scan');

  const browser = await playwright.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    sendProgress('Scanning with axe-core...', 70, 'Running WCAG 2.1 accessibility checks');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    return {
      violations: results.violations,
      passes: results.passes,
      incomplete: results.incomplete,
      inapplicable: results.inapplicable
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runSecurityAudit(url) {
  sendProgress('Running security audit...', 75, 'Checking security headers and mixed content');

  const browser = await playwright.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    const headers = response.headers();

    const securityHeaders = [
      { name: 'content-security-policy', label: 'Content-Security-Policy', risk: 'high' },
      { name: 'strict-transport-security', label: 'Strict-Transport-Security (HSTS)', risk: 'high' },
      { name: 'x-frame-options', label: 'X-Frame-Options', risk: 'medium' },
      { name: 'x-content-type-options', label: 'X-Content-Type-Options', risk: 'medium' },
      { name: 'referrer-policy', label: 'Referrer-Policy', risk: 'low' },
      { name: 'permissions-policy', label: 'Permissions-Policy', risk: 'low' },
      { name: 'x-xss-protection', label: 'X-XSS-Protection', risk: 'low' },
      { name: 'cross-origin-opener-policy', label: 'Cross-Origin-Opener-Policy', risk: 'medium' },
      { name: 'cross-origin-resource-policy', label: 'Cross-Origin-Resource-Policy', risk: 'medium' }
    ];

    const findings = securityHeaders.map(h => ({
      header: h.label,
      present: !!headers[h.name],
      value: headers[h.name] || null,
      risk: h.risk,
      recommendation: headers[h.name] ? null : `Add ${h.label} header to improve security`
    }));

    const mixedContent = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]').forEach(el => {
        items.push({ tag: el.tagName, url: el.src || el.href });
      });
      return items;
    });

    return { headers: findings, mixedContent, isHttps: url.startsWith('https') };
  } finally {
    await context.close();
    await browser.close();
  }
}

function extractMetrics(lhr) {
  const audit = (id) => lhr.audits[id] || {};
  return {
    scores: {
      performance: Math.round((lhr.categories.performance?.score || 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((lhr.categories.seo?.score || 0) * 100)
    },
    coreWebVitals: {
      lcp: { value: audit('largest-contentful-paint').numericValue, display: audit('largest-contentful-paint').displayValue, score: audit('largest-contentful-paint').score },
      fcp: { value: audit('first-contentful-paint').numericValue, display: audit('first-contentful-paint').displayValue, score: audit('first-contentful-paint').score },
      tbt: { value: audit('total-blocking-time').numericValue, display: audit('total-blocking-time').displayValue, score: audit('total-blocking-time').score },
      cls: { value: audit('cumulative-layout-shift').numericValue, display: audit('cumulative-layout-shift').displayValue, score: audit('cumulative-layout-shift').score },
      si: { value: audit('speed-index').numericValue, display: audit('speed-index').displayValue, score: audit('speed-index').score },
      ttfb: { value: audit('server-response-time').numericValue, display: audit('server-response-time').displayValue, score: audit('server-response-time').score }
    },
    performanceAudits: extractPerformanceAudits(lhr),
    seoAudits: extractSEOAudits(lhr),
    bestPracticesAudits: extractBestPracticesAudits(lhr),
    resourceSummary: extractResourceSummary(lhr),
    individualResources: extractIndividualResources(lhr)
  };
}

function extractPerformanceAudits(lhr) {
  const keys = [
    'render-blocking-resources', 'unused-javascript', 'unused-css-rules',
    'unminified-javascript', 'unminified-css', 'total-byte-weight',
    'uses-long-cache-ttl', 'dom-size', 'uses-optimized-images',
    'uses-text-compression', 'uses-responsive-images', 'efficient-animated-content'
  ];
  return keys.map(key => {
    const audit = lhr.audits[key];
    if (!audit) return null;
    return {
      id: key,
      title: audit.title,
      description: audit.description,
      score: audit.score,
      displayValue: audit.displayValue,
      numericValue: audit.numericValue,
      details: audit.details
    };
  }).filter(Boolean);
}

function extractSEOAudits(lhr) {
  const keys = [
    'document-title', 'meta-description', 'link-text', 'crawlable-anchors',
    'is-crawlable', 'hreflang', 'canonical', 'structured-data',
    'robots-txt', 'http-status-code'
  ];
  return keys.map(key => {
    const audit = lhr.audits[key];
    if (!audit) return null;
    return { id: key, title: audit.title, description: audit.description, score: audit.score, displayValue: audit.displayValue, details: audit.details };
  }).filter(Boolean);
}

function extractBestPracticesAudits(lhr) {
  const keys = [
    'deprecations', 'errors-in-console', 'image-aspect-ratio',
    'image-size-responsive', 'is-on-https', 'geolocation-on-start',
    'notification-on-start', 'paste-preventing-inputs', 'uses-http2',
    'inspector-issues'
  ];
  return keys.map(key => {
    const audit = lhr.audits[key];
    if (!audit) return null;
    return { id: key, title: audit.title, description: audit.description, score: audit.score, displayValue: audit.displayValue, details: audit.details };
  }).filter(Boolean);
}

function extractResourceSummary(lhr) {
  const audit = lhr.audits['resource-summary'];
  if (!audit || !audit.details || !audit.details.items) return [];
  return audit.details.items.map(item => ({
    resourceType: item.resourceType,
    label: item.label,
    requestCount: item.requestCount,
    transferSize: item.transferSize
  }));
}

function extractIndividualResources(lhr) {
  const audit = lhr.audits['network-requests'];
  if (!audit || !audit.details || !audit.details.items) return [];
  return audit.details.items
    .filter(item => item.transferSize > 0)
    .map(item => ({
      url: item.url,
      resourceType: item.resourceType || 'Other',
      transferSize: item.transferSize || 0,
      resourceSize: item.resourceSize || 0,
      statusCode: item.statusCode || 0,
      mimeType: item.mimeType || '',
      protocol: item.protocol || ''
    }))
    .sort((a, b) => b.transferSize - a.transferSize);
}

// Register IPC handlers immediately (no async module loading needed at registration time)
ipcMain.handle('audit:run', async (_event, config) => {
  try {
    // Load ESM modules on first use
    await loadModules();

    currentAudit = { cancelled: false };

    const lhr = await runLighthouseAudit(config.url, config);
    if (currentAudit.cancelled) return { error: 'Audit cancelled' };

    const metrics = extractMetrics(lhr);

    const accessibility = await runAccessibilityAudit(config.url);
    if (currentAudit.cancelled) return { error: 'Audit cancelled' };

    sendProgress('Accessibility complete', 75, `Found ${accessibility.violations.length} violations`);

    const security = await runSecurityAudit(config.url);
    if (currentAudit.cancelled) return { error: 'Audit cancelled' };

    // Run deep diagnostics (non-blocking — failures are captured gracefully)
    sendProgress('Running deep diagnostics...', 80, 'Collecting trace-level performance insights');
    let diagnostics = null;
    try {
      diagnostics = await runDiagnostics(config.url, playwright);
    } catch (e) {
      diagnostics = { error: `Diagnostics failed: ${e.message}`, partial: null, retryable: true };
    }

    sendProgress('Audit complete!', 100, 'All checks finished');

    return {
      success: true,
      url: config.url,
      device: config.device,
      throttling: config.throttling,
      timestamp: new Date().toISOString(),
      metrics,
      accessibility,
      security,
      diagnostics,
      lighthouseVersion: lhr.lighthouseVersion,
      fetchTime: lhr.fetchTime
    };
  } catch (error) {
    sendProgress('Error', 0, error.message);
    return { error: error.message };
  } finally {
    currentAudit = null;
  }
});

ipcMain.handle('audit:cancel', () => {
  if (currentAudit) currentAudit.cancelled = true;
  return { success: true };
});

console.log('[CoreVitals] IPC handlers registered (audit:run, audit:cancel)');
