import { Page } from 'playwright';
import { RawBugFinding } from '../analyzer';

export async function runAccessibilityTests(
  page: Page,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];
  onLog('♿ [Accessibility] Starting WCAG 2.1 accessibility audit...', 'action');

  // Check 1: Images missing alt text
  onLog('[A11y] Checking images for missing alt text...', 'action');
  const imagesWithoutAlt = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs
      .filter(img => !img.getAttribute('alt') && !img.getAttribute('aria-label'))
      .map(img => ({ src: (img.getAttribute('src') || '').substring(0, 60), id: img.id }))
      .slice(0, 10);
  });

  if (imagesWithoutAlt.length > 0) {
    bugs.push({
      id: `a11y-img-alt-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `${imagesWithoutAlt.length} image(s) missing 'alt' attribute (WCAG 1.1.1): ${imagesWithoutAlt.map(i => i.src || 'unnamed').join(', ')}`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'ACCESSIBILITY',
    });
    onLog(`[A11y] 💥 ${imagesWithoutAlt.length} image(s) without alt text!`, 'bug');
  }

  // Check 2: Icon buttons without aria-label
  onLog('[A11y] Checking buttons for missing labels...', 'action');
  const unlabelledButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    return buttons
      .filter(btn => {
        const text = btn.textContent?.trim() || '';
        const label = btn.getAttribute('aria-label') || btn.getAttribute('title') || '';
        return text.length === 0 && label.length === 0;
      })
      .map(btn => btn.id || btn.className.split(' ')[0] || 'unknown')
      .slice(0, 5);
  });

  if (unlabelledButtons.length > 0) {
    bugs.push({
      id: `a11y-btn-label-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `${unlabelledButtons.length} button(s) have no accessible label (WCAG 4.1.2): ${unlabelledButtons.join(', ')}`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'ACCESSIBILITY',
    });
    onLog(`[A11y] 💥 ${unlabelledButtons.length} unlabelled button(s) found!`, 'bug');
  }

  // Check 3: Form inputs without associated labels
  onLog('[A11y] Checking form inputs for missing labels...', 'action');
  const inputsWithoutLabels = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
    return inputs
      .filter(input => {
        const id = input.getAttribute('id');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const placeholder = input.getAttribute('placeholder');
        return !label && !ariaLabel && !ariaLabelledBy && !placeholder;
      })
      .map(input => `${input.tagName}#${input.id || 'unnamed'}`)
      .slice(0, 5);
  });

  if (inputsWithoutLabels.length > 0) {
    bugs.push({
      id: `a11y-input-label-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `${inputsWithoutLabels.length} form input(s) have no accessible label (WCAG 1.3.1): ${inputsWithoutLabels.join(', ')}`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'ACCESSIBILITY',
    });
    onLog(`[A11y] 💥 ${inputsWithoutLabels.length} input(s) without labels!`, 'bug');
  }

  // Check 4: Missing html lang attribute
  const langAttr = await page.getAttribute('html', 'lang');
  if (!langAttr) {
    bugs.push({
      id: `a11y-lang-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: 'HTML element is missing lang attribute (WCAG 3.1.1). Screen readers cannot determine the page language.',
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'ACCESSIBILITY',
    });
    onLog('[A11y] 💥 Missing <html lang=""> attribute!', 'bug');
  }

  // Check 5: Missing page title
  const pageTitle = await page.title();
  if (!pageTitle || pageTitle.trim().length === 0) {
    bugs.push({
      id: `a11y-title-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: 'Page has no <title> element (WCAG 2.4.2). Screen readers announce the title on page load.',
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'ACCESSIBILITY',
    });
    onLog('[A11y] 💥 Missing page <title>!', 'bug');
  }

  // Check 6: Heading hierarchy
  const headingIssues = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const levels = headings.map(h => parseInt(h.tagName[1]));
    const issues: string[] = [];
    const h1Count = levels.filter(l => l === 1).length;
    if (h1Count === 0) issues.push('No <h1> found — page must have exactly one h1');
    if (h1Count > 1) issues.push(`Multiple <h1> elements (${h1Count}) — only one allowed`);
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        issues.push(`Heading level jumps from h${levels[i - 1]} to h${levels[i]}`);
      }
    }
    return issues.slice(0, 3);
  });

  if (headingIssues.length > 0) {
    bugs.push({
      id: `a11y-headings-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `Heading hierarchy violation (WCAG 1.3.1): ${headingIssues.join('; ')}`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'ACCESSIBILITY',
    });
    onLog(`[A11y] 💥 Heading hierarchy issues: ${headingIssues.join('; ')}`, 'bug');
  }

  // Check 7: Keyboard navigation — test Tab focus
  onLog('[A11y] Testing keyboard Tab navigation...', 'action');
  try {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    const focusedEl = await page.evaluate(() => {
      const el = document.activeElement;
      return el && el !== document.body ? el.tagName : null;
    });
    if (!focusedEl) {
      bugs.push({
        id: `a11y-keyboard-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: 'Keyboard Tab navigation does not focus any interactive element. Page may not be keyboard-accessible.',
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'ACCESSIBILITY',
      });
      onLog('[A11y] 💥 Keyboard Tab focus not working!', 'bug');
    } else {
      onLog(`[A11y] ✓ Tab focus lands on: <${focusedEl}>`);
    }
  } catch (_) {}

  // Check 8: Low contrast text (heuristic — check gray text on white or dark backgrounds)
  const contrastIssues = await page.evaluate(() => {
    const issues: string[] = [];
    const textElements = Array.from(document.querySelectorAll('p, span, label, a, li, td'));
    for (const el of textElements.slice(0, 30)) {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bg = style.backgroundColor;
      // Simple check: text is very light gray (common low contrast issue)
      if (color.includes('rgb(') && bg.includes('rgb(')) {
        const rgb = color.match(/\d+/g)?.map(Number) || [];
        if (rgb.length === 3) {
          const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
          if (luminance > 0.8) {
            const text = el.textContent?.trim().substring(0, 20);
            if (text) issues.push(`"${text}" may have insufficient contrast`);
          }
        }
      }
    }
    return Array.from(new Set(issues)).slice(0, 3);
  });

  if (contrastIssues.length > 0) {
    bugs.push({
      id: `a11y-contrast-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `Potential low color contrast detected (WCAG 1.4.3): ${contrastIssues.join('; ')}`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'ACCESSIBILITY',
    });
    onLog(`[A11y] ⚠️ Potential contrast issues detected.`, 'bug');
  }

  onLog(`[Accessibility] Suite complete. Found ${bugs.length} accessibility issue(s).`);
  return bugs;
}
