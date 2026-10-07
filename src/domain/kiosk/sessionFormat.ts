// Display helpers for sessions. Plain functions, no React.

// "2026-10-06T00:00:00Z" -> { time: "5:00", period: "PM" } in the kiosk's own locale.
// period is empty for 24-hour locales.
export function formatStartTime(startsAt: string) {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(new Date(startsAt));

  const period = parts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const time = parts
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();

  return { time, period };
}

// 45 -> "45 min", 60 -> "1 hr", 90 -> "1 hr 30 min"
export function formatDuration(startsAt: string, endsAt: string) {
  const totalMinutes = Math.round(
    (Date.parse(endsAt) - Date.parse(startsAt)) / 60000,
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

// "2026-10-06T21:58:00Z" -> "4:58 PM" in the kiosk's own locale
export function formatClockTime(isoTime: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoTime));
}
