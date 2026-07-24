type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

// Per-instance only; acceptable for MVP, swap for durable store (Supabase/Upstash) when scaling.
const requestsByKey = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions = {},
): RateLimitResult {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (requestsByKey.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );

  if (timestamps.length >= limit) {
    requestsByKey.set(key, timestamps);

    const oldestTimestamp = timestamps[0] ?? now;
    const retryAfterMs = Math.max(0, oldestTimestamp + windowMs - now);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  timestamps.push(now);
  requestsByKey.set(key, timestamps);

  return {
    allowed: true,
    remaining: Math.max(0, limit - timestamps.length),
    retryAfterSeconds: 0,
  };
}
