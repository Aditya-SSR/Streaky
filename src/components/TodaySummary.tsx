import { useEffect } from "react";
import { Text, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { GlassSurface } from "./GlassSurface";
import { doneToday, type Habit } from "@/lib/habits";
import { fonts, useTheme } from "@/lib/theme";

/** "Today" strip: a ring of habits on track, a line of encouragement, and your longest live streak. */
export function TodaySummary({ habits, today }: { habits: Habit[]; today: Date }) {
  const { c } = useTheme();
  const active = habits.filter((h) => h.status === "active");
  const done = active.filter((h) => doneToday(h, today)).length;
  const progress = useSharedValue(0);
  const pct = active.length ? done / active.length : 0;

  useEffect(() => {
    progress.value = withTiming(pct * 100, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [pct, progress]);

  if (active.length === 0) return null;

  const left = active.length - done;
  const headline = left === 0 ? "All done for today" : `${done} of ${active.length} on track`;
  const sub = left === 0 ? "Nothing left. Enjoy it." : `${left} to go — you’ve got this`;

  return (
    <GlassSurface radius={30} style={{ marginHorizontal: 20, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <CircularProgress
        progress={progress}
        size={48}
        strokeWidth={5}
        gap={2}
        outerCircleColor={c.track}
        progressCircleColor={c.ink}
        backgroundColor="transparent"
        renderIcon={() => (
          <Text style={{ fontFamily: fonts.geistBold, fontSize: 13, color: c.ink }}>
            {done}/{active.length}
          </Text>
        )}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 16.5, letterSpacing: -0.3, color: c.ink }}>{headline}</Text>
        <Text style={{ fontFamily: fonts.inter, fontSize: 12.5, color: c.ink2, marginTop: 1 }}>{sub}</Text>
      </View>
    </GlassSurface>
  );
}
