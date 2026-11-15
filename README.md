# Streaky

**Start small. Stay consistent.** A minimal, pitch-black habit and streak tracker for Android, built with React Native and Expo.

## Features

- **Build or quit** — track a daily habit, or quit something and count clean days.
- **Goals** — pick Ongoing, 7 / 21 / 30 / 66 / 90 days or a custom length. When a goal ends, choose to keep going, extend, or finish.
- **Calendar** — a month view per habit with stats and success rate.
- **Urge SOS** — for quit habits: a calm full-screen flow with animated text and a guided breathing orb, then log whether you resisted or relapsed.
- **Micro-interactions** — an animated flame, rolling streak numbers, haptics, and milestone confetti.
- **Card layouts** — 3D drum (default), circular, stack or cinematic, plus system / light / dark themes.
- **Widget** — an Android home-screen widget; tap a circle to check in.
- **Private** — everything is stored on the device.

## Stack

Expo SDK 58 · React Native 0.88 · NativeWind v4 · Reanimated · Skia · Lottie · Zustand · [react-native-android-widget](https://github.com/sAleksovski/react-native-android-widget) · [Reacticx](https://www.reacticx.com) components (in `src/components/ui`) · Geist and Inter fonts.

## Run it

It uses native modules, so Expo Go won't work — use a development build.

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

Release APK:

```bash
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

> On Windows, build from a short path (e.g. `C:\s`) and use CMake 3.31+ from the SDK Manager. The default ninja 1.10 can't handle the long native build paths.

## Credits

Animated fire emoji © Google, [Noto Emoji](https://github.com/googlefonts/noto-emoji) (CC BY 4.0).
