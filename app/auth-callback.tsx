import { useEffect } from "react";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(url);
      
      if (error) {
        console.log("Error exchanging code:", error);
        // Redirect to auth screen on error
        router.replace("/auth");
        return;
      }
      
      // Success - redirect to home
      router.replace("/(tabs)/home");
    };

    // Listens when app is already open
    const sub = Linking.addEventListener("url", handleDeepLink);
    
    // Handles the link when app is opened from CLOSED state
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, [router]);

  return null;
}

