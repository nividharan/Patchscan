'use client';

import React, { useState } from 'react';
import {
  Play,
  Terminal,
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
  Key,
  Info,
  CheckSquare,
  Square,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ALL_SUITES } from '@/hooks/useScanStream';
import { ScanConfig, SuiteKey } from '@/types/scan';

interface ScanConfigFormProps {
  targetUrl: string;
  setTargetUrl: (url: string) => void;
  config: ScanConfig;
  setConfig: React.Dispatch<React.SetStateAction<ScanConfig>>;
  apiKey: string;
  setApiKey: (key: string) => void;
  onStartScan: (urlOverride?: string) => void;
  isScanning: boolean;
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

export function ScanConfigForm({
  targetUrl,
  setTargetUrl,
  config,
  setConfig,
  apiKey,
  setApiKey,
  onStartScan,
  isScanning,
}: ScanConfigFormProps) {
  const [showApiKeyDetails, setShowApiKeyDetails] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);

  const activeCount = Object.values(config).filter(Boolean).length;

  const handleToggleSuite = (key: SuiteKey) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = () => {
    setConfig({
      functional: true,
      accessibility: true,
      responsive: true,
      security: true,
      performance: true,
      apiMonitor: true,
      fileUpload: true,
      crossBrowser: true,
      localization: true,
      concurrency: true,
    });
  };

  const handleSelectRecommended = () => {
    setConfig({
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
    });
  };

  const handleDeselectAll = () => {
    setConfig({
      functional: false,
      accessibility: false,
      responsive: false,
      security: false,
      performance: false,
      apiMonitor: false,
      fileUpload: false,
      crossBrowser: false,
      localization: false,
      concurrency: false,
    });
  };

  const handleUrlBlur = () => {
    setUrlTouched(true);
    let trimmed = targetUrl.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
      setTargetUrl(trimmed);
    }
  };

  const isValidUrl = () => {
    if (!targetUrl.trim()) return false;
    try {
      let testUrl = targetUrl.trim();
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = `https://${testUrl}`;
      }
      new URL(testUrl);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidUrl() && !isScanning && activeCount > 0) {
      onStartScan();
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Compact Unified Scanner Card */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl space-y-4">
        {/* Header & Quick Intro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Automated QA Sweep & Auto-Heal</span>
            </h1>
            <p className="text-xs text-slate-400">
              Run 10 parallel Playwright test suites. AI discovers defects, produces .spec.ts repros, and generates .diff patches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTargetUrl('http://localhost:3000/demo');
                onStartScan('http://localhost:3000/demo');
              }}
              disabled={isScanning}
              className="px-2.5 py-1 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 rounded-lg border border-indigo-500/30 text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target Sandbox (/demo)</span>
            </button>
          </div>
        </div>

        {/* Compact URL Scanner Input Bar */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Terminal className="absolute left-3 inset-y-0 my-auto w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://example.com or http://localhost:3000/demo"
                disabled={isScanning}
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-950 border rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                  urlTouched && !isValidUrl()
                    ? 'border-rose-500/80 focus:border-rose-500'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isScanning || !isValidUrl() || activeCount === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 flex-shrink-0 transition active:scale-[0.99]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Run QA Sweep ({activeCount}/10)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Compact 10-Suite Fleet Matrix */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Select Test Suites ({activeCount}/10 Enabled)
            </h2>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={handleSelectRecommended}
              className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-900/60 transition"
            >
              Recommended (7)
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              All (10)
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 hover:bg-slate-800 transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* 10 Suites Grid - Compact */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ALL_SUITES.map((suite) => {
            const Icon = ICON_MAP[suite.iconName] || Activity;
            const isEnabled = config[suite.key];

            return (
              <button
                key={suite.key}
                type="button"
                onClick={() => handleToggleSuite(suite.key)}
                disabled={isScanning}
                className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2 select-none ${
                  isEnabled
                    ? 'bg-indigo-950/30 border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/30 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-500 hover:border-slate-700 opacity-60'
                }`}
              >
                <div
                  className={`p-1.5 rounded flex-shrink-0 ${
                    isEnabled
                      ? 'bg-indigo-600/30 text-indigo-300'
                      : 'bg-slate-900 text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{suite.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {suite.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion AI Engine Config */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 shadow-md">
        <button
          type="button"
          onClick={() => setShowApiKeyDetails(!showApiKeyDetails)}
          className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">AI Forensic Engine Settings</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              Zero-Key AST Active
            </span>
          </div>
          {showApiKeyDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {showApiKeyDetails && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Optional OpenAI API Key (e.g. sk-...)"
                disabled={isScanning}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              By default, WebHealer runs its zero-key AST heuristic engine for instant Playwright tests & diff patches without needing any external API keys.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
