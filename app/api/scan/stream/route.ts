import { NextRequest } from 'next/server';
import { crawlAndTestUrl, ScanConfig, DEFAULT_CONFIG, CrawlProgressEvent } from '@/lib/crawler';
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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error('[SSE Stream Push Error]', e);
          }
        };

        try {
          const rawBugs = await crawlAndTestUrl(
            formattedUrl,
            (event: CrawlProgressEvent) => {
              send({ type: 'EVENT', event });
            },
            scanConfig
          );

          send({
            type: 'EVENT',
            event: {
              type: 'LOG',
              message: 'Crawl completed. Running AI Forensic Analyzer...',
              timestamp: new Date().toLocaleTimeString(),
            }
          });

          const reports = await analyzeBugsWithAI(formattedUrl, rawBugs, apiKey);

          const byCategory: Record<string, typeof reports> = {};
          for (const r of reports) {
            if (!byCategory[r.category]) byCategory[r.category] = [];
            byCategory[r.category].push(r);
          }

          const summary = {
            critical: reports.filter(r => r.severity === 'CRITICAL').length,
            high: reports.filter(r => r.severity === 'HIGH').length,
            medium: reports.filter(r => r.severity === 'MEDIUM').length,
            low: reports.filter(r => r.severity === 'LOW').length,
            total: reports.length,
          };

          send({
            type: 'REPORT_READY',
            reports,
            byCategory,
            summary,
            targetUrl: formattedUrl,
          });

          controller.close();
        } catch (error: any) {
          send({ type: 'ERROR', error: error.message || 'Scan execution error' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Scan Stream API Error]', error);
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
