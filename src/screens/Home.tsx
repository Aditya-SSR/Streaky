import { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedLine } from "@/components/AnimatedLine";
import { Backdrop } from "@/components/Backdrop";
import { CardDeck, PageDots, type DeckItem } from "@/components/CardDeck";
import { GlassButton } from "@/components/GlassButton";
import { GoalDialog } from "@/components/GoalDialog";
import { TodaySummary } from "@/components/TodaySummary";
import { GradientWaveText } from "@/components/ui/molecules/gradient-wave-text";
import { greeting, useToday } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { goalInfo } from "@/lib/habits";
import { fonts, useTheme } from "@/lib/theme";
import { useStore, type Habit } from "@/store/useStore";

export function Home({
  onOpenSettings,
  onOpenHabit,
  onUrge,
  onCreate,
  onEdit,
  overlayOpen,
}: {
  onOpenSettings: () => void;
  onOpenHabit: (id: string) => void;
  onUrge: (id: string) => void;
  onCreate: () => void;
  onEdit: (habit: Habit) => void;
  /** Another screen is on top — hold back popups like the goal dialog. */
  overlayOpen: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const today = useToday();

  const habits = useStore((s) => s.habits);
  const cardStyle = useStore((s) => s.cardStyle);
  const userName = useStore((s) => s.userName);
  const setOngoing = useStore((s) => s.setOngoing);
  const extendGoal = useStore((s) => s.extendGoal);
  const completeHabit = useStore((s) => s.completeHabit);

  const [index, setIndex] = useState(0);
  // Each card style remounts at its first card — keep the page dots in step.
  const [seenStyle, setSeenStyle] = useState(cardStyle);
  if (seenStyle !== cardStyle) {
    setSeenStyle(cardStyle);
    setIndex(0);
  }
  // A habit was just added: land on it (it sits right before the "New habit" card).
  const [prevCount, setPrevCount] = useState(habits.length);
  if (habits.length !== prevCount) {
    setPrevCount(habits.length);
    if (habits.length > prevCount) setIndex(prevCount);
  }
  const [snoozed, setSnoozed] = useState<string[]>([]);

  const items = useMemo<DeckItem[]>(
    () => [...habits.map((habit) => ({ id: habit.id, habit })), { id: "__add" }],
    [habits],
  );

  const open = useCallback((h: Habit) => onOpenHabit(h.id), [onOpenHabit]);
  const urge = useCallback((h: Habit) => onUrge(h.id), [onUrge]);

  const activeIndex = Math.min(index, items.length - 1);
  const due = !overlayOpen ? habits.find((h) => goalInfo(h, today).state === "due" && !snoozed.includes(h.id)) : undefined;

  const greet = `${greeting(today)}${userName ? `, ${userName}` : ""}`;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />

      <View style={{ flex: 1, paddingTop: insets.top + 10 }}>
        <Animated.View
          entering={FadeInDown.duration(600)}
          style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 24 }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <AnimatedLine
              text={greet}
              align="flex-start"
              wordDelay={110}
              startDelay={500}
              style={{ fontFamily: fonts.interMedium, fontSize: 14, color: c.ink2, letterSpacing: 0.2 }}
            />
            <GradientWaveText
              colors={isDark ? ["#FFFFFF", "#FFE2C6", "#FFFFFF", "#6E6E76", "#FFFFFF"] : ["#0A0A0A", "#FF6A00", "#0A0A0A", "#8E8E93", "#0A0A0A"]}
              baseColor={isDark ? "#A8A8B0" : "#3A3A40"}
              speed={0.85}
              bandGap={5}
              bandCount={8}
              radial
              style={{ marginTop: 2 }}
              textStyle={{ fontFamily: fonts.geistBold, fontSize: 42, letterSpacing: -1.8, includeFontPadding: false }}
            >
              Streaky
            </GradientWaveText>
          </View>
          <GlassButton
            width={50}
            height={50}
            accessibilityLabel="Settings"
            sheen={false}
            onPress={() => {
              haptic.tap();
              onOpenSettings();
            }}
          >
            <Ionicons name="settings-outline" size={22} color={c.ink} />
          </GlassButton>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(120)} style={{ marginTop: 14 }}>
          <TodaySummary habits={habits} today={today} />
        </Animated.View>

        <Animated.View entering={FadeIn.duration(800).delay(200)} style={{ flex: 1, justifyContent: "center" }}>
          <CardDeck
            key={cardStyle}
            items={items}
            cardStyle={cardStyle}
            today={today}
            initialIndex={index}
            onOpen={open}
            onEdit={onEdit}
            onUrge={urge}
            onAdd={onCreate}
            onIndexChange={setIndex}
          />
        </Animated.View>

        <View style={{ paddingBottom: Math.max(insets.bottom, 16) + 14, alignItems: "center", gap: 12 }}>
          <PageDots count={items.length} index={activeIndex} />
          <Text style={{ fontFamily: fonts.inter, fontSize: 12, color: c.ink3 }}>
            Tap a card for its calendar · Hold to edit · Drag to spin
          </Text>
        </View>
      </View>

      {due && (
        <GoalDialog
          key={due.id}
          habit={due}
          onKeepGoing={() => setOngoing(due.id)}
          onExtend={() => extendGoal(due.id, 30)}
          onFinish={() => completeHabit(due.id)}
          onLater={() => setSnoozed((s) => [...s, due.id])}
        />
      )}
    </View>
  );
}
