import { memo, useEffect, useMemo } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { CompletionMark } from "./CompletionMark";
import { Flame } from "./Fire";
import { Press } from "./Press";
import { RollingNumber } from "./RollingNumber";
import { celebrate } from "@/lib/celebrate";
import { DAY_LABELS, formatKey, parseKey, toKey, weekOf } from "@/lib/dates";
import {
  bestStreak,
  computeStreak,
  doneToday,
  goalInfo,
  isDone,
  isMilestone,
  monthDone,
  ringProgress,
  type Habit,
} from "@/lib/habits";
import { haptic } from "@/lib/haptics";
import { fonts, useTheme } from "@/lib/theme";
import { useStore } from "@/store/useStore";

export const CARD_HEIGHT = 330;
const RADIUS = 32;

/** Shared surface: near-black on black in dark mode, soft white card in light mode. */
export function useCardSurface() {
  const { isDark, c } = useTheme();
  return {
    backgroundColor: c.surface,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden" as const,
    ...(Platform.OS === "android"
      ? { elevation: isDark ? 0 : 3 }
      : { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }),
  };
}

/** A faint highlight on the top edge — gives the card depth without any glow. */
function Sheen() {
  const { isDark } = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={isDark ? ["rgba(255,255,255,0.07)", "rgba(255,255,255,0)"] : ["rgba(255,255,255,1)", "rgba(255,255,255,0)"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ position: "absolute", left: 0, right: 0, top: 0, height: 170 }}
    />
  );
}

function StreakBadge({ streak }: { streak: number }) {
  const { c } = useTheme();
  return (
    <View accessibilityLabel={`${streak} day streak`} style={{ flexDirection: "row", alignItems: "center" }}>
      <Flame size={30} active={streak > 0} popKey={streak} />
      <RollingNumber
        value={streak}
        textStyle={{ fontFamily: fonts.geistBold, fontSize: 24, color: c.ink, letterSpacing: -0.6, minWidth: 12 }}
      />
    </View>
  );
}

function GoalRing({ habit, today }: { habit: Habit; today: Date }) {
  const { c } = useTheme();
  const rp = ringProgress(habit, today);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(rp.value * 100, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [rp.value, progress]);

  return (
    <CircularProgress
      progress={progress}
      size={88}
      strokeWidth={7}
      gap={4}
      outerCircleColor={c.track}
      progressCircleColor={c.ink}
      backgroundColor="transparent"
      renderIcon={() => (
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.geistBold, fontSize: 24, letterSpacing: -0.6, color: c.ink }}>{rp.label}</Text>
          <Text style={{ fontFamily: fonts.inter, fontSize: 9.5, color: c.ink3, marginTop: -1 }}>{rp.caption}</Text>
        </View>
      )}
    />
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const { c } = useTheme();
  return (
    <View>
      <Text style={{ fontFamily: fonts.interSemibold, fontSize: 9.5, letterSpacing: 1, color: c.ink3 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 1 }}>
        <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 22, letterSpacing: -0.5, color: c.ink }}>{value}</Text>
        {unit ? <Text style={{ fontFamily: fonts.inter, fontSize: 11, color: c.ink2 }}>{unit}</Text> : null}
      </View>
    </View>
  );
}

/** Fires a toast / confetti after a check-in when something worth celebrating happened. */
function afterCheckIn(habitId: string, nowDone: boolean) {
  if (!nowDone) return;
  const { habits } = useStore.getState();
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return;
  const today = new Date();
  const streak = computeStreak(habit, today);

  const active = habits.filter((h) => h.status === "active");
  const allDone = active.length > 1 && active.every((h) => doneToday(h, today));

  if (isMilestone(streak)) {
    celebrate({ title: `${streak}-day streak`, subtitle: habit.title, confetti: true });
  } else if (allDone) {
    celebrate({ title: "All done for today", subtitle: "Nice work — see you tomorrow", confetti: true });
  }
}

