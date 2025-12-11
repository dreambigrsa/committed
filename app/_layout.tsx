import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppContext } from "@/contexts/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { trpc, trpcClient } from "@/lib/trpc";
import NotificationToast from "@/components/NotificationToast";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ headerShown: true, title: 'Verify Email' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[userId]" options={{ headerShown: true, title: "Profile" }} />
        <Stack.Screen name="relationship/register" options={{ presentation: "modal", title: "Register Relationship" }} />
        <Stack.Screen name="messages/[conversationId]" options={{ headerShown: true, title: "Chat" }} />
        <Stack.Screen name="admin/advertisements" options={{ headerShown: true, title: "Advertisements" }} />
        <Stack.Screen name="settings/2fa" options={{ headerShown: true, title: "Two-Factor Authentication" }} />
        <Stack.Screen name="settings/sessions" options={{ headerShown: true, title: "Active Sessions" }} />
        <Stack.Screen name="settings/blocked-users" options={{ headerShown: true, title: "Blocked Users" }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <NotificationToast />
    </>
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
          <ThemeProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </ThemeProvider>
        </AppContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
