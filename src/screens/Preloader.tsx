import { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { GradientWaveText } from "@/components/ui/molecules/gradient-wave-text";
import { Flame } from "@/components/Fire";
import { fonts } from "@/lib/theme";

const HOLD_MS = 2400;
// The native splash draws the fire at the exact centre of the screen at roughly this size.
// Matching both means the hand-off from splash → preloader is invisible: the flame stays
// put and only the wordmark appears beneath it.
const FIRE_SIZE = 104; // the animation has built-in padding, so the visible flame is ~60% of this

/** Always dark — it continues seamlessly from the native splash (fire on black). */
export function Preloader({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(onDone, HOLD_MS);
    return () => clearTimeout(t);
  }, [ready, onDone]);

  return (
    <Animated.View exiting={FadeOut.duration(450)} style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Flame size={FIRE_SIZE} />
      </View>

      <Animated.View
        entering={FadeInDown.duration(800).delay(250)}
        style={{ position: "absolute", left: 0, right: 0, top: height / 2 + FIRE_SIZE * 0.62, alignItems: "center" }}
      >
        <GradientWaveText
          colors={["#FFFFFF", "#FFD9B8", "#FFFFFF", "#C7C7CC", "#FFFFFF"]}
          baseColor="#A1A1A6"
          bandGap={5}
          bandCount={8}
          speed={0.9}
          radial
          style={{ alignItems: "center" }}
          textStyle={{ fontFamily: fonts.geistBold, fontSize: 52, letterSpacing: -2, includeFontPadding: false }}
        >
          Streaky
        </GradientWaveText>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(900).delay(900)} style={{ position: "absolute", bottom: 64, left: 0, right: 0, alignItems: "center" }}>
        <Text style={{ fontFamily: fonts.interMedium, fontSize: 12, letterSpacing: 1.6, color: "#6E6E73" }}>
          HABITS, QUIETLY
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
