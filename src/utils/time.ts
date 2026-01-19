export function formatTimeUntil(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = timestamp - now;

  if (secondsLeft <= 0) {
    return "now";
  }

  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ");
}

export function windowMinutesFromSeconds(seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  return Math.floor((seconds + 59) / 60);
}