function BuildWeek({ habit, today }: { habit: Habit; today: Date }) {
  const { c } = useTheme();
  const toggleDay = useStore((s) => s.toggleDay);
  const week = useMemo(() => weekOf(today), [today]);
  const todayKey = toKey(today);
  const locked = habit.status === "completed";

  return (
    <View style={{ flexDirection: "row" }}>
      {week.map((day) => {
        const isToday = day.key === todayKey;
        const isFuture = day.key > todayKey;
        const done = isDone(habit, day.key, todayKey);
        return (
          <View key={day.key} style={{ flex: 1, alignItems: "center" }}>
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: isToday ? fonts.interSemibold : fonts.interMedium,
                fontSize: 11,
                letterSpacing: 0.4,
                color: isToday ? c.ink : c.ink3,
              }}
            >
              {DAY_LABELS[day.index]}
            </Text>
            <View style={{ height: 38, marginTop: 6, alignItems: "center", justifyContent: "center" }}>
              {isToday && !locked ? (
                <CompletionMark
                  done={done}
                  label={`${done ? "Undo" : "Complete"} ${habit.title} today`}
                  onToggle={() => {
                    const nowDone = toggleDay(habit.id, day.key);
                    if (nowDone) haptic.success();
                    else haptic.tap();
                    afterCheckIn(habit.id, nowDone);
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: done ? c.ink : isFuture ? "transparent" : c.surface2,
                    borderWidth: done ? 0 : 1.5,
                    borderColor: isFuture ? c.line : c.surface2,
                  }}
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function QuitWeek({ habit, today }: { habit: Habit; today: Date }) {
  const { c } = useTheme();
  const week = useMemo(() => weekOf(today), [today]);
  const todayKey = toKey(today);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.08 }], opacity: 0.85 + pulse.value * 0.15 }));

  return (
    <View style={{ flexDirection: "row" }}>
      {week.map((day) => {
        const isToday = day.key === todayKey;
        const isFuture = day.key > todayKey;
        const slipped = habit.relapses.includes(day.key);
        const clean = isDone(habit, day.key, todayKey);
        const beforeStart = day.key < habit.startKey;
        return (
          <View key={day.key} style={{ flex: 1, alignItems: "center" }}>
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: isToday ? fonts.interSemibold : fonts.interMedium,
                fontSize: 11,
                letterSpacing: 0.4,
                color: isToday ? c.ink : c.ink3,
              }}
            >
              {DAY_LABELS[day.index]}
            </Text>
            <View style={{ height: 38, marginTop: 6, alignItems: "center", justifyContent: "center" }}>
              {slipped ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#FF453A", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="close" size={14} color="#FF453A" />
                </View>
              ) : isToday && clean ? (
                <Animated.View style={pulseStyle}>
                  <Flame mono size={36} />
                </Animated.View>
              ) : (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: clean ? c.ink : isFuture || beforeStart ? "transparent" : c.surface2,
                    borderWidth: clean ? 0 : 1.5,
                    borderColor: isFuture ? c.line : c.surface2,
                  }}
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function kicker(habit: Habit, today: Date): string {
  const kind = habit.type === "build" ? "DAILY" : "QUITTING";
  const g = goalInfo(habit, today);
  if (g.state === "completed") return `${kind} · COMPLETED`;
  if (g.state === "due") return `${kind} · GOAL REACHED`;
  if (g.state === "active") return `${kind} · DAY ${g.dayNumber} OF ${g.total}`;
  return `${kind} · ONGOING`;
}

export const HabitCard = memo(function HabitCard({
  habit,
  width,
  today,
  onOpen,
  onEdit,
  onUrge,
}: {
  habit: Habit;
  width: number;
  today: Date;
  onOpen: (h: Habit) => void;
  onEdit: (h: Habit) => void;
  onUrge: (h: Habit) => void;
}) {
  const { c } = useTheme();
  const surface = useCardSurface();
  const todayKey = toKey(today);
  const streak = computeStreak(habit, today);
  const best = Math.max(bestStreak(habit, today), streak);
  const month = monthDone(habit, today.getFullYear(), today.getMonth(), todayKey);
  const done = doneToday(habit, today);
  const quit = habit.type === "quit";

  return (
    <Pressable
      onPress={() => onOpen(habit)}
      onLongPress={() => {
        haptic.press();
        onEdit(habit);
      }}
      delayLongPress={420}
      style={[surface, { width, height: CARD_HEIGHT, padding: 18 }]}
    >
      <Sheen />

      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.interSemibold, fontSize: 10, letterSpacing: 1.1, color: c.ink3 }}>{kicker(habit, today)}</Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.geistSemibold, fontSize: 18.5, letterSpacing: -0.45, color: c.ink, marginTop: 4 }}
          >
            {habit.title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: fonts.inter, fontSize: 13, marginTop: 2, color: c.ink2 }}>
            {habit.description || (quit ? "One day at a time" : "Keep it going")}
          </Text>
        </View>
        <View style={{ marginTop: -4 }}>
          <StreakBadge streak={streak} />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 14 }}>
        <GoalRing habit={habit} today={today} />
        <View style={{ flex: 1, gap: 12 }}>
          <Stat label="BEST STREAK" value={`${best}`} unit={best === 1 ? "day" : "days"} />
          {quit ? (
            <Stat label="URGES BEATEN" value={`${habit.urgesResisted}`} />
          ) : (
            <Stat label="THIS MONTH" value={`${month}`} unit={`/ ${today.getDate()} days`} />
          )}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      {quit ? <QuitWeek habit={habit} today={today} /> : <BuildWeek habit={habit} today={today} />}

      <View style={{ height: 10 }} />

      {quit && habit.status === "active" ? (
        <Press
          onPress={() => {
            haptic.press();
            onUrge(habit);
          }}
          scale={0.97}
          style={{
            height: 38,
            borderRadius: 19,
            backgroundColor: c.surface2,
            borderWidth: 1,
            borderColor: c.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name="hand-left-outline" size={15} color={c.ink} />
          <Text style={{ fontFamily: fonts.geistMedium, fontSize: 14, color: c.ink }}>Feeling an urge? Tap here</Text>
        </Press>
      ) : (
        <View style={{ height: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: done ? c.ink : c.ink3 }} />
            <Text style={{ fontFamily: fonts.interMedium, fontSize: 12.5, color: done ? c.ink : c.ink2 }}>
              {habit.status === "completed" ? "Goal complete" : done ? "Done for today" : "Not done yet today"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Text style={{ fontFamily: fonts.interMedium, fontSize: 12.5, color: c.ink2 }}>
              {habit.endKey ? `Ends ${formatKey(habit.endKey)}` : "Calendar"}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={c.ink3} />
          </View>
        </View>
      )}
    </Pressable>
  );
});

export function AddCard({ width, onPress }: { width: number; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Press
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Add a new habit"
      scale={0.97}
      dim={0.85}
      style={{
        width,
        height: CARD_HEIGHT,
        borderRadius: RADIUS,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: c.line,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="add" size={32} color={c.canvas} />
      </View>
      <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 18, letterSpacing: -0.3, color: c.ink }}>New habit</Text>
      <Text style={{ fontFamily: fonts.inter, fontSize: 13, color: c.ink2, textAlign: "center", paddingHorizontal: 28, lineHeight: 18 }}>
        Build a daily streak — or quit something for good.
      </Text>
    </Press>
  );
}

export { parseKey };
