import * as Haptics from "expo-haptics";
import { useStore } from "@/store/useStore";

const enabled = () => useStore.getState().haptics;

export const haptic = {
  tap: () => enabled() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  press: () => enabled() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  select: () => enabled() && Haptics.selectionAsync().catch(() => {}),
  success: () =>
    enabled() &&
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};
