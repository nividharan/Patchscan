import { Page } from 'playwright';
import { RawBugFinding } from '../analyzer';

const EXPOSED_KEY_PATTERNS = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'OpenAI API Key' },
  { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Access Token' },
  { pattern: /Bearer [a-zA-Z0-9\-_\.]{20,}/, name: 'Bearer Auth Token' },
  { pattern: /password\s*[:=]\s*["'][^"']{4,}["']/i, name: 'Hardcoded Password' },
  { pattern: /api[_-]?key\s*[:=]\s*["'][^"']{8,}["']/i, name: 'API Key' },
  { pattern: /secret\s*[:=]\s*["'][^"']{8,}["']/i, name: 'Secret Key' },
];

const REQUIRED_SECURITY_HEADERS = [
  { name: 'content-security-policy', description: 'Prevents XSS and data injection attacks' },
  { name: 'x-frame-options', description: 'Prevents clickjacking attacks' },
  { name: 'x-content-type-options', description: 'Prevents MIME-type sniffing attacks' },
  { name: 'strict-transport-security', description: 'Forces HTTPS connections (HSTS)' },
  { name: 'referrer-policy', description: 'Controls referrer information leakage' },
  { name: 'permissions-policy', description: 'Controls browser feature access (camera, mic, etc.)' },
];

export async function runSecurityTests(
  page: Page,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];
  onLog('🔒 [Security] Starting security vulnerability scan...', 'action');

  // Check 1: HTTPS enforcement
  if (targetUrl.startsWith('http://') && !targetUrl.includes('localhost')) {
    bugs.push({
      id: `sec-https-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: 'Site is served over HTTP (unencrypted). All production websites must use HTTPS to protect user data in transit. Risk: Man-in-the-middle attacks, cookie theft.',
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'SECURITY',
    });
    onLog('[Security] 💥 No HTTPS! Site served over plain HTTP!', 'bug');
  }

  // Check 2: Security response headers
  onLog('[Security] Checking HTTP security response headers...', 'action');
  let responseHeaders: Record<string, string> = {};
  try {
    const response = await page.context().request.get(targetUrl);
    responseHeaders = response.headers();
  } catch (_) {}

  for (const header of REQUIRED_SECURITY_HEADERS) {
    if (!responseHeaders[header.name]) {
      bugs.push({
        id: `sec-header-${header.name}-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: `Missing security header: "${header.name.toUpperCase()}". ${header.description}.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'SECURITY',
      });
      onLog(`[Security] 💥 Missing header: ${header.name}`, 'bug');
    }
  }

  // Check 3: Exposed secrets in page source / inline scripts
  onLog('[Security] Scanning JavaScript bundles for exposed secrets...', 'action');
  const pageContent = await page.content();
  const inlineScripts = await page.$$eval('script:not([src])', scripts =>
    scripts.map(s => s.textContent || '').join('\n')
  );
  const allContent = pageContent + inlineScripts;

  for (const { pattern, name } of EXPOSED_KEY_PATTERNS) {
    const match = allContent.match(pattern);
    if (match) {
      bugs.push({
        id: `sec-secret-${name.replace(/\s+/g, '-')}-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: `CRITICAL: Exposed ${name} detected in client-side source code: "${match[0].substring(0, 20)}...". This leaks credentials to any user who inspects the page.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'SECURITY',
      });
      onLog(`[Security] 🚨 CRITICAL: Exposed ${name} found in source!`, 'bug');
    }
  }

  // Check 4: XSS reflection probe
  onLog('[Security] Testing XSS input reflection in URL parameters...', 'action');
  try {
    const xssProbe = '<script>window.__xss_test=1</script>';
    const xssUrl = new URL(targetUrl);
    xssProbe.split('').forEach((_, i) => {});
    xssUrl.searchParams.set('q', xssProbe);
    await page.goto(xssUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 10000 });
    const xssExecuted = await page.evaluate(() => (window as any).__xss_test === 1);
    if (xssExecuted) {
      bugs.push({
        id: `sec-xss-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: 'CRITICAL: Reflected XSS vulnerability detected! Injected <script> tag in URL parameter executed on the page. User input is not sanitized before being rendered.',
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'SECURITY',
      });
      onLog('[Security] 🚨 CRITICAL: XSS vulnerability confirmed!', 'bug');
    }
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch (_) {}

  // Check 5: Cookie security flags
  onLog('[Security] Checking cookie security attributes...', 'action');
  const cookies = await page.context().cookies();
  for (const cookie of cookies) {
    if (!cookie.httpOnly && !cookie.name.startsWith('_ga')) {
      bugs.push({
        id: `sec-cookie-httponly-${cookie.name}-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: `Cookie "${cookie.name}" is missing HttpOnly flag. This makes it accessible to JavaScript, enabling cookie theft via XSS attacks.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'SECURITY',
      });
      onLog(`[Security] 💥 Cookie "${cookie.name}" missing HttpOnly flag!`, 'bug');
    }
    if (!cookie.secure && !targetUrl.includes('localhost')) {
      bugs.push({
        id: `sec-cookie-secure-${cookie.name}-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: `Cookie "${cookie.name}" is missing Secure flag. It can be transmitted over unencrypted HTTP connections.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'SECURITY',
      });
    }
  }

  // Check 6: Sensitive data in URL
  const urlObj = new URL(targetUrl);
  const sensitiveParams = ['password', 'token', 'secret', 'key', 'api_key', 'auth'];
  for (const param of sensitiveParams) {
    if (urlObj.searchParams.has(param)) {
      bugs.push({
        id: `sec-url-sensitive-${param}-${Date.now()}`,
        type: 'CONSOLE_ERROR',
        message: `Sensitive parameter "${param}" found in URL. URL parameters are logged in browser history, server logs, and referrer headers — never transmit credentials in URLs.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'SECURITY',
      });
      onLog(`[Security] 💥 Sensitive URL parameter detected: "${param}"!`, 'bug');
    }
  }

  onLog(`[Security] Suite complete. Found ${bugs.length} security issue(s).`);
  return bugs;
}
