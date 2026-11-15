import AsyncStorage from "@react-native-async-storage/async-storage";
import { toKey } from "@/lib/dates";
import { migrateHabit, type Habit } from "@/lib/habits";

/** Same key the app's zustand store persists under. */
const STORE_KEY = "streaky-store-v1";

type Persisted = { state?: { habits?: Habit[] } & Record<string, unknown>; version?: number };

async function readRaw(): Promise<Persisted | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

/** Active habits from the app's persisted store (migrated if the app has not opened since updating). */
export async function loadHabits(): Promise<Habit[]> {
  const p = await readRaw();
  const habits = p?.state?.habits ?? [];
  return habits.map((h) => migrateHabit(h)).filter((h) => h.status === "active");
}

/** Toggle today's check-in for a build habit straight in storage (the app rehydrates on resume). */
export async function toggleToday(id: string): Promise<void> {
  const p = await readRaw();
  if (!p?.state?.habits) return;
  const today = toKey(new Date());
  p.state.habits = p.state.habits.map((h) => {
    if (h.id !== id || (h.type ?? "build") !== "build") return h;
    const completions = h.completions ?? [];
    return {
      ...h,
      completions: completions.includes(today) ? completions.filter((k) => k !== today) : [...completions, today],
    };
  });
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(p));
}
