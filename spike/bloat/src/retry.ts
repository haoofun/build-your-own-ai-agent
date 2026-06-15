// retry.ts — backoff timing and retry-exhaustion policy.
import { MAX_RETRIES, BACKOFF_BASE_MS } from "./config.ts";

// Exponential backoff with full jitter. Returns the milliseconds to wait
// before the given (1-based) attempt. Jitter spreads thundering herds when
// many tasks fail at once.
export function nextDelay(attempt: number): number {
  const ceiling = BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1);
  return Math.floor(Math.random() * ceiling);
}

// A task is exhausted once it has used up its retry budget. Mind the
// off-by-one: `attempts` counts from 1, and MAX_RETRIES is a count of
// *retries*, so the total number of tries allowed is MAX_RETRIES + 1.
export function isExhausted(attempts: number): boolean {
  return attempts > MAX_RETRIES;
}

export function remainingTries(attempts: number): number {
  return Math.max(0, MAX_RETRIES + 1 - attempts);
}
