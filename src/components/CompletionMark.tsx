import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Flame } from "./Fire";
import { useTheme } from "@/lib/theme";

const SIZE = 32;
const PARTICLES = Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8);

function Particle({ angle, burst, color }: { angle: number; burst: { value: number }; color: string }) {
  const style = useAnimatedStyle(() => {
    const dist = interpolate(burst.value, [0, 1], [6, 30]);
    return {
      opacity: interpolate(burst.value, [0, 0.15, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * dist },
        { translateY: Math.sin(angle) * dist },
        { scale: interpolate(burst.value, [0, 1], [1, 0.2]) },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", width: 4, height: 4, borderRadius: 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

/**
 * Today's indicator — the primary interaction on a card.
 * Empty ring → tap → the ring collapses while a flame springs in with a soft shock-wave
 * and a ring of sparks. Tapping again gently reverses it.
 */
export function CompletionMark({
  done,
  onToggle,
  label,
}: {
  done: boolean;
  onToggle: () => void;
  label: string;
}) {
  const { c } = useTheme();
  const p = useSharedValue(done ? 1 : 0);
  const burst = useSharedValue(1);
  const breathe = useSharedValue(0);
  const flicker = useSharedValue(0);
  const press = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    p.value = withSpring(done ? 1 : 0, { damping: done ? 9 : 16, stiffness: done ? 170 : 220, mass: 0.8 });
    if (done) {
      burst.value = 0;
      burst.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    }
  }, [done, p, burst]);

  // a barely-there breathing on the empty ring invites the tap
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe]);

  // gentle flame flicker once complete
  useEffect(() => {
    flicker.value = done
      ? withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true)
      : withTiming(0, { duration: 200 });
  }, [done, flicker]);

  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.45], [1, 0], "clamp"),
    transform: [
      { scale: interpolate(p.value, [0, 1], [1, 0.45], "clamp") * (1 + 0.035 * breathe.value * (1 - p.value)) },
    ],
  }));

  const flame = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0.1, 0.55], [0, 1], "clamp"),
    transform: [
      { scale: p.value * (1 + 0.05 * flicker.value) },
      { rotate: `${interpolate(p.value, [0, 1], [-24, 0]) + (flicker.value - 0.5) * 3}deg` },
    ],
    transformOrigin: "50% 90%",
  }));

  const wave = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 1], [0.35, 0]),
    transform: [{ scale: interpolate(burst.value, [0, 1], [0.7, 2.1]) }],
  }));

  const wrap = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ checked: done }}
      hitSlop={12}
      onPress={onToggle}
      onPressIn={() => (press.value = withSpring(0.88, { damping: 14, stiffness: 400 }))}
      onPressOut={() => (press.value = withSpring(1, { damping: 10, stiffness: 300 }))}
    >
      <Animated.View style={[{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }, wrap]}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1.5, borderColor: c.ink },
            wave,
          ]}
        />
        <Animated.View
          style={[
            { position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1.75, borderColor: c.ink3 },
            ring,
          ]}
        />
        <Animated.View style={[{ position: "absolute", alignItems: "center", justifyContent: "center" }, flame]}>
          <Flame mono size={SIZE + 6} />
        </Animated.View>
        <View pointerEvents="none" style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
          {PARTICLES.map((a, i) => (
            <Particle key={i} angle={a} burst={burst} color={c.ink} />
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}
