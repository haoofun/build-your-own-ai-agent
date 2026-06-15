// types.ts — shared domain types for the taskqueue library.
// Nothing here has behaviour; it's the vocabulary the other modules speak.

export type TaskId = string;

export type TaskState =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "dead";

export interface Task<P = unknown> {
  id: TaskId;
  kind: string;
  payload: P;
  priority: number;
  attempts: number;
  state: TaskState;
  createdAt: number;
  updatedAt: number;
  lastError?: string;
}

export interface TaskResult<R = unknown> {
  id: TaskId;
  ok: boolean;
  value?: R;
  error?: string;
  durationMs: number;
}

// A Handler is the user-supplied function that actually does the work for a
// given task `kind`. It receives the payload plus a small context object.
export type Handler<P = unknown, R = unknown> = (
  payload: P,
  ctx: HandlerContext,
) => Promise<R>;

export interface HandlerContext {
  taskId: TaskId;
  attempt: number;
  signal: AbortSignal;
  log: (msg: string) => void;
}

// The registry maps a task `kind` string to the Handler that runs it.
export type Registry = Map<string, Handler>;
