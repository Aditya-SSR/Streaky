import "./global.css";
import { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { colorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Celebration } from "@/components/Celebration";
import { HabitSheet, type HabitFormValues } from "@/components/HabitSheet";
import { DetailScreen } from "@/screens/DetailScreen";
import { Home } from "@/screens/Home";
import { Onboarding } from "@/screens/Onboarding";
import { Preloader } from "@/screens/Preloader";
import { Settings } from "@/screens/Settings";
import { UrgeScreen } from "@/screens/UrgeScreen";
import { palettes, useTheme } from "@/lib/theme";
import { type Habit, useStore } from "@/store/useStore";
import { syncWidget } from "@/widget/sync";

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 350 });

type Stage = "preloader" | "onboarding" | "home";

export default function App() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    ...Ionicons.font,
  });
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.onboarded);
  const themePref = useStore((s) => s.theme);
  const habits = useStore((s) => s.habits);
  const finishOnboarding = useStore((s) => s.finishOnboarding);
  const addHabit = useStore((s) => s.addHabit);
  const updateHabit = useStore((s) => s.updateHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const setOngoing = useStore((s) => s.setOngoing);
  const setGoalDays = useStore((s) => s.setGoalDays);

  const [stage, setStage] = useState<Stage>("preloader");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [urgeId, setUrgeId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });

  // follow the system theme unless the user picked one in Settings
  useEffect(() => {
    colorScheme.set(themePref);
  }, [themePref]);

  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // The home-screen widget can check habits in while the app sits in the background:
  // re-read storage whenever the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void useStore.persist.rehydrate();
    });
    return () => sub.remove();
  }, []);

  // …and keep the widget fresh whenever habits change in the app.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => void syncWidget(), 500);
    return () => clearTimeout(t);
  }, [habits, ready]);

  const leavePreloader = useCallback(() => setStage(onboarded ? "home" : "onboarding"), [onboarded]);
  const start = useCallback(
    (name: string) => {
      finishOnboarding(name);
      setStage("home");
    },
    [finishOnboarding],
  );

  const closeSheet = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);
  const urgeHabit = urgeId ? habits.find((h) => h.id === urgeId) : undefined;

  const saveHabit = (v: HabitFormValues) => {
    if (sheet.habit) {
      updateHabit(sheet.habit.id, { title: v.title, description: v.description });
      if (v.goalDays === null) setOngoing(sheet.habit.id);
      else setGoalDays(sheet.habit.id, v.goalDays);
    } else {
      addHabit(v);
    }
    closeSheet();
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Shell dark={stage === "preloader" || !!urgeId}>
          {!ready ? null : stage === "preloader" ? (
            <Preloader ready={ready} onDone={leavePreloader} />
          ) : stage === "onboarding" ? (
            <Onboarding onStart={start} />
          ) : (
            <Animated.View entering={FadeIn.duration(500)} style={styles.root}>
              <Home
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenHabit={setDetailId}
                onUrge={setUrgeId}
                onCreate={() => setSheet({ open: true, habit: null })}
                onEdit={(habit) => setSheet({ open: true, habit })}
                overlayOpen={settingsOpen || !!detailId || !!urgeId || sheet.open}
              />
              {settingsOpen && <Settings onBack={() => setSettingsOpen(false)} />}
              {detailId && (
                <DetailScreen
                  habitId={detailId}
                  onBack={() => setDetailId(null)}
                  onEdit={(id) => setSheet({ open: true, habit: habits.find((h) => h.id === id) ?? null })}
                  onUrge={setUrgeId}
                />
              )}
              <HabitSheet
                visible={sheet.open}
                habit={sheet.habit}
                onClose={closeSheet}
                onSave={saveHabit}
                onDelete={(id) => {
                  deleteHabit(id);
                  setDetailId((cur) => (cur === id ? null : cur));
                  closeSheet();
                }}
              />
              {urgeHabit && <UrgeScreen habit={urgeHabit} onClose={() => setUrgeId(null)} />}
            </Animated.View>
          )}
          <Celebration />
        </Shell>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Paints the themed background and status bar behind everything. */
function Shell({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  const { scheme, c } = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palettes[scheme].canvas).catch(() => {});
  }, [scheme]);
  return (
    <View style={[styles.root, { backgroundColor: "#000" }]}>
      <View style={[styles.root, { backgroundColor: c.canvas }]}>{children}</View>
      <StatusBar style={dark ? "light" : "auto"} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
