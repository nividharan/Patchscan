import { Page } from 'playwright';
import { RawBugFinding } from '../analyzer';

export interface PerformanceMetrics {
  lcp: number | null;
  cls: number | null;
  ttfb: number | null;
  fcp: number | null;
  totalPayloadKB: number;
  renderBlockingScripts: number;
  domElements: number;
  pageLoadMs: number;
}

export async function runPerformanceTests(
  page: Page,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];
  onLog('⚡ [Performance] Starting Core Web Vitals & performance audit...', 'action');

  const startTime = Date.now();

  // Collect all network resources
  const resources: { url: string; size: number; type: string }[] = [];
  page.on('response', async (res) => {
    try {
      const headers = res.headers();
      const contentLength = parseInt(headers['content-length'] || '0');
      const contentType = headers['content-type'] || '';
      resources.push({
        url: res.url(),
        size: contentLength,
        type: contentType,
      });
    } catch (_) {}
  });

  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 20000 });
  const pageLoadMs = Date.now() - startTime;

  onLog(`[Performance] Page fully loaded in ${pageLoadMs}ms.`);

  // Collect Web Vitals via PerformanceObserver
  const vitals = await page.evaluate((): PerformanceMetrics => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const ttfb = nav ? nav.responseStart - nav.requestStart : null;
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
    const domElements = document.querySelectorAll('*').length;

    // LCP from PerformanceObserver (approximated from largest image/text)
    let lcp: number | null = null;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      lcp = (lcpEntries[lcpEntries.length - 1] as any).startTime;
    }

    // CLS from layout shift entries
    let cls: number | null = null;
    const layoutShifts = performance.getEntriesByType('layout-shift');
    if (layoutShifts.length > 0) {
      cls = layoutShifts.reduce((sum, entry: any) => sum + (entry.value || 0), 0);
    }

    return { lcp, cls, ttfb, fcp, totalPayloadKB: 0, renderBlockingScripts: 0, domElements, pageLoadMs: 0 };
  });

  // Calculate total payload
  const totalPayloadKB = resources.reduce((sum, r) => sum + (r.size || 0), 0) / 1024;

  // Count render-blocking scripts
  const renderBlockingScripts = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script:not([async]):not([defer])[src]'));
    return scripts.length;
  });

  onLog(`[Performance] LCP: ${vitals.lcp ? vitals.lcp.toFixed(0) : 'N/A'}ms | TTFB: ${vitals.ttfb ? vitals.ttfb.toFixed(0) : 'N/A'}ms | CLS: ${vitals.cls ? vitals.cls.toFixed(3) : 'N/A'}`);
  onLog(`[Performance] Total payload: ${totalPayloadKB.toFixed(1)}KB | DOM elements: ${vitals.domElements} | Render-blocking scripts: ${renderBlockingScripts}`);

  // Evaluate thresholds
  if (pageLoadMs > 3000) {
    bugs.push({
      id: `perf-load-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `Page load time ${pageLoadMs}ms exceeds 3000ms threshold (Good: <1000ms, Needs Improvement: 1000-3000ms, Poor: >3000ms).`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'PERFORMANCE',
      actionTaken: 'Full page load measurement',
    });
    onLog(`[Performance] 💥 Slow page load: ${pageLoadMs}ms!`, 'bug');
  }

  if (vitals.lcp && vitals.lcp > 2500) {
    bugs.push({
      id: `perf-lcp-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `LCP (Largest Contentful Paint) is ${vitals.lcp.toFixed(0)}ms. Google threshold: Good <2500ms, Needs Improvement 2500-4000ms, Poor >4000ms.`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'PERFORMANCE',
    });
    onLog(`[Performance] 💥 Poor LCP: ${vitals.lcp.toFixed(0)}ms!`, 'bug');
  }

  if (vitals.cls && vitals.cls > 0.1) {
    bugs.push({
      id: `perf-cls-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `CLS (Cumulative Layout Shift) score is ${vitals.cls.toFixed(3)}. Google threshold: Good <0.1, Needs Improvement 0.1-0.25, Poor >0.25. Elements are jumping during load.`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'PERFORMANCE',
    });
    onLog(`[Performance] 💥 High CLS score: ${vitals.cls.toFixed(3)}!`, 'bug');
  }

  if (totalPayloadKB > 3000) {
    bugs.push({
      id: `perf-payload-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `Total page payload is ${totalPayloadKB.toFixed(0)}KB (${(totalPayloadKB / 1024).toFixed(1)}MB). Recommended maximum: 3000KB (3MB) for optimal mobile performance.`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'PERFORMANCE',
    });
    onLog(`[Performance] 💥 Oversized payload: ${totalPayloadKB.toFixed(0)}KB!`, 'bug');
  }

  if (renderBlockingScripts > 3) {
    bugs.push({
      id: `perf-blocking-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `${renderBlockingScripts} render-blocking <script> tags found without async or defer attribute. This delays page paint significantly.`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'PERFORMANCE',
    });
    onLog(`[Performance] 💥 ${renderBlockingScripts} render-blocking scripts!`, 'bug');
  }

  if (vitals.domElements > 1500) {
    bugs.push({
      id: `perf-dom-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `DOM contains ${vitals.domElements} elements (recommended max: 1500). Excessive DOM size causes slow style recalculation and longer paint times.`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'PERFORMANCE',
    });
    onLog(`[Performance] ⚠️ Large DOM: ${vitals.domElements} elements!`, 'bug');
  }

  if (vitals.ttfb && vitals.ttfb > 800) {
    bugs.push({
      id: `perf-ttfb-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `TTFB (Time To First Byte) is ${vitals.ttfb.toFixed(0)}ms. Good: <800ms. High TTFB indicates slow server response, database queries, or missing caching.`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'PERFORMANCE',
    });
    onLog(`[Performance] 💥 High TTFB: ${vitals.ttfb.toFixed(0)}ms!`, 'bug');
  }

  onLog(`[Performance] Suite complete. Found ${bugs.length} performance issue(s).`);
  return bugs;
}
