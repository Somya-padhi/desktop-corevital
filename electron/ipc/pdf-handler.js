const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

ipcMain.handle('pdf:export', async (_event, data) => {
  try {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    const html = generateReportHTML(data);
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      paperWidth: 8.5,
      paperHeight: 11,
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
    });

    win.close();

    const { dialog } = require('electron');
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Audit Report',
      defaultPath: `CoreVitals-Report-${new Date().toISOString().slice(0, 10)}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, path: filePath };
    }
    return { success: false, reason: 'cancelled' };
  } catch (error) {
    return { error: error.message };
  }
});

function generateReportHTML(data) {
  const { metrics, accessibility, security, url, timestamp, device, throttling } = data;
  const scores = metrics.scores;
  const cwv = metrics.coreWebVitals;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>CoreVitals Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; padding: 40px; font-size: 12px; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
  .header h1 { font-size: 28px; color: #1e40af; margin-bottom: 5px; }
  .header .meta { color: #64748b; font-size: 11px; }
  .section { margin-bottom: 25px; page-break-inside: avoid; }
  .section h2 { font-size: 16px; color: #1e3a8a; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; }
  .scores-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
  .score-card { text-align: center; padding: 15px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
  .score-card .value { font-size: 32px; font-weight: 700; }
  .score-card .label { font-size: 11px; color: #64748b; margin-top: 5px; }
  .good { color: #0cce6b; } .average { color: #ffa400; } .poor { color: #ff4e42; }
  .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .metric-card { padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
  .metric-card .name { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .metric-card .val { font-size: 18px; font-weight: 600; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
  .badge-high { background: #fee2e2; color: #dc2626; }
  .badge-medium { background: #fef3c7; color: #d97706; }
  .badge-low { background: #dcfce7; color: #16a34a; }
</style></head><body>
  <div class="header">
    <h1>CoreVitals Audit Report</h1>
    <div class="meta">${url} &bull; ${device} &bull; ${throttling} throttling &bull; ${new Date(timestamp).toLocaleDateString()}</div>
  </div>

  <div class="scores-grid">
    <div class="score-card"><div class="value ${getScoreClass(scores.performance)}">${scores.performance}</div><div class="label">Performance</div></div>
    <div class="score-card"><div class="value ${getScoreClass(scores.accessibility)}">${scores.accessibility}</div><div class="label">Accessibility</div></div>
    <div class="score-card"><div class="value ${getScoreClass(scores.bestPractices)}">${scores.bestPractices}</div><div class="label">Best Practices</div></div>
    <div class="score-card"><div class="value ${getScoreClass(scores.seo)}">${scores.seo}</div><div class="label">SEO</div></div>
  </div>

  <div class="section">
    <h2>Core Web Vitals</h2>
    <div class="metrics-grid">
      <div class="metric-card"><div class="name">LCP</div><div class="val ${getScoreClass(cwv.lcp.score)}">${cwv.lcp.display || '-'}</div></div>
      <div class="metric-card"><div class="name">FCP</div><div class="val ${getScoreClass(cwv.fcp.score)}">${cwv.fcp.display || '-'}</div></div>
      <div class="metric-card"><div class="name">TBT</div><div class="val ${getScoreClass(cwv.tbt.score)}">${cwv.tbt.display || '-'}</div></div>
      <div class="metric-card"><div class="name">CLS</div><div class="val ${getScoreClass(cwv.cls.score)}">${cwv.cls.display || '-'}</div></div>
      <div class="metric-card"><div class="name">Speed Index</div><div class="val ${getScoreClass(cwv.si.score)}">${cwv.si.display || '-'}</div></div>
      <div class="metric-card"><div class="name">TTFB</div><div class="val ${getScoreClass(cwv.ttfb.score)}">${cwv.ttfb.display || '-'}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Accessibility (${accessibility.violations.length} violations)</h2>
    ${accessibility.violations.length > 0 ? `<table><tr><th>Issue</th><th>Impact</th><th>Elements</th></tr>
    ${accessibility.violations.slice(0, 15).map(v => `<tr><td>${v.description}</td><td><span class="badge badge-${v.impact === 'critical' || v.impact === 'serious' ? 'high' : v.impact === 'moderate' ? 'medium' : 'low'}">${v.impact}</span></td><td>${v.nodes.length}</td></tr>`).join('')}
    </table>` : '<p>No accessibility violations found.</p>'}
  </div>

  <div class="section">
    <h2>Security Headers</h2>
    <table><tr><th>Header</th><th>Status</th><th>Risk</th></tr>
    ${security.headers.map(h => `<tr><td>${h.header}</td><td>${h.present ? '✓ Present' : '✗ Missing'}</td><td><span class="badge badge-${h.risk}">${h.risk}</span></td></tr>`).join('')}
    </table>
  </div>
</body></html>`;
}

function getScoreClass(score) {
  if (score === null || score === undefined) return '';
  const s = typeof score === 'number' && score <= 1 ? score * 100 : score;
  if (s >= 90) return 'good';
  if (s >= 50) return 'average';
  return 'poor';
}
