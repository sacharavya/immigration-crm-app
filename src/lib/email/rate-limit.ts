import "server-only";

// Process-level rate limiter for transactional email. A single Vercel
// function instance owns one Map; with multiple cold-start instances
// the limit is per-instance, which is fine for the modest volumes the
// firm sends. Switch to Vercel KV / Redis once limits get tighter.

const WINDOW_MS = 60 * 60 * 1000;

const store = new Map<string, number[]>();

function trim(timestamps: number[], now: number): number[] {
  const cutoff = now - WINDOW_MS;
  return timestamps.filter((t) => t >= cutoff);
}

// Returns true if the next send should be blocked. Increments the
// counter only when allowed — callers do not need to record the send
// separately.
export async function shouldRateLimit(
  emailType: string,
  recipientEmail: string,
  maxPerHour = 5,
): Promise<boolean> {
  const key = `${emailType}:${recipientEmail.toLowerCase()}`;
  const now = Date.now();
  const trimmed = trim(store.get(key) ?? [], now);
  if (trimmed.length >= maxPerHour) {
    store.set(key, trimmed);
    return true;
  }
  trimmed.push(now);
  store.set(key, trimmed);
  return false;
}
