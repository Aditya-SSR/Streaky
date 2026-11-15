import { StyleSheet, View } from "react-native";
import { useTheme } from "@/lib/theme";

/** Flat screen background — pitch black in dark mode, no ambient glow. */
export function Backdrop() {
  const { c } = useTheme();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.canvas }]} />;
}
