'use client';

import React, { useState } from 'react';
import {
  Bug,
  Activity,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useScanStream } from '@/hooks/useScanStream';
import { ScanConfigForm } from '@/components/ScanConfigForm';
import { LiveScanView } from '@/components/LiveScanView';
import { ReportDashboard } from '@/components/ReportDashboard';

export default function Home() {
  const {
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
    progressPercent,
    startScan,
    cancelScan,
    resetScan,
  } = useScanStream();

  const [activeScreen, setActiveScreen] = useState<'config' | 'live' | 'report'>('config');

  const handleStartScan = (urlOverride?: string) => {
    setActiveScreen('live');
    startScan(urlOverride);
  };

  const handleResetScan = () => {
    resetScan();
    setActiveScreen('config');
  };

  const isCompleted = scanState === 'completed';
  const hasReports = reports.length > 0;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Compact Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-13 py-2 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-lg text-white shadow-md shadow-indigo-500/20">
              <Bug className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                WebHealer AI
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono font-bold">
                COCKPIT
              </span>
            </div>
          </div>

          {/* Navigation View Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveScreen('config')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition text-xs font-medium ${
                activeScreen === 'config'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Config</span>
            </button>

            <button
              onClick={() => setActiveScreen('live')}
              disabled={scanState === 'idle'}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition text-xs font-medium ${
                activeScreen === 'live'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Live Sweep</span>
              {isScanning && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveScreen('report')}
              disabled={!hasReports && !isCompleted}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition text-xs font-medium ${
                activeScreen === 'report'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Report</span>
              {hasReports && (
                <span className="text-[9px] px-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-mono">
                  {reports.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Target Sandbox Link */}
          <div className="flex items-center gap-2">
            <a
              href="/demo"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex px-2.5 py-1 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>Demo Sandbox</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Timeout Warning */}
        {scanState === 'timeout' && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between gap-2 text-amber-200 text-xs shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>120s Limit Reached:</strong> Playwright sweep capped at timeout. Processed findings are ready for review.
              </span>
            </div>
            <button
              onClick={() => setActiveScreen('report')}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold transition text-xs flex-shrink-0"
            >
              View Report →
            </button>
          </div>
        )}

        {/* Error Banner */}
        {scanState === 'error' && errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center justify-between gap-2 text-rose-200 text-xs shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>
                <strong>Scan Issue:</strong> {errorMessage}
              </span>
            </div>
            <button
              onClick={handleResetScan}
              className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded font-semibold transition text-xs flex-shrink-0 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Screen Switcher */}
        {activeScreen === 'config' && (
          <ScanConfigForm
            targetUrl={targetUrl}
            setTargetUrl={setTargetUrl}
            config={config}
            setConfig={setConfig}
            apiKey={apiKey}
            setApiKey={setApiKey}
            onStartScan={handleStartScan}
            isScanning={isScanning}
          />
        )}

        {activeScreen === 'live' && (
          <LiveScanView
            targetUrl={targetUrl}
            config={config}
            suiteStates={suiteStates}
            logs={logs}
            screenshots={screenshots}
            severityCounts={severityCounts}
            elapsedSeconds={elapsedSeconds}
            remainingSeconds={remainingSeconds}
            progressPercent={progressPercent}
            isScanning={isScanning}
            isFallbackMode={isFallbackMode}
            onCancelScan={cancelScan}
            onViewReport={() => setActiveScreen('report')}
          />
        )}

        {activeScreen === 'report' && (
          <ReportDashboard
            targetUrl={targetUrl}
            reports={reports}
            byCategory={byCategory}
            summary={severityCounts}
            onResetScan={handleResetScan}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950/90 py-2.5 text-center text-[11px] text-slate-500 font-mono">
        WebHealer AI • Autonomous 10-Suite Playwright QA & AI Auto-Remediation Cockpit
      </footer>
    </div>
  );
}
