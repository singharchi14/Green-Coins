// In-memory sliding-window limiter (per server instance). Use Redis/Upstash when running multiple instances.
const store = (globalThis.__gcRate ||= new Map());
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const hits = (store.get(key) || []).filter(t => now - t < windowMs);
  if (hits.length >= max) { store.set(key, hits); return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) }; }
  hits.push(now); store.set(key, hits);
  return { ok: true };
}
