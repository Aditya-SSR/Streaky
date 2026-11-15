import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  BackHandler,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip, Segmented, Stepper } from "./controls";
import { Press } from "./Press";
import { addDaysKey, formatKey, toKey } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { diffDays, type HabitType } from "@/lib/habits";
import { fonts, useTheme } from "@/lib/theme";
import type { Habit } from "@/store/useStore";

export type HabitFormValues = { title: string; description: string; type: HabitType; goalDays: number | null };

type Props = {
  visible: boolean;
  habit: Habit | null; // null → create
  onClose: () => void;
  onSave: (values: HabitFormValues) => void;
  onDelete: (id: string) => void;
};

const TITLE_MAX = 32;
const DESC_MAX = 56;
const PRESETS = [7, 21, 30, 66, 90] as const;

/** Duration implied by an existing habit (so editing opens on the right chip). */
function goalOf(h: Habit | null): number | null {
  if (!h || !h.endKey) return null;
  return diffDays(h.startKey, h.endKey) + 1;
}

/** iOS-style bottom sheet: dims the page, springs up, drags down to dismiss. */
export function HabitSheet({ visible, habit, onClose, onSave, onDelete }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [title, setTitle] = useState(habit?.title ?? "");
  const [desc, setDesc] = useState(habit?.description ?? "");
  const [type, setType] = useState<HabitType>(habit?.type ?? "build");
  const [goal, setGoal] = useState<number | null>(goalOf(habit));
  const [custom, setCustom] = useState(false);
  const [kbH, setKbH] = useState(0);
  const descRef = useRef<ComponentRef<typeof TextInput>>(null);

  const open = useSharedValue(0);
  const drag = useSharedValue(0);
  const kb = useSharedValue(0);

  // Opening: mount and reset the form (adjusting state while rendering avoids a flash of
  // the previous habit's values).
  if (visible && !mounted) {
    setMounted(true);
    setTitle(habit?.title ?? "");
    setDesc(habit?.description ?? "");
    setType(habit?.type ?? "build");
    const g = goalOf(habit);
    setGoal(g);
    setCustom(g !== null && !(PRESETS as readonly number[]).includes(g));
  }

  useEffect(() => {
    if (visible) {
      drag.value = 0;
      open.value = withSpring(1, { damping: 22, stiffness: 240, mass: 0.9 });
    } else {
      open.value = withTiming(0, { duration: 240 }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, open, drag]);

  // Android 15+ draws edge-to-edge and ignores `adjustResize`, so the keyboard would cover
  // the sheet. Follow the keyboard-height events and lift the sheet by hand.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      kb.value = withTiming(e.endCoordinates.height, { duration: 220 });
      setKbH(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      kb.value = withTiming(0, { duration: 180 });
      setKbH(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [kb]);

  useEffect(() => {
    if (!visible) Keyboard.dismiss();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) scheduleOnRN(onClose);
      else drag.value = withSpring(0, { damping: 20, stiffness: 260 });
    });

  const scrim = useAnimatedStyle(() => ({ opacity: interpolate(open.value, [0, 1], [0, 1]) }));
  const bottomPad = Math.max(insets.bottom, 12) + 14;
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(open.value, [0, 1], [H * 0.6, 0]) + drag.value }],
    opacity: interpolate(open.value, [0, 0.25, 1], [0, 1, 1]),
    // RN reports the keyboard height without the nav-bar inset on edge-to-edge Android
    marginBottom: kb.value + interpolate(kb.value, [0, 60], [0, insets.bottom], Extrapolation.CLAMP),
    paddingBottom: interpolate(kb.value, [0, 120], [bottomPad, 14], Extrapolation.CLAMP),
  }));

  if (!mounted) return null;

  const valid = title.trim().length > 0;
  const isEdit = !!habit;
  const field = { backgroundColor: c.surface2, borderRadius: 16, paddingHorizontal: 16, height: 52, color: c.ink } as const;
  const label = { fontFamily: fonts.interSemibold, fontSize: 11, letterSpacing: 1, color: c.ink3, marginBottom: 10, marginTop: 20 } as const;
  const maxBody = H - insets.top - kbH - 190;
  const startKey = isEdit ? habit!.startKey : toKey(new Date());
  const endText = goal
    ? `Ends ${formatKey(addDaysKey(startKey, goal - 1), true)}`
    : "No end date — keep it going as long as you like";

  const pick = (g: number | null) => {
    setCustom(false);
    setGoal(g);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }, scrim]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>

      <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
        <Animated.View
          style={[
            {
              backgroundColor: c.surface,
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
              paddingHorizontal: 22,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: c.border,
            },
            sheet,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: c.ink3, opacity: 0.5 }} />
              <View style={{ alignSelf: "stretch", marginTop: 16, marginBottom: 6 }}>
                <Text style={{ fontFamily: fonts.geistBold, fontSize: 26, letterSpacing: -0.8, color: c.ink }}>
                  {isEdit ? "Edit habit" : "New habit"}
                </Text>
                <Text style={{ fontFamily: fonts.inter, fontSize: 13.5, color: c.ink2, marginTop: 4 }}>
                  {isEdit ? "Rename it, change the goal, or let it go." : "One small thing, every day."}
                </Text>
              </View>
            </View>
          </GestureDetector>

          <ScrollView style={{ maxHeight: maxBody }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ gap: 10, marginTop: 10 }}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={type === "quit" ? "What are you quitting?" : "Habit name"}
                placeholderTextColor={c.ink3}
                maxLength={TITLE_MAX}
                autoFocus={!isEdit}
                returnKeyType="next"
                onSubmitEditing={() => descRef.current?.focus()}
                selectionColor={c.ink}
                style={[field, { fontFamily: fonts.geistMedium, fontSize: 17 }]}
              />
              <TextInput
                ref={descRef}
                value={desc}
                onChangeText={setDesc}
                placeholder="Description (optional)"
                placeholderTextColor={c.ink3}
                maxLength={DESC_MAX}
                returnKeyType="done"
                selectionColor={c.ink}
                style={[field, { fontFamily: fonts.geist, fontSize: 16 }]}
              />
            </View>

            {!isEdit && (
              <>
                <Text style={label}>TYPE</Text>
                <Segmented<HabitType>
                  value={type}
                  onChange={(t) => {
                    setType(t);
                    Keyboard.dismiss();
                  }}
                  options={[
                    { value: "build", label: "Build a habit" },
                    { value: "quit", label: "Quit a habit" },
                  ]}
                />
                <Animated.Text
                  key={type}
                  entering={FadeIn.duration(220)}
                  exiting={FadeOut.duration(120)}
                  style={{ fontFamily: fonts.inter, fontSize: 12.5, lineHeight: 18, color: c.ink2, marginTop: 10 }}
                >
                  {type === "build"
                    ? "Check in once a day to grow your streak."
                    : "Every day counts as clean automatically. If you slip, log it and start again — and tap “Feeling an urge?” whenever you need help."}
                </Animated.Text>
              </>
            )}

            <Text style={label}>HOW LONG?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip label="Ongoing" active={goal === null && !custom} onPress={() => pick(null)} />
              {PRESETS.map((d) => (
                <Chip key={d} label={`${d} days`} active={goal === d && !custom} onPress={() => pick(d)} />
              ))}
              <Chip
                label="Custom"
                active={custom}
                onPress={() => {
                  setCustom(true);
                  setGoal((g) => g ?? 45);
                  Keyboard.dismiss();
                }}
              />
            </View>
            {custom && goal !== null && (
              <Animated.View entering={FadeIn.duration(200)} layout={LinearTransition} style={{ alignItems: "center", marginTop: 16 }}>
                <Stepper value={goal} onChange={setGoal} />
              </Animated.View>
            )}
            <Text style={{ fontFamily: fonts.inter, fontSize: 12.5, color: c.ink2, marginTop: 12 }}>{endText}</Text>
            <View style={{ height: 6 }} />
          </ScrollView>

          <Press
            disabled={!valid}
            onPress={() => {
              haptic.success();
              onSave({ title, description: desc, type, goalDays: goal });
            }}
            dim={0.85}
            scale={0.985}
            restOpacity={valid ? 1 : 0.28}
            style={{ marginTop: 14, height: 56, borderRadius: 28, backgroundColor: c.ink, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontFamily: fonts.geistSemibold, fontSize: 17, color: c.canvas }}>
              {isEdit ? "Save changes" : type === "quit" ? "Start quitting" : "Create habit"}
            </Text>
          </Press>

          {isEdit && (
            <Press
              onPress={() => {
                haptic.press();
                onDelete(habit!.id);
              }}
              dim={0.5}
              style={{ alignItems: "center", paddingVertical: 14 }}
            >
              <Text style={{ fontFamily: fonts.geistMedium, fontSize: 15.5, color: "#FF453A" }}>Delete habit</Text>
            </Press>
          )}
        </Animated.View>
      </View>
    </View>
  );
}
