export type RepeatFrequency = "none" | "daily" | "weekly" | "monthly";

export function getOccurrenceDates(
  startDate: string,
  repeat: RepeatFrequency,
  repeatUntil?: string,
): string[] {
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];
  if (repeat === "none" || !repeatUntil) return [startDate.slice(0, 10)];

  const end = new Date(`${repeatUntil.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(end.getTime()) || end < start) return [];

  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end && dates.length < 366) {
    dates.push(toDateKey(current));
    if (repeat === "daily") {
      current.setDate(current.getDate() + 1);
    } else if (repeat === "weekly") {
      current.setDate(current.getDate() + 7);
    } else {
      const originalDay = start.getDate();
      current.setMonth(current.getMonth() + 1, 1);
      const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      current.setDate(Math.min(originalDay, lastDay));
    }
  }

  return dates;
}

function toDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
