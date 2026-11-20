export function secret(name, devFallback) {
  const v = process.env[name];
  if (v) return v;
  if (process.env.NODE_ENV === 'production') throw new Error(`${name} must be set in production`);
  return devFallback;
}
