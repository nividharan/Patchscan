'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ScanConfig,
  SuiteKey,
  SuiteState,
  CrawlProgressEvent,
  AnalyzedBugReport,
  ScreenshotItem,
  ScanSummary,
} from '@/types/scan';

export const ALL_SUITES: { key: SuiteKey; label: string; desc: string; category: any; iconName: string; color: string }[] = [
  { key: 'functional', label: 'Functional QA', desc: 'Forms, CRUD, navigation, workflows', category: 'FUNCTIONAL', iconName: 'Activity', color: 'indigo' },
  { key: 'accessibility', label: 'Accessibility (WCAG)', desc: 'WCAG 2.1 AA, ARIA, contrast, labels', category: 'ACCESSIBILITY', iconName: 'Eye', color: 'violet' },
  { key: 'responsive', label: 'Responsive Layout', desc: 'Mobile (390px), Tablet (768px), Desktop', category: 'RESPONSIVE', iconName: 'Smartphone', color: 'sky' },
  { key: 'security', label: 'Security Headers', desc: 'CSP, XSS, HSTS, secrets, cookies', category: 'SECURITY', iconName: 'Lock', color: 'rose' },
  { key: 'performance', label: 'Performance & Vitals', desc: 'LCP, CLS, TTFB, payload overhead', category: 'PERFORMANCE', iconName: 'Zap', color: 'amber' },
  { key: 'apiMonitor', label: 'API Monitoring', desc: '4xx/5xx errors, CORS, contract sanity', category: 'API', iconName: 'Server', color: 'emerald' },
  { key: 'fileUpload', label: 'File Upload / Download', desc: 'Type spoofing, size limits, parsing', category: 'FILE_UPLOAD', iconName: 'FileUp', color: 'orange' },
  { key: 'crossBrowser', label: 'Cross-Browser Engine', desc: 'Chromium, Firefox, WebKit rendering', category: 'CROSS_BROWSER', iconName: 'Globe', color: 'teal' },
  { key: 'localization', label: 'Localization & i18n', desc: 'RTL layout, lang tags, locale formats', category: 'LOCALIZATION', iconName: 'Languages', color: 'purple' },
  { key: 'concurrency', label: 'Concurrency & Load', desc: 'Simultaneous users, race conditions', category: 'CONCURRENCY', iconName: 'Users', color: 'pink' },
];

export const INITIAL_CONFIG: ScanConfig = {
  functional: true,
  accessibility: true,
  responsive: true,
  security: true,
  performance: true,
  apiMonitor: true,
  fileUpload: true,
  crossBrowser: false,
  localization: false,
  concurrency: false,
};

const MAX_SCAN_TIMEOUT_SEC = 120;

