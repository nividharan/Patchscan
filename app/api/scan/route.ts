import { NextRequest } from 'next/server';
import { crawlAndTestUrl, ScanConfig, DEFAULT_CONFIG } from '@/lib/crawler';
import { analyzeBugsWithAI } from '@/lib/analyzer';
import { validateTargetUrl } from '@/lib/url-validator';
import { scanLimiter } from '@/lib/scan-limiter';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, apiKey, config } = body;

    if (!url) {
      return Response.json({ error: 'Target URL is required' }, { status: 400 });
    }

    // SSRF Validation
    const validation = validateTargetUrl(url);
    if (!validation.isValid || !validation.formattedUrl) {
      return Response.json({ error: validation.error || 'Invalid target URL' }, { status: 400 });
    }

    const formattedUrl = validation.formattedUrl;

    if (!scanLimiter.acquire()) {
      return Response.json(
        { error: 'Server busy: Maximum concurrent scans running. Please retry in a few moments.' },
        { status: 429 }
      );
    }

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const scanConfig: ScanConfig = { ...DEFAULT_CONFIG, ...(config || {}) };
    const logs: any[] = [];
    let latestScreenshot: string | undefined;

    try {
      const rawBugs = await crawlAndTestUrl(formattedUrl, (event) => {
        logs.push(event);
        if (event.screenshotBase64) {
          latestScreenshot = event.screenshotBase64;
        }
      }, scanConfig);

      const reports = await analyzeBugsWithAI(formattedUrl, rawBugs, effectiveApiKey);

      // Group reports by category
      const byCategory: Record<string, typeof reports> = {};
      for (const r of reports) {
        if (!byCategory[r.category]) byCategory[r.category] = [];
        byCategory[r.category].push(r);
      }

      return Response.json({
        success: true,
        targetUrl: formattedUrl,
        totalBugsFound: reports.length,
        logs,
        latestScreenshot,
        reports,
        byCategory,
        summary: {
          critical: reports.filter(r => r.severity === 'CRITICAL').length,
          high: reports.filter(r => r.severity === 'HIGH').length,
          medium: reports.filter(r => r.severity === 'MEDIUM').length,
          low: reports.filter(r => r.severity === 'LOW').length,
        }
      });
    } finally {
      scanLimiter.release();
    }
  } catch (error: any) {
    console.error('[Scan API Error]', error);
    return Response.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
