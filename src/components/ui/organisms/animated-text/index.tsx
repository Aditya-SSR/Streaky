import { StyleSheet, type ViewStyle } from "react-native";
import React, { memo, useEffect } from "react";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type {
  StaggeredTextProps,
  AnimationConfig,
  CharacterAnimationParams,
  CharacterProps,
} from "./types";
import {
  DEFAULT_ANIMATION_CONFIG,
  DEFAULT_ENTER_FROM,
  DEFAULT_ENTER_TO,
} from "./conf";

/**
 * Reacticx "animated-text", tuned for Android.
 *
 * The upstream version gave every character its own blur layer plus layout animations, which
 * is far too many offscreen passes on a phone (the text visibly stutters). Here each character
 * only animates cheap properties (opacity / translate / scale / rotate) and the focus-pull blur
 * is applied ONCE per word — the same look with a fraction of the render cost.
 */
const Character: React.FC<CharacterProps> = memo<CharacterProps>(
  ({
    char,
    style,
    index,
    animationConfig,
    enterFrom,
    enterTo,
    startDelay = 0,
  }: CharacterProps & { startDelay?: number }): React.ReactNode & React.JSX.Element & React.ReactElement => {
    const p = useSharedValue<number>(0);

    // Ease-out timing — a spring overshoots and reads as bouncy/"hard"; this just settles.
    useEffect(() => {
      p.value = withDelay(
        startDelay + index * animationConfig.characterDelay,
        withTiming(1, { duration: animationConfig.characterEnterDuration, easing: Easing.out(Easing.cubic) }),
      );
    }, [p, index, animationConfig, startDelay]);

    const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
      opacity: interpolate(p.value, [0, 0.7], [enterFrom.opacity, enterTo.opacity], "clamp"),
      transform: [
        { translateY: interpolate(p.value, [0, 1], [enterFrom.translateY, enterTo.translateY]) },
        { scale: interpolate(p.value, [0, 1], [enterFrom.scale, enterTo.scale]) },
        { rotate: `${interpolate(p.value, [0, 1], [enterFrom.rotate, enterTo.rotate])}deg` },
      ],
    }));

    return (
      <Animated.View style={[styles.characterWrapper, animatedStyle]}>
        <Animated.Text style={style}>{char}</Animated.Text>
      </Animated.View>
    );
  },
);

export const StaggeredText: React.FC<StaggeredTextProps> = memo<StaggeredTextProps>(
  ({
    text,
    style,
    animationConfig,
    enterFrom,
    enterTo,
    startDelay = 0,
  }: StaggeredTextProps): React.ReactNode & React.JSX.Element & React.ReactElement => {
    const characters = Array.from<string>(text);

    const mergedAnimationConfig: AnimationConfig = {
      ...DEFAULT_ANIMATION_CONFIG,
      ...animationConfig,
      spring: {
        ...DEFAULT_ANIMATION_CONFIG.spring,
        ...animationConfig?.spring,
      },
    };

    const mergedEnterFrom: CharacterAnimationParams = { ...DEFAULT_ENTER_FROM, ...enterFrom };
    const mergedEnterTo: CharacterAnimationParams = { ...DEFAULT_ENTER_TO, ...enterTo };

    // One blur for the whole word: sharpens from `maxBlurIntensity` to 0 as its letters land.
    const maxBlur = mergedAnimationConfig.maxBlurIntensity ?? 12;
    const focus = useSharedValue<number>(1);
    const total =
      characters.length * mergedAnimationConfig.characterDelay + mergedAnimationConfig.characterEnterDuration;

    useEffect(() => {
      focus.value = withDelay(startDelay, withTiming(0, { duration: total, easing: Easing.out(Easing.quad) }));
    }, [focus, total, startDelay]);

    const wordStyle = useAnimatedStyle<ViewStyle>(() => ({
      filter: [{ blur: focus.value * maxBlur * 0.22 }],
    }));

    return (
      <Animated.View style={[styles.textWrapper, wordStyle]}>
        {characters.map<React.JSX.Element | React.ReactNode>((char, index) => (
          <Character
            key={`${char}-${index}`}
            char={char}
            style={style}
            index={index}
            totalChars={characters.length}
            animationConfig={mergedAnimationConfig}
            enterFrom={mergedEnterFrom}
            enterTo={mergedEnterTo}
            startDelay={startDelay}
            exitFrom={DEFAULT_ENTER_TO}
            exitTo={DEFAULT_ENTER_FROM}
          />
        ))}
      </Animated.View>
    );
  },
);

export default memo<StaggeredTextProps>(StaggeredText);

const styles = StyleSheet.create({
  textWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  characterWrapper: {
    position: "relative",
    overflow: "visible",
  },
});
