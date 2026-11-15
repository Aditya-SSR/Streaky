import { useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, type TextStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

/**
 * A number that rolls to its new value: the old figure slides out while the new one
 * slides in, direction following whether the value went up or down.
 */
export function RollingNumber({
  value,
  textStyle,
}: {
  value: number;
  textStyle: TextStyle;
}) {
  const prev = useRef(value);
  const [outgoing, setOutgoing] = useState(value);
  const progress = useSharedValue(1);
  const direction = useSharedValue(1);

  useLayoutEffect(() => {
    if (value === prev.current) return;
    direction.value = value > prev.current ? 1 : -1;
    setOutgoing(prev.current);
    prev.current = value;
    progress.value = 0;
    progress.value = withSpring(1, { damping: 15, stiffness: 190, mass: 0.8 });
  }, [value, progress, direction]);

  const travel = (textStyle.fontSize ?? 20) * 0.85;

  const incoming = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 1, 1]),
    transform: [{ translateY: (1 - progress.value) * travel * direction.value }],
  }));
  const leaving = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [1, 0, 0]),
    transform: [{ translateY: -progress.value * travel * direction.value }],
  }));

  const widest = String(Math.max(value, outgoing));
  const lineHeight = textStyle.lineHeight ?? Math.round((textStyle.fontSize ?? 20) * 1.2);

  return (
    <View style={{ height: lineHeight, overflow: "hidden", justifyContent: "center" }}>
      {/* invisible sizer keeps the container as wide as the widest number */}
      <Text style={[textStyle, { opacity: 0, lineHeight }]}>{widest}</Text>
      <Animated.Text style={[textStyle, styles.layer, { lineHeight }, leaving]}>
        {outgoing}
      </Animated.Text>
      <Animated.Text style={[textStyle, styles.layer, { lineHeight }, incoming]}>
        {value}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, top: 0, textAlign: "right" },
});
