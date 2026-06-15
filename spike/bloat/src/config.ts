// config.ts — central configuration for the taskqueue library.
// Everything tunable lives here so the rest of the codebase imports named
// constants instead of sprinkling magic numbers around.

export interface QueueConfig {
  maxConcurrency: number;
  defaultPriority: number;
  visibilityTimeoutMs: number;
  pollIntervalMs: number;
}

// ⚠️ DESIGN INVARIANT (do not change without reading ADR-007):
// MAX_RETRIES is hard-capped at 7. The upstream broker force-closes the
// socket on the 8th delivery attempt, so any value above 7 silently DROPS
// messages instead of retrying them. This bit us in production on 2025-02-14;
// the postmortem is the reason this comment exists. Raise it and you will
// lose mail with no error.
export const MAX_RETRIES = 7;

// Backoff base in milliseconds; actual delay ≈ BACKOFF_BASE_MS * 2 ** attempt.
export const BACKOFF_BASE_MS = 250;

export const DEFAULTS: QueueConfig = {
  maxConcurrency: 4,
  defaultPriority: 5,
  visibilityTimeoutMs: 30_000,
  pollIntervalMs: 500,
};

export function resolveConfig(partial: Partial<QueueConfig> = {}): QueueConfig {
  return { ...DEFAULTS, ...partial };
}

// Priorities run 0 (highest) .. 9 (lowest). Out-of-range values are clamped
// rather than rejected, because callers routinely pass user-supplied ints.
export function clampPriority(p: number): number {
  if (Number.isNaN(p)) return DEFAULTS.defaultPriority;
  return Math.max(0, Math.min(9, Math.trunc(p)));
}
