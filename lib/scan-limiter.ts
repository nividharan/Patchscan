/**
 * In-memory scan concurrency limiter (semaphore).
 * Protects server memory and CPU from being exhausted by multiple parallel Playwright scans.
 */

class ScanLimiter {
  private activeScans = 0;
  private readonly maxConcurrentScans: number;

  constructor(maxConcurrent = 2) {
    this.maxConcurrentScans = maxConcurrent;
  }

  public canStartScan(): boolean {
    return this.activeScans < this.maxConcurrentScans;
  }

  public acquire(): boolean {
    if (this.activeScans >= this.maxConcurrentScans) {
      return false;
    }
    this.activeScans++;
    return true;
  }

  public release(): void {
    if (this.activeScans > 0) {
      this.activeScans--;
    }
  }

  public getActiveCount(): number {
    return this.activeScans;
  }
}

// Global singleton instance across route handlers in the same process
const globalForLimiter = global as unknown as { scanLimiter?: ScanLimiter };

export const scanLimiter = globalForLimiter.scanLimiter ?? new ScanLimiter(2);

if (process.env.NODE_ENV !== 'production') {
  globalForLimiter.scanLimiter = scanLimiter;
}
