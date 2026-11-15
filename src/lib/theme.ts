import { useColorScheme } from "nativewind";

export const palettes = {
  light: {
    canvas: "#F2F2F7",
    surface: "#FFFFFF",
    surface2: "#F2F2F7",
    ink: "#0A0A0A",
    ink2: "#6C6C70",
    ink3: "#AEAEB2",
    line: "#E5E5EA",
    track: "#E9E9EE",
    border: "#E7E7EC",
    accent: "#FF6A00",
  },
  dark: {
    // Pitch black canvas — surfaces are near-black so cards read by edge, not by glow.
    canvas: "#000000",
    surface: "#0E0E10",
    surface2: "#18181B",
    ink: "#FAFAFA",
    ink2: "#9A9AA1",
    ink3: "#5E5E66",
    line: "#232327",
    track: "#1E1E22",
    border: "#26262B",
    accent: "#FF8A3D",
  },
} as const;

export type Palette = (typeof palettes)["light"] | (typeof palettes)["dark"];

/** Resolved colour scheme + palette for places className can't reach (Skia, gradients…). */
export function useTheme() {
  const { colorScheme } = useColorScheme();
  const scheme: "light" | "dark" = colorScheme === "dark" ? "dark" : "light";
  return { scheme, isDark: scheme === "dark", c: palettes[scheme] as Palette };
}

export const fonts = {
  geist: "Geist_400Regular",
  geistMedium: "Geist_500Medium",
  geistSemibold: "Geist_600SemiBold",
  geistBold: "Geist_700Bold",
  inter: "Inter_400Regular",
  interMedium: "Inter_500Medium",
  interSemibold: "Inter_600SemiBold",
} as const;
