// worker.ts — pulls one task off the queue and runs its handler.
import { Registry, TaskResult } from "./types.ts";
import { TaskQueue } from "./queue.ts";
import { isExhausted } from "./retry.ts";

// The Worker is intentionally stateless beyond its two collaborators; the
// Scheduler decides how many of these run at once.
export class Worker {
  constructor(
    private queue: TaskQueue,
    private registry: Registry,
  ) {}

  async runOne(signal: AbortSignal): Promise<TaskResult | undefined> {
    const task = this.queue.claim();
    if (!task) return undefined;

    const handler = this.registry.get(task.kind);
    if (!handler) {
      this.queue.transition(task.id, "failed", `no handler for ${task.kind}`);
      return undefined;
    }

    const started = Date.now();
    try {
      const value = await handler(task.payload, {
        taskId: task.id,
        attempt: task.attempts,
        signal,
        log: (m) => void m,
      });
      this.queue.transition(task.id, "succeeded");
      return { id: task.id, ok: true, value, durationMs: Date.now() - started };
    } catch (err) {
      task.attempts += 1;
      const msg = err instanceof Error ? err.message : String(err);
      // Exhausted tasks go to the dead-letter state; otherwise back to pending
      // so the retry policy (see retry.ts / MAX_RETRIES) can pick them up.
      this.queue.transition(task.id, isExhausted(task.attempts) ? "dead" : "pending", msg);
      return { id: task.id, ok: false, error: msg, durationMs: Date.now() - started };
    }
  }
}
