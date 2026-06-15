// queue.ts — the in-memory priority queue at the heart of the library.
import { Task, TaskId, TaskState } from "./types.ts";
import { clampPriority } from "./config.ts";

// Tasks are held in a single Map and selected by (priority, createdAt).
// This is deliberately simple: O(n) selection is fine for the in-memory
// tier. The persistent tier (not part of this fixture) keeps a real index.
export class TaskQueue {
  private tasks = new Map<TaskId, Task>();

  enqueue(task: Task): void {
    task.priority = clampPriority(task.priority);
    this.tasks.set(task.id, task);
  }

  /** Claim the highest-priority pending task; oldest wins on a tie. */
  claim(): Task | undefined {
    let best: Task | undefined;
    for (const t of this.tasks.values()) {
      if (t.state !== "pending") continue;
      if (
        !best ||
        t.priority < best.priority ||
        (t.priority === best.priority && t.createdAt < best.createdAt)
      ) {
        best = t;
      }
    }
    if (best) best.state = "running";
    return best;
  }

  transition(id: TaskId, state: TaskState, error?: string): void {
    const t = this.tasks.get(id);
    if (!t) return;
    t.state = state;
    t.updatedAt = Date.now();
    if (error) t.lastError = error;
  }

  byState(state: TaskState): Task[] {
    return [...this.tasks.values()].filter((t) => t.state === state);
  }

  get size(): number {
    return this.tasks.size;
  }
}
