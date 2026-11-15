import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";
import { AnimatedLine } from "./AnimatedLine";
import { Flame } from "./Fire";
import { Press } from "./Press";
import { goalInfo, totalDone, type Habit } from "@/lib/habits";
import { haptic } from "@/lib/haptics";
import { fonts, useTheme } from "@/lib/theme";

/**
 * Shown when a habit's end date has passed: celebrate, then ask what the user wants —
 * keep going with no end date, extend by a month, or finish for good.
 */
export function GoalDialog({
  habit,
  onKeepGoing,
  onExtend,
  onFinish,
  onLater,
}: {
  habit: Habit;
  onKeepGoing: () => void;
  onExtend: () => void;
  onFinish: () => void;
  onLater: () => void;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const g = goalInfo(habit, new Date());
  const days = g.state === "due" ? g.total : totalDone(habit, new Date());
  const quit = habit.type === "quit";

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", padding: 24 }]}
    >
      <Animated.View
        entering={ZoomIn.springify().damping(15).stiffness(170)}
        exiting={ZoomOut.duration(180)}
        style={{
          width: Math.min(width - 48, 380),
          backgroundColor: c.surface,
          borderRadius: 34,
          borderWidth: 1,
          borderColor: c.border,
          padding: 24,
          alignItems: "center",
        }}
      >
        <Flame size={92} popKey={days} />
        <Text style={{ fontFamily: fonts.interSemibold, fontSize: 11, letterSpacing: 1.2, color: c.ink3, marginTop: 2 }}>GOAL REACHED</Text>
        <View style={{ marginTop: 8 }}>
          <AnimatedLine
            text="You made it!"
            style={{ fontFamily: fonts.geistBold, fontSize: 34, letterSpacing: -1.1, color: c.ink }}
            startDelay={250}
            wordDelay={200}
          />
        </View>
        <Text style={{ fontFamily: fonts.inter, fontSize: 15, lineHeight: 22, color: c.ink2, textAlign: "center", marginTop: 8 }}>
          {days} {quit ? "clean days" : "days"} of “{habit.title}”. Do you want to keep going?
        </Text>

        <View style={{ alignSelf: "stretch", gap: 10, marginTop: 22 }}>
          <Press
            onPress={() => {
              haptic.success();
              onKeepGoing();
            }}
            scale={0.97}
            dim={0.85}
            style={{ height: 54, borderRadius: 27, backgroundColor: c.ink, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 16.5, color: c.canvas }}>Keep going — no end date</Text>
          </Press>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Press
              onPress={() => {
                haptic.select();
                onExtend();
              }}
              scale={0.97}
              style={{ flex: 1, height: 48, borderRadius: 24, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontFamily: fonts.geistMedium, fontSize: 15, color: c.ink }}>+30 more days</Text>
            </Press>
            <Press
              onPress={() => {
                haptic.success();
                onFinish();
              }}
              scale={0.97}
              style={{ flex: 1, height: 48, borderRadius: 24, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontFamily: fonts.geistMedium, fontSize: 15, color: c.ink }}>I’m done</Text>
            </Press>
          </View>
          <Press onPress={onLater} dim={0.5} style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ fontFamily: fonts.interMedium, fontSize: 13.5, color: c.ink3 }}>Decide later</Text>
          </Press>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
