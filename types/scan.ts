import { AnalyzedBugReport, BugCategory, Severity } from '@/lib/analyzer';
import { ScanConfig, CrawlProgressEvent } from '@/lib/crawler';

export type { AnalyzedBugReport, BugCategory, Severity, ScanConfig, CrawlProgressEvent };

export type SuiteKey = keyof ScanConfig;

export type SuiteStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed';

export interface SuiteState {
  key: SuiteKey;
  label: string;
  category: BugCategory;
  status: SuiteStatus;
  bugsCount: number;
  criticalCount: number;
  durationMs?: number;
  startedAt?: number;
  completedAt?: number;
  message?: string;
}

export interface ScreenshotItem {
  id: string;
  timestamp: string;
  suite?: string;
  title: string;
  dataUrl: string;
}

export interface ScanSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface StreamPayload {
  type: 'EVENT' | 'REPORT_READY' | 'ERROR' | 'TIMEOUT';
  event?: CrawlProgressEvent;
  reports?: AnalyzedBugReport[];
  byCategory?: Record<string, AnalyzedBugReport[]>;
  summary?: ScanSummary;
  error?: string;
}
