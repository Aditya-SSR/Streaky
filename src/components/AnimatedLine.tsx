import { useMemo } from "react";
import { View, type StyleProp, type TextStyle } from "react-native";
import { StaggeredText } from "@/components/ui/organisms/animated-text";

/**
 * A line of text that reveals word by word, each word easing into focus letter by letter
 * (Reacticx "animated-text"). The component animates per character, so wrapping happens per
 * word here — otherwise long lines would break in the middle of a word.
 *
 * All words are mounted immediately and staggered with native animation delays, so there are
 * no timers or React re-renders while the text plays — that is what keeps it smooth.
 */
export function AnimatedLine({
  text,
  style,
  startDelay = 0,
  wordDelay = 150,
  align = "center",
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  /** ms before the first word appears. */
  startDelay?: number;
  /** ms between words. */
  wordDelay?: number;
  align?: "center" | "flex-start";
}) {
  const words = useMemo(() => text.split(" ").filter(Boolean), [text]);

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: align, columnGap: 9 }}>
      {words.map((w, i) => (
        <StaggeredText
          key={`${i}-${w}`}
          text={w}
          style={style}
          startDelay={startDelay + i * wordDelay}
          animationConfig={{ characterDelay: 24, characterEnterDuration: 680, maxBlurIntensity: 14 }}
          enterFrom={{ translateY: 12, scale: 0.94, rotate: 0 }}
        />
      ))}
    </View>
  );
}
