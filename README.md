# Babu Mesthri

A premium, privacy-first, offline AI assistant built with React Native and Expo. The application features a custom, monolithic dark aesthetic ("Babu Mesthri") designed to execute neural engine inference entirely inside your mobile device.

## Features

- **Monolithic Dark Theme**: A sleek, premium dark-mode interface built natively with React Native `StyleSheet`, independent of external layout libraries.
- **Strict Offline Mode**: A maximum security protocol toggle in the Vault that forces strictly local processing and blocks all external API telemetry.
- **Model Hub**: Download, manage, and activate local models (e.g., Babu Mesthri-7B, Qwen2.5) while monitoring real-time system RAM availability.
- **Hardware Authentication**: A specialized onboarding sequence that assesses your device's neural engine capacity.
- **Encrypted Conversational Canvas**: A beautiful native chat interface, featuring custom assistant bubbles, a floating input terminal, and multi-session persistence.

## Tech Stack

- **Framework**: [Expo](https://expo.dev) & React Native
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Typography**: `@expo-google-fonts` (`Inter`, `Manrope`, `Space Grotesk`)
- **Icons**: `@expo/vector-icons`
- **Navigation**: Expo Router (File-based Routing)
- **Routing & Interactivity**: `react-native-reanimated`

## Getting Started

1. **Install Dependencies**

   We recommend using `bun` for optimal performance.
   ```bash
   bun install
   ```

2. **Start the Application**

   Run the application directly on the iOS Simulator:
   ```bash
   bunx expo run:ios
   ```

   To clear the Metro cache if experiencing font or module resolution issues:
   ```bash
   bunx expo start -c
   ```

## Project Structure

- `/app` - File-based layouts and tabs including the main Chat (`index.tsx`), Model Hub (`models.tsx`), and settings (`vault.tsx`).
- `/components` - Reusable interface items like the navigation sidebar.
- `/constants` - Contains the `theme.ts` exporting our custom dark color palette.
- `/services` - Standalone services managing mock permissions and the Inference/Model downloads.
- `/store` - Global state architecture implemented with Zustand.
