// @ts-check
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import MaskedViewNative from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  DEFAULT_BAND_RATIO,
  DEFAULT_BASE_COLOR,
  DEFAULT_DELAY,
  DEFAULT_DURATION,
  DEFAULT_LOOP_DELAY,
  DEFAULT_SWEEP_COLORS,
  ENTER_DURATION,
  EXIT_DURATION,
  SWAP_EASING,
  SWAP_SHIFT,
  SWEEP_EASING,
} from "./const";
import { buildSweepGradient, sweepStripWidth } from "./helper";
import type { IDiaGradient, IDiaText } from "./types";

const MaskedView = MaskedViewNative as unknown as React.ComponentType<any>;

const DiaTextBase: React.FC<IDiaText> & React.FunctionComponent<IDiaText> = ({
  text,
  sweepColors = DEFAULT_SWEEP_COLORS,
  baseColor = DEFAULT_BASE_COLOR,
  duration = DEFAULT_DURATION,
  delay = DEFAULT_DELAY,
  loop = false,
  loopDelay = DEFAULT_LOOP_DELAY,
  bandRatio = DEFAULT_BAND_RATIO,
  autoPlay = true,
  textStyle,
  style,
  onSweepEnd,
}: IDiaText): React.JSX.Element & React.ReactNode => {
  const textKey = Array.isArray(text) ? text.join(" ") : (text as string);
  const texts = useMemo<string[]>(
    () => (Array.isArray(text) ? [...text] : [text as string]),
    [textKey],
  );
  const isMulti = texts.length > 1;

  const [index, setIndex] = useState<number>(0);
  const [cycle, setCycle] = useState<number>(0);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const progress = useSharedValue<number>(0);
  const opacity = useSharedValue<number>(isMulti ? 0 : 1);
  const shift = useSharedValue<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setIndex(0);
  }, [textKey]);

  const onSizerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5
        ? prev
        : { w: width, h: height },
    );
  }, []);

  const band = size.w * bandRatio;
  const ready = size.w > 0;

  const gradient = useMemo<IDiaGradient>(
    () => buildSweepGradient(size.w, band, sweepColors, baseColor),
    [size.w, band, sweepColors, baseColor],
  );

  const commitNext = useCallback(() => {
    setIndex((current) => (current + 1) % texts.length);
    setCycle((current) => current + 1);
  }, [texts.length]);

  const handleSweepEnd = useCallback(
    (finishedIndex: number) => {
      onSweepEnd?.(finishedIndex);
      if (!loop) return;

      timerRef.current = setTimeout(() => {
        if (!isMulti) {
          setCycle((current) => current + 1);
          return;
        }
        opacity.value = withTiming<number>(0, {
          duration: EXIT_DURATION,
          easing: SWAP_EASING,
        });
        shift.value = withTiming(
          -SWAP_SHIFT,
          { duration: EXIT_DURATION, easing: SWAP_EASING },
          (finished) => {
            "worklet";
            if (finished) scheduleOnRN<[], void>(commitNext);
          },
        );
      }, loopDelay);
    },
    [onSweepEnd, loop, loopDelay, isMulti, opacity, shift, commitNext],
  );

  useEffect(() => {
    if (!ready || !autoPlay) return;
    const playing = index;

    if (isMulti) {
      shift.value = SWAP_SHIFT;
      opacity.value = 0;
      shift.value = withTiming(0, {
        duration: ENTER_DURATION,
        easing: SWAP_EASING,
      });
      opacity.value = withTiming(1, {
        duration: ENTER_DURATION,
        easing: SWAP_EASING,
      });
    }

    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: SWEEP_EASING }, (finished) => {
        "worklet";
        if (finished) scheduleOnRN(handleSweepEnd, playing);
      }),
    );
  }, [ready, autoPlay, index, cycle, duration, delay, isMulti]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const stripStyle = useAnimatedStyle<Pick<ViewStyle, "transform">>(() => ({
    transform: [{ translateX: -(size.w + band) * (1 - progress.value) }],
  }));

  const contentStyle = useAnimatedStyle<
    Pick<ViewStyle, "transform" | "opacity">
  >(() => ({
    opacity: opacity.value,
    transform: [{ translateY: withSpring(shift.value) }],
  }));

  const label = texts[index] ?? "";

  return (
    <View style={[styles.root, style]}>
      <Text
        numberOfLines={1}
        onLayout={onSizerLayout}
        style={[textStyle, styles.sizer]}
      >
        {label}
      </Text>

      {ready ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, contentStyle]}
        >
          <MaskedView
            style={{ width: size.w, height: size.h }}
            maskElement={
              <Text numberOfLines={1} style={[textStyle, styles.mask]}>
                {label}
              </Text>
            }
          >
            <Animated.View
              style={[
                {
                  width: sweepStripWidth<number>(size.w, band),
                  height: size.h,
                },
                stripStyle,
              ]}
            >
              <LinearGradient
                colors={gradient.colors as [string, string, ...string[]]}
                locations={gradient.locations as [number, number, ...number[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </MaskedView>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    justifyContent: "center",
  },
  sizer: {
    opacity: 0,
  },
  mask: {
    color: "#000000",
    backgroundColor: "transparent",
  },
});

const DiaText: React.NamedExoticComponent<IDiaText> = memo(DiaTextBase);

export { DiaText, DiaTextBase };
export type { IDiaText } from "./types";
export default DiaText;
