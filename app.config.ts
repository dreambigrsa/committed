// Expo dynamic config so we can safely read environment variables at build time.
// This avoids relying on runtime `process.env` in React Native.
//
// Usage (Windows PowerShell):
//   $env:EXPO_PUBLIC_OPENAI_API_KEY="sk-..."; npm start
//
// The app reads this via `Constants.expoConfig.extra.openaiApiKey`.
import type { ExpoConfig, ConfigContext } from 'expo/config';

import appJson from './app.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Prefer config from app.json, but allow Expo to pass an existing config too.
  const base = (appJson as any).expo ?? config;

  return {
    ...base,
    extra: {
      ...(base.extra ?? {}),
      // Inject the key at build time (never hardcode keys in repo).
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? null,
    },
  };
};


