// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // This rule targets the React Compiler (not enabled in this app) and flags
      // Reanimated's core API — `sharedValue.value = …` — as a mutation. False positive.
      "react-hooks/immutability": "off",
    },
  },
  {
    // Third-party component source copied in by the Reacticx CLI: keep it close to
    // upstream rather than rewriting it to satisfy rules it wasn't written against.
    files: ["src/components/ui/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/display-name": "off",
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  { ignores: ["dist/*", "android/*", ".expo/*"] },
]);
