// Durations for time tracking.

/** "1:30", "1h 30m", "90m", "1.5" or "1,5" → hours (1.5). Null if it isn't a duration. */
export function parseHours(text: string): number | null {
  const t = text.trim().toLowerCase().replace(",", ".");
  if (!t) return null;
  let m = t.match(/^(\d{1,2}):([0-5]\d)$/);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  m = t.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/);
  if (m && (m[1] || m[2])) return Number(m[1] ?? 0) + Number(m[2] ?? 0) / 60;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

/** 1.5 → "1h 30m", 2 → "2h", 0.75 → "45m". */
export function fmtHours(hours: number) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!m) return `${h}h`;
  return h ? `${h}h ${m}m` : `${m}m`;
}
