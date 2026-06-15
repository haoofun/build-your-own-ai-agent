// scheduler.ts — drives Workers on a poll loop until stopped or aborted.
import { Worker } from "./worker.ts";
import { QueueConfig } from "./config.ts";

export class Scheduler {
  private running = false;

  constructor(
    private worker: Worker,
    private config: QueueConfig,
  ) {}

  // Keeps up to `maxConcurrency` task runs in flight at once. Each settled run
  // frees a slot; the loop tops the pool back up, then polls after a delay.
  async start(signal: AbortSignal): Promise<void> {
    this.running = true;
    const inFlight = new Set<Promise<unknown>>();

    while (this.running && !signal.aborted) {
      while (inFlight.size < this.config.maxConcurrency) {
        const p = this.worker.runOne(signal).finally(() => inFlight.delete(p));
        inFlight.add(p);
      }
      await Promise.race(inFlight);
      await sleep(this.config.pollIntervalMs, signal);
    }
    await Promise.allSettled(inFlight);
  }

  stop(): void {
    this.running = false;
  }
}

// Abortable sleep: resolves on timeout OR when the signal aborts, whichever
// comes first, so a stop() never leaves the loop hanging on a timer.
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });
}
