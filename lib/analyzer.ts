export type BugCategory =
  | 'FUNCTIONAL' | 'UI_UX' | 'RESPONSIVE' | 'ACCESSIBILITY'
  | 'PERFORMANCE' | 'SECURITY' | 'API' | 'CROSS_BROWSER'
  | 'FILE_UPLOAD' | 'LOCALIZATION' | 'CONCURRENCY' | 'INTEGRATION';

export interface RawBugFinding {
  id: string;
  type: 'CONSOLE_ERROR' | 'NETWORK_FAILURE' | 'RUNTIME_EXCEPTION' | 'ELEMENT_NOT_INTERACTABLE';
  message: string;
  elementSelector?: string;
  elementHtml?: string;
  actionTaken?: string;
  url: string;
  timestamp: string;
  screenshotBase64?: string;
  category?: BugCategory;
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AnalyzedBugReport {
  id: string;
  title: string;
  severity: Severity;
  category: BugCategory;
  categoryLabel: string;
  summary: string;
  rootCause: string;
  playwrightTestCode: string;
  suggestedFixDiff: string;
  fixExplanation: string;
  screenshotBase64?: string;
}

const CATEGORY_LABELS: Record<BugCategory, string> = {
  FUNCTIONAL: 'Functional Testing',
  UI_UX: 'UI / UX Testing',
  RESPONSIVE: 'Responsive & Device',
  ACCESSIBILITY: 'Accessibility (WCAG)',
  PERFORMANCE: 'Performance',
  SECURITY: 'Security',
  API: 'API Testing',
  CROSS_BROWSER: 'Cross-Browser',
  FILE_UPLOAD: 'File Upload / Download',
  LOCALIZATION: 'Localization & i18n',
  CONCURRENCY: 'Concurrency & Multi-User',
  INTEGRATION: 'Integration Testing',
};

export async function analyzeBugsWithAI(
  targetUrl: string,
  rawBugs: RawBugFinding[],
  apiKey?: string
): Promise<AnalyzedBugReport[]> {
  const reports: AnalyzedBugReport[] = [];
  const seen = new Set<string>();

  for (const bug of rawBugs) {
    // Deduplicate by message similarity
    const msgKey = bug.message.substring(0, 60);
    if (seen.has(msgKey)) continue;
    seen.add(msgKey);

    if (apiKey && apiKey.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: `You are a Staff QA Engineer. Analyze a bug report and produce JSON:
{ title, severity (CRITICAL|HIGH|MEDIUM|LOW), summary, rootCause, playwrightTestCode (full .spec.ts), suggestedFixDiff (unified diff), fixExplanation }`
              },
              {
                role: 'user',
                content: JSON.stringify({ url: targetUrl, category: bug.category, type: bug.type, message: bug.message, action: bug.actionTaken })
              }
            ],
            response_format: { type: 'json_object' },
          })
        });

        if (response.ok) {
          const data = await response.json();
          const parsed = JSON.parse(data.choices[0].message.content);
          const cat = bug.category || 'FUNCTIONAL';
          reports.push({
            id: bug.id,
            title: parsed.title || 'Detected Issue',
            severity: parsed.severity || 'HIGH',
            category: cat,
            categoryLabel: CATEGORY_LABELS[cat] || cat,
            summary: parsed.summary || bug.message,
            rootCause: parsed.rootCause || 'Unknown root cause.',
            playwrightTestCode: parsed.playwrightTestCode || generatePlaywrightTest(targetUrl, bug),
            suggestedFixDiff: parsed.suggestedFixDiff || generateDiff(bug),
            fixExplanation: parsed.fixExplanation || 'Apply fix to resolve the issue.',
            screenshotBase64: bug.screenshotBase64,
          });
          continue;
        }
      } catch (_) {}
    }

    reports.push(generateHeuristicReport(targetUrl, bug));
  }

  return reports;
}

