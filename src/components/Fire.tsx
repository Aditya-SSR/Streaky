import { useEffect, useRef } from "react";
import LottieView from "lottie-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/lib/theme";

// Google's animated Noto Emoji "fire" (CC BY 4.0) — a real, flickering flame.
const fireSource = require("../../assets/animations/fire.json");

/**
 * A living flame. `size` is the on-screen box; the animation has built-in padding so the
 * flame itself is a little smaller. Pass a changing `popKey` for a little kick (e.g. when
 * the streak grows). When inactive (a streak of 0) it freezes dim.
 */
export function Flame({
  size = 24,
  active = true,
  popKey,
  mono = false,
}: {
  size?: number;
  active?: boolean;
  popKey?: number;
  /** Black-and-white flame: the same animation, desaturated (keeps all the shading). */
  mono?: boolean;
}) {
  const { isDark } = useTheme();
  const pop = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pop.value = withSequence(
      withTiming(1.5, { duration: 140 }),
      withSpring(1, { damping: 6, stiffness: 190 }),
    );
  }, [popKey, pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    opacity: active ? 1 : 0.28,
  }));
  // light flame on dark surfaces, dark flame on light surfaces
  const monoFilter = mono ? [{ grayscale: 1 }, { brightness: isDark ? 1.25 : 0.5 }, { contrast: 1.1 }] : undefined;

  return (
    <Animated.View style={[{ width: size, height: size }, style, monoFilter ? { filter: monoFilter } : null]}>
      {active ? (
        <LottieView source={fireSource} autoPlay loop renderMode="HARDWARE" style={{ width: size, height: size }} />
      ) : (
        <LottieView source={fireSource} progress={0.3} renderMode="HARDWARE" style={{ width: size, height: size }} />
      )}
    </Animated.View>
  );
}

/** Minimal monochrome flame (Lucide "flame" geometry, filled). */
export function FlameGlyph({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        fill={color}
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
