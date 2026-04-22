/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

const themeColors = {
  background: '#131313',
  onBackground: '#e5e2e1',
  primary: '#4edea3',
  primaryFixed: '#6ffbbe',
  primaryContainer: '#10b981',
  onPrimary: '#003824',
  surface: '#131313',
  onSurface: '#e5e2e1',
  surfaceContainerLowest: '#0e0e0e',
  surfaceContainerLow: '#1c1b1b',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerHighest: '#353534',
  surfaceVariant: '#353534',
  onSurfaceVariant: '#bbcabf',
  outline: '#86948a',
  outlineVariant: '#3c4a42',
  secondary: '#b7c8e1',
  secondaryContainer: '#374b5f',
  onSecondaryContainer: '#d3e4f9',
  onSecondary: '#213145',
  tertiaryContainer: '#4a4458',
  error: '#ffb4ab',
  onError: '#690005',
  surfaceContainerActive: 'rgba(78, 222, 163, 0.15)',
};

export const Colors = {
  light: {
    ...themeColors,
    tint: themeColors.primary,
    icon: themeColors.outline,
    tabIconDefault: '#687076',
    tabIconSelected: themeColors.primary,
  },
  dark: {
    ...themeColors,
    tint: themeColors.primary,
    icon: themeColors.outline,
    tabIconDefault: '#687076',
    tabIconSelected: themeColors.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
