import { useState } from "react";
import { Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedLine } from "@/components/AnimatedLine";
import { Backdrop } from "@/components/Backdrop";
import { GlassButton } from "@/components/GlassButton";
import { Press } from "@/components/Press";
import { DiaText } from "@/components/ui/organisms/dia-text";
import { haptic } from "@/lib/haptics";
import { fonts, useTheme } from "@/lib/theme";

export function Onboarding({ onStart }: { onStart: (name: string) => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { c, isDark } = useTheme();
  const [step, setStep] = useState<"intro" | "name">("intro");
  const [name, setName] = useState("");

  // monochrome sweep: a soft light band glides across and leaves solid ink behind
  const sweep = isDark ? ["#48484A", "#AEAEB2", "#FFFFFF"] : ["#D1D1D6", "#8E8E93", "#3A3A3C"];
  // "Stay consistent." is the widest line (~7.6 × fontSize); keep ~8% spare so it never
  // truncates on narrow phones. DiaText renders on a single line.
  const fontSize = Math.floor(Math.min(46, (width - 56) / 8.2));
  const textStyle = {
    fontFamily: fonts.geistBold,
    fontSize,
    lineHeight: Math.round(fontSize * 1.14),
    letterSpacing: -fontSize * 0.04,
  } as const;

  return (
    <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut.duration(300)} style={{ flex: 1 }}>
      <Backdrop />

      {step === "intro" ? (
        <Animated.View key="intro" exiting={FadeOut.duration(250)} style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: insets.top + 24, justifyContent: "center" }}>
            <DiaText text="Start small." baseColor={c.ink} sweepColors={sweep} bandRatio={0.8} duration={1500} delay={450} textStyle={textStyle} />
            <DiaText text="Stay consistent." baseColor={c.ink} sweepColors={sweep} bandRatio={0.8} duration={1500} delay={1250} textStyle={textStyle} />

            <Animated.Text
              entering={FadeIn.duration(900).delay(2400)}
              style={{ fontFamily: fonts.inter, fontSize: 15, lineHeight: 22, color: c.ink2, marginTop: 22, maxWidth: 300 }}
            >
              Build daily streaks. Quit what holds you back. One day at a time.
            </Animated.Text>
          </View>

          <Animated.View
            entering={FadeInDown.duration(800).delay(2000)}
            style={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 20 }}
          >
            <GlassButton label="Get started" onPress={() => setStep("name")} height={60} />
            <Text style={{ fontFamily: fonts.inter, fontSize: 12, color: c.ink3, textAlign: "center", marginTop: 14 }}>
              Private by design. Everything stays on your phone.
            </Text>
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View key="name" entering={FadeIn.duration(500)} style={{ flex: 1, paddingHorizontal: 28, paddingTop: insets.top + 90 }}>
          <AnimatedLine text="What should we call you?" align="flex-start" style={{ ...textStyle, fontSize: Math.min(textStyle.fontSize, 38), lineHeight: 44 }} startDelay={250} wordDelay={170} />
          <Animated.Text entering={FadeIn.duration(600).delay(900)} style={{ fontFamily: fonts.inter, fontSize: 14.5, lineHeight: 21, color: c.ink2, marginTop: 12 }}>
            Streaky will greet you by name — and cheer you on when it matters.
          </Animated.Text>

          <Animated.View entering={FadeInDown.duration(600).delay(1100)}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={c.ink3}
              maxLength={20}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              selectionColor={c.ink}
              onSubmitEditing={() => {
                haptic.success();
                onStart(name);
              }}
              style={{
                marginTop: 34,
                paddingVertical: 12,
                borderBottomWidth: 1.5,
                borderBottomColor: name ? c.ink : c.line,
                fontFamily: fonts.geistSemibold,
                fontSize: 30,
                letterSpacing: -0.8,
                color: c.ink,
              }}
            />
            <View style={{ marginTop: 28, gap: 6 }}>
              <GlassButton label={name.trim() ? `Continue, ${name.trim()}` : "Continue"} onPress={() => onStart(name)} height={58} />
              <Press onPress={() => onStart("")} dim={0.5} style={{ alignItems: "center", paddingVertical: 12 }}>
                <Text style={{ fontFamily: fonts.interMedium, fontSize: 14, color: c.ink2 }}>Skip for now</Text>
              </Press>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
}
