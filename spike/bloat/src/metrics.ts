// metrics.ts — in-memory counters and timing histograms.
// No exporter here; snapshot() is meant to be scraped by the caller.
export class Metrics {
  private counters = new Map<string, number>();
  private timings = new Map<string, number[]>();

  inc(name: string, by = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by);
  }

  observe(name: string, ms: number): void {
    const arr = this.timings.get(name) ?? [];
    arr.push(ms);
    this.timings.set(name, arr);
  }

  // Returns p50/p95/p99 for a timing series, or zeros if empty. Nearest-rank
  // method — good enough for in-memory dashboards, not for billing.
  percentiles(name: string): { p50: number; p95: number; p99: number } {
    const arr = [...(this.timings.get(name) ?? [])].sort((a, b) => a - b);
    if (arr.length === 0) return { p50: 0, p95: 0, p99: 0 };
    const at = (q: number) => arr[Math.min(arr.length - 1, Math.floor(q * arr.length))];
    return { p50: at(0.5), p95: at(0.95), p99: at(0.99) };
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }
}
