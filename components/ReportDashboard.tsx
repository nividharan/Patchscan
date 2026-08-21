'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Code2,
  FileCode,
  Sparkles,
  Download,
  FileJson,
  Printer,
  RotateCcw,
  CheckCircle2,
  Camera,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { AnalyzedBugReport, Severity, ScanSummary } from '@/types/scan';
import { CodeViewer } from './CodeViewer';
import { ScreenshotModal } from './ScreenshotModal';

interface ReportDashboardProps {
  targetUrl: string;
  reports: AnalyzedBugReport[];
  byCategory: Record<string, AnalyzedBugReport[]>;
  summary: ScanSummary;
  onResetScan: () => void;
}

const SEVERITY_THEME: Record<Severity, { text: string; bg: string; border: string; badgeBg: string }> = {
  CRITICAL: {
    text: 'text-rose-400',
    bg: 'bg-rose-950/20',
    border: 'border-rose-500/40',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  HIGH: {
    text: 'text-orange-400',
    bg: 'bg-orange-950/20',
    border: 'border-orange-500/40',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  MEDIUM: {
    text: 'text-amber-400',
    bg: 'bg-amber-950/20',
    border: 'border-amber-500/40',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  LOW: {
    text: 'text-blue-400',
    bg: 'bg-blue-950/20',
    border: 'border-blue-500/40',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
};

export function ReportDashboard({
  targetUrl,
  reports,
  byCategory,
  summary,
  onResetScan,
}: ReportDashboardProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'ALL'>('ALL');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(Object.keys(byCategory))
  );
  const [expandedReports, setExpandedReports] = useState<Set<string>>(
    () => new Set(reports.slice(0, 3).map((r) => r.id))
  );
  const [activeCodeTab, setActiveCodeTab] = useState<Record<string, 'diff' | 'spec'>>({});
  const [enlargedScreenshot, setEnlargedScreenshot] = useState<{
    id: string;
    timestamp: string;
    title: string;
    dataUrl: string;
  } | null>(null);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleReport = (id: string) => {
    setExpandedReports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedCategories(new Set(Object.keys(byCategory)));
    setExpandedReports(new Set(reports.map((r) => r.id)));
  };

  const handleCollapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedReports(new Set());
  };

  const filteredReports = selectedSeverity === 'ALL'
    ? reports
    : reports.filter((r) => r.severity === selectedSeverity);

  const filteredByCategory: Record<string, AnalyzedBugReport[]> = {};
  for (const r of filteredReports) {
    if (!filteredByCategory[r.category]) {
      filteredByCategory[r.category] = [];
    }
    filteredByCategory[r.category].push(r);
  }

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(
      {
        targetUrl,
        scannedAt: new Date().toISOString(),
        summary,
        totalFindings: reports.length,
        reports,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `webhealer-audit-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllPatches = () => {
    const allPatches = reports
      .map(
        (r, idx) =>
          `# Patch #${idx + 1}: ${r.title} [${r.severity}]\n# Category: ${r.categoryLabel}\n# Root Cause: ${r.rootCause}\n\n${r.suggestedFixDiff}\n\n`
      )
      .join('\n' + '='.repeat(80) + '\n\n');

    const blob = new Blob([allPatches], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `webhealer-all-patches-${Date.now()}.patch`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Compact Header & Export Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">
              QA Audit & Forensic Patch Report
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-2.5 h-2.5" /> DONE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono truncate max-w-lg">
            Target: <span className="text-slate-200">{targetUrl}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleDownloadAllPatches}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Patches (.patch)</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition"
          >
            <FileJson className="w-3.5 h-3.5 text-indigo-400" />
            <span>JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print</span>
          </button>

          <button
            onClick={onResetScan}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Scan</span>
          </button>
        </div>
      </div>

      {/* Sleek Severity Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => setSelectedSeverity('ALL')}
          className={`p-2.5 rounded-lg border text-left transition ${
            selectedSeverity === 'ALL'
              ? 'bg-indigo-950/60 border-indigo-500/60 ring-1 ring-indigo-500/30 text-white'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="text-base font-bold font-mono text-white">{reports.length}</div>
          <div className="text-[11px] mt-0.5">All Findings</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSeverity('CRITICAL')}
          className={`p-2.5 rounded-lg border text-left transition ${
            selectedSeverity === 'CRITICAL'
              ? 'bg-rose-950/60 border-rose-500 ring-1 ring-rose-500/30 text-white'
              : 'bg-slate-900/60 border-slate-800 hover:border-rose-900/50 text-slate-400'
          }`}
        >
          <div className="text-base font-bold font-mono text-rose-400">{summary.critical}</div>
          <div className="text-[11px] mt-0.5 text-rose-300">Critical</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSeverity('HIGH')}
          className={`p-2.5 rounded-lg border text-left transition ${
            selectedSeverity === 'HIGH'
              ? 'bg-orange-950/60 border-orange-500 ring-1 ring-orange-500/30 text-white'
              : 'bg-slate-900/60 border-slate-800 hover:border-orange-900/50 text-slate-400'
          }`}
        >
          <div className="text-base font-bold font-mono text-orange-400">{summary.high}</div>
          <div className="text-[11px] mt-0.5 text-orange-300">High</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSeverity('MEDIUM')}
          className={`p-2.5 rounded-lg border text-left transition ${
            selectedSeverity === 'MEDIUM'
              ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500/30 text-white'
              : 'bg-slate-900/60 border-slate-800 hover:border-amber-900/50 text-slate-400'
          }`}
        >
          <div className="text-base font-bold font-mono text-amber-400">{summary.medium}</div>
          <div className="text-[11px] mt-0.5 text-amber-300">Medium</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSeverity('LOW')}
          className={`p-2.5 rounded-lg border text-left transition ${
            selectedSeverity === 'LOW'
              ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500/30 text-white'
              : 'bg-slate-900/60 border-slate-800 hover:border-blue-900/50 text-slate-400'
          }`}
        >
          <div className="text-base font-bold font-mono text-blue-400">{summary.low}</div>
          <div className="text-[11px] mt-0.5 text-blue-300">Low</div>
        </button>
      </div>

      {/* Accordion Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Categorized Findings ({Object.keys(filteredByCategory).length} Suites Active)
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button onClick={handleExpandAll} className="text-slate-400 hover:text-white transition text-[11px]">
            Expand All
          </button>
          <span className="text-slate-700">•</span>
          <button onClick={handleCollapseAll} className="text-slate-400 hover:text-white transition text-[11px]">
            Collapse All
          </button>
        </div>
      </div>

      {/* Zero Defects Clean Sweep Hero */}
      {reports.length === 0 ? (
        <div className="p-6 md:p-8 text-center rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
              CERTIFIED CLEAN SWEEP
            </span>
            <h3 className="text-lg font-bold text-white">Zero Defects Detected</h3>
            <p className="text-xs text-slate-400">
              All suites passed against <span className="text-white font-mono">{targetUrl}</span> with zero runtime exceptions or WCAG violations.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl mx-auto text-xs font-medium">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 flex items-center gap-1.5 justify-center text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>WCAG 2.1 Passed</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 flex items-center gap-1.5 justify-center text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Zero JS Errors</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 flex items-center gap-1.5 justify-center text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Vitals Clean</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 flex items-center gap-1.5 justify-center text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Responsive Clean</span>
            </div>
          </div>

          <button
            onClick={onResetScan}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" /> Scan Another URL
          </button>
        </div>
      ) : Object.keys(filteredByCategory).length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Findings for Severity &quot;{selectedSeverity}&quot;</h3>
          <button
            onClick={() => setSelectedSeverity('ALL')}
            className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
          >
            Show All {reports.length} Findings
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(filteredByCategory).map(([categoryKey, categoryReports]) => {
            const isExpanded = expandedCategories.has(categoryKey);
            const categoryLabel = categoryReports[0]?.categoryLabel || categoryKey;

            return (
              <div key={categoryKey} className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-md">
                {/* Suite Category Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(categoryKey)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/60 transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-white text-xs">{categoryLabel}</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                      {categoryReports.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Findings in Category */}
                {isExpanded && (
                  <div className="divide-y divide-slate-800/80 border-t border-slate-800/80">
                    {categoryReports.map((report) => {
                      const isFindingExpanded = expandedReports.has(report.id);
                      const tabKey = report.id;
                      const activeTab = activeCodeTab[tabKey] || 'diff';
                      const theme = SEVERITY_THEME[report.severity] || SEVERITY_THEME.MEDIUM;

                      return (
                        <div key={report.id} className="p-3.5 bg-slate-950/40 space-y-3">
                          {/* Finding Summary Bar */}
                          <div
                            onClick={() => toggleReport(report.id)}
                            className="cursor-pointer flex items-start justify-between gap-2 group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.2 rounded-full border ${theme.badgeBg}`}>
                                  {report.severity}
                                </span>
                                <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                                  {report.title}
                                </h3>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-1">{report.summary}</p>
                            </div>

                            <button className="p-1 text-slate-400 hover:text-white flex-shrink-0">
                              {isFindingExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Expanded Code & Details */}
                          {isFindingExpanded && (
                            <div className="space-y-3 pt-2 border-t border-slate-800/60">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-amber-400" />
                                    <span>Observed Defect</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400">{report.summary}</p>
                                </div>

                                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                                    <Code2 className="w-3 h-3 text-indigo-400" />
                                    <span>Root Cause</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400">{report.rootCause}</p>
                                </div>
                              </div>

                              {/* Fix explanation badge */}
                              <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs text-slate-300">
                                <span className="text-emerald-400 font-bold text-[11px]">Fix Strategy: </span>
                                <span className="text-[11px]">{report.fixExplanation}</span>
                              </div>

                              {/* Code Tab Switcher */}
                              <div className="space-y-1.5">
                                <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800 text-[10px] w-fit">
                                  <button
                                    type="button"
                                    onClick={() => setActiveCodeTab((prev) => ({ ...prev, [tabKey]: 'diff' }))}
                                    className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 ${
                                      activeTab === 'diff' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                                    }`}
                                  >
                                    <Sparkles className="w-3 h-3" /> Patch (.diff)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveCodeTab((prev) => ({ ...prev, [tabKey]: 'spec' }))}
                                    className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 ${
                                      activeTab === 'spec' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                                    }`}
                                  >
                                    <FileCode className="w-3 h-3" /> Playwright (.spec.ts)
                                  </button>
                                </div>

                                {activeTab === 'diff' ? (
                                  <CodeViewer
                                    code={report.suggestedFixDiff}
                                    language="diff"
                                    fileName={`fix-${report.id.slice(0, 6)}.diff`}
                                    maxHeight="max-h-[260px]"
                                  />
                                ) : (
                                  <CodeViewer
                                    code={report.playwrightTestCode}
                                    language="typescript"
                                    fileName={`test-${report.id.slice(0, 6)}.spec.ts`}
                                    maxHeight="max-h-[260px]"
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ScreenshotModal screenshot={enlargedScreenshot} onClose={() => setEnlargedScreenshot(null)} />
    </div>
  );
}
