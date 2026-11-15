import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { fonts, useTheme } from "@/lib/theme";

/** iOS-style toggle in monochrome. */
export function IOSSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { isDark } = useTheme();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(value ? 1 : 0, { damping: 16, stiffness: 260 });
  }, [value, p]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      p.value,
      [0, 1],
      [isDark ? "#39393D" : "#E5E5EA", isDark ? "#FAFAFA" : "#0A0A0A"],
    ),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(p.value, [0, 1], [2, 22]) }],
    backgroundColor: interpolateColor(p.value, [0, 1], ["#FFFFFF", isDark ? "#0A0A0A" : "#FFFFFF"]),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        haptic.select();
        onChange(!value);
      }}
    >
      <Animated.View style={[{ width: 51, height: 31, borderRadius: 16, justifyContent: "center" }, track]}>
        <Animated.View
          style={[
            {
              width: 27,
              height: 27,
              borderRadius: 14,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            },
            knob,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

/** iOS-style segmented control with a sliding thumb. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c, isDark } = useTheme();
  const [w, setW] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(index);
  useEffect(() => {
    x.value = withSpring(index, { damping: 18, stiffness: 260 });
  }, [index, x]);

  const seg = (w - 6) / options.length;
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * seg }] }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ backgroundColor: c.surface2, borderRadius: 12, padding: 3, flexDirection: "row" }}
    >
      {w > 0 && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 3,
              left: 3,
              width: seg,
              height: 34,
              borderRadius: 10,
              backgroundColor: isDark ? "#48484A" : "#FFFFFF",
              shadowColor: "#000",
              shadowOpacity: isDark ? 0 : 0.12,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
              elevation: isDark ? 0 : 1,
            },
            thumb,
          ]}
        />
      )}
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => {
            if (o.value !== value) haptic.select();
            onChange(o.value);
          }}
          style={{ flex: 1, height: 34, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            style={{
              fontFamily: o.value === value ? fonts.geistSemibold : fonts.geistMedium,
              fontSize: 14,
              color: o.value === value ? c.ink : c.ink2,
            }}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Selectable pill with a springy press — used for goal durations. */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(active ? 1 : 0, { damping: 15, stiffness: 300 });
  }, [active, p]);
  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [c.surface2, c.ink]),
    transform: [{ scale: 1 + 0.04 * p.value }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (!active) haptic.select();
        onPress();
      }}
    >
      <Animated.View style={[{ paddingHorizontal: 16, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, bg]}>
        <Text style={{ fontFamily: active ? fonts.geistSemibold : fonts.geistMedium, fontSize: 14.5, color: active ? c.canvas : c.ink }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** − 45 + stepper with press-and-hold feel. */
export function Stepper({ value, onChange, min = 1, max = 365, unit = "days" }: { value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string }) {
  const { c } = useTheme();
  const step = (d: number) => {
    const next = Math.min(max, Math.max(min, value + d));
    if (next !== value) {
      haptic.select();
      onChange(next);
    }
  };
  const btn = {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <Pressable onPress={() => step(-1)} onLongPress={() => step(-7)} style={btn} accessibilityLabel="Fewer days">
        <Text style={{ fontFamily: fonts.geistMedium, fontSize: 22, color: c.ink, marginTop: -2 }}>−</Text>
      </Pressable>
      <View style={{ minWidth: 86, alignItems: "center" }}>
        <Text style={{ fontFamily: fonts.geistBold, fontSize: 26, letterSpacing: -0.6, color: c.ink }}>{value}</Text>
        <Text style={{ fontFamily: fonts.inter, fontSize: 11, color: c.ink2, marginTop: -2 }}>{unit}</Text>
      </View>
      <Pressable onPress={() => step(1)} onLongPress={() => step(7)} style={btn} accessibilityLabel="More days">
        <Text style={{ fontFamily: fonts.geistMedium, fontSize: 22, color: c.ink, marginTop: -2 }}>+</Text>
      </Pressable>
    </View>
  );
}
