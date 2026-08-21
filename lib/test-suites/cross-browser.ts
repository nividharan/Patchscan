import { Browser } from 'playwright';
import { RawBugFinding } from '../analyzer';

type BrowserType = 'chromium' | 'firefox' | 'webkit';

export async function runCrossBrowserTests(
  browsers: Record<BrowserType, Browser | null>,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];
  const results: Record<string, { errors: string[]; title: string; h1: string }> = {};

  const browserNames: BrowserType[] = ['chromium', 'firefox', 'webkit'];

  onLog('🌍 [Cross-Browser] Running cross-browser compatibility checks...', 'action');

  for (const browserName of browserNames) {
    const browser = browsers[browserName];
    if (!browser) {
      onLog(`[Cross-Browser] Skipping ${browserName} (not available).`);
      continue;
    }

    onLog(`[Cross-Browser] Testing on ${browserName}...`, 'action');
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text().substring(0, 100));
    });
    page.on('pageerror', err => errors.push(err.message.substring(0, 100)));

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000);

      const title = await page.title();
      const h1 = await page.$eval('h1', el => el.textContent?.trim() || '').catch(() => '');

      results[browserName] = { errors, title, h1 };
      onLog(`[Cross-Browser] ${browserName}: ${errors.length} console error(s). Title: "${title}"`);
    } catch (err: any) {
      onLog(`[Cross-Browser] ${browserName} navigation failed: ${err.message}`);
      results[browserName] = { errors: [err.message], title: '', h1: '' };
    } finally {
      await context.close();
    }
  }

  // Compare results across browsers
  const browsers2 = Object.keys(results) as BrowserType[];
  if (browsers2.length >= 2) {
    const reference = results[browsers2[0]];

    for (const browserName of browsers2.slice(1)) {
      const current = results[browserName];

      // Different console errors across browsers
      const uniqueErrors = current.errors.filter(e => !reference.errors.includes(e));
      if (uniqueErrors.length > 0) {
        bugs.push({
          id: `cross-${browserName}-errors-${Date.now()}`,
          type: 'CONSOLE_ERROR',
          message: `${browserName} has ${uniqueErrors.length} unique console error(s) not present in ${browsers2[0]}: ${uniqueErrors.slice(0, 2).join('; ')}`,
          url: targetUrl,
          timestamp: new Date().toISOString(),
          category: 'CROSS_BROWSER',
        });
        onLog(`[Cross-Browser] 💥 ${browserName}-specific errors detected!`, 'bug');
      }

      // Different page titles (rendering issue)
      if (current.title && reference.title && current.title !== reference.title) {
        bugs.push({
          id: `cross-${browserName}-title-${Date.now()}`,
          type: 'CONSOLE_ERROR',
          message: `Page title differs across browsers: ${browsers2[0]}: "${reference.title}" vs ${browserName}: "${current.title}"`,
          url: targetUrl,
          timestamp: new Date().toISOString(),
          category: 'CROSS_BROWSER',
        });
      }
    }

    // Report errors that appear in ALL browsers (common bugs)
    for (const browserName of browsers2) {
      if (results[browserName].errors.length > 0) {
        bugs.push({
          id: `cross-common-${browserName}-${Date.now()}`,
          type: 'CONSOLE_ERROR',
          message: `${browserName} console errors during page load (${results[browserName].errors.length} total): ${results[browserName].errors[0]}`,
          url: targetUrl,
          timestamp: new Date().toISOString(),
          category: 'CROSS_BROWSER',
        });
      }
    }
  }

  onLog(`[Cross-Browser] Suite complete. Found ${bugs.length} cross-browser issue(s).`);
  return bugs;
}
