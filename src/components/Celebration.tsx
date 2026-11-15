import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame } from "./Fire";
import { GlassSurface } from "./GlassSurface";
import { onCelebrate, type CelebrationEvent } from "@/lib/celebrate";
import { haptic } from "@/lib/haptics";
import { fonts, useTheme } from "@/lib/theme";

const COLORS = ["#FFFFFF", "#FF8A3D", "#FFC15E", "#FF5A36", "#FFE9C7"];
const COUNT = 34;

type P = { vx: number; vy: number; rot: number; size: number; color: string; round: boolean };

function Particle({ p, t, x0, y0 }: { p: P; t: { value: number }; x0: number; y0: number }) {
  const style = useAnimatedStyle(() => {
    const s = t.value;
    return {
      opacity: interpolate(s, [0, 0.08, 0.75, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: x0 + p.vx * s },
        { translateY: y0 + p.vy * s + 520 * s * s },
        { rotate: `${p.rot * s}deg` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: p.size,
          height: p.round ? p.size : p.size * 0.5,
          borderRadius: p.round ? p.size / 2 : 1.5,
          backgroundColor: p.color,
        },
        style,
      ]}
    />
  );
}

/** Toast + confetti overlay. Mounted once at the app root; triggered through `celebrate()`. */
export function Celebration() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [event, setEvent] = useState<CelebrationEvent | null>(null);
  const [burstId, setBurstId] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useSharedValue(0);
  const t = useSharedValue(0);

  const particles = useMemo<P[]>(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const a = -Math.PI / 2 + ((i / COUNT) * 2 - 1) * 1.15;
        const speed = 260 + ((i * 37) % 220);
        return {
          vx: Math.cos(a) * speed * 0.9,
          vy: Math.sin(a) * speed - 120,
          rot: ((i * 53) % 720) - 360,
          size: 6 + ((i * 7) % 6),
          color: COLORS[i % COLORS.length],
          round: i % 3 === 0,
        };
      }),
    [],
  );

  useEffect(
    () =>
      onCelebrate((e) => {
        clearTimeout(timer.current);
        setEvent(e);
        toast.value = 0;
        toast.value = withSpring(1, { damping: 14, stiffness: 190 });
        if (e.confetti) {
          setBurstId((n) => n + 1);
          t.value = 0;
          t.value = withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) });
          haptic.success();
        }
        timer.current = setTimeout(() => {
          toast.value = withDelay(0, withTiming(0, { duration: 260 }));
        }, 2800);
      }),
    [toast, t],
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  void runOnUI;

  const toastStyle = useAnimatedStyle(() => ({
    opacity: interpolate(toast.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(toast.value, [0, 1], [-70, 0]) },
      { scale: interpolate(toast.value, [0, 1], [0.9, 1]) },
    ],
  }));

  if (!event) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {event.confetti &&
        particles.map((p, i) => <Particle key={`${burstId}-${i}`} p={p} t={t} x0={width / 2} y0={height * 0.42} />)}

      <Animated.View style={[{ position: "absolute", top: insets.top + 10, left: 16, right: 16, alignItems: "center" }, toastStyle]}>
        <GlassSurface radius={26} strength={1.4} style={{ paddingVertical: 10, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(0,0,0,0.55)" }}>
          <Flame size={30} />
          <View>
            <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 16, color: c.ink, letterSpacing: -0.2 }}>{event.title}</Text>
            {event.subtitle ? (
              <Text style={{ fontFamily: fonts.inter, fontSize: 12, color: c.ink2, marginTop: 1 }}>{event.subtitle}</Text>
            ) : null}
          </View>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}
