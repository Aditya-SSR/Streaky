import { addDaysKey, diffDays, parseKey, toKey } from "./dates";

/**
 * Pure habit logic — no React, no storage — so the app and the Android widget share it.
 *
 * Two kinds of habit:
 *  - `build` : something you do. A day counts when you check it in.
 *  - `quit`  : something you stop. Every day since `startKey` counts as clean automatically,
 *              until you log a relapse.
 */
export type HabitType = "build" | "quit";
export type HabitStatus = "active" | "completed";

export type Habit = {
  id: string;
  title: string;
  description: string;
  type: HabitType;
  /** `YYYY-MM-DD` the habit began. */
  startKey: string;
  /** Last day of the goal (inclusive). `null` = ongoing, no end date. */
  endKey: string | null;
  status: HabitStatus;
  completedKey: string | null;
  /** build: days checked in. */
  completions: string[];
  /** quit: days you slipped. */
  relapses: string[];
  /** quit: how many urges you rode out with the SOS screen. */
  urgesResisted: number;
  createdAt: number;
};

export const MILESTONES = [3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 500, 730, 1000] as const;
export const nextMilestone = (n: number): number => MILESTONES.find((m) => m > n) ?? n + 100;
export const isMilestone = (n: number): boolean => (MILESTONES as readonly number[]).includes(n);

export function isDone(h: Habit, key: string, todayKey: string): boolean {
  if (h.type === "build") return h.completions.includes(key);
  if (key < h.startKey || key > todayKey) return false;
  if (h.status === "completed" && h.completedKey && key > h.completedKey) return false;
  return !h.relapses.includes(key);
}

/** Consecutive done days ending today (build: or yesterday, so a streak survives until midnight). */
export function computeStreak(h: Habit, today: Date): number {
  const todayKey = toKey(today);
  let cursor = todayKey;
  if (h.type === "build" && !isDone(h, cursor, todayKey)) cursor = addDaysKey(cursor, -1);
  let n = 0;
  while (isDone(h, cursor, todayKey) && n < 5000) {
    n += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return n;
}

export function bestStreak(h: Habit, today: Date): number {
  const todayKey = toKey(today);
  let best = 0;
  if (h.type === "build") {
    const days = [...new Set(h.completions)].sort();
    let run = 0;
    for (let i = 0; i < days.length; i++) {
      run = i > 0 && diffDays(days[i - 1], days[i]) === 1 ? run + 1 : 1;
      if (run > best) best = run;
    }
    return best;
  }
  let run = 0;
  const span = Math.min(diffDays(h.startKey, todayKey), 5000);
  for (let i = 0; i <= span; i++) {
    const key = addDaysKey(h.startKey, i);
    run = isDone(h, key, todayKey) ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** build: check-ins; quit: clean days so far. */
export function totalDone(h: Habit, today: Date): number {
  if (h.type === "build") return h.completions.length;
  const todayKey = toKey(today);
  const end = h.status === "completed" && h.completedKey ? h.completedKey : todayKey;
  if (end < h.startKey) return 0;
  const days = diffDays(h.startKey, end) + 1;
  return Math.max(0, days - h.relapses.filter((k) => k >= h.startKey && k <= end).length);
}

export function doneToday(h: Habit, today: Date): boolean {
  const k = toKey(today);
  return isDone(h, k, k);
}

export type GoalState =
  | { state: "ongoing" }
  | { state: "active"; dayNumber: number; total: number; daysLeft: number }
  | { state: "due"; total: number }
  | { state: "completed" };

export function goalInfo(h: Habit, today: Date): GoalState {
  if (h.status === "completed") return { state: "completed" };
  if (!h.endKey) return { state: "ongoing" };
  const todayKey = toKey(today);
  const total = diffDays(h.startKey, h.endKey) + 1;
  if (todayKey > h.endKey) return { state: "due", total };
  return {
    state: "active",
    dayNumber: Math.max(1, diffDays(h.startKey, todayKey) + 1),
    total,
    daysLeft: diffDays(todayKey, h.endKey),
  };
}

/** Progress ring: toward the goal when there is one, otherwise toward the next streak milestone. */
export function ringProgress(h: Habit, today: Date): { value: number; label: string; caption: string } {
  const g = goalInfo(h, today);
  if (g.state === "completed") return { value: 1, label: "✓", caption: "Complete" };
  if (h.endKey && (g.state === "active" || g.state === "due")) {
    const total = g.total;
    const done = h.type === "quit" ? totalDone(h, today) : h.completions.filter((k) => k >= h.startKey && k <= h.endKey!).length;
    return { value: Math.min(1, done / total), label: `${Math.min(done, total)}`, caption: `of ${total} days` };
  }
  const s = computeStreak(h, today);
  const next = nextMilestone(s);
  const prev = [...MILESTONES].reverse().find((m) => m <= s) ?? 0;
  return { value: Math.min(1, (s - prev) / (next - prev)), label: `${s}`, caption: `next: ${next}` };
}

export function monthDone(h: Habit, year: number, month: number, todayKey: string): number {
  let n = 0;
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const key = toKey(new Date(year, month, d));
    if (key <= todayKey && isDone(h, key, todayKey)) n++;
  }
  return n;
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function makeHabit(
  input: { title: string; description: string; type: HabitType; goalDays: number | null },
  today: Date,
): Habit {
  const startKey = toKey(today);
  return {
    id: newId(),
    title: input.title.trim(),
    description: input.description.trim(),
    type: input.type,
    startKey,
    endKey: input.goalDays ? addDaysKey(startKey, input.goalDays - 1) : null,
    status: "active",
    completedKey: null,
    completions: [],
    relapses: [],
    urgesResisted: 0,
    createdAt: Date.now(),
  };
}

/** Upgrade a v1 habit (title/description/completions only) to the current shape. */
export function migrateHabit(raw: Partial<Habit> & { id: string; title: string }): Habit {
  const completions = raw.completions ?? [];
  const createdKey = raw.createdAt ? toKey(new Date(raw.createdAt)) : toKey(new Date());
  const earliest = [...completions].sort()[0];
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? "",
    type: raw.type ?? "build",
    startKey: raw.startKey ?? (earliest && earliest < createdKey ? earliest : createdKey),
    endKey: raw.endKey ?? null,
    status: raw.status ?? "active",
    completedKey: raw.completedKey ?? null,
    completions,
    relapses: raw.relapses ?? [],
    urgesResisted: raw.urgesResisted ?? 0,
    createdAt: raw.createdAt ?? Date.now(),
  };
}

export { parseKey, diffDays };
