import { Injectable } from '@angular/core';
import { AuditResult } from '../models/audit.models';

export interface Recommendation {
  category: 'performance' | 'accessibility' | 'seo' | 'security' | 'quality';
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  title: string;
  description: string;
  impact: string;
  fix: string;
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  generate(result: AuditResult): Recommendation[] {
    const recs: Recommendation[] = [];

    // Performance recommendations
    result.metrics.performanceAudits.forEach(audit => {
      if (audit.score !== null && audit.score < 0.9) {
        recs.push({
          category: 'performance',
          severity: audit.score < 0.5 ? 'critical' : audit.score < 0.7 ? 'serious' : 'moderate',
          title: audit.title,
          description: audit.description?.replace(/<[^>]*>/g, '') || '',
          impact: audit.displayValue || 'Impacts page load performance',
          fix: this.getPerformanceFix(audit.id)
        });
      }
    });

    // Accessibility recommendations
    result.accessibility.violations.forEach(v => {
      recs.push({
        category: 'accessibility',
        severity: v.impact === 'critical' ? 'critical' : v.impact === 'serious' ? 'serious' : 'moderate',
        title: v.help,
        description: v.description,
        impact: `${v.nodes.length} element(s) affected`,
        fix: v.nodes[0]?.failureSummary || 'Review element accessibility'
      });
    });

    // Security recommendations
    result.security.headers.filter(h => !h.present).forEach(h => {
      recs.push({
        category: 'security',
        severity: h.risk === 'high' ? 'critical' : h.risk === 'medium' ? 'serious' : 'moderate',
        title: `Missing ${h.header}`,
        description: `The ${h.header} header is not set`,
        impact: `${h.risk} security risk`,
        fix: h.recommendation || `Configure ${h.header} on your server`
      });
    });

    // SEO recommendations
    result.metrics.seoAudits.forEach(audit => {
      if (audit.score !== null && audit.score < 1) {
        recs.push({
          category: 'seo',
          severity: audit.score === 0 ? 'serious' : 'moderate',
          title: audit.title,
          description: audit.description?.replace(/<[^>]*>/g, '') || '',
          impact: 'May affect search engine visibility',
          fix: this.getSEOFix(audit.id)
        });
      }
    });

    // Best practices recommendations
    result.metrics.bestPracticesAudits.forEach(audit => {
      if (audit.score !== null && audit.score < 1) {
        recs.push({
          category: 'quality',
          severity: audit.score === 0 ? 'serious' : 'moderate',
          title: audit.title,
          description: audit.description?.replace(/<[^>]*>/g, '') || '',
          impact: 'Quality concern',
          fix: 'Review and address the flagged issue'
        });
      }
    });

    return recs.sort((a, b) => {
      const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      return order[a.severity] - order[b.severity];
    });
  }

  private getPerformanceFix(id: string): string {
    const fixes: Record<string, string> = {
      'render-blocking-resources': 'Defer non-critical CSS/JS or inline critical resources',
      'unused-javascript': 'Remove unused code or implement code splitting',
      'unused-css-rules': 'Remove unused CSS or use PurgeCSS',
      'unminified-javascript': 'Minify JavaScript files using a bundler',
      'unminified-css': 'Minify CSS files',
      'total-byte-weight': 'Reduce overall page weight by optimizing assets',
      'uses-long-cache-ttl': 'Set appropriate Cache-Control headers',
      'dom-size': 'Reduce DOM complexity by simplifying markup',
      'uses-optimized-images': 'Compress images using WebP/AVIF format',
      'uses-text-compression': 'Enable gzip/brotli compression on the server',
      'uses-responsive-images': 'Serve appropriately sized images for each viewport'
    };
    return fixes[id] || 'Optimize based on the specific audit findings';
  }

  private getSEOFix(id: string): string {
    const fixes: Record<string, string> = {
      'document-title': 'Add a descriptive <title> tag',
      'meta-description': 'Add a <meta name="description"> tag',
      'link-text': 'Use descriptive link text instead of generic phrases',
      'is-crawlable': 'Remove noindex directive if page should be indexed',
      'canonical': 'Add a canonical URL tag'
    };
    return fixes[id] || 'Address the SEO issue identified';
  }
}
