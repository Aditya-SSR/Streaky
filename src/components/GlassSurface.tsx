import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { Canvas, LinearGradient, RadialGradient, RoundedRect, vec } from "@shopify/react-native-skia";
import { useTheme } from "@/lib/theme";

/**
 * Liquid-glass material, drawn with Skia and modelled on Apple's:
 *
 *  - an almost-clear body (a whisper of light, lighter toward the top),
 *  - slightly darker edges, so the pane reads as having thickness — like a lens,
 *  - a soft specular bloom where light hits the top-left,
 *  - a thin inner edge band (the glass's bevel),
 *  - a hairline rim that is bright at the top-left, fades fast, stays almost invisible
 *    along the sides and picks up a faint cool fringe at the bottom-right.
 *
 * On pure black there is nothing behind to blur or refract, so the look is made of light.
 */
export function GlassSurface({
  radius,
  style,
  children,
  strength = 1,
}: {
  radius: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  strength?: number;
}) {
  const { isDark } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((p) => (p.w === width && p.h === height ? p : { w: width, h: height }));
  };

  const { w, h } = size;
  const a = (v: number) => Math.min(1, v * strength).toFixed(3);
  const clear = "rgba(255,255,255,0)";

  const body = isDark
    ? [`rgba(255,255,255,${a(0.085)})`, `rgba(255,255,255,${a(0.022)})`]
    : [`rgba(255,255,255,${a(0.82)})`, `rgba(255,255,255,${a(0.52)})`];
  const edgeShade = isDark ? ["rgba(0,0,0,0)", `rgba(0,0,0,${a(0.34)})`] : ["rgba(0,0,0,0)", `rgba(0,0,0,${a(0.06)})`];
  const bloom = isDark ? [`rgba(255,255,255,${a(0.2)})`, clear] : [`rgba(255,255,255,${a(0.95)})`, clear];
  const bevel = isDark
    ? [`rgba(255,255,255,${a(0.15)})`, clear, `rgba(255,255,255,${a(0.07)})`]
    : [`rgba(255,255,255,${a(0.9)})`, clear, `rgba(0,0,0,${a(0.05)})`];
  const rim = isDark
    ? [`rgba(255,255,255,${a(0.92)})`, `rgba(255,255,255,${a(0.14)})`, `rgba(255,255,255,${a(0.03)})`, `rgba(176,206,255,${a(0.5)})`]
    : [`rgba(255,255,255,1)`, `rgba(0,0,0,${a(0.05)})`, `rgba(0,0,0,${a(0.04)})`, `rgba(0,0,0,${a(0.13)})`];

  const cx = w / 2;
  const cy = h / 2;
  const reach = Math.max(w, h) * 0.72;

  return (
    <View onLayout={onLayout} style={[{ borderRadius: radius }, style]}>
      {w > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* clear body, a little brighter toward the top */}
          <RoundedRect x={0} y={0} width={w} height={h} r={radius}>
            <LinearGradient start={vec(0, 0)} end={vec(0, h)} colors={body} />
          </RoundedRect>

          {/* thickness: the pane darkens slightly toward its edges */}
          <RoundedRect x={0} y={0} width={w} height={h} r={radius}>
            <RadialGradient c={vec(cx, cy)} r={reach} colors={edgeShade} positions={[0.55, 1]} />
          </RoundedRect>

          {/* specular bloom where the light lands (top-left) */}
          <RoundedRect x={1.5} y={1.5} width={w - 3} height={h - 3} r={Math.max(radius - 1.5, 2)}>
            <RadialGradient c={vec(w * 0.2, 0)} r={Math.max(h * 1.05, w * 0.45)} colors={bloom} />
          </RoundedRect>

          {/* the glass bevel: a thin lit band just inside the edge */}
          <RoundedRect x={2} y={2} width={w - 4} height={h - 4} r={Math.max(radius - 2, 2)} style="stroke" strokeWidth={2.5}>
            <LinearGradient start={vec(0, 0)} end={vec(w, h)} colors={bevel} />
          </RoundedRect>

          {/* hairline rim: bright top-left, fading fast, faint cool fringe bottom-right */}
          <RoundedRect x={0.5} y={0.5} width={w - 1} height={h - 1} r={radius} style="stroke" strokeWidth={1}>
            <LinearGradient start={vec(0, 0)} end={vec(w, h)} colors={rim} positions={[0, 0.22, 0.6, 1]} />
          </RoundedRect>
        </Canvas>
      )}
      {children}
    </View>
  );
}
