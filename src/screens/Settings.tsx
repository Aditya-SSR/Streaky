import { useEffect, useState, type ReactNode } from "react";
import { Alert, BackHandler, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { requestPinWidget } from "react-native-android-widget";
import Animated, { SlideInRight, SlideOutRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IOSSwitch, Segmented } from "@/components/controls";
import { Press } from "@/components/Press";
import { haptic } from "@/lib/haptics";
import { fonts, useTheme } from "@/lib/theme";
import { useStore, type CardStyle, type ThemePref } from "@/store/useStore";

function Section({ title, children, footer }: { title: string; children: ReactNode; footer?: string }) {
  const { c, isDark } = useTheme();
  return (
    <View style={{ marginTop: 28 }}>
      <Text
        style={{
          fontFamily: fonts.interSemibold,
          fontSize: 12,
          letterSpacing: 1,
          color: c.ink2,
          textTransform: "uppercase",
          marginLeft: 20,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? "#2A2A2D" : "#ECECF0",
          overflow: "hidden",
        }}
      >
        {children}
      </View>
      {footer ? (
        <Text style={{ fontFamily: fonts.inter, fontSize: 12.5, lineHeight: 18, color: c.ink3, marginTop: 8, marginHorizontal: 20 }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/** Tiny wireframes that hint at how each card layout behaves. */
function StylePreview({ kind, active }: { kind: CardStyle; active: boolean }) {
  const { c } = useTheme();
  const fill = active ? c.ink : c.ink3;
  const card = (extra: object) => ({
    position: "absolute" as const,
    width: 34,
    height: 24,
    borderRadius: 7,
    backgroundColor: fill,
    ...extra,
  });
  return (
    <View style={{ width: 72, height: 54, alignItems: "center", justifyContent: "center" }}>
      {kind === "cylinder" && (
        <>
          <View style={card({ opacity: 0.3, left: 8, top: 14, width: 10, height: 26 })} />
          <View style={card({ opacity: 0.3, right: 8, top: 14, width: 10, height: 26 })} />
          <View style={card({ opacity: 0.55, left: 14, top: 11, width: 16, height: 32 })} />
          <View style={card({ opacity: 0.55, right: 14, top: 11, width: 16, height: 32 })} />
          <View style={card({ top: 8, width: 30, height: 38 })} />
        </>
      )}
      {kind === "carousel" && (
        <>
          <View style={card({ opacity: 0.35, left: 0, top: 18, transform: [{ rotate: "-16deg" }] })} />
          <View style={card({ opacity: 0.35, right: 0, top: 18, transform: [{ rotate: "16deg" }] })} />
          <View style={card({ top: 12, width: 38, height: 28 })} />
        </>
      )}
      {kind === "stack" && (
        <>
          <View style={card({ opacity: 0.25, top: 2, width: 26, transform: [{ scale: 0.9 }] })} />
          <View style={card({ opacity: 0.5, top: 10, width: 32 })} />
          <View style={card({ top: 20, width: 40, height: 28 })} />
        </>
      )}
      {kind === "cinematic" && (
        <>
          <View style={card({ opacity: 0.35, left: 2, top: 12, width: 20, height: 28, transform: [{ skewY: "8deg" }] })} />
          <View style={card({ opacity: 0.35, right: 2, top: 12, width: 20, height: 28, transform: [{ skewY: "-8deg" }] })} />
          <View style={card({ top: 10, width: 34, height: 32 })} />
        </>
      )}
    </View>
  );
}

const STYLES: { value: CardStyle; label: string; hint: string }[] = [
  { value: "cylinder", label: "3D drum", hint: "Cards spin around a cylinder" },
  { value: "carousel", label: "Circular", hint: "Cards fan along an arc" },
  { value: "stack", label: "Stack", hint: "Flick cards off a pile" },
  { value: "cinematic", label: "Cinematic", hint: "Tilted, depth-of-field" },
];

export function Settings({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const cardStyle = useStore((s) => s.cardStyle);
  const theme = useStore((s) => s.theme);
  const haptics = useStore((s) => s.haptics);
  const setCardStyle = useStore((s) => s.setCardStyle);
  const setTheme = useStore((s) => s.setTheme);
  const setHaptics = useStore((s) => s.setHaptics);
  const eraseAll = useStore((s) => s.eraseAll);
  const habitCount = useStore((s) => s.habits.length);
  const userName = useStore((s) => s.userName);
  const setUserName = useStore((s) => s.setUserName);
  const [nameDraft, setNameDraft] = useState(userName);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const confirmErase = () =>
    Alert.alert("Erase all habits?", "This removes every habit and its history from this phone. It can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Erase",
        style: "destructive",
        onPress: () => {
          haptic.success();
          eraseAll();
        },
      },
    ]);

  return (
    <Animated.View
      entering={SlideInRight.duration(340)}
      exiting={SlideOutRight.duration(280)}
      style={{ ...absoluteFill, backgroundColor: c.canvas }}
    >
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", height: insets.top + 60 }}>
        <Press
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            haptic.tap();
            onBack();
          }}
          hitSlop={10}
          scale={0.92}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: isDark ? "#2A2A2D" : "#ECECF0",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={22} color={c.ink} />
        </Press>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
      >
        <Text style={{ fontFamily: fonts.geistBold, fontSize: 38, letterSpacing: -1.6, color: c.ink, marginLeft: 4 }}>
          Settings
        </Text>

        <Section title="Profile" footer="Used for greetings and the Urge SOS screen. Stays on this phone.">
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 56 }}>
            <Text style={{ fontFamily: fonts.geistMedium, fontSize: 16, color: c.ink, width: 80 }}>Name</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              onEndEditing={() => setUserName(nameDraft)}
              placeholder="Your name"
              placeholderTextColor={c.ink3}
              maxLength={20}
              autoCapitalize="words"
              selectionColor={c.ink}
              style={{ flex: 1, textAlign: "right", fontFamily: fonts.geist, fontSize: 16, color: c.ink2 }}
            />
          </View>
        </Section>

        <Section title="Appearance" footer="Cards adapt to your phone's light or dark mode unless you choose otherwise.">
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ fontFamily: fonts.geistMedium, fontSize: 16, color: c.ink }}>Theme</Text>
            <Segmented<ThemePref>
              value={theme}
              onChange={setTheme}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </View>
        </Section>

        <Section title="Card style" footer="Choose how your habit cards are laid out on the home screen.">
          {STYLES.map((s, i) => {
            const active = cardStyle === s.value;
            return (
              <Press
                key={s.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (!active) haptic.select();
                  setCardStyle(s.value);
                }}
                dim={0.6}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  gap: 14,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: c.line,
                }}
              >
                <View
                  style={{
                    borderRadius: 14,
                    backgroundColor: c.surface2,
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? c.ink : c.line,
                  }}
                >
                  <StylePreview kind={s.value} active={active} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: active ? fonts.geistSemibold : fonts.geistMedium, fontSize: 16, color: c.ink }}>
                    {s.label}
                  </Text>
                  <Text style={{ fontFamily: fonts.inter, fontSize: 12.5, color: c.ink2, marginTop: 2 }}>{s.hint}</Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: active ? 0 : 1.5,
                    borderColor: c.ink3,
                    backgroundColor: active ? c.ink : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active && <Ionicons name="checkmark" size={14} color={c.canvas} />}
                </View>
              </Press>
            );
          })}
        </Section>

        <Section title="Feedback">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: fonts.geistMedium, fontSize: 16, color: c.ink }}>Haptics</Text>
              <Text style={{ fontFamily: fonts.inter, fontSize: 12.5, color: c.ink2, marginTop: 2 }}>
                A small tap when you complete a day
              </Text>
            </View>
            <IOSSwitch value={haptics} onChange={setHaptics} />
          </View>
        </Section>

        <Section title="Widget" footer="Tap a circle on the widget to check in without opening the app.">
          <Press
            onPress={async () => {
              haptic.select();
              const ok = Platform.OS === "android" ? await requestPinWidget({ widgetName: "StreakyStreaks" }).catch(() => false) : false;
              if (!ok) Alert.alert("Add it manually", "Your launcher can't add widgets from here. Long-press the home screen, tap Widgets, and pick Streaky.");
            }}
            style={{ padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: fonts.geistMedium, fontSize: 16, color: c.ink }}>Add to home screen</Text>
              <Text style={{ fontFamily: fonts.inter, fontSize: 12.5, color: c.ink2, marginTop: 2 }}>Your streaks at a glance</Text>
            </View>
            <Ionicons name="add-circle-outline" size={24} color={c.ink} />
          </Press>
        </Section>

        <Section title="Data">
          <Press
            disabled={habitCount === 0}
            onPress={confirmErase}
            restOpacity={habitCount === 0 ? 0.4 : 1}
            style={{ padding: 16 }}
          >
            <Text style={{ fontFamily: fonts.geistMedium, fontSize: 16, color: "#FF453A" }}>Erase all habits</Text>
          </Press>
        </Section>

        <View style={{ alignItems: "center", marginTop: 36, gap: 4 }}>
          <Text style={{ fontFamily: fonts.geistMedium, fontSize: 14, color: c.ink2 }}>Streaky 2.0</Text>
          <Text style={{ fontFamily: fonts.inter, fontSize: 12, color: c.ink3 }}>Start small. Stay consistent.</Text>
          <Text style={{ fontFamily: fonts.inter, fontSize: 11, color: c.ink3, marginTop: 10, textAlign: "center", paddingHorizontal: 20 }}>
            Animated fire emoji © Google, Noto Emoji — CC BY 4.0
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const absoluteFill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
