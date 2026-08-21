'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Clock,
  Flame,
  CheckCircle2,
  RefreshCw,
  Eye,
  Camera,
  Activity,
  Smartphone,
  Lock,
  Zap,
  Server,
  FileUp,
  Globe,
  Languages,
  Users,
  Search,
  Pause,
  Play,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { ALL_SUITES } from '@/hooks/useScanStream';
import {
  SuiteState,
  SuiteKey,
  CrawlProgressEvent,
  ScreenshotItem,
  ScanSummary,
  ScanConfig,
} from '@/types/scan';
import { ScreenshotModal } from './ScreenshotModal';

interface LiveScanViewProps {
  targetUrl: string;
  config: ScanConfig;
  suiteStates: Record<SuiteKey, SuiteState>;
  logs: CrawlProgressEvent[];
  screenshots: ScreenshotItem[];
  severityCounts: ScanSummary;
  elapsedSeconds: number;
  remainingSeconds: number;
  progressPercent: number;
  isScanning: boolean;
  isFallbackMode?: boolean;
  onCancelScan: () => void;
  onViewReport?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Activity,
  Eye,
  Smartphone,
  Lock,
  Zap,
  Server,
  FileUp,
  Globe,
  Languages,
  Users,
};

export function LiveScanView({
  targetUrl,
  config,
  suiteStates,
  logs,
  screenshots,
  severityCounts,
  elapsedSeconds,
  remainingSeconds,
  progressPercent,
  isScanning,
  isFallbackMode,
  onCancelScan,
  onViewReport,
}: LiveScanViewProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotItem | null>(null);
  const [logFilter, setLogFilter] = useState<'ALL' | 'ACTION' | 'BUG' | 'LOG'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'ACTION' && log.type !== 'ACTION' && log.type !== 'SUITE_START') return false;
    if (logFilter === 'BUG' && log.type !== 'BUG_FOUND') return false;
    if (logFilter === 'LOG' && log.type !== 'LOG' && log.type !== 'SUITE_DONE') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        (log.suite && log.suite.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const getRiskLevel = () => {
    if (severityCounts.critical > 0) return { label: 'CRITICAL', color: 'text-rose-400 bg-rose-950/60 border-rose-500/50' };
    if (severityCounts.high > 0) return { label: 'HIGH RISK', color: 'text-orange-400 bg-orange-950/60 border-orange-500/50' };
    if (severityCounts.medium > 0) return { label: 'MODERATE', color: 'text-amber-400 bg-amber-950/60 border-amber-500/50' };
    return { label: 'CLEAN', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/50' };
  };

  const risk = getRiskLevel();

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Compact Telemetry Strip */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
          {/* Target */}
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Target</span>
              {isFallbackMode ? (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  DIRECT
                </span>
              ) : (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  SSE LIVE
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-200 truncate font-semibold" title={targetUrl}>
              {targetUrl}
            </p>
          </div>

          {/* Timing */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>ELAPSED</span>
              <span>{formatTime(remainingSeconds)} left</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold font-mono text-white">{formatTime(elapsedSeconds)}</span>
              <div className="flex-1 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Real-time Findings Counter */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>FINDINGS</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${risk.color}`}>{risk.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white font-mono">{severityCounts.total}</span>
              <div className="flex gap-1 text-[9px] font-mono">
                <span className="text-rose-400 bg-rose-950/60 px-1 rounded">{severityCounts.critical}C</span>
                <span className="text-orange-400 bg-orange-950/60 px-1 rounded">{severityCounts.high}H</span>
                <span className="text-amber-400 bg-amber-950/60 px-1 rounded">{severityCounts.medium}M</span>
              </div>
            </div>
          </div>

          {/* Action / Progress */}
          <div className="flex items-center justify-end gap-2">
            {isScanning ? (
              <button
                onClick={onCancelScan}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 transition flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Stop Scan
              </button>
            ) : (
              onViewReport && (
                <button
                  onClick={onViewReport}
                  className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> View Report →
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 10 Suites Fleet - Compact Grid */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" /> Suite Status Fleet (10 Suites)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {Object.values(suiteStates).filter((s) => s.status === 'completed').length}/
            {Object.values(config).filter(Boolean).length} Done ({progressPercent}%)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ALL_SUITES.map((suite) => {
            const Icon = ICON_MAP[suite.iconName] || Activity;
            const state = suiteStates[suite.key];
            const isEnabled = config[suite.key];

            let borderStyle = 'border-slate-800/80 bg-slate-950/40 text-slate-600 opacity-50';
            let statusText = 'OFF';

            if (isEnabled) {
              if (state.status === 'running') {
                borderStyle = 'border-indigo-500 bg-indigo-950/30 text-indigo-300 ring-1 ring-indigo-500/40';
                statusText = 'RUNNING';
              } else if (state.status === 'completed') {
                if (state.bugsCount > 0) {
                  borderStyle = 'border-rose-500/40 bg-rose-950/20 text-rose-300';
                  statusText = `${state.bugsCount} BUGS`;
                } else {
                  borderStyle = 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300';
                  statusText = 'PASSED';
                }
              } else {
                borderStyle = 'border-slate-800 bg-slate-950 text-slate-400';
                statusText = 'QUEUED';
              }
            }

            return (
              <div
                key={suite.key}
                className={`p-2 rounded-lg border flex items-center justify-between gap-1.5 transition-all text-xs ${borderStyle}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium truncate text-[11px]">{suite.label}</span>
                </div>
                <span className="text-[9px] font-mono font-bold flex-shrink-0">
                  {state?.status === 'running' ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-400" />
                  ) : (
                    statusText
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Workspace: Split View Terminal + Screenshots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Terminal Log Stream */}
        <div className="lg:col-span-2 rounded-xl bg-[#070b14] border border-slate-800 flex flex-col h-[360px] shadow-xl overflow-hidden">
          <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300 font-mono">TELEMETRY STREAM</span>
              <span className="text-[10px] text-slate-500 font-mono">({filteredLogs.length})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800 text-[9px] font-mono">
                {(['ALL', 'ACTION', 'BUG', 'LOG'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLogFilter(filter)}
                    className={`px-1.5 py-0.5 rounded transition ${
                      logFilter === filter ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1 rounded text-xs transition ${
                  autoScroll ? 'bg-indigo-950 text-indigo-300' : 'bg-slate-900 text-slate-500'
                }`}
                title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
              >
                {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div
            ref={logsContainerRef}
            className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-1 bg-[#050811] custom-scrollbar"
          >
            {filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                Awaiting real-time stream events...
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/30 rounded px-1">
                  <span className="text-slate-600 text-[10px] flex-shrink-0 font-mono">[{log.timestamp || '00:00'}]</span>
                  <span className="flex-1 text-[11px] break-all">
                    {log.type === 'ACTION' || log.type === 'SUITE_START' ? (
                      <span className="text-indigo-300">▶ {log.message}</span>
                    ) : log.type === 'BUG_FOUND' ? (
                      <span className="text-rose-400 font-semibold">💥 {log.message}</span>
                    ) : log.type === 'SUITE_DONE' ? (
                      <span className="text-emerald-400">✓ {log.message}</span>
                    ) : (
                      <span className="text-slate-400">{log.message}</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Screenshot Viewport Strip */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col h-[360px] shadow-xl overflow-hidden">
          <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-bold text-slate-300 font-mono">VIEWPORT STRIP</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{screenshots.length} shots</span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-2 bg-[#080c16] custom-scrollbar">
            {screenshots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs text-center p-4">
                <Camera className="w-6 h-6 text-slate-700 mb-1" />
                <p className="text-[11px]">Capturing browser snapshots...</p>
              </div>
            ) : (
              screenshots.map((shot) => (
                <div
                  key={shot.id}
                  onClick={() => setSelectedScreenshot(shot)}
                  className="cursor-pointer group rounded-lg border border-slate-800 bg-slate-950 overflow-hidden hover:border-sky-500/50 transition-all"
                >
                  <div className="aspect-video w-full bg-black/40 overflow-hidden">
                    <img src={shot.dataUrl} alt={shot.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </div>
                  <div className="p-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-slate-300 truncate max-w-[150px]">{shot.title}</span>
                    <span className="text-slate-500 font-mono">{shot.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ScreenshotModal screenshot={selectedScreenshot} onClose={() => setSelectedScreenshot(null)} />
    </div>
  );
}
