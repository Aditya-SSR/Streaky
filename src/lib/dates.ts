import { useEffect, useState } from "react";
import { AppState } from "react-native";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-time `YYYY-MM-DD` key. */
export const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const addDaysKey = (key: string, n: number) => toKey(addDays(parseKey(key), n));

/** Whole days from `a` to `b` (b − a). */
export const diffDays = (a: string, b: string) =>
  Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Cells for a Sunday-first month grid: `null` pads the leading blanks. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const lead = new Date(year, month, 1).getDay();
  const n = daysInMonth(year, month);
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= n; d++) cells.push(toKey(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type WeekDay = { key: string; index: number; date: Date };

/** The calendar week containing `today`, starting on Sunday. */
export function weekOf(today: Date): WeekDay[] {
  const start = addDays(today, -today.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return { key: toKey(date), index, date };
  });
}

/** Current date, refreshed when the app returns to foreground or midnight passes. */
export function useToday(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () =>
      setNow((prev) => {
        const next = new Date();
        return toKey(next) === toKey(prev) ? prev : next;
      });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    const timer = setInterval(refresh, 30_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  return now;
}

export function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function formatKey(key: string, withYear = false): string {
  return parseKey(key).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : null),
  });
}

export function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Good night";
}
