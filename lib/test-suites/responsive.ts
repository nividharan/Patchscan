import { Browser } from 'playwright';
import { RawBugFinding } from '../analyzer';

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  isMobile: boolean;
}

export const VIEWPORTS: ViewportConfig[] = [
  { name: 'Mobile (iPhone 14)', width: 390, height: 844, isMobile: true },
  { name: 'Tablet (iPad)', width: 768, height: 1024, isMobile: true },
  { name: 'Desktop (1440p)', width: 1440, height: 900, isMobile: false },
];

export async function runResponsiveTests(
  browser: Browser,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];
  onLog('📱 [Responsive] Starting multi-viewport responsive testing...', 'action');

  for (const viewport of VIEWPORTS) {
    onLog(`[Responsive] Testing at ${viewport.name} (${viewport.width}×${viewport.height})...`, 'action');

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
    });
    const page = await context.newPage();

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000);

      // Check 1: Horizontal overflow (most common mobile bug)
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      if (hasHorizontalOverflow) {
        const overflowWidth = await page.evaluate(() => document.body.scrollWidth);
        const shot = await page.screenshot({ type: 'jpeg', quality: 60 });
        bugs.push({
          id: `resp-overflow-${viewport.width}-${Date.now()}`,
          type: 'CONSOLE_ERROR',
          message: `Horizontal scroll overflow detected at ${viewport.name}. Body scrollWidth: ${overflowWidth}px exceeds viewport width: ${viewport.width}px.`,
          url: targetUrl,
          timestamp: new Date().toISOString(),
          actionTaken: `Viewport resize to ${viewport.width}×${viewport.height}`,
          screenshotBase64: `data:image/jpeg;base64,${shot.toString('base64')}`,
          category: 'RESPONSIVE',
        });
        onLog(`[Responsive] 💥 Horizontal overflow at ${viewport.name}!`, 'bug');
      }

      // Check 2: Elements overflowing their containers
      const overflowingElements = await page.evaluate(() => {
        const results: string[] = [];
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth + 5 && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
            results.push(`${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + String(el.className).split(' ')[0] : ''}`);
          }
        });
        return [...new Set(results)].slice(0, 5);
      });

      if (overflowingElements.length > 0) {
        bugs.push({
          id: `resp-elements-${viewport.width}-${Date.now()}`,
          type: 'CONSOLE_ERROR',
          message: `${overflowingElements.length} element(s) overflow viewport at ${viewport.name}: ${overflowingElements.join(', ')}`,
          url: targetUrl,
          timestamp: new Date().toISOString(),
          category: 'RESPONSIVE',
        });
        onLog(`[Responsive] 💥 Overflowing elements at ${viewport.name}: ${overflowingElements.join(', ')}`, 'bug');
      }

      // Check 3: Navigation menu collapses properly on mobile
      if (viewport.isMobile) {
        const desktopNav = await page.$('nav ul li:visible, nav .menu-item:visible');
        const hamburger = await page.$('[class*="hamburger"], [class*="menu-toggle"], [aria-label*="menu" i]');
        if (desktopNav && !hamburger) {
          bugs.push({
            id: `resp-nav-${viewport.width}-${Date.now()}`,
            type: 'CONSOLE_ERROR',
            message: `Navigation menu not collapsed on ${viewport.name}. No hamburger/toggle button detected.`,
            url: targetUrl,
            timestamp: new Date().toISOString(),
            category: 'RESPONSIVE',
          });
          onLog(`[Responsive] 💥 Non-collapsed nav menu at mobile viewport!`, 'bug');
        }
      }

      // Check 4: Text/image overlap
      const overlaps = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('p, h1, h2, h3, button, a'));
        const overlapping: string[] = [];
        for (let i = 0; i < elements.length && overlapping.length < 3; i++) {
          for (let j = i + 1; j < elements.length; j++) {
            const a = elements[i].getBoundingClientRect();
            const b = elements[j].getBoundingClientRect();
            if (a.width > 0 && b.width > 0 &&
                a.left < b.right && a.right > b.left &&
                a.top < b.bottom && a.bottom > b.top &&
                !elements[i].contains(elements[j]) && !elements[j].contains(elements[i])) {
              overlapping.push(`${elements[i].tagName} overlaps ${elements[j].tagName}`);
              break;
            }
          }
        }
        return overlapping;
      });

      if (overlaps.length > 0) {
        bugs.push({
          id: `resp-overlap-${viewport.width}-${Date.now()}`,
          type: 'CONSOLE_ERROR',
          message: `Element overlap detected at ${viewport.name}: ${overlaps.join('; ')}`,
          url: targetUrl,
          timestamp: new Date().toISOString(),
          category: 'RESPONSIVE',
        });
        onLog(`[Responsive] 💥 Element overlaps detected at ${viewport.name}!`, 'bug');
      }

      onLog(`[Responsive] ✓ ${viewport.name} — ${overflowingElements.length + overlaps.length} issues.`);
    } catch (err: any) {
      onLog(`[Responsive] Error at ${viewport.name}: ${err.message}`);
    } finally {
      await context.close();
    }
  }

  onLog(`[Responsive] Suite complete. Found ${bugs.length} responsive issue(s).`);
  return bugs;
}
