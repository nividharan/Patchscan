import { NextRequest } from 'next/server';
import { crawlAndTestUrl, runHttpFallbackScan, ScanConfig, DEFAULT_CONFIG, CrawlProgressEvent } from '@/lib/crawler';
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

    // Check concurrency limits
    if (!scanLimiter.acquire()) {
      return Response.json(
        { error: 'Server is currently executing maximum concurrent scans. Please try again shortly.' },
        { status: 429 }
      );
    }

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
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
          let rawBugs = [];
          try {
            rawBugs = await crawlAndTestUrl(
              formattedUrl,
              (event: CrawlProgressEvent) => {
                send({ type: 'EVENT', event });
              },
              scanConfig
            );
          } catch (crawlErr: any) {
            send({
              type: 'EVENT',
              event: {
                type: 'LOG',
                message: `Notice: Desktop binary restricted by host. Running Resilient HTTP/DOM Deep Probe...`,
                timestamp: new Date().toLocaleTimeString(),
              }
            });
            rawBugs = await runHttpFallbackScan(
              formattedUrl,
              scanConfig,
              (type, message, suite, screenshotBase64) => {
                send({
                  type: 'EVENT',
                  event: {
                    type,
                    message,
                    timestamp: new Date().toLocaleTimeString(),
                    suite,
                    screenshotBase64,
                  }
                });
              },
              []
            );
          }

          send({
            type: 'EVENT',
            event: {
              type: 'LOG',
              message: 'Crawl completed. Running Multi-LLM Forensic Analyzer...',
              timestamp: new Date().toLocaleTimeString(),
            }
          });

          const reports = await analyzeBugsWithAI(formattedUrl, rawBugs, effectiveApiKey);

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
        } finally {
          scanLimiter.release();
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
