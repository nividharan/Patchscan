import { Page } from 'playwright';
import { RawBugFinding } from '../analyzer';

interface ApiCall {
  url: string;
  method: string;
  status: number;
  duration: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  responseSize: number;
  contentType: string;
}

export async function runApiMonitorTests(
  page: Page,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];
  const apiCalls: ApiCall[] = [];
  const slowThresholdMs = 2000;

  onLog('🌐 [API Monitor] Intercepting and validating all network requests...', 'action');

  const requestTimestamps: Map<string, number> = new Map();

  page.on('request', (req) => {
    const url = req.url();
    if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr' ||
        url.includes('/api/') || url.includes('/v1/') || url.includes('/v2/')) {
      requestTimestamps.set(url, Date.now());
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    const method = res.request().method();
    const status = res.status();
    const requestTime = requestTimestamps.get(url) || Date.now();
    const duration = Date.now() - requestTime;
    const responseHeaders = res.headers();
    const contentType = responseHeaders['content-type'] || '';
    const contentLength = parseInt(responseHeaders['content-length'] || '0');

    if (res.request().resourceType() === 'fetch' || res.request().resourceType() === 'xhr' ||
        url.includes('/api/') || url.includes('/v1/') || url.includes('/v2/')) {
      apiCalls.push({
        url,
        method,
        status,
        duration,
        requestHeaders: res.request().headers(),
        responseHeaders,
        responseSize: contentLength,
        contentType,
      });
    }
  });

  // Navigate and interact to trigger API calls
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });

  // Click interactive elements to trigger more API calls
  const buttons = await page.$$('button:not([disabled]), [role="button"]');
  for (const btn of buttons.slice(0, 5)) {
    try {
      await btn.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(500);
    } catch (_) {}
  }

  await page.waitForTimeout(1000);

  onLog(`[API Monitor] Captured ${apiCalls.length} API call(s).`);

  // Analyze collected API calls
  for (const call of apiCalls) {
    const shortUrl = call.url.substring(0, 80);

    // Check 1: 4xx Client Errors
    if (call.status >= 400 && call.status < 500) {
      bugs.push({
        id: `api-4xx-${call.status}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'NETWORK_FAILURE',
        message: `API returned HTTP ${call.status} for ${call.method} ${shortUrl}. Client error — likely a missing endpoint, authentication failure, or bad request payload.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'API',
        actionTaken: `${call.method} ${shortUrl}`,
      });
      onLog(`[API Monitor] 💥 HTTP ${call.status} on ${call.method} ${shortUrl}`, 'bug');
    }

    // Check 2: 5xx Server Errors
    if (call.status >= 500) {
      bugs.push({
        id: `api-5xx-${call.status}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'NETWORK_FAILURE',
        message: `API returned HTTP ${call.status} (Server Error) for ${call.method} ${shortUrl}. This indicates a backend crash, unhandled exception, or database failure.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'API',
        actionTaken: `${call.method} ${shortUrl}`,
      });
      onLog(`[API Monitor] 💥 HTTP ${call.status} Server Error on ${shortUrl}`, 'bug');
    }

    // Check 3: Slow API responses
    if (call.duration > slowThresholdMs) {
      bugs.push({
        id: `api-slow-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'CONSOLE_ERROR',
        message: `Slow API response: ${call.method} ${shortUrl} took ${call.duration}ms (threshold: ${slowThresholdMs}ms). This degrades user experience. Consider caching, query optimization, or CDN.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'API',
      });
      onLog(`[API Monitor] ⚠️ Slow API: ${call.duration}ms for ${shortUrl}`, 'bug');
    }

    // Check 4: Missing Content-Type in response
    if (call.status < 400 && !call.contentType && (call.url.includes('/api/') || call.url.includes('json'))) {
      bugs.push({
        id: `api-content-type-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'CONSOLE_ERROR',
        message: `API response missing Content-Type header for ${shortUrl}. Clients cannot determine how to parse the response body.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'API',
      });
    }

    // Check 5: Missing CORS headers on cross-origin requests
    const reqOrigin = new URL(targetUrl).origin;
    const resOrigin = new URL(call.url).origin;
    if (reqOrigin !== resOrigin && !call.responseHeaders['access-control-allow-origin']) {
      bugs.push({
        id: `api-cors-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'CONSOLE_ERROR',
        message: `Cross-origin API request to ${shortUrl} is missing "Access-Control-Allow-Origin" header. This will cause CORS failures in production browsers.`,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        category: 'API',
      });
      onLog(`[API Monitor] 💥 Missing CORS header on ${shortUrl}`, 'bug');
    }
  }

  if (apiCalls.length === 0) {
    onLog('[API Monitor] No XHR/fetch API calls detected during page interaction.');
  }

  onLog(`[API Monitor] Suite complete. Found ${bugs.length} API issue(s).`);
  return bugs;
}
