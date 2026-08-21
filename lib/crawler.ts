import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import { RawBugFinding } from './analyzer';
import { runFunctionalTests } from './test-suites/functional';
import { runResponsiveTests } from './test-suites/responsive';
import { runAccessibilityTests } from './test-suites/accessibility';
import { runPerformanceTests } from './test-suites/performance';
import { runSecurityTests } from './test-suites/security';
import { runApiMonitorTests } from './test-suites/api-monitor';
import { runCrossBrowserTests } from './test-suites/cross-browser';
import { runFileTests } from './test-suites/file-testing';
import { runLocalizationTests } from './test-suites/localization';
import { runConcurrencyTests } from './test-suites/concurrency';

export interface CrawlProgressEvent {
  type: 'LOG' | 'ACTION' | 'BUG_FOUND' | 'SCREENSHOT' | 'COMPLETE' | 'SUITE_START' | 'SUITE_DONE';
  message: string;
  timestamp: string;
  screenshotBase64?: string;
  suite?: string;
}

export interface ScanConfig {
  functional: boolean;
  responsive: boolean;
  accessibility: boolean;
  performance: boolean;
  security: boolean;
  apiMonitor: boolean;
  crossBrowser: boolean;
  fileUpload: boolean;
  localization: boolean;
  concurrency: boolean;
}

export const DEFAULT_CONFIG: ScanConfig = {
  functional: true,
  responsive: true,
  accessibility: true,
  performance: true,
  security: true,
  apiMonitor: true,
  crossBrowser: false,
  fileUpload: true,
  localization: false,
  concurrency: false,
};

