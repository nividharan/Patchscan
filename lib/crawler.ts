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

  // Launch primary Chromium browser
  emit('ACTION', 'Launching primary Chromium headless browser...');
  const primaryBrowser = await chromium.launch({ headless: true });

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
    emit('LOG', `Engine error: ${err.message}`);
  } finally {
    await primaryBrowser.close();
    if (firefoxBrowser) await firefoxBrowser.close().catch(() => {});
    if (webkitBrowser) await webkitBrowser.close().catch(() => {});
  }

  emit('COMPLETE', `All suites complete. Total issues found: ${allBugs.length}.`);
  return allBugs;
}
