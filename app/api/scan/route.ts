import { NextRequest } from 'next/server';
import { crawlAndTestUrl, ScanConfig, DEFAULT_CONFIG } from '@/lib/crawler';
import { analyzeBugsWithAI } from '@/lib/analyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, apiKey, config } = body;

    if (!url) {
      return Response.json({ error: 'Target URL is required' }, { status: 400 });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const scanConfig: ScanConfig = { ...DEFAULT_CONFIG, ...(config || {}) };
    const logs: any[] = [];
    let latestScreenshot: string | undefined;

    const rawBugs = await crawlAndTestUrl(formattedUrl, (event) => {
      logs.push(event);
      if (event.screenshotBase64) {
        latestScreenshot = event.screenshotBase64;
      }
    }, scanConfig);

    const reports = await analyzeBugsWithAI(formattedUrl, rawBugs, apiKey);

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
  } catch (error: any) {
    console.error('[Scan API Error]', error);
    return Response.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
