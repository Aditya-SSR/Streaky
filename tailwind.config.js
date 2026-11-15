/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Monochrome, iOS-inspired palette. `-dark` variants are used with `dark:`
        canvas: { DEFAULT: "#F2F2F7", dark: "#000000" },
        surface: { DEFAULT: "#FFFFFF", dark: "#0E0E10" },
        surface2: { DEFAULT: "#F2F2F7", dark: "#18181B" },
        ink: { DEFAULT: "#0A0A0A", dark: "#FAFAFA" },
        ink2: { DEFAULT: "#6C6C70", dark: "#9A9AA1" },
        ink3: { DEFAULT: "#AEAEB2", dark: "#5E5E66" },
        line: { DEFAULT: "#E5E5EA", dark: "#232327" },
      },
      fontFamily: {
        geist: ["Geist_400Regular"],
        "geist-medium": ["Geist_500Medium"],
        "geist-semibold": ["Geist_600SemiBold"],
        "geist-bold": ["Geist_700Bold"],
        inter: ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
      },
    },
  },
  plugins: [],
};
