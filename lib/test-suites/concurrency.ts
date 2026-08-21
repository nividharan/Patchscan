import { Browser } from 'playwright';
import { RawBugFinding } from '../analyzer';

export async function runConcurrencyTests(
  browser: Browser,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];
  const CONCURRENT_USERS = 5;

  onLog(`👥 [Concurrency] Simulating ${CONCURRENT_USERS} simultaneous users...`, 'action');

  // Launch N browser contexts simultaneously
  const contexts = await Promise.all(
    Array.from({ length: CONCURRENT_USERS }, (_, i) =>
      browser.newContext({ viewport: { width: 1280, height: 720 } })
    )
  );

  const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
  const results: { errors: string[]; status: 'ok' | 'error'; duration: number }[] = [];

  // All users navigate simultaneously
  onLog('[Concurrency] All users loading page simultaneously...', 'action');
  const navResults = await Promise.allSettled(
    pages.map(async (page, i) => {
      const start = Date.now();
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text().substring(0, 80));
      });
      page.on('pageerror', err => errors.push(err.message.substring(0, 80)));
      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        return { errors, status: 'ok' as const, duration: Date.now() - start };
      } catch (err: any) {
        return { errors: [err.message], status: 'error' as const, duration: Date.now() - start };
      }
    })
  );

  navResults.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({ errors: [result.reason?.message || 'Unknown'], status: 'error', duration: 0 });
    }
  });

  const failedUsers = results.filter(r => r.status === 'error').length;
  const avgDuration = results.reduce((s, r) => s + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));

  onLog(`[Concurrency] ${CONCURRENT_USERS} users loaded. Avg: ${avgDuration.toFixed(0)}ms, Max: ${maxDuration}ms, Failures: ${failedUsers}`);

  if (failedUsers > 0) {
    bugs.push({
      id: `concur-failures-${Date.now()}`,
      type: 'NETWORK_FAILURE',
      message: `${failedUsers} of ${CONCURRENT_USERS} concurrent users failed to load the page. The server may not handle concurrent connections reliably.`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'CONCURRENCY',
    });
    onLog(`[Concurrency] 💥 ${failedUsers} user(s) failed under concurrent load!`, 'bug');
  }

  if (maxDuration > 5000) {
    bugs.push({
      id: `concur-slow-${Date.now()}`,
      type: 'CONSOLE_ERROR',
      message: `Under concurrent load of ${CONCURRENT_USERS} users, the slowest page load took ${maxDuration}ms (average: ${avgDuration.toFixed(0)}ms). This may indicate server capacity issues.`,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      category: 'CONCURRENCY',
    });
    onLog(`[Concurrency] ⚠️ Slowest concurrent load: ${maxDuration}ms!`, 'bug');
  }

  // Simultaneous form submissions (race condition test)
  onLog('[Concurrency] Testing simultaneous form submissions (race condition check)...', 'action');
  const formPages = pages.slice(0, 3);
  const submitResults: boolean[] = [];

  await Promise.all(
    formPages.map(async (page) => {
      try {
        const form = await page.$('form');
        if (!form) return;
        const inputs = await form.$$('input[type="text"], input[type="email"]');
        for (const input of inputs.slice(0, 2)) {
          await input.fill('concurrent_test@example.com').catch(() => {});
        }
        const submitBtn = await form.$('button[type="submit"], button:not([type])');
        if (submitBtn) {
          await submitBtn.click({ timeout: 2000 }).catch(() => {});
          submitResults.push(true);
        }
      } catch (_) {
        submitResults.push(false);
      }
    })
  );

  if (submitResults.length > 1) {
    onLog(`[Concurrency] ${submitResults.filter(Boolean).length} simultaneous form submissions fired.`);
  }

  // Cleanup
  await Promise.allSettled(pages.map(p => p.close()));
  await Promise.allSettled(contexts.map(c => c.close()));

  onLog(`[Concurrency] Suite complete. Found ${bugs.length} concurrency issue(s).`);
  return bugs;
}
