import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedLine } from "@/components/AnimatedLine";
import { Flame } from "@/components/Fire";
import { GlassButton } from "@/components/GlassButton";
import { Press } from "@/components/Press";
import { EnergyOrb } from "@/components/ui/organisms/energy-orb";
import { RollingCounter } from "@/components/ui/organisms/rolling-counter";
import { celebrate } from "@/lib/celebrate";
import { toKey } from "@/lib/dates";
import { computeStreak, type Habit } from "@/lib/habits";
import { haptic } from "@/lib/haptics";
import { fonts } from "@/lib/theme";
import { useStore } from "@/store/useStore";

type Step = "hello" | "streak" | "ask" | "think" | "breathe" | "resisted" | "relapse-confirm" | "relapsed";

const INHALE = 4000;
const HOLD = 2000;
const EXHALE = 6000;
const CYCLE = INHALE + HOLD + EXHALE;
const MIN_CYCLES = 2;

// This screen is deliberately pitch black in every theme — a calm, empty room.
const INK = "#FAFAFA";
const MUTED = "#9A9AA1";

const big = { fontFamily: fonts.geistBold, fontSize: 36, lineHeight: 42, letterSpacing: -1.2, color: INK } as const;
const mid = { fontFamily: fonts.geistSemibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8, color: INK } as const;

/** Calm, cool glow — the shader keeps swirling while the whole orb swells and settles with the breath. */
const ORB_COLORS = ["#6E9BFF", "#B08CFF", "#E6F2FF"];
const ORB_SIZE = 320;

