/** Tiny event bus so any screen can trigger the toast / confetti overlay. */
export type CelebrationEvent = {
  /** Headline, e.g. "7-day streak". */
  title: string;
  subtitle?: string;
  /** Confetti burst (milestones) vs. a plain toast. */
  confetti?: boolean;
};

type Listener = (e: CelebrationEvent) => void;
const listeners = new Set<Listener>();

export const celebrate = (e: CelebrationEvent) => listeners.forEach((l) => l(e));

export const onCelebrate = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
