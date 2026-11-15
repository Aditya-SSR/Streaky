import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { StreakWidget } from "./StreakWidget";
import { loadHabits, toggleToday } from "./data";

export const WIDGET_NAME = "StreakyStreaks";

/** Runs headless whenever Android adds/updates/resizes the widget or the user taps it. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, clickAction, clickActionData, renderWidget } = props;

  if (widgetAction === "WIDGET_DELETED") return;

  if (widgetAction === "WIDGET_CLICK" && clickAction === "TOGGLE" && typeof clickActionData?.id === "string") {
    await toggleToday(clickActionData.id);
  }

  const habits = await loadHabits();
  renderWidget(<StreakWidget habits={habits} width={widgetInfo.width} height={widgetInfo.height} />);
}