/** Reacticx "energy-orb" (Skia shader) as the breathing orb: 4s in, 2s hold, 6s out. */
function BreathOrb({ phase }: { phase: "in" | "hold" | "out" }) {
  const s = useSharedValue(0.55);

  useEffect(() => {
    s.value = withRepeat(
      withSequence(
        withTiming(1, { duration: INHALE, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: HOLD }),
        withTiming(0.55, { duration: EXHALE, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [s]);

  const orb = useAnimatedStyle(() => ({
    opacity: interpolate(s.value, [0.55, 1], [0.7, 1]),
    transform: [{ scale: s.value }],
  }));

  return (
    <View style={{ width: ORB_SIZE, height: ORB_SIZE, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={orb}>
        <EnergyOrb width={ORB_SIZE} height={ORB_SIZE} colors={ORB_COLORS} speed={0.7} intensity={0.65} glowRadius={0.5} />
      </Animated.View>
      <View style={{ position: "absolute" }}>
        <Animated.Text
          key={phase}
          entering={FadeIn.duration(350)}
          exiting={FadeOut.duration(150)}
          style={{ fontFamily: fonts.geistSemibold, fontSize: 21, color: INK, letterSpacing: -0.3, textShadowColor: "rgba(0,0,0,0.55)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } }}
        >
          {phase === "in" ? "Breathe in" : phase === "hold" ? "Hold" : "Breathe out"}
        </Animated.Text>
      </View>
    </View>
  );
}

export function UrgeScreen({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const name = useStore((s) => s.userName);
  const resistUrge = useStore((s) => s.resistUrge);
  const relapse = useStore((s) => s.relapse);

  const [step, setStep] = useState<Step>("hello");
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [cycles, setCycles] = useState(0);
  // Snapshot on open: logging an urge/relapse changes the live habit under us.
  const [streak] = useState(() => computeStreak(habit, new Date()));
  const [urgesBefore] = useState(habit.urgesResisted);
  const counter = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // The scripted opening: hello → streak → "do you want to do it?" → "think" → breathe.
  useEffect(() => {
    later(2600, () => setStep("streak"));
    later(2600 + 4200, () => setStep("ask"));
    later(2600 + 4200 + 3300, () => setStep("think"));
    later(2600 + 4200 + 3300 + 3400, () => setStep("breathe"));
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [later]);

  useEffect(() => {
    if (step === "streak") {
      counter.value = 0;
      counter.value = withDelay(500, withTiming(streak, { duration: 1500, easing: Easing.out(Easing.cubic) }));
      later(600, () => haptic.press());
    }
  }, [step, streak, counter, later]);

  // Breathing clock — drives the label and counts finished cycles.
  useEffect(() => {
    if (step !== "breathe") return;
    let alive = true;
    const run = () => {
      if (!alive) return;
      setPhase("in");
      haptic.tap();
      later(INHALE, () => {
        setPhase("hold");
        haptic.tap();
      });
      later(INHALE + HOLD, () => {
        setPhase("out");
        haptic.tap();
      });
      later(CYCLE, () => {
        setCycles((c) => c + 1);
        run();
      });
    };
    run();
    return () => {
      alive = false;
    };
  }, [step, later]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const finishResisted = () => {
    resistUrge(habit.id);
    haptic.success();
    setStep("resisted");
  };
  const finishRelapse = () => {
    relapse(habit.id, toKey(new Date()));
    haptic.press();
    setStep("relapsed");
  };

  const ready = cycles >= MIN_CYCLES;
  const hello = name ? `Hey ${name}.` : "Hey there.";

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      exiting={FadeOut.duration(400)}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000000" }}
    >
      <View style={{ flex: 1, paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) + 20, paddingHorizontal: 28 }}>
        {/* quiet exit */}
        <View style={{ alignItems: "flex-end", height: 36 }}>
          {step !== "resisted" && step !== "relapsed" && (
            <Press onPress={onClose} dim={0.5} hitSlop={12} accessibilityLabel="Close">
              <Text style={{ fontFamily: fonts.interMedium, fontSize: 14, color: MUTED }}>Close</Text>
            </Press>
          )}
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {step === "hello" && (
            <Animated.View key="hello" exiting={FadeOut.duration(350)} style={{ alignItems: "center" }}>
              <AnimatedLine text={hello} style={{ ...big, fontSize: 44, lineHeight: 50 }} startDelay={350} wordDelay={260} />
            </Animated.View>
          )}

          {step === "streak" && (
            <Animated.View key="streak" entering={FadeIn.duration(300).delay(380)} exiting={FadeOut.duration(350)} style={{ alignItems: "center", gap: 6 }}>
              <AnimatedLine text="You have a streak of" style={mid} startDelay={150} wordDelay={150} />
              <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 6 }}>
                <Flame size={104} popKey={streak} />
                <RollingCounter value={counter} height={110} width={62} fontSize={92} color={INK} digitStyle={{ fontFamily: fonts.geistBold, fontWeight: "400" }} timingConfig={{ duration: 900 }} />
              </View>
              <Animated.Text entering={FadeInDown.duration(500).delay(1200)} style={{ ...mid, color: MUTED }}>
                {streak === 1 ? "day" : "days"}
              </Animated.Text>
            </Animated.View>
          )}

          {step === "ask" && (
            <Animated.View key="ask" exiting={FadeOut.duration(350)} style={{ alignItems: "center" }}>
              <AnimatedLine text="Do you really want to do this?" style={{ ...big, fontSize: 38, lineHeight: 46 }} startDelay={200} wordDelay={190} />
            </Animated.View>
          )}

          {step === "think" && (
            <Animated.View key="think" exiting={FadeOut.duration(350)} style={{ alignItems: "center", gap: 12 }}>
              <AnimatedLine text="Calm down." style={{ ...big, fontSize: 40 }} startDelay={150} wordDelay={220} />
              <AnimatedLine text="Think about it." style={{ ...mid, color: MUTED }} startDelay={1100} wordDelay={200} />
            </Animated.View>
          )}

          {step === "breathe" && (
            <Animated.View key="breathe" entering={FadeIn.duration(700)} style={{ alignItems: "center", gap: 18 }}>
              <BreathOrb phase={phase} />
              <Text style={{ fontFamily: fonts.inter, fontSize: 14.5, lineHeight: 21, color: MUTED, textAlign: "center", maxWidth: 290 }}>
                Urges peak and fade — usually within 10 to 15 minutes. You only have to get through this one.
              </Text>
            </Animated.View>
          )}

          {step === "resisted" && (
            <Animated.View key="resisted" entering={FadeIn.duration(500)} style={{ alignItems: "center", gap: 12 }}>
              <Flame size={110} popKey={streak} />
              <AnimatedLine text="That took strength." style={big} startDelay={200} wordDelay={200} />
              <Animated.Text entering={FadeInDown.duration(500).delay(1200)} style={{ fontFamily: fonts.inter, fontSize: 15, lineHeight: 22, color: MUTED, textAlign: "center", maxWidth: 290 }}>
                {streak} {streak === 1 ? "day" : "days"} protected. Urges beaten so far: {urgesBefore + 1}.
              </Animated.Text>
            </Animated.View>
          )}

          {step === "relapse-confirm" && (
            <Animated.View key="rc" entering={FadeIn.duration(400)} style={{ alignItems: "center", gap: 12 }}>
              <AnimatedLine text="Log a slip?" style={big} startDelay={100} />
              <Text style={{ fontFamily: fonts.inter, fontSize: 15, lineHeight: 22, color: MUTED, textAlign: "center", maxWidth: 300 }}>
                Your {streak}-day streak resets to 0 today. Your best streak and history stay.
              </Text>
            </Animated.View>
          )}

          {step === "relapsed" && (
            <Animated.View key="relapsed" entering={FadeIn.duration(500)} style={{ alignItems: "center", gap: 12 }}>
              <AnimatedLine text="It happens." style={big} startDelay={200} wordDelay={220} />
              <Animated.Text entering={FadeInDown.duration(500).delay(1000)} style={{ fontFamily: fonts.inter, fontSize: 15.5, lineHeight: 23, color: MUTED, textAlign: "center", maxWidth: 300 }}>
                One slip doesn’t erase {streak} days of effort. Tomorrow is day one again — and you already know how.
              </Animated.Text>
            </Animated.View>
          )}
        </View>

        {/* actions */}
        <View style={{ minHeight: 120, justifyContent: "flex-end", gap: 12 }}>
          {step === "breathe" && ready && (
            <Animated.View entering={FadeInDown.duration(500)} style={{ gap: 12 }}>
              <GlassButton label="I’m okay — I resisted" onPress={finishResisted} height={58} />
              <Press onPress={() => setStep("relapse-confirm")} dim={0.5} style={{ alignItems: "center", paddingVertical: 10 }}>
                <Text style={{ fontFamily: fonts.interMedium, fontSize: 14.5, color: MUTED }}>I relapsed</Text>
              </Press>
            </Animated.View>
          )}
          {step === "breathe" && !ready && (
            <Animated.Text entering={FadeIn.duration(600)} style={{ textAlign: "center", fontFamily: fonts.inter, fontSize: 13, color: "#5E5E66" }}>
              Stay with the breath for a few rounds…
            </Animated.Text>
          )}
          {step === "relapse-confirm" && (
            <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 12 }}>
              <GlassButton label="Yes, log it and start again" onPress={finishRelapse} height={58} />
              <Press onPress={() => setStep("breathe")} dim={0.5} style={{ alignItems: "center", paddingVertical: 10 }}>
                <Text style={{ fontFamily: fonts.interMedium, fontSize: 14.5, color: MUTED }}>Go back — I can hold on</Text>
              </Press>
            </Animated.View>
          )}
          {(step === "resisted" || step === "relapsed") && (
            <Animated.View entering={FadeInDown.duration(500).delay(1600)}>
              <GlassButton
                label={step === "resisted" ? "Back to Streaky" : "Start again"}
                onPress={() => {
                  if (step === "resisted") celebrate({ title: "Urge beaten", subtitle: `${habit.title} — streak safe`, confetti: true });
                  onClose();
                }}
                height={58}
              />
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
