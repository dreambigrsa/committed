import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppContext, useApp } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[userId]" options={{ headerShown: true, title: "Profile" }} />
      <Stack.Screen name="relationship/register" options={{ presentation: "modal", title: "Register Relationship" }} />
      <Stack.Screen name="messages/[conversationId]" options={{ headerShown: true, title: "Chat" }} />
      <Stack.Screen name="admin/advertisements" options={{ headerShown: true, title: "Advertisements" }} />
      <Stack.Screen name="settings/sessions" options={{ headerShown: true, title: "Active Sessions" }} />
      <Stack.Screen name="settings/blocked-users" options={{ headerShown: true, title: "Blocked Users" }} />
      <Stack.Screen name="settings/2fa" options={{ headerShown: true, title: "Two-Factor Authentication" }} />
      <Stack.Screen name="settings/change-password" options={{ headerShown: true, title: "Change Password" }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function AppWithTheme() {
  const { currentUser } = useApp();
  
  return (
    <ThemeProvider userId={currentUser?.id}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppContext>
          <AppWithTheme />
        </AppContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