export function useScanStream() {
  const [targetUrl, setTargetUrl] = useState('http://localhost:3000/demo');
  const [config, setConfig] = useState<ScanConfig>(INITIAL_CONFIG);
  const [apiKey, setApiKey] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'completed' | 'timeout' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Time tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(MAX_SCAN_TIMEOUT_SEC);

  // Live items
  const [logs, setLogs] = useState<CrawlProgressEvent[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [suiteStates, setSuiteStates] = useState<Record<SuiteKey, SuiteState>>(() => {
    const initial: Partial<Record<SuiteKey, SuiteState>> = {};
    for (const suite of ALL_SUITES) {
      initial[suite.key] = {
        key: suite.key,
        label: suite.label,
        category: suite.category,
        status: 'idle',
        bugsCount: 0,
        criticalCount: 0,
      };
    }
    return initial as Record<SuiteKey, SuiteState>;
  });

  // Severity metrics
  const [severityCounts, setSeverityCounts] = useState<ScanSummary>({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  });

  // Final Reports
  const [reports, setReports] = useState<AnalyzedBugReport[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, AnalyzedBugReport[]>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Map suite string from crawler logs to SuiteKey
  const normalizeSuiteKey = (suiteStr?: string): SuiteKey | null => {
    if (!suiteStr) return null;
    const s = suiteStr.toLowerCase();
    if (s.includes('func')) return 'functional';
    if (s.includes('access') || s.includes('a11y')) return 'accessibility';
    if (s.includes('resp')) return 'responsive';
    if (s.includes('sec')) return 'security';
    if (s.includes('perf')) return 'performance';
    if (s.includes('api')) return 'apiMonitor';
    if (s.includes('file')) return 'fileUpload';
    if (s.includes('cross') || s.includes('browser')) return 'crossBrowser';
    if (s.includes('local') || s.includes('i18n')) return 'localization';
    if (s.includes('concur')) return 'concurrency';
    return null;
  };

  // Timer effect during scanning
  useEffect(() => {
    if (isScanning) {
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(elapsed);
        const remaining = Math.max(0, MAX_SCAN_TIMEOUT_SEC - elapsed);
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          abortControllerRef.current?.abort();
          setIsScanning(false);
          setScanState('timeout');
          setLogs((prev) => [
            ...prev,
            {
              type: 'LOG',
              message: '⏱️ Scan reached maximum 120-second timeout threshold. Finalizing collected findings.',
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isScanning]);

  const processIncomingEvent = useCallback((event: CrawlProgressEvent) => {
    setLogs((prev) => [...prev, event]);

    // Handle Screenshot
    if (event.screenshotBase64) {
      setScreenshots((prev) => [
        ...prev,
        {
          id: `shot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: event.timestamp || new Date().toLocaleTimeString(),
          suite: event.suite,
          title: event.message || 'Viewport Snapshot',
          dataUrl: event.screenshotBase64!,
        },
      ]);
    }

    const matchedSuiteKey = normalizeSuiteKey(event.suite);

    // Handle Suite Status Transitions
    if (event.type === 'SUITE_START' && matchedSuiteKey) {
      setSuiteStates((prev) => ({
        ...prev,
        [matchedSuiteKey]: {
          ...prev[matchedSuiteKey],
          status: 'running',
          startedAt: Date.now(),
          message: event.message,
        },
      }));
    } else if (event.type === 'SUITE_DONE' && matchedSuiteKey) {
      setSuiteStates((prev) => {
        const current = prev[matchedSuiteKey];
        const duration = current?.startedAt ? Date.now() - current.startedAt : undefined;
        return {
          ...prev,
          [matchedSuiteKey]: {
            ...current,
            status: 'completed',
            completedAt: Date.now(),
            durationMs: duration,
            message: event.message,
          },
        };
      });
    } else if (event.type === 'BUG_FOUND') {
      const isCritical =
        event.message.toLowerCase().includes('critical') ||
        event.message.toLowerCase().includes('exception') ||
        event.message.toLowerCase().includes('xss') ||
        event.message.toLowerCase().includes('500');

      const isHigh =
        event.message.toLowerCase().includes('error') ||
        event.message.toLowerCase().includes('violation') ||
        event.message.toLowerCase().includes('404');

      setSeverityCounts((prev) => {
        const next = { ...prev };
        if (isCritical) {
          next.critical += 1;
        } else if (isHigh) {
          next.high += 1;
        } else {
          next.medium += 1;
        }
        next.total += 1;
        return next;
      });

      if (matchedSuiteKey) {
        setSuiteStates((prev) => ({
          ...prev,
          [matchedSuiteKey]: {
            ...prev[matchedSuiteKey],
            bugsCount: (prev[matchedSuiteKey]?.bugsCount || 0) + 1,
            criticalCount: (prev[matchedSuiteKey]?.criticalCount || 0) + (isCritical ? 1 : 0),
          },
        }));
      }
    }
  }, []);

  const startScan = async (overrideUrl?: string) => {
    let finalUrl = (overrideUrl || targetUrl).trim();
    if (!finalUrl) return;

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
      setTargetUrl(finalUrl);
    }

    setIsScanning(true);
    setIsFallbackMode(false);
    setScanState('scanning');
    setErrorMessage(null);
    setElapsedSeconds(0);
    setRemainingSeconds(MAX_SCAN_TIMEOUT_SEC);
    setLogs([]);
    setScreenshots([]);
    setReports([]);
    setByCategory({});
    setSeverityCounts({ critical: 0, high: 0, medium: 0, low: 0, total: 0 });

    // Mark active suites as pending
    setSuiteStates(() => {
      const initial: Partial<Record<SuiteKey, SuiteState>> = {};
      for (const suite of ALL_SUITES) {
        const isActive = config[suite.key];
        initial[suite.key] = {
          key: suite.key,
          label: suite.label,
          category: suite.category,
          status: isActive ? 'pending' : 'idle',
          bugsCount: 0,
          criticalCount: 0,
        };
      }
      return initial as Record<SuiteKey, SuiteState>;
    });

    abortControllerRef.current = new AbortController();

    try {
      // Try streaming endpoint first
      const response = await fetch('/api/scan/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl, apiKey: apiKey || undefined, config }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE streaming endpoint returned status ${response.status}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              try {
                const payload = JSON.parse(trimmed.slice(5).trim());
                if (payload.type === 'EVENT' && payload.event) {
                  processIncomingEvent(payload.event);
                } else if (payload.type === 'REPORT_READY') {
                  setReports(payload.reports || []);
                  setByCategory(payload.byCategory || {});
                  if (payload.summary) {
                    setSeverityCounts(payload.summary);
                  }
                  // Mark all running/pending active suites as completed
                  setSuiteStates((prev) => {
                    const updated = { ...prev };
                    for (const key of Object.keys(updated) as SuiteKey[]) {
                      if (config[key] && updated[key].status !== 'idle') {
                        updated[key] = { ...updated[key], status: 'completed' };
                      }
                    }
                    return updated;
                  });
                  setScanState('completed');
                } else if (payload.type === 'ERROR') {
                  setErrorMessage(payload.error || 'Scan error');
                  setScanState('error');
                }
              } catch (parseErr) {
                console.warn('Could not parse SSE payload:', trimmed, parseErr);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.warn('SSE stream failed, initiating visible fallback channel...', err);
      setIsFallbackMode(true);
      setLogs((prev) => [
        ...prev,
        {
          type: 'LOG',
          message: `⚠️ [STREAM FALLBACK] SSE live connection interrupted (${err.message || 'connection dropped'}). Switching to buffered direct execution channel...`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      // Fallback to regular POST endpoint
      try {
        const fallbackRes = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: finalUrl, apiKey: apiKey || undefined, config }),
        });
        const data = await fallbackRes.json();
        if (!fallbackRes.ok) throw new Error(data.error || 'Direct scan execution failed');

        if (data.logs) setLogs(data.logs);
        if (data.reports) setReports(data.reports);
        if (data.byCategory) setByCategory(data.byCategory);
        if (data.summary) {
          setSeverityCounts({
            ...data.summary,
            total: data.reports?.length || 0,
          });
        }
        setSuiteStates((prev) => {
          const updated = { ...prev };
          for (const key of Object.keys(updated) as SuiteKey[]) {
            if (config[key]) {
              updated[key] = { ...updated[key], status: 'completed' };
            }
          }
          return updated;
        });
        setScanState('completed');
      } catch (fallbackErr: any) {
        setErrorMessage(fallbackErr.message || 'Scan failed completely on both SSE stream and direct channels.');
        setScanState('error');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const cancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
    setScanState('idle');
    setLogs((prev) => [
      ...prev,
      {
        type: 'LOG',
        message: 'Scan cancelled by user.',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const resetScan = () => {
    setIsScanning(false);
    setIsFallbackMode(false);
    setScanState('idle');
    setLogs([]);
    setScreenshots([]);
    setReports([]);
    setByCategory({});
    setSeverityCounts({ critical: 0, high: 0, medium: 0, low: 0, total: 0 });
    setElapsedSeconds(0);
    setRemainingSeconds(MAX_SCAN_TIMEOUT_SEC);
  };

  const activeSuitesCount = Object.values(config).filter(Boolean).length;
  const completedSuitesCount = Object.values(suiteStates).filter((s) => s.status === 'completed').length;
  const progressPercent = activeSuitesCount > 0
    ? Math.min(100, Math.round((completedSuitesCount / activeSuitesCount) * 100))
    : 0;

  return {
    targetUrl,
    setTargetUrl,
    config,
    setConfig,
    apiKey,
    setApiKey,
    isScanning,
    isFallbackMode,
    scanState,
    errorMessage,
    elapsedSeconds,
    remainingSeconds,
    logs,
    screenshots,
    suiteStates,
    severityCounts,
    reports,
    byCategory,
    activeSuitesCount,
    completedSuitesCount,
    progressPercent,
    startScan,
    cancelScan,
    resetScan,
  };
}