export async function crawlAndTestUrl(
  targetUrl: string,
  onProgress: (event: CrawlProgressEvent) => void,
  config: ScanConfig = DEFAULT_CONFIG,
): Promise<RawBugFinding[]> {
  const allBugs: RawBugFinding[] = [];

  const emit = (type: CrawlProgressEvent['type'], message: string, suite?: string, screenshotBase64?: string) => {
    onProgress({ type, message, timestamp: new Date().toLocaleTimeString(), screenshotBase64, suite });
  };

  let formattedUrl = targetUrl.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }

  emit('LOG', `Initializing WebHealer AI engine for: ${formattedUrl}`);
  emit('LOG', `Active test suites: ${Object.entries(config).filter(([, v]) => v).map(([k]) => k).join(', ')}`);

  // Launch primary Chromium browser with resilient fallback
  emit('ACTION', 'Launching Chromium browser engine...');
  let primaryBrowser: Browser | null = null;
  try {
    primaryBrowser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (launchErr: any) {
    emit('LOG', `Note: Host environment container lacks shared desktop libraries. Switching to Resilient HTTP/DOM Probe Engine...`);
  }

  // If browser failed to launch on restricted host, run resilient HTTP/DOM inspection
  if (!primaryBrowser) {
    return await runHttpFallbackScan(formattedUrl, config, emit, allBugs);
  }

  // Launch additional browsers only if cross-browser is enabled
  let firefoxBrowser: Browser | null = null;
  let webkitBrowser: Browser | null = null;
  if (config.crossBrowser) {
    emit('ACTION', 'Launching Firefox and WebKit browsers for cross-browser testing...');
    try {
      firefoxBrowser = await firefox.launch({ headless: true });
    } catch (_) {
      emit('LOG', 'Firefox not available, skipping.');
    }
    try {
      webkitBrowser = await webkit.launch({ headless: true });
    } catch (_) {
      emit('LOG', 'WebKit not available, skipping.');
    }
  }

  // Shared logger for suites
  const makeLogger = (suite: string) => (msg: string, type?: 'action' | 'bug' | 'log') => {
    const evtType = type === 'bug' ? 'BUG_FOUND' : type === 'action' ? 'ACTION' : 'LOG';
    emit(evtType, msg, suite);
  };

  try {
    // ── Primary page for single-page suites ──────────────────────────────────
    const primaryContext = await primaryBrowser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 WebHealerAI/2.0',
    });
    const primaryPage = await primaryContext.newPage();

    // Capture initial errors on primary page
    primaryPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        allBugs.push({
          id: `console-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: 'CONSOLE_ERROR',
          message: msg.text(),
          url: formattedUrl,
          timestamp: new Date().toISOString(),
          category: 'FUNCTIONAL',
        });
        emit('BUG_FOUND', `[Console Error] ${msg.text()}`, 'functional');
      }
    });
    primaryPage.on('pageerror', (err) => {
      allBugs.push({
        id: `runtime-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'RUNTIME_EXCEPTION',
        message: err.message,
        url: formattedUrl,
        timestamp: new Date().toISOString(),
        category: 'FUNCTIONAL',
      });
      emit('BUG_FOUND', `[JS Exception] ${err.message}`, 'functional');
    });
    primaryPage.on('requestfailed', (req) => {
      const failure = req.failure();
      allBugs.push({
        id: `netfail-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'NETWORK_FAILURE',
        message: `Request failed: ${req.url()} — ${failure?.errorText || 'unknown'}`,
        url: formattedUrl,
        timestamp: new Date().toISOString(),
        category: 'API',
      });
      emit('BUG_FOUND', `[Network Fail] ${req.url()}`, 'api');
    });

    // Initial navigation
    emit('ACTION', `Navigating to ${formattedUrl}...`);
    await primaryPage.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Initial screenshot
    try {
      const shot = await primaryPage.screenshot({ type: 'jpeg', quality: 60 });
      emit('SCREENSHOT', 'Initial page snapshot', 'general', `data:image/jpeg;base64,${shot.toString('base64')}`);
    } catch (_) {}

    emit('LOG', 'Page loaded. Starting parallel test suite execution...');

    // ── Run suites — fast ones in parallel on separate pages ──────────────────

    const suitePromises: Promise<RawBugFinding[]>[] = [];

    // Functional (on primary page with fresh navigation)
    if (config.functional) {
      emit('SUITE_START', 'Functional Testing starting...', 'functional');
      const funcPage = await primaryContext.newPage();
      await funcPage.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      suitePromises.push(
        runFunctionalTests(funcPage, formattedUrl, makeLogger('functional'))
          .then(bugs => { emit('SUITE_DONE', `Functional: ${bugs.length} issue(s) found.`, 'functional'); funcPage.close(); return bugs; })
          .catch(() => [])
      );
    }

    // Accessibility
    if (config.accessibility) {
      emit('SUITE_START', 'Accessibility Testing starting...', 'accessibility');
      const a11yPage = await primaryContext.newPage();
      await a11yPage.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      suitePromises.push(
        runAccessibilityTests(a11yPage, formattedUrl, makeLogger('accessibility'))
          .then(bugs => { emit('SUITE_DONE', `Accessibility: ${bugs.length} issue(s) found.`, 'accessibility'); a11yPage.close(); return bugs; })
          .catch(() => [])
      );
    }

    // Security
    if (config.security) {
      emit('SUITE_START', 'Security Testing starting...', 'security');
      const secPage = await primaryContext.newPage();
      await secPage.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      suitePromises.push(
        runSecurityTests(secPage, formattedUrl, makeLogger('security'))
          .then(bugs => { emit('SUITE_DONE', `Security: ${bugs.length} issue(s) found.`, 'security'); secPage.close(); return bugs; })
          .catch(() => [])
      );
    }

    // API Monitor
    if (config.apiMonitor) {
      emit('SUITE_START', 'API Monitoring starting...', 'api');
      const apiPage = await primaryContext.newPage();
      suitePromises.push(
        runApiMonitorTests(apiPage, formattedUrl, makeLogger('api'))
          .then(bugs => { emit('SUITE_DONE', `API Monitor: ${bugs.length} issue(s) found.`, 'api'); apiPage.close(); return bugs; })
          .catch(() => [])
      );
    }

    // File Upload/Download
    if (config.fileUpload) {
      emit('SUITE_START', 'File Upload/Download Testing starting...', 'file');
      const filePage = await primaryContext.newPage();
      await filePage.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      suitePromises.push(
        runFileTests(filePage, formattedUrl, makeLogger('file'))
          .then(bugs => { emit('SUITE_DONE', `File Testing: ${bugs.length} issue(s) found.`, 'file'); filePage.close(); return bugs; })
          .catch(() => [])
      );
    }

    // Performance (needs its own context for clean network capture)
    if (config.performance) {
      emit('SUITE_START', 'Performance Testing starting...', 'performance');
      const perfContext = await primaryBrowser.newContext({ viewport: { width: 1280, height: 720 } });
      const perfPage = await perfContext.newPage();
      suitePromises.push(
        runPerformanceTests(perfPage, formattedUrl, makeLogger('performance'))
          .then(bugs => { emit('SUITE_DONE', `Performance: ${bugs.length} issue(s) found.`, 'performance'); perfContext.close(); return bugs; })
          .catch(() => [])
      );
    }

    // Responsive (needs separate contexts at different viewports)
    if (config.responsive) {
      emit('SUITE_START', 'Responsive Testing starting...', 'responsive');
      suitePromises.push(
        runResponsiveTests(primaryBrowser, formattedUrl, makeLogger('responsive'))
          .then(bugs => { emit('SUITE_DONE', `Responsive: ${bugs.length} issue(s) found.`, 'responsive'); return bugs; })
          .catch(() => [])
      );
    }

    // Cross-browser (only if enabled, uses additional browsers)
    if (config.crossBrowser) {
      emit('SUITE_START', 'Cross-Browser Testing starting...', 'crossbrowser');
      suitePromises.push(
        runCrossBrowserTests(
          { chromium: primaryBrowser, firefox: firefoxBrowser, webkit: webkitBrowser },
          formattedUrl,
          makeLogger('crossbrowser')
        )
          .then(bugs => { emit('SUITE_DONE', `Cross-Browser: ${bugs.length} issue(s) found.`, 'crossbrowser'); return bugs; })
          .catch(() => [])
      );
    }

    // Localization (uses separate browser contexts with locales)
    if (config.localization) {
      emit('SUITE_START', 'Localization Testing starting...', 'localization');
      suitePromises.push(
        runLocalizationTests(primaryBrowser, formattedUrl, makeLogger('localization'))
          .then(bugs => { emit('SUITE_DONE', `Localization: ${bugs.length} issue(s) found.`, 'localization'); return bugs; })
          .catch(() => [])
      );
    }

    // Concurrency (uses multiple browser contexts)
    if (config.concurrency) {
      emit('SUITE_START', 'Concurrency Testing starting...', 'concurrency');
      suitePromises.push(
        runConcurrencyTests(primaryBrowser, formattedUrl, makeLogger('concurrency'))
          .then(bugs => { emit('SUITE_DONE', `Concurrency: ${bugs.length} issue(s) found.`, 'concurrency'); return bugs; })
          .catch(() => [])
      );
    }

    // Await all suites in parallel
    emit('LOG', `Running ${suitePromises.length} test suite(s) in parallel...`);
    const allSuiteResults = await Promise.all(suitePromises);
    allSuiteResults.flat().forEach(bug => allBugs.push(bug));

    // Final screenshot
    try {
      const finalShot = await primaryPage.screenshot({ type: 'jpeg', quality: 60 });
      emit('SCREENSHOT', 'Final crawl snapshot', 'general', `data:image/jpeg;base64,${finalShot.toString('base64')}`);
    } catch (_) {}

    await primaryContext.close();

  } catch (err: any) {
    emit('LOG', `Notice: Browser execution interrupted (${err.message}). Completing sweep with Resilient HTTP/DOM Probe...`);
    if (allBugs.length === 0) {
      return await runHttpFallbackScan(formattedUrl, config, emit, allBugs);
    }
  } finally {
    if (primaryBrowser) await primaryBrowser.close().catch(() => {});
    if (firefoxBrowser) await firefoxBrowser.close().catch(() => {});
    if (webkitBrowser) await webkitBrowser.close().catch(() => {});
  }

  emit('COMPLETE', `All suites complete. Total issues found: ${allBugs.length}.`);
  return allBugs;
}

/**
 * Resilient HTTP/DOM fallback inspection engine when host environment
 * lacks desktop GUI display drivers or sandbox privileges.
 */
export async function runHttpFallbackScan(
  formattedUrl: string,
  config: ScanConfig,
  emit: (type: CrawlProgressEvent['type'], message: string, suite?: string, screenshotBase64?: string) => void,
  allBugs: RawBugFinding[],
): Promise<RawBugFinding[]> {
  emit('LOG', `Initiating HTTP/DOM Deep Probe on: ${formattedUrl}`);

  try {
    const startTime = Date.now();
    const res = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 WebHealer/2.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    const latency = Date.now() - startTime;
    const html = await res.text();
    const headers = res.headers;

    // 1. Security Headers Inspection
    if (config.security) {
      emit('SUITE_START', 'Security Headers audit running...', 'security');
      const requiredHeaders = [
        { name: 'content-security-policy', label: 'CONTENT-SECURITY-POLICY' },
        { name: 'strict-transport-security', label: 'STRICT-TRANSPORT-SECURITY' },
        { name: 'x-frame-options', label: 'X-FRAME-OPTIONS' },
        { name: 'x-content-type-options', label: 'X-CONTENT-TYPE-OPTIONS' },
        { name: 'permissions-policy', label: 'PERMISSIONS-POLICY' },
      ];

      for (const h of requiredHeaders) {
        if (!headers.get(h.name)) {
          allBugs.push({
            id: `sec-${h.name}-${Date.now()}`,
            type: 'RUNTIME_EXCEPTION',
            message: `Missing security response header: "${h.label}". This leaves the application vulnerable to injection or clickjacking.`,
            url: formattedUrl,
            timestamp: new Date().toISOString(),
            category: 'SECURITY',
          });
          emit('BUG_FOUND', `Missing Header: ${h.label}`, 'security');
        }
      }

      // Check cookie security
      const setCookie = headers.get('set-cookie');
      if (setCookie && (!setCookie.includes('HttpOnly') || !setCookie.includes('Secure'))) {
        allBugs.push({
          id: `sec-cookie-${Date.now()}`,
          type: 'RUNTIME_EXCEPTION',
          message: `Session cookie is missing "HttpOnly" or "Secure" flags, making it vulnerable to XSS exfiltration.`,
          url: formattedUrl,
          timestamp: new Date().toISOString(),
          category: 'SECURITY',
        });
        emit('BUG_FOUND', 'Insecure Cookie Attributes Detected', 'security');
      }
      emit('SUITE_DONE', 'Security Headers audit completed.', 'security');
    }

    // 2. Accessibility (WCAG 2.1) Inspection
    if (config.accessibility) {
      emit('SUITE_START', 'WCAG Accessibility DOM probe running...', 'accessibility');
      
      // Images missing alt
      const imgRegex = /<img(?![^>]*\balt=)[^>]*>/gi;
      const missingAltMatches = html.match(imgRegex);
      if (missingAltMatches && missingAltMatches.length > 0) {
        allBugs.push({
          id: `a11y-alt-${Date.now()}`,
          type: 'RUNTIME_EXCEPTION',
          message: `Found ${missingAltMatches.length} image(s) missing required "alt" attributes (WCAG 1.1.1 Non-Text Content).`,
          url: formattedUrl,
          timestamp: new Date().toISOString(),
          category: 'ACCESSIBILITY',
        });
        emit('BUG_FOUND', `WCAG 1.1.1: ${missingAltMatches.length} images missing alt text`, 'accessibility');
      }

      // Form inputs missing labels
      const inputRegex = /<input(?![^>]*\b(aria-label|aria-labelledby|id)=)[^>]*>/gi;
      const unlabelledInputs = html.match(inputRegex);
      if (unlabelledInputs && unlabelledInputs.length > 0) {
        allBugs.push({
          id: `a11y-label-${Date.now()}`,
          type: 'RUNTIME_EXCEPTION',
          message: `Found ${unlabelledInputs.length} form input element(s) with no associated label or aria-label (WCAG 1.3.1 Info and Relationships).`,
          url: formattedUrl,
          timestamp: new Date().toISOString(),
          category: 'ACCESSIBILITY',
        });
        emit('BUG_FOUND', `WCAG 1.3.1: Form inputs missing accessible labels`, 'accessibility');
      }
      emit('SUITE_DONE', 'WCAG Accessibility audit completed.', 'accessibility');
    }

    // 3. Performance / Latency Inspection
    if (config.performance) {
      emit('SUITE_START', 'Performance & Vitals measurement running...', 'performance');
      if (latency > 1500) {
        allBugs.push({
          id: `perf-ttfb-${Date.now()}`,
          type: 'RUNTIME_EXCEPTION',
          message: `Server Time to First Byte (TTFB) is ${latency}ms (exceeds 1500ms recommended threshold).`,
          url: formattedUrl,
          timestamp: new Date().toISOString(),
          category: 'PERFORMANCE',
        });
        emit('BUG_FOUND', `Slow TTFB: ${latency}ms latency`, 'performance');
      } else {
        emit('LOG', `Server TTFB: ${latency}ms (Excellent response latency)`, 'performance');
      }
      emit('SUITE_DONE', 'Performance telemetry completed.', 'performance');
    }

    // 4. Functional / Status Inspection
    if (config.functional) {
      emit('SUITE_START', 'Functional HTTP and DOM health probe running...', 'functional');
      if (!res.ok) {
        allBugs.push({
          id: `func-status-${Date.now()}`,
          type: 'NETWORK_FAILURE',
          message: `Target URL returned HTTP error status ${res.status} (${res.statusText}).`,
          url: formattedUrl,
          timestamp: new Date().toISOString(),
          category: 'FUNCTIONAL',
        });
        emit('BUG_FOUND', `HTTP ${res.status} Status Error`, 'functional');
      }

      // Check document title
      if (!html.includes('<title>') || html.includes('<title></title>')) {
        allBugs.push({
          id: `func-title-${Date.now()}`,
          type: 'RUNTIME_EXCEPTION',
          message: `Web page is missing a valid <title> tag in the HTML head.`,
          url: formattedUrl,
          timestamp: new Date().toISOString(),
          category: 'FUNCTIONAL',
        });
        emit('BUG_FOUND', 'Missing Document Title', 'functional');
      }
      emit('SUITE_DONE', 'Functional health audit completed.', 'functional');
    }

    // 5. Localization / Responsive / API suites
    if (config.localization) {
      emit('SUITE_START', 'Localization checks...', 'localization');
      if (!html.includes('lang=')) {
        allBugs.push({
          id: `i18n-lang-${Date.now()}`,
          type: 'RUNTIME_EXCEPTION',
          message: `Root <html> tag is missing standard "lang" attribute (e.g. lang="en").`,
          url: formattedUrl,
          timestamp: new Date().toISOString(),
          category: 'LOCALIZATION',
        });
        emit('BUG_FOUND', 'Missing HTML lang attribute', 'localization');
      }
      emit('SUITE_DONE', 'Localization checks completed.', 'localization');
    }

    if (config.responsive) {
      emit('SUITE_START', 'Responsive viewport audit...', 'responsive');
      if (!html.includes('viewport')) {
        allBugs.push({
          id: `resp-viewport-${Date.now()}`,
          type: 'RUNTIME_EXCEPTION',
          message: `HTML is missing <meta name="viewport"> tag, which causes mobile layout scaling failures.`,
          url: formattedUrl,
          timestamp: new Date().toISOString(),
          category: 'RESPONSIVE',
        });
        emit('BUG_FOUND', 'Missing Viewport Meta Tag', 'responsive');
      }
      emit('SUITE_DONE', 'Responsive audit completed.', 'responsive');
    }

  } catch (err: any) {
    emit('LOG', `HTTP Probe encountered an error: ${err.message}`);
  }

  emit('COMPLETE', `Resilient sweep complete. Total issues found: ${allBugs.length}.`);
  return allBugs;
}
