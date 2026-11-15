import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { GlassSurface } from "./GlassSurface";
import { Press } from "./Press";
import { haptic } from "@/lib/haptics";
import { fonts, useTheme } from "@/lib/theme";

type Props = {
  onPress: () => void;
  label?: string;
  children?: ReactNode;
  height?: number;
  width?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Let a sheen glide across every few seconds. */
  sheen?: boolean;
};

/** Liquid-glass button: Skia glass body, rim light, press spring and a gliding sheen. */
export function GlassButton({ onPress, label, children, height = 58, width, style, accessibilityLabel, sheen = true }: Props) {
  const { isDark, c } = useTheme();
  const t = useSharedValue(0);
  const [w, setW] = useState(width ?? 0);

  useEffect(() => {
    if (!sheen) return;
    t.value = withRepeat(withDelay(2600, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) })), -1, false);
  }, [t, sheen]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(t.value, [0, 1], [-80, w + 40]) }, { rotate: "18deg" }],
  }));

  const radius = height / 2;

  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        haptic.press();
        onPress();
      }}
      scale={0.955}
      dim={0.92}
      style={[width ? { width } : { alignSelf: "stretch" }, style]}
    >
      <GlassSurface
        radius={radius}
        style={{ height, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      >
        <Animated.View
          pointerEvents="none"
          onLayout={undefined}
          style={[{ position: "absolute", top: -12, bottom: -12, width: 40 }, sheenStyle]}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0)", isDark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {/* measures the available width for the sheen travel */}
        <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)} />
        {children ??
          (label ? (
            <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 17, letterSpacing: -0.2, color: c.ink }}>{label}</Text>
          ) : null)}
      </GlassSurface>
    </Press>
  );
}