function generateHeuristicReport(url: string, bug: RawBugFinding): AnalyzedBugReport {
  const cat = bug.category || detectCategory(bug);
  const categoryLabel = CATEGORY_LABELS[cat] || cat;

  // ── Category-specific heuristic report generation ──────────────────────────

  if (cat === 'ACCESSIBILITY') {
    if (bug.message.includes('alt')) {
      return {
        id: bug.id, severity: 'HIGH', category: cat, categoryLabel,
        title: 'WCAG 1.1.1 Violation: Images Missing Alt Text',
        summary: 'One or more images do not have an alt attribute, making them inaccessible to screen reader users.',
        rootCause: bug.message,
        playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('All images have alt text (WCAG 1.1.1)', async ({ page }) => {\n  await page.goto('${url}');\n  const images = await page.$$eval('img', imgs =>\n    imgs.filter(img => !img.getAttribute('alt')).map(img => img.src)\n  );\n  expect(images, 'Images missing alt text: ' + images.join(', ')).toHaveLength(0);\n});`,
        suggestedFixDiff: `- <img src="hero.jpg">\n+ <img src="hero.jpg" alt="Descriptive text about the image content">`,
        fixExplanation: 'Add meaningful alt attributes to all <img> elements. Use empty alt="" for decorative images.',
        screenshotBase64: bug.screenshotBase64,
      };
    }
    if (bug.message.includes('label') || bug.message.includes('input')) {
      return {
        id: bug.id, severity: 'HIGH', category: cat, categoryLabel,
        title: 'WCAG 1.3.1 Violation: Form Inputs Missing Labels',
        summary: 'Form input elements have no associated label, making them inaccessible to screen reader users who cannot see the visual context.',
        rootCause: bug.message,
        playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('All form inputs have accessible labels (WCAG 1.3.1)', async ({ page }) => {\n  await page.goto('${url}');\n  const unlabelled = await page.$$eval(\n    'input:not([type="hidden"]):not([type="submit"])',\n    inputs => inputs.filter(input => {\n      const label = input.id ? document.querySelector('label[for="' + input.id + '"]') : null;\n      return !label && !input.getAttribute('aria-label');\n    }).map(i => i.id || i.name || 'unnamed')\n  );\n  expect(unlabelled).toHaveLength(0);\n});`,
        suggestedFixDiff: `- <input type="email" id="email" />\n+ <label for="email">Email Address</label>\n+ <input type="email" id="email" aria-required="true" />`,
        fixExplanation: 'Add a <label for="..."> element or aria-label attribute to every form input.',
        screenshotBase64: bug.screenshotBase64,
      };
    }
  }

  if (cat === 'RESPONSIVE') {
    return {
      id: bug.id, severity: 'MEDIUM', category: cat, categoryLabel,
      title: 'Responsive Layout Issue: Viewport Overflow or Element Mismatch',
      summary: bug.message,
      rootCause: 'CSS does not correctly constrain element widths at smaller viewports. Common causes: fixed-width elements, missing media queries, or non-flexible flex/grid configurations.',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest.describe('Responsive layout checks', () => {\n  const viewports = [\n    { name: 'Mobile', width: 390, height: 844 },\n    { name: 'Tablet', width: 768, height: 1024 },\n    { name: 'Desktop', width: 1440, height: 900 },\n  ];\n\n  for (const vp of viewports) {\n    test(\`No horizontal overflow at \${vp.name}\`, async ({ page }) => {\n      await page.setViewportSize({ width: vp.width, height: vp.height });\n      await page.goto('${url}');\n      const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);\n      expect(overflow).toBeFalsy();\n    });\n  }\n});`,
      suggestedFixDiff: `/* Add to global CSS */\n* {\n  box-sizing: border-box;\n  max-width: 100%;\n}\n\n@media (max-width: 768px) {\n  .container {\n    width: 100%;\n    padding: 0 1rem;\n  }\n}`,
      fixExplanation: 'Apply box-sizing: border-box globally, use max-width: 100% on images and media, and add responsive breakpoints with media queries.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  if (cat === 'PERFORMANCE') {
    const isLCP = bug.message.includes('LCP');
    const isCLS = bug.message.includes('CLS');
    const isLoad = bug.message.includes('load time') || bug.message.includes('page load');
    return {
      id: bug.id, severity: 'HIGH', category: cat, categoryLabel,
      title: isLCP ? 'Poor LCP (Largest Contentful Paint)' : isCLS ? 'High CLS (Cumulative Layout Shift)' : 'Performance Threshold Exceeded',
      summary: bug.message,
      rootCause: isLCP ? 'The largest visible content element (hero image or main heading) loads too slowly. Common causes: unoptimized images, render-blocking scripts, slow server TTFB.' : isCLS ? 'Visual elements shift position after initial render. Common causes: images without dimensions, dynamically injected content, late-loading fonts.' : 'Page load performance metrics exceed recommended thresholds.',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('Core Web Vitals within acceptable thresholds', async ({ page }) => {\n  await page.goto('${url}', { waitUntil: 'networkidle' });\n  \n  const metrics = await page.evaluate(() => {\n    const lcp = performance.getEntriesByType('largest-contentful-paint').at(-1);\n    const cls = performance.getEntriesByType('layout-shift').reduce((s, e) => s + (e as any).value, 0);\n    return { lcp: lcp ? (lcp as any).startTime : null, cls };\n  });\n  \n  if (metrics.lcp) expect(metrics.lcp).toBeLessThan(2500); // Good LCP threshold\n  expect(metrics.cls).toBeLessThan(0.1); // Good CLS threshold\n});`,
      suggestedFixDiff: `/* For LCP improvement */\n<link rel="preload" as="image" href="/hero.webp">\n\n/* For CLS improvement: always define image dimensions */\n- <img src="hero.jpg">\n+ <img src="hero.jpg" width="1200" height="630" loading="lazy">`,
      fixExplanation: isLCP ? 'Preload critical images with <link rel="preload">, convert to WebP format, and ensure the server responds in under 800ms.' : 'Reserve space for images and dynamic content with explicit width/height or CSS aspect-ratio.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  if (cat === 'SECURITY') {
    const isCritical = bug.message.toLowerCase().includes('exposed') || bug.message.toLowerCase().includes('xss') || bug.message.toLowerCase().includes('critical');
    const isHeader = bug.message.toLowerCase().includes('header');
    return {
      id: bug.id, severity: isCritical ? 'CRITICAL' : isHeader ? 'MEDIUM' : 'HIGH', category: cat, categoryLabel,
      title: isCritical ? 'Critical Security Vulnerability Detected' : isHeader ? 'Missing Security Response Header' : 'Security Configuration Issue',
      summary: bug.message,
      rootCause: isHeader ? 'The web server is not setting recommended HTTP security headers in its responses. These headers instruct browsers to enforce security policies.' : 'Client-side source code or configuration exposes sensitive information.',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('Security headers present in HTTP response', async ({ page }) => {\n  const response = await page.goto('${url}');\n  const headers = response?.headers() || {};\n  \n  expect(headers['x-frame-options'] || headers['content-security-policy'], \n    'Missing clickjacking protection header').toBeTruthy();\n  expect(headers['x-content-type-options'],\n    'Missing MIME sniffing protection').toBe('nosniff');\n  expect(headers['strict-transport-security'],\n    'Missing HSTS header').toBeTruthy();\n});`,
      suggestedFixDiff: `// Express.js — add helmet middleware\n+ const helmet = require('helmet');\n+ app.use(helmet());\n\n// Or set headers manually:\n+ res.setHeader('X-Frame-Options', 'DENY');\n+ res.setHeader('X-Content-Type-Options', 'nosniff');\n+ res.setHeader('Content-Security-Policy', "default-src 'self'");\n+ res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');`,
      fixExplanation: 'Install and configure the helmet middleware (Node.js/Express) or equivalent for your backend framework to automatically set all recommended security headers.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  if (cat === 'API') {
    const is404 = bug.message.includes('404');
    const is5xx = bug.message.includes('5');
    const isSlow = bug.message.includes('slow') || bug.message.includes('ms');
    const isCors = bug.message.includes('CORS');
    return {
      id: bug.id, severity: is5xx ? 'CRITICAL' : is404 ? 'HIGH' : 'MEDIUM', category: cat, categoryLabel,
      title: isCors ? 'CORS Policy Misconfiguration' : is5xx ? 'Server Error: API Endpoint Crash' : is404 ? 'Broken API Endpoint (404)' : isSlow ? 'Slow API Response Time' : 'API Contract Violation',
      summary: bug.message,
      rootCause: is404 ? 'The API endpoint URL does not match any registered route on the server. Possible causes: endpoint renamed, route registration missing, or API version mismatch.' : is5xx ? 'The server threw an unhandled exception while processing the request. Check server logs for stack trace.' : isSlow ? 'Database query, external service call, or missing caching layer causing excessive response latency.' : bug.message,
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('API endpoints return successful responses', async ({ page }) => {\n  const failedRequests: string[] = [];\n  \n  page.on('response', res => {\n    if (res.url().includes('/api/') && res.status() >= 400) {\n      failedRequests.push(\`\${res.status()} \${res.url()}\`);\n    }\n  });\n  \n  await page.goto('${url}');\n  // Trigger user interactions\n  const buttons = await page.$$('button');\n  for (const btn of buttons.slice(0, 5)) {\n    await btn.click({ timeout: 1000 }).catch(() => {});\n    await page.waitForTimeout(300);\n  }\n  \n  expect(failedRequests, 'Failed API calls: ' + failedRequests.join(', ')).toHaveLength(0);\n});`,
      suggestedFixDiff: is404 ? `// router.ts — ensure route is registered correctly\n- // Missing route\n+ router.post('/api/payment-gateway', authMiddleware, paymentController.process);\n\n// Or check the fetch URL:\n- await fetch('/api/non-existent-endpoint')\n+ await fetch('/api/payment/process')` : `// Add proper error handling to API route\n+ try {\n+   const result = await db.query(...);\n+   return res.json(result);\n+ } catch (err) {\n+   console.error(err);\n+   return res.status(500).json({ error: 'Internal server error' });\n+ }`,
      fixExplanation: is404 ? 'Verify the API endpoint path matches exactly between frontend fetch calls and backend route registration. Check for typos, version prefixes, and trailing slashes.' : is5xx ? 'Add try/catch error handling in the API route handler and check server logs for the full stack trace.' : 'Implement response caching (Redis) or database query optimization (add indexes) to reduce API response time.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  if (cat === 'CONCURRENCY') {
    return {
      id: bug.id, severity: 'HIGH', category: cat, categoryLabel,
      title: 'Concurrency Issue: Server Under Multi-User Load',
      summary: bug.message,
      rootCause: 'The server does not handle concurrent connections or simultaneous requests reliably. This may indicate missing connection pooling, race conditions in shared state, or insufficient server capacity.',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('Server handles concurrent users without failures', async ({ browser }) => {\n  const USERS = 5;\n  const contexts = await Promise.all(\n    Array.from({ length: USERS }, () => browser.newContext())\n  );\n  const pages = await Promise.all(contexts.map(c => c.newPage()));\n  \n  const results = await Promise.allSettled(\n    pages.map(p => p.goto('${url}', { waitUntil: 'domcontentloaded', timeout: 10000 }))\n  );\n  \n  const failures = results.filter(r => r.status === 'rejected').length;\n  expect(failures).toBe(0);\n  \n  await Promise.all(contexts.map(c => c.close()));\n});`,
      suggestedFixDiff: `// Use connection pooling for database\n- const db = new Database(config);\n+ const db = new Pool({ max: 20, ...config });\n\n// Add rate limiting middleware\n+ const rateLimit = require('express-rate-limit');\n+ app.use(rateLimit({ windowMs: 60000, max: 100 }));`,
      fixExplanation: 'Implement database connection pooling, add rate limiting middleware, and consider horizontal scaling or load balancing if traffic exceeds server capacity.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  if (cat === 'FILE_UPLOAD') {
    return {
      id: bug.id, severity: 'MEDIUM', category: cat, categoryLabel,
      title: 'File Upload Validation Gap',
      summary: bug.message,
      rootCause: 'File upload inputs do not properly validate file type, size, or content before accepting uploads. Both client-side and server-side validation are required.',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\nimport { writeFileSync, unlinkSync } from 'fs';\nimport { join } from 'path';\nimport { tmpdir } from 'os';\n\ntest('File upload rejects invalid file types', async ({ page }) => {\n  await page.goto('${url}');\n  const input = page.locator('input[type="file"]').first();\n  \n  // Create a wrong-type test file\n  const wrongFile = join(tmpdir(), 'test.exe');\n  writeFileSync(wrongFile, 'fake executable content');\n  \n  await input.setInputFiles(wrongFile);\n  await page.waitForTimeout(500);\n  \n  const errorVisible = await page.locator('.error, [role="alert"]').isVisible().catch(() => false);\n  expect(errorVisible, 'Should show error for invalid file type').toBeTruthy();\n  \n  unlinkSync(wrongFile);\n});`,
      suggestedFixDiff: `// Frontend: add accept attribute\n- <input type="file" />\n+ <input type="file" accept=".jpg,.jpeg,.png,.pdf" />\n\n// Backend: validate MIME type\n+ const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];\n+ if (!allowedTypes.includes(file.mimetype)) {\n+   return res.status(400).json({ error: 'Invalid file type' });\n+ }\n+ if (file.size > 5 * 1024 * 1024) { // 5MB limit\n+   return res.status(400).json({ error: 'File too large' });\n+ }`,
      fixExplanation: 'Add the accept attribute to file inputs for client-side hints, and always validate file MIME type and size server-side as client-side validation can be bypassed.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  if (cat === 'LOCALIZATION') {
    return {
      id: bug.id, severity: 'LOW', category: cat, categoryLabel,
      title: 'Internationalization (i18n) Issue',
      summary: bug.message,
      rootCause: 'The application uses hardcoded English strings, dates, or currencies, or lacks RTL layout support. This prevents the app from being localized for non-English markets.',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('Page has lang attribute for screen readers', async ({ page }) => {\n  await page.goto('${url}');\n  const lang = await page.getAttribute('html', 'lang');\n  expect(lang, '<html> element missing lang attribute').toBeTruthy();\n});\n\ntest('No horizontal overflow with German locale', async ({ browser }) => {\n  const context = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 720 } });\n  const page = await context.newPage();\n  await page.goto('${url}');\n  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);\n  expect(overflow).toBeFalsy();\n  await context.close();\n});`,
      suggestedFixDiff: `- <html>\n+ <html lang="en">\n\n// Use Intl APIs instead of hardcoded formats:\n- const date = 'January 1, 2024';\n+ const date = new Intl.DateTimeFormat(userLocale).format(new Date());\n\n- const price = '$49.99';\n+ const price = new Intl.NumberFormat(userLocale, { style: 'currency', currency: 'USD' }).format(49.99);`,
      fixExplanation: 'Add lang attribute to <html>, use Intl.DateTimeFormat and Intl.NumberFormat for dates and currencies, and implement CSS logical properties (margin-inline-start instead of margin-left) for RTL support.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  // ── Generic fallback ──────────────────────────────────────────────────────
  const isTypeError = bug.message.includes('TypeError') || bug.message.includes('Cannot read');
  const is404 = bug.message.includes('404');
  const isCritical = bug.message.toLowerCase().includes('critical');

  return {
    id: bug.id,
    title: isTypeError ? 'Unhandled JavaScript TypeError' : is404 ? 'Broken Resource or Endpoint (404)' : 'Detected Application Issue',
    severity: isCritical ? 'CRITICAL' : isTypeError ? 'CRITICAL' : is404 ? 'HIGH' : 'MEDIUM',
    category: cat,
    categoryLabel,
    summary: bug.message.substring(0, 200),
    rootCause: `Issue detected during ${bug.actionTaken || 'automated crawl'}: ${bug.message}`,
    playwrightTestCode: generatePlaywrightTest(url, bug),
    suggestedFixDiff: generateDiff(bug),
    fixExplanation: 'Add defensive null-checking, proper error handling, and validate all user inputs before processing.',
    screenshotBase64: bug.screenshotBase64,
  };
}

function detectCategory(bug: RawBugFinding): BugCategory {
  const msg = bug.message.toLowerCase();
  if (msg.includes('alt') || msg.includes('aria') || msg.includes('wcag') || msg.includes('label')) return 'ACCESSIBILITY';
  if (msg.includes('overflow') || msg.includes('viewport') || msg.includes('mobile') || msg.includes('responsive')) return 'RESPONSIVE';
  if (msg.includes('lcp') || msg.includes('cls') || msg.includes('ttfb') || msg.includes('payload') || msg.includes('performance')) return 'PERFORMANCE';
  if (msg.includes('header') || msg.includes('xss') || msg.includes('csrf') || msg.includes('cookie') || msg.includes('secret') || msg.includes('exposed')) return 'SECURITY';
  if (msg.includes('api') || msg.includes('cors') || msg.includes('fetch') || msg.includes('xhr') || bug.type === 'NETWORK_FAILURE') return 'API';
  if (msg.includes('locale') || msg.includes('rtl') || msg.includes('lang') || msg.includes('i18n')) return 'LOCALIZATION';
  if (msg.includes('concurrent') || msg.includes('simultaneous') || msg.includes('race')) return 'CONCURRENCY';
  if (msg.includes('file') || msg.includes('upload') || msg.includes('download')) return 'FILE_UPLOAD';
  if (msg.includes('firefox') || msg.includes('webkit') || msg.includes('safari') || msg.includes('cross-browser')) return 'CROSS_BROWSER';
  return 'FUNCTIONAL';
}

function generatePlaywrightTest(url: string, bug: RawBugFinding): string {
  return `import { test, expect } from '@playwright/test';

test('Verify no errors on ${bug.elementSelector || 'page interaction'}', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('${url}');
  ${bug.elementSelector ? `await page.click('${bug.elementSelector}').catch(() => {});` : ''}
  await page.waitForTimeout(500);

  expect(errors, 'Console errors found: ' + errors.join(', ')).toHaveLength(0);
});`;
}

function generateDiff(bug: RawBugFinding): string {
  return `--- a/src/component.tsx
+++ b/src/component.tsx
@@ -10,5 +10,9 @@
- // Missing error handling
- element.action();
+ try {
+   if (!element) throw new Error('Element not initialized');
+   element.action();
+ } catch (err) {
+   console.error('[Fix] Handler error:', err);
+ }`;
}
