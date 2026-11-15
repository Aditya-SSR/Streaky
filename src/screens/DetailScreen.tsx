import { useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeInDown,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame } from "@/components/Fire";
import { GlassButton } from "@/components/GlassButton";
import { Press } from "@/components/Press";
import { RollingCounter } from "@/components/ui/organisms/rolling-counter";
import { diffDays, formatKey, MONTHS, monthGrid, toKey, useToday } from "@/lib/dates";
import {
  bestStreak,
  computeStreak,
  goalInfo,
  isDone,
  totalDone,
} from "@/lib/habits";
import { haptic } from "@/lib/haptics";
import { fonts, useTheme } from "@/lib/theme";
import { useStore } from "@/store/useStore";

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: 28, borderWidth: 1, borderColor: c.border, padding: 18 }, style]}>
      {children}
    </View>
  );
}

function Label({ children }: { children: string }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: fonts.interSemibold, fontSize: 10.5, letterSpacing: 1.1, color: c.ink3 }}>{children}</Text>;
}

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border, padding: 16 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 6 }}>
        <Text style={{ fontFamily: fonts.geistBold, fontSize: 30, letterSpacing: -1, color: c.ink }}>{value}</Text>
        {unit ? <Text style={{ fontFamily: fonts.inter, fontSize: 12.5, color: c.ink2 }}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function DetailScreen({
  habitId,
  onBack,
  onEdit,
  onUrge,
}: {
  habitId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onUrge: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const today = useToday();
  const todayKey = toKey(today);

  const habit = useStore((s) => s.habits.find((h) => h.id === habitId));
  const toggleDay = useStore((s) => s.toggleDay);
  const relapse = useStore((s) => s.relapse);
  const undoRelapse = useStore((s) => s.undoRelapse);
  const completeHabit = useStore((s) => s.completeHabit);
  const reopenHabit = useStore((s) => s.reopenHabit);
  const extendGoal = useStore((s) => s.extendGoal);
  const setOngoing = useStore((s) => s.setOngoing);

  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const counter = useSharedValue(0);
  const bar = useSharedValue(0);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    if (!habit) onBack();
  }, [habit, onBack]);

  const streak = habit ? computeStreak(habit, today) : 0;
  const best = habit ? Math.max(bestStreak(habit, today), streak) : 0;
  const total = habit ? totalDone(habit, today) : 0;
  const goal = habit ? goalInfo(habit, today) : ({ state: "ongoing" } as const);
  const elapsed = habit ? Math.max(1, diffDays(habit.startKey, todayKey) + 1) : 1;
  const rate = Math.min(100, Math.round((total / elapsed) * 100));
  const goalPct = habit && habit.endKey ? Math.min(1, total / (diffDays(habit.startKey, habit.endKey) + 1)) : 0;

  useEffect(() => {
    counter.value = withTiming(streak, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [streak, counter]);
  useEffect(() => {
    bar.value = withTiming(goalPct, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [goalPct, bar]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const canPrev = habit ? `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}` > habit.startKey.slice(0, 7) : false;
  const canNext = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}` < todayKey.slice(0, 7);

  if (!habit) return null;
  const quit = habit.type === "quit";
  const locked = habit.status === "completed";

  const shift = (d: number) => {
    haptic.select();
    setCursor((cur) => {
      const m = cur.m + d;
      return { y: cur.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  };

  const tapDay = (key: string) => {
    if (locked || key > todayKey || key < habit.startKey) return;
    if (quit) {
      const slipped = habit.relapses.includes(key);
      Alert.alert(
        slipped ? "Remove this slip?" : `Log a slip on ${formatKey(key)}?`,
        slipped ? "That day will count as clean again." : "The streak restarts from the next day. Your history stays.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: slipped ? "Remove" : "Log slip",
            style: slipped ? "default" : "destructive",
            onPress: () => {
              haptic.press();
              if (slipped) undoRelapse(habit.id, key);
              else relapse(habit.id, key);
            },
          },
        ],
      );
      return;
    }
    const now = toggleDay(habit.id, key);
    if (now) haptic.success();
    else haptic.tap();
  };

  const goalLine =
    goal.state === "active"
      ? `Day ${goal.dayNumber} of ${goal.total} · ${goal.daysLeft === 0 ? "last day" : `${goal.daysLeft} ${goal.daysLeft === 1 ? "day" : "days"} left`}`
      : goal.state === "due"
        ? `You reached your ${goal.total}-day goal`
        : goal.state === "completed"
          ? "Goal completed"
          : "No end date";

  const slips = [...habit.relapses].sort().reverse().slice(0, 4);

  return (
    <Animated.View
      entering={SlideInRight.duration(340)}
      exiting={SlideOutRight.duration(280)}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.canvas }}
    >
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: insets.top + 60 }}>
        <Press
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            haptic.tap();
            onBack();
          }}
          hitSlop={10}
          scale={0.92}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={22} color={c.ink} />
        </Press>
        <Press
          accessibilityRole="button"
          accessibilityLabel="Edit habit"
          onPress={() => {
            haptic.tap();
            onEdit(habit.id);
          }}
          hitSlop={10}
          scale={0.92}
          style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
        >
          <Ionicons name="create-outline" size={17} color={c.ink} />
          <Text style={{ fontFamily: fonts.geistMedium, fontSize: 14, color: c.ink }}>Edit</Text>
        </Press>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 14 }}>
        {/* hero */}
        <Animated.View entering={FadeInDown.duration(500).delay(120)} style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <Label>{quit ? "QUITTING" : "DAILY HABIT"}</Label>
          <Text numberOfLines={2} style={{ fontFamily: fonts.geistBold, fontSize: 34, lineHeight: 38, letterSpacing: -1.3, color: c.ink, marginTop: 6 }}>
            {habit.title}
          </Text>
          {habit.description ? (
            <Text style={{ fontFamily: fonts.inter, fontSize: 14.5, color: c.ink2, marginTop: 6 }}>{habit.description}</Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(220)}>
          <Card style={{ alignItems: "center", paddingVertical: 22 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Flame size={96} active={streak > 0} popKey={streak} />
              <RollingCounter value={counter} height={84} width={48} fontSize={70} color={c.ink} digitStyle={{ fontFamily: fonts.geistBold, fontWeight: "400" }} timingConfig={{ duration: 900 }} />
            </View>
            <Text style={{ fontFamily: fonts.interMedium, fontSize: 13.5, color: c.ink2, marginTop: 2 }}>
              day {quit ? "clean streak" : "streak"} · best {best}
            </Text>
          </Card>
        </Animated.View>

        {quit && !locked && (
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <GlassButton onPress={() => onUrge(habit.id)} height={56}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="hand-left-outline" size={19} color={c.ink} />
                <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 16.5, color: c.ink }}>Feeling an urge? Get help now</Text>
              </View>
            </GlassButton>
          </Animated.View>
        )}

        {/* goal */}
        <Animated.View entering={FadeInDown.duration(500).delay(340)}>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Label>GOAL</Label>
              {habit.endKey ? <Text style={{ fontFamily: fonts.interMedium, fontSize: 12.5, color: c.ink2 }}>Ends {formatKey(habit.endKey, true)}</Text> : null}
            </View>
            <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 18, letterSpacing: -0.3, color: c.ink, marginTop: 8 }}>{goalLine}</Text>
            {habit.endKey ? (
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.track, marginTop: 14, overflow: "hidden" }}>
                <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: c.ink }, barStyle]} />
              </View>
            ) : null}

            {goal.state === "due" && (
              <View style={{ gap: 10, marginTop: 16 }}>
                <Text style={{ fontFamily: fonts.inter, fontSize: 13.5, lineHeight: 19, color: c.ink2 }}>What next? Keep the streak going or call it done.</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Press onPress={() => { haptic.success(); setOngoing(habit.id); }} scale={0.96} style={{ paddingHorizontal: 16, height: 40, borderRadius: 20, backgroundColor: c.ink, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 14, color: c.canvas }}>Keep going</Text>
                  </Press>
                  <Press onPress={() => { haptic.select(); extendGoal(habit.id, 30); }} scale={0.96} style={{ paddingHorizontal: 16, height: 40, borderRadius: 20, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: fonts.geistMedium, fontSize: 14, color: c.ink }}>+30 days</Text>
                  </Press>
                  <Press onPress={() => { haptic.success(); completeHabit(habit.id); }} scale={0.96} style={{ paddingHorizontal: 16, height: 40, borderRadius: 20, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: fonts.geistMedium, fontSize: 14, color: c.ink }}>Finish</Text>
                  </Press>
                </View>
              </View>
            )}
            {goal.state === "completed" && (
              <Press onPress={() => { haptic.select(); reopenHabit(habit.id); }} scale={0.96} style={{ marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 16, height: 40, borderRadius: 20, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: fonts.geistMedium, fontSize: 14, color: c.ink }}>Reopen habit</Text>
              </Press>
            )}
            {goal.state === "active" && (
              <Press
                onPress={() =>
                  Alert.alert("Finish this goal early?", "It moves to “completed”. You can reopen it any time.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Finish", onPress: () => { haptic.success(); completeHabit(habit.id); } },
                  ])
                }
                dim={0.5}
                style={{ marginTop: 12, alignSelf: "flex-start" }}
              >
                <Text style={{ fontFamily: fonts.interMedium, fontSize: 13, color: c.ink2 }}>Finish early</Text>
              </Press>
            )}
          </Card>
        </Animated.View>

        {/* calendar */}
        <Animated.View entering={FadeInDown.duration(500).delay(420)}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 19, letterSpacing: -0.4, color: c.ink }}>
                {MONTHS[cursor.m]} {cursor.y}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Press disabled={!canPrev} restOpacity={canPrev ? 1 : 0.3} onPress={() => shift(-1)} scale={0.9} hitSlop={8} accessibilityLabel="Previous month" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="chevron-back" size={18} color={c.ink} />
                </Press>
                <Press disabled={!canNext} restOpacity={canNext ? 1 : 0.3} onPress={() => shift(1)} scale={0.9} hitSlop={8} accessibilityLabel="Next month" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="chevron-forward" size={18} color={c.ink} />
                </Press>
              </View>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <Text key={i} style={{ flex: 1, textAlign: "center", fontFamily: fonts.interMedium, fontSize: 11, color: c.ink3 }}>{d}</Text>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {cells.map((key, i) => {
                if (!key) return <View key={`b${i}`} style={{ width: `${100 / 7}%`, height: 46 }} />;
                const day = Number(key.slice(8));
                const future = key > todayKey;
                const before = key < habit.startKey;
                const done = isDone(habit, key, todayKey);
                const slipped = habit.relapses.includes(key);
                const isToday = key === todayKey;
                const inGoal = habit.endKey ? key === habit.endKey : false;
                return (
                  <View key={key} style={{ width: `${100 / 7}%`, height: 46, alignItems: "center", justifyContent: "center" }}>
                    <Press
                      disabled={future || before || locked}
                      onPress={() => tapDay(key)}
                      scale={0.86}
                      dim={0.8}
                      accessibilityLabel={`${formatKey(key)}${done ? ", done" : ""}`}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: done ? c.ink : "transparent",
                        borderWidth: slipped || isToday || inGoal ? 1.5 : 0,
                        borderColor: slipped ? "#FF453A" : isToday ? c.ink : c.ink2,
                        borderStyle: inGoal && !isToday && !slipped ? "dashed" : "solid",
                      }}
                    >
                      {slipped ? (
                        <Ionicons name="close" size={16} color="#FF453A" />
                      ) : (
                        <Text
                          style={{
                            fontFamily: done || isToday ? fonts.geistSemibold : fonts.geist,
                            fontSize: 14,
                            color: done ? c.canvas : future || before ? c.ink3 : c.ink,
                            opacity: future || before ? 0.55 : 1,
                          }}
                        >
                          {day}
                        </Text>
                      )}
                    </Press>
                  </View>
                );
              })}
            </View>

            <Text style={{ fontFamily: fonts.inter, fontSize: 12, color: c.ink3, marginTop: 10, lineHeight: 17 }}>
              {quit
                ? "Tap a day to log or remove a slip. Filled days are clean."
                : "Tap a past day to fill it in or undo it. The dashed ring marks your goal date."}
            </Text>
          </Card>
        </Animated.View>

        {/* stats */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label={quit ? "CLEAN DAYS" : "CHECK-INS"} value={`${total}`} />
          <StatTile label="SUCCESS RATE" value={`${rate}`} unit="%" />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(560)} style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label="CURRENT" value={`${streak}`} unit={streak === 1 ? "day" : "days"} />
          <StatTile label={quit ? "URGES BEATEN" : "STARTED"} value={quit ? `${habit.urgesResisted}` : formatKey(habit.startKey)} />
        </Animated.View>

        {quit && slips.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(620)}>
            <Card>
              <Label>RECENT SLIPS</Label>
              <View style={{ marginTop: 8 }}>
                {slips.map((k) => (
                  <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
                    <Text style={{ fontFamily: fonts.geistMedium, fontSize: 15, color: c.ink }}>{formatKey(k, true)}</Text>
                    <Press onPress={() => { haptic.select(); undoRelapse(habit.id, k); }} dim={0.5} hitSlop={8}>
                      <Text style={{ fontFamily: fonts.interMedium, fontSize: 13, color: c.ink2 }}>Remove</Text>
                    </Press>
                  </View>
                ))}
              </View>
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}
