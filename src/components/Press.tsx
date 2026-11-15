import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { haptic } from "@/lib/haptics";

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** Opacity while pressed (1 = no dimming). */
  dim?: number;
  /** Scale while pressed (1 = no shrink). */
  scale?: number;
  /** Opacity when not pressed — use for disabled looks. */
  restOpacity?: number;
  /** Tiny haptic tick on press-in. */
  tick?: boolean;
};

/**
 * Pressable with micro-interaction feedback: a springy squish and a soft dim.
 *
 * NativeWind's JSX transform doesn't support `Pressable`'s function-style
 * (`style={({ pressed }) => …}`) — the whole style is dropped. So the style here is a
 * plain object and the pressed state is animated on the UI thread instead.
 */
export function Press({
  style,
  children,
  dim = 0.6,
  scale = 1,
  restOpacity = 1,
  tick = false,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const p = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    opacity: restOpacity * (1 - (1 - dim) * p.value),
    transform: [{ scale: 1 - (1 - scale) * p.value }],
  }));

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        p.value = withTiming(1, { duration: 70 });
        if (tick) haptic.tap();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.value = withSpring(0, { damping: 12, stiffness: 320 });
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}
