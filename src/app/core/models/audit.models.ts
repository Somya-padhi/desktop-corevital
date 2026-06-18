export interface AuditConfig {
  url: string;
  device: 'desktop' | 'tablet' | 'mobile';
  throttling: 'none' | 'simulated' | 'slow4g' | 'fast4g';
}

export interface AuditProgress {
  step: string;
  percentage: number;
  log: string;
}

export interface CoreWebVitalMetric {
  value: number | null;
  display: string | null;
  score: number | null;
}

export interface CoreWebVitals {
  lcp: CoreWebVitalMetric;
  fcp: CoreWebVitalMetric;
  tbt: CoreWebVitalMetric;
  cls: CoreWebVitalMetric;
  si: CoreWebVitalMetric;
  ttfb: CoreWebVitalMetric;
}

export interface AuditScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface PerformanceAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  details?: any;
}

export interface ResourceItem {
  resourceType: string;
  label: string;
  requestCount: number;
  transferSize: number;
}

export interface IndividualResource {
  url: string;
  resourceType: string;
  transferSize: number;
  resourceSize: number;
  statusCode: number;
  mimeType: string;
  protocol: string;
}

export interface AuditMetrics {
  scores: AuditScores;
  coreWebVitals: CoreWebVitals;
  performanceAudits: PerformanceAudit[];
  seoAudits: PerformanceAudit[];
  bestPracticesAudits: PerformanceAudit[];
  resourceSummary: ResourceItem[];
  individualResources: IndividualResource[];
}

export interface AccessibilityViolation {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodes: { html: string; target: string[]; failureSummary: string }[];
}

export interface AccessibilityResult {
  violations: AccessibilityViolation[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
}

export interface SecurityHeader {
  header: string;
  present: boolean;
  value: string | null;
  risk: 'high' | 'medium' | 'low';
  recommendation: string | null;
}

export interface SecurityResult {
  headers: SecurityHeader[];
  mixedContent: { tag: string; url: string }[];
  isHttps: boolean;
}

export interface AuditResult {
  success: boolean;
  error?: string;
  url: string;
  device: string;
  throttling: string;
  timestamp: string;
  metrics: AuditMetrics;
  accessibility: AccessibilityResult;
  security: SecurityResult;
  diagnostics: DiagnosticsResult | null;
  lighthouseVersion: string;
  fetchTime: string;
}

export interface DiagnosticsResult {
  data?: DiagnosticsData;
  partial?: DiagnosticsData | null;
  error?: string;
  warnings?: string[];
  retryable?: boolean;
}

export interface DiagnosticsData {
  longTasks: LongTask[];
  lcpAttribution: LcpAttribution | null;
  layoutShifts: LayoutShiftEntry[];
  thirdPartyBlocking: ThirdPartyRequest[];
  lcpDiscoverability: LcpDiscoverability | null;
  traceWarnings: string[];
}

export interface LongTask {
  duration: number;
  startTime: number;
  attribution: string;
  kind: string;
}

export interface LcpAttribution {
  element: string | null;
  url: string | null;
  renderTime: number;
  loadTime: number;
  size: number;
  renderDelay: number | null;
}

export interface LayoutShiftEntry {
  value: number;
  sources: { node: string; previousRect: string | null; currentRect: string | null }[];
}

export interface ThirdPartyRequest {
  url: string;
  duration: number;
  transferSize: number;
  initiatorType: string;
  renderBlocking: string;
  entity: string;
  startTime: number;
}

export interface LcpDiscoverability {
  url: string | null;
  inInitialHtml: boolean | null;
  recommendation: string;
}

export interface AuditTab {
  id: string;
  url: string;
  hostname: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  config: AuditConfig;
  progress: AuditProgress | null;
  result: AuditResult | null;
  error: string | null;
}
