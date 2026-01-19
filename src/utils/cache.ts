const CACHE_MAX_AGE_SECONDS = 180; // 3 minutes

export function shouldUpdateRateLimit(lastUpdated: number | undefined): boolean {
  if (!lastUpdated) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  const age = now - lastUpdated;

  return age >= CACHE_MAX_AGE_SECONDS;
}

export function isStale(timestamp: number, maxAgeSeconds: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;
  return age >= maxAgeSeconds;
}
