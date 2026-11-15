import React from "react";
import { Platform } from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { StreakWidget } from "./StreakWidget";
import { loadHabits } from "./data";
import { WIDGET_NAME } from "./widget-task-handler";

/** Ask Android to redraw the home-screen widget with the latest habits. Safe to call often. */
export async function syncWidget(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: async (info) => {
        const habits = await loadHabits();
        return <StreakWidget habits={habits} width={info.width} height={info.height} />;
      },
      widgetNotFound: () => {},
    });
  } catch {
    // widget not installed / not on Android — nothing to do
  }
}
