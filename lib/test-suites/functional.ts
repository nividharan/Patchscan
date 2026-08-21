import { Page } from 'playwright';
import { RawBugFinding } from '../analyzer';

export async function runFunctionalTests(
  page: Page,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];

  onLog('🔧 [Functional] Starting functional test suite...', 'action');

  // --- 1. Test all forms with boundary & invalid values ---
  const forms = await page.$$('form');
  onLog(`[Functional] Found ${forms.length} form(s) on page.`);

  for (const form of forms) {
    const inputs = await form.$$('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea');

    // Test 1: Submit empty form (required field validation)
    onLog('[Functional] Testing empty form submission (required field check)...', 'action');
    try {
      const submitBtn = await form.$('button[type="submit"], input[type="submit"], button:not([type])');
      if (submitBtn) {
        const errsBefore = await page.evaluate(() =>
          document.querySelectorAll('[aria-invalid="true"], .error, .invalid').length
        );
        await submitBtn.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(400);
        const errsAfter = await page.evaluate(() =>
          document.querySelectorAll('[aria-invalid="true"], .error, .invalid').length
        );
        if (errsAfter === errsBefore && errsAfter === 0) {
          bugs.push({
            id: `func-empty-form-${Date.now()}`,
            type: 'CONSOLE_ERROR',
            message: 'Form accepted empty submission without showing validation errors.',
            url: targetUrl,
            timestamp: new Date().toISOString(),
            actionTaken: 'Submit empty form',
            elementSelector: 'form',
            category: 'FUNCTIONAL',
          });
          onLog('[Functional] ⚠️ Form submitted without required field validation!', 'bug');
        }
      }
    } catch (_) {}

    // Test 2: Boundary value — overly long input
    for (const input of inputs.slice(0, 3)) {
      try {
        const inputType = await input.getAttribute('type') || 'text';
        if (['text', 'email', 'search', 'url', 'password'].includes(inputType)) {
          await input.fill('A'.repeat(10000));
          onLog('[Functional] Tested boundary: 10,000 char input string.');
        } else if (inputType === 'number') {
          await input.fill('999999999999999999');
          onLog('[Functional] Tested boundary: extremely large number input.');
        }
      } catch (_) {}
    }
  }

  // --- 2. Test CRUD-like operations (detect add/edit/delete buttons) ---
  onLog('[Functional] Scanning for CRUD action buttons...', 'action');
  const crudButtons = await page.$$('[data-action], [aria-label*="delete" i], [aria-label*="remove" i], [aria-label*="edit" i], button:has-text("Delete"), button:has-text("Remove"), button:has-text("Edit")');
  onLog(`[Functional] Found ${crudButtons.length} CRUD-style button(s).`);

  for (const btn of crudButtons.slice(0, 3)) {
    try {
      const label = await btn.evaluate(el => el.textContent?.trim() || el.getAttribute('aria-label') || 'CRUD Button');
      onLog(`[Functional] Testing CRUD button: "${label}"`, 'action');
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    } catch (_) {}
  }

  // --- 3. Detect broken links (href="#", empty href, dead anchors) ---
  onLog('[Functional] Checking for broken/dead links...', 'action');
  const links = await page.$$eval('a[href]', anchors =>
    anchors.map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent?.trim().substring(0, 40),
    }))
  );

  const brokenLinks = links.filter(l =>
    l.href === '#' || l.href === '' || l.href === 'javascript:void(0)'
  );

  if (brokenLinks.length > 0) {
    bugs.push({
      id: `func-broken-links-${Date.now()}`,
      type: 'ELEMENT_NOT_INTERACTABLE',
      message: `Found ${brokenLinks.length} non-functional link(s): ${brokenLinks.map(l => `"${l.text}" (href="${l.href}")`).slice(0, 3).join(', ')}`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      actionTaken: 'Link inspection',
      elementSelector: 'a[href="#"]',
      category: 'FUNCTIONAL',
    });
    onLog(`[Functional] 💥 ${brokenLinks.length} dead link(s) found!`, 'bug');
  }

  // --- 4. Navigation smoke test ---
  onLog('[Functional] Testing navigation menu links...', 'action');
  const navLinks = await page.$$('nav a[href]:not([href="#"]):not([href^="mailto"])');
  for (const link of navLinks.slice(0, 5)) {
    try {
      const href = await link.getAttribute('href');
      if (href && (href.startsWith('/') || href.startsWith('http'))) {
        const fullUrl = href.startsWith('http') ? href : new URL(href, targetUrl).toString();
        const response = await page.context().request.get(fullUrl).catch(() => null);
        if (response && response.status() >= 400) {
          bugs.push({
            id: `func-nav-dead-${Date.now()}`,
            type: 'NETWORK_FAILURE',
            message: `Navigation link returns HTTP ${response.status()}: "${href}"`,
            url: targetUrl,
            timestamp: new Date().toISOString(),
            category: 'FUNCTIONAL',
          });
          onLog(`[Functional] 💥 Navigation link "${href}" returns ${response.status()}!`, 'bug');
        }
      }
    } catch (_) {}
  }

  onLog(`[Functional] Suite complete. Found ${bugs.length} functional issue(s).`);
  return bugs;
}
