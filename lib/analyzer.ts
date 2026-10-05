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

/**
 * Analyzes raw bug findings with Multi-LLM AI (Google Gemini or OpenAI GPT-4o)
 * or built-in deterministic AST heuristics when offline.
 */
export async function analyzeBugsWithAI(
  targetUrl: string,
  rawBugs: RawBugFinding[],
  apiKey?: string
): Promise<AnalyzedBugReport[]> {
  const reports: AnalyzedBugReport[] = [];
  const seen = new Set<string>();

  const geminiKey = (apiKey && apiKey.startsWith('AIzaSy')) ? apiKey : process.env.GEMINI_API_KEY;
  const openaiKey = (apiKey && apiKey.startsWith('sk-')) ? apiKey : process.env.OPENAI_API_KEY;

  for (const bug of rawBugs) {
    // Deduplicate by message similarity
    const msgKey = bug.message.substring(0, 60);
    if (seen.has(msgKey)) continue;
    seen.add(msgKey);

    // 1. Try Google Gemini if available
    if (geminiKey) {
      try {
        const geminiReport = await callGeminiAnalysis(targetUrl, bug, geminiKey);
        if (geminiReport) {
          reports.push(geminiReport);
          continue;
        }
      } catch (geminiErr) {
        console.warn('[AI Analyzer] Gemini call fallback:', geminiErr);
      }
    }

    // 2. Try OpenAI GPT-4o if available
    if (openaiKey) {
      try {
        const openaiReport = await callOpenAIAnalysis(targetUrl, bug, openaiKey);
        if (openaiReport) {
          reports.push(openaiReport);
          continue;
        }
      } catch (openaiErr) {
        console.warn('[AI Analyzer] OpenAI call fallback:', openaiErr);
      }
    }

    // 3. Built-in Deterministic Heuristic AST Analyzer
    reports.push(generateHeuristicReport(targetUrl, bug));
  }

  return reports;
}

/**
 * Direct HTTP integration with Google Gemini 1.5/2.0 Flash API (Zero SDK dependency)
 */
async function callGeminiAnalysis(
  targetUrl: string,
  bug: RawBugFinding,
  apiKey: string
): Promise<AnalyzedBugReport | null> {
  const prompt = `You are a Staff QA Automation Engineer. Analyze this bug finding and return a JSON object with this exact structure:
{
  "title": "Clear concise bug title",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "summary": "1-2 sentence summary of what failed",
  "rootCause": "Technical explanation of the underlying failure",
  "playwrightTestCode": "Full runnable Playwright .spec.ts reproduction test",
  "suggestedFixDiff": "Unified .diff syntax patch",
  "fixExplanation": "Actionable explanation of the fix"
}

Bug Details:
- Target URL: ${targetUrl}
- Category: ${bug.category || 'FUNCTIONAL'}
- Error Type: ${bug.type}
- Failure Message: ${bug.message}
- Triggering Action: ${bug.actionTaken || 'Page load'}
- Element Selector: ${bug.elementSelector || 'N/A'}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = JSON.parse(text);
  const cat = bug.category || 'FUNCTIONAL';

  return {
    id: bug.id,
    title: parsed.title || 'Detected Issue',
    severity: parsed.severity || 'HIGH',
    category: cat,
    categoryLabel: CATEGORY_LABELS[cat] || cat,
    summary: parsed.summary || bug.message,
    rootCause: parsed.rootCause || 'Root cause unidentified.',
    playwrightTestCode: parsed.playwrightTestCode || generatePlaywrightTest(targetUrl, bug),
    suggestedFixDiff: parsed.suggestedFixDiff || generateDiff(bug),
    fixExplanation: parsed.fixExplanation || 'Apply the suggested patch.',
    screenshotBase64: bug.screenshotBase64,
  };
}

/**
 * Direct HTTP integration with OpenAI GPT-4o
 */
async function callOpenAIAnalysis(
  targetUrl: string,
  bug: RawBugFinding,
  apiKey: string
): Promise<AnalyzedBugReport | null> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a Staff QA Engineer. Analyze a bug report and produce JSON:
{ title, severity (CRITICAL|HIGH|MEDIUM|LOW), summary, rootCause, playwrightTestCode (full .spec.ts), suggestedFixDiff (unified diff), fixExplanation }`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            url: targetUrl,
            category: bug.category,
            type: bug.type,
            message: bug.message,
            action: bug.actionTaken,
          }),
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  const cat = bug.category || 'FUNCTIONAL';

  return {
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
  };
}

