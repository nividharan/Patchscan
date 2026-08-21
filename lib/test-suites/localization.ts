import { Browser } from 'playwright';
import { RawBugFinding } from '../analyzer';

const LOCALES = [
  { locale: 'ar-SA', name: 'Arabic (RTL)', dir: 'rtl' },
  { locale: 'de-DE', name: 'German (text expansion)' },
  { locale: 'ja-JP', name: 'Japanese (CJK characters)' },
];

export async function runLocalizationTests(
  browser: Browser,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];
  onLog('🌐 [Localization] Starting i18n & localization tests...', 'action');

  // Check 1: HTML lang attribute
  const context0 = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 720 } });
  const page0 = await context0.newPage();
  try {
    await page0.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const langAttr = await page0.getAttribute('html', 'lang');
    if (!langAttr) {
      bugs.push({
        id: `i18n-lang-attr-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: 'Missing <html lang="..."> attribute. Screen readers and translation tools need this to identify the page language.',
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'LOCALIZATION',
      });
      onLog('[i18n] 💥 Missing <html lang=""> attribute!', 'bug');
    } else {
      onLog(`[i18n] ✓ <html lang="${langAttr}"> found.`);
    }

    // Check 2: Date/currency hardcoding (simplified heuristic)
    const hardcodedDates = await page0.evaluate(() => {
      const allText = document.body.innerText;
      const dateRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/gi;
      const currencyRegex = /\$\s*\d+(\.\d{2})?/g;
      return {
        dates: (allText.match(dateRegex) || []).slice(0, 3),
        currencies: (allText.match(currencyRegex) || []).slice(0, 3),
      };
    });

    if (hardcodedDates.dates.length > 0) {
      bugs.push({
        id: `i18n-hardcoded-date-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: `Hardcoded English date format detected: ${hardcodedDates.dates.join(', ')}. Use Intl.DateTimeFormat() with locale-aware formatting instead.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'LOCALIZATION',
      });
      onLog('[i18n] ⚠️ Hardcoded date format detected!', 'bug');
    }
  } catch (_) {}
  await context0.close();

  // Check 3: RTL layout (Arabic)
  onLog('[i18n] Testing Arabic RTL layout...', 'action');
  const contextAr = await browser.newContext({ locale: 'ar-SA', viewport: { width: 1280, height: 720 } });
  const pageAr = await contextAr.newPage();
  try {
    await pageAr.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await pageAr.waitForTimeout(500);

    const rtlIssues = await pageAr.evaluate(() => {
      const htmlDir = document.documentElement.getAttribute('dir');
      const bodyDir = document.body.getAttribute('dir') || window.getComputedStyle(document.body).direction;
      const issues: string[] = [];
      if (htmlDir !== 'rtl' && bodyDir !== 'rtl') {
        issues.push('No RTL direction set for Arabic locale');
      }
      return issues;
    });

    if (rtlIssues.length > 0) {
      bugs.push({
        id: `i18n-rtl-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: `RTL layout not configured for Arabic locale. ${rtlIssues.join('; ')}. Add dir="rtl" and CSS logical properties for RTL support.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'LOCALIZATION',
      });
      onLog('[i18n] 💥 RTL layout not configured!', 'bug');
    }
  } catch (_) {}
  await contextAr.close();

  // Check 4: Text expansion for German locale (text can be 30-40% longer)
  onLog('[i18n] Testing German locale text expansion...', 'action');
  const contextDe = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 720 } });
  const pageDe = await contextDe.newPage();
  try {
    await pageDe.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await pageDe.waitForTimeout(500);

    // Check for horizontal overflow at German locale
    const hasOverflow = await pageDe.evaluate(() => document.body.scrollWidth > window.innerWidth);
    if (hasOverflow) {
      bugs.push({
        id: `i18n-overflow-de-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: 'Layout overflow detected with de-DE locale. German text is typically 30-40% longer than English. UI components need flexible width to accommodate text expansion.',
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'LOCALIZATION',
      });
      onLog('[i18n] 💥 Layout overflow with German locale!', 'bug');
    } else {
      onLog('[i18n] ✓ No layout overflow with German locale.');
    }
  } catch (_) {}
  await contextDe.close();

  onLog(`[Localization] Suite complete. Found ${bugs.length} localization issue(s).`);
  return bugs;
}
