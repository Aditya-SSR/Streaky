import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addDays, addDaysKey, toKey } from "@/lib/dates";
import { makeHabit, migrateHabit, newId, type Habit, type HabitType } from "@/lib/habits";

export type { Habit, HabitType } from "@/lib/habits";

export type CardStyle = "cylinder" | "carousel" | "stack" | "cinematic";
export type ThemePref = "system" | "light" | "dark";

/** Key the Android widget reads too — keep it in sync with `widget-task-handler`. */
export const STORE_KEY = "streaky-store-v1";

type NewHabit = { title: string; description: string; type: HabitType; goalDays: number | null };

type State = {
  habits: Habit[];
  userName: string;
  cardStyle: CardStyle;
  theme: ThemePref;
  haptics: boolean;
  onboarded: boolean;
  hydrated: boolean;

  addHabit: (input: NewHabit) => string;
  updateHabit: (id: string, patch: Partial<Pick<Habit, "title" | "description">>) => void;
  deleteHabit: (id: string) => void;
  /** build habits: toggles a day, returns whether it is now done. */
  toggleDay: (id: string, dayKey: string) => boolean;
  /** quit habits: log a slip on `dayKey`. */
  relapse: (id: string, dayKey: string) => void;
  /** quit habits: forgive a logged slip (e.g. mis-tap). */
  undoRelapse: (id: string, dayKey: string) => void;
  resistUrge: (id: string) => void;
  /** Push the goal end date out by `days` (from the later of its end and today). */
  extendGoal: (id: string, days: number) => void;
  setOngoing: (id: string) => void;
  setGoalDays: (id: string, days: number) => void;
  completeHabit: (id: string) => void;
  reopenHabit: (id: string) => void;
  setUserName: (name: string) => void;
  setCardStyle: (s: CardStyle) => void;
  setTheme: (t: ThemePref) => void;
  setHaptics: (on: boolean) => void;
  finishOnboarding: (name: string) => void;
  eraseAll: () => void;
};

/** Sample habits so the app doesn't open empty — one of each kind, with a little history. */
function sampleHabits(): Habit[] {
  const today = new Date();
  const k = (n: number) => toKey(addDays(today, -n));

  const dsa = makeHabit({ title: "Solve DSA problems", description: "Complete at least 2 problems", type: "build", goalDays: 30 }, addDays(today, -4));
  dsa.completions = [k(1), k(2), k(3), k(4)];

  const read = makeHabit({ title: "Read 10 pages", description: "Before bed, no phone", type: "build", goalDays: null }, addDays(today, -2));
  read.completions = [k(1), k(2)];

  const scroll = makeHabit({ title: "No doomscrolling", description: "Phone down after 10 pm", type: "quit", goalDays: 60 }, addDays(today, -6));

  return [dsa, read, scroll];
}

const patch = (habits: Habit[], id: string, fn: (h: Habit) => Habit) =>
  habits.map((h) => (h.id === id ? fn(h) : h));

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      habits: [],
      userName: "",
      cardStyle: "cylinder",
      theme: "system",
      haptics: true,
      onboarded: false,
      hydrated: false,

      addHabit: (input) => {
        const habit = makeHabit(input, new Date());
        set((s) => ({ habits: [...s.habits, habit] }));
        return habit.id;
      },

      updateHabit: (id, p) =>
        set((s) => ({
          habits: patch(s.habits, id, (h) => ({
            ...h,
            title: (p.title ?? h.title).trim(),
            description: (p.description ?? h.description).trim(),
          })),
        })),

      deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      toggleDay: (id, dayKey) => {
        let nowDone = false;
        set((s) => ({
          habits: patch(s.habits, id, (h) => {
            const has = h.completions.includes(dayKey);
            nowDone = !has;
            return { ...h, completions: has ? h.completions.filter((x) => x !== dayKey) : [...h.completions, dayKey] };
          }),
        }));
        return nowDone;
      },

      relapse: (id, dayKey) =>
        set((s) => ({
          habits: patch(s.habits, id, (h) => (h.relapses.includes(dayKey) ? h : { ...h, relapses: [...h.relapses, dayKey] })),
        })),

      undoRelapse: (id, dayKey) =>
        set((s) => ({ habits: patch(s.habits, id, (h) => ({ ...h, relapses: h.relapses.filter((x) => x !== dayKey) })) })),

      resistUrge: (id) =>
        set((s) => ({ habits: patch(s.habits, id, (h) => ({ ...h, urgesResisted: h.urgesResisted + 1 })) })),

      extendGoal: (id, days) =>
        set((s) => ({
          habits: patch(s.habits, id, (h) => {
            const today = toKey(new Date());
            const base = h.endKey && h.endKey > today ? h.endKey : today;
            return { ...h, endKey: addDaysKey(base, days), status: "active", completedKey: null };
          }),
        })),

      setOngoing: (id) =>
        set((s) => ({ habits: patch(s.habits, id, (h) => ({ ...h, endKey: null, status: "active", completedKey: null })) })),

      setGoalDays: (id, days) =>
        set((s) => ({
          habits: patch(s.habits, id, (h) => ({ ...h, endKey: addDaysKey(h.startKey, days - 1), status: "active", completedKey: null })),
        })),

      completeHabit: (id) =>
        set((s) => ({ habits: patch(s.habits, id, (h) => ({ ...h, status: "completed", completedKey: toKey(new Date()) })) })),

      reopenHabit: (id) =>
        set((s) => ({ habits: patch(s.habits, id, (h) => ({ ...h, status: "active", completedKey: null })) })),

      setUserName: (userName) => set({ userName: userName.trim() }),
      setCardStyle: (cardStyle) => set({ cardStyle }),
      setTheme: (theme) => set({ theme }),
      setHaptics: (haptics) => set({ haptics }),

      finishOnboarding: (name) =>
        set({
          onboarded: true,
          userName: name.trim(),
          habits: get().habits.length ? get().habits : sampleHabits(),
        }),

      eraseAll: () => set({ habits: [] }),
    }),
    {
      name: STORE_KEY,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        habits: s.habits,
        userName: s.userName,
        cardStyle: s.cardStyle,
        theme: s.theme,
        haptics: s.haptics,
        onboarded: s.onboarded,
      }),
      // v1 → v2: habits gain a type, start/end dates, status, relapses and urge counts.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<State>;
        if (version < 2) {
          return {
            ...p,
            habits: (p.habits ?? []).map((h) => migrateHabit(h as Habit)),
            userName: p.userName ?? "",
            // existing users keep the style they picked; new default is the 3D cylinder
            cardStyle: (p.cardStyle as CardStyle) ?? "cylinder",
          } as State;
        }
        return p as State;
      },
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

export { newId };