function generateHeuristicReport(url: string, bug: RawBugFinding): AnalyzedBugReport {
  const cat = bug.category || detectCategory(bug);
  const categoryLabel = CATEGORY_LABELS[cat] || cat;

  if (cat === 'ACCESSIBILITY') {
    if (bug.message.includes('alt')) {
      return {
        id: bug.id,
        severity: 'HIGH',
        category: cat,
        categoryLabel,
        title: 'WCAG 1.1.1 Violation: Images Missing Alt Text',
        summary: 'One or more images do not have an alt attribute, making them inaccessible to screen readers.',
        rootCause: bug.message,
        playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('All images have alt text (WCAG 1.1.1)', async ({ page }) => {\n  await page.goto('${url}');\n  const images = await page.$$eval('img', imgs =>\n    imgs.filter(img => !img.getAttribute('alt')).map(img => img.src)\n  );\n  expect(images, 'Images missing alt text: ' + images.join(', ')).toHaveLength(0);\n});`,
        suggestedFixDiff: `- <img src="hero.jpg">\n+ <img src="hero.jpg" alt="Descriptive text about the image content">`,
        fixExplanation: 'Add meaningful alt attributes to all <img> elements. Use empty alt="" for decorative images.',
        screenshotBase64: bug.screenshotBase64,
      };
    }
    if (bug.message.includes('label') || bug.message.includes('input')) {
      return {
        id: bug.id,
        severity: 'HIGH',
        category: cat,
        categoryLabel,
        title: 'WCAG 1.3.1 Violation: Form Inputs Missing Labels',
        summary: 'Form inputs lack associated labels or aria-label attributes.',
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
      id: bug.id,
      severity: 'MEDIUM',
      category: cat,
      categoryLabel,
      title: 'Responsive Layout Issue: Viewport Overflow',
      summary: bug.message,
      rootCause: 'CSS does not constrain element widths at mobile/tablet viewports, causing horizontal scrolling.',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest.describe('Responsive layout checks', () => {\n  const viewports = [\n    { name: 'Mobile', width: 390, height: 844 },\n    { name: 'Tablet', width: 768, height: 1024 },\n    { name: 'Desktop', width: 1440, height: 900 },\n  ];\n\n  for (const vp of viewports) {\n    test(\`No horizontal overflow at \${vp.name}\`, async ({ page }) => {\n      await page.setViewportSize({ width: vp.width, height: vp.height });\n      await page.goto('${url}');\n      const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);\n      expect(overflow).toBeFalsy();\n    });\n  }\n});`,
      suggestedFixDiff: `/* Add to global CSS */\n* {\n  box-sizing: border-box;\n  max-width: 100%;\n}\n\n@media (max-width: 768px) {\n  .container {\n    width: 100%;\n    padding: 0 1rem;\n  }\n}`,
      fixExplanation: 'Apply box-sizing: border-box globally and ensure child elements use fluid widths.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  if (cat === 'PERFORMANCE') {
    const isLCP = bug.message.includes('LCP');
    const isCLS = bug.message.includes('CLS');
    return {
      id: bug.id,
      severity: 'HIGH',
      category: cat,
      categoryLabel,
      title: isLCP ? 'Poor LCP (Largest Contentful Paint)' : isCLS ? 'High CLS (Cumulative Layout Shift)' : 'Performance Threshold Exceeded',
      summary: bug.message,
      rootCause: isLCP ? 'The hero image or largest text element takes too long to load.' : 'Visual elements shift layout position after initial render.',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('Core Web Vitals within thresholds', async ({ page }) => {\n  await page.goto('${url}', { waitUntil: 'networkidle' });\n  const metrics = await page.evaluate(() => {\n    const lcp = performance.getEntriesByType('largest-contentful-paint').at(-1);\n    const cls = performance.getEntriesByType('layout-shift').reduce((s, e) => s + (e as any).value, 0);\n    return { lcp: lcp ? (lcp as any).startTime : null, cls };\n  });\n  if (metrics.lcp) expect(metrics.lcp).toBeLessThan(2500);\n  expect(metrics.cls).toBeLessThan(0.1);\n});`,
      suggestedFixDiff: `<link rel="preload" as="image" href="/hero.webp">\n- <img src="hero.jpg">\n+ <img src="hero.jpg" width="1200" height="630" loading="lazy">`,
      fixExplanation: 'Preload key hero assets and provide explicit width and height attributes on all media elements.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  if (cat === 'SECURITY') {
    const isCritical = bug.message.toLowerCase().includes('exposed') || bug.message.toLowerCase().includes('xss');
    return {
      id: bug.id,
      severity: isCritical ? 'CRITICAL' : 'HIGH',
      category: cat,
      categoryLabel,
      title: isCritical ? 'Critical Security Vulnerability Detected' : 'Missing Security Response Headers',
      summary: bug.message,
      rootCause: 'The server response lacks essential browser protection headers (CSP, HSTS, X-Frame-Options).',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('Security headers present in HTTP response', async ({ page }) => {\n  const response = await page.goto('${url}');\n  const headers = response?.headers() || {};\n  expect(headers['x-frame-options'] || headers['content-security-policy']).toBeTruthy();\n  expect(headers['x-content-type-options']).toBe('nosniff');\n});`,
      suggestedFixDiff: `// Express/Node middleware\n+ const helmet = require('helmet');\n+ app.use(helmet());`,
      fixExplanation: 'Enable standard security headers using Helmet or web server reverse proxy configuration.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  if (cat === 'API') {
    const is404 = bug.message.includes('404');
    const is5xx = bug.message.includes('5');
    return {
      id: bug.id,
      severity: is5xx ? 'CRITICAL' : is404 ? 'HIGH' : 'MEDIUM',
      category: cat,
      categoryLabel,
      title: is5xx ? 'API Server Error (5xx Crash)' : is404 ? 'Broken API Endpoint (404)' : 'API Failure Detected',
      summary: bug.message,
      rootCause: is404 ? 'API route registration missing or frontend path typo.' : 'Server threw an unhandled exception.',
      playwrightTestCode: `import { test, expect } from '@playwright/test';\n\ntest('API endpoints return 200 OK', async ({ page }) => {\n  const failures: string[] = [];\n  page.on('response', res => {\n    if (res.url().includes('/api/') && res.status() >= 400) {\n      failures.push(\`\${res.status()} \${res.url()}\`);\n    }\n  });\n  await page.goto('${url}');\n  expect(failures).toHaveLength(0);\n});`,
      suggestedFixDiff: `// Add defensive error boundary\n+ try {\n+   return res.json(data);\n+ } catch (err) {\n+   return res.status(500).json({ error: 'Internal server error' });\n+ }`,
      fixExplanation: 'Implement try/catch blocks in API route handlers and verify client fetch paths.',
      screenshotBase64: bug.screenshotBase64,
    };
  }

  const isTypeError = bug.message.includes('TypeError') || bug.message.includes('Cannot read');
  const is404 = bug.message.includes('404');
  const isCritical = bug.message.toLowerCase().includes('critical');

  return {
    id: bug.id,
    title: isTypeError ? 'Unhandled JavaScript TypeError' : is404 ? 'Broken Resource (404)' : 'Detected Application Issue',
    severity: isCritical ? 'CRITICAL' : isTypeError ? 'CRITICAL' : is404 ? 'HIGH' : 'MEDIUM',
    category: cat,
    categoryLabel,
    summary: bug.message.substring(0, 200),
    rootCause: `Detected during ${bug.actionTaken || 'crawl'}: ${bug.message}`,
    playwrightTestCode: generatePlaywrightTest(url, bug),
    suggestedFixDiff: generateDiff(bug),
    fixExplanation: 'Add defensive null checks and error handling before calling properties on nullable objects.',
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
- // Unhandled operation
- element.action();
+ try {
+   if (element) {
+     element.action();
+   }
+ } catch (err) {
+   console.error('[PatchScan Fix] Action error:', err);
+ }`;
}
