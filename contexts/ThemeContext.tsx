import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { supabase } from '@/lib/supabase';
import createContextHook from '@nkzw/create-context-hook';

export type ThemeMode = 'light' | 'dark' | 'system';

const lightColors = {
  primary: '#1A73E8',
  primaryDark: '#1557B0',
  secondary: '#34A853',
  accent: '#FBBC04',
  danger: '#EA4335',
  
  text: {
    primary: '#1F1F1F',
    secondary: '#5F6368',
    tertiary: '#9AA0A6',
    white: '#FFFFFF',
  },
  
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#E8EAED',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  border: {
    light: '#E8EAED',
    medium: '#DADCE0',
    dark: '#5F6368',
  },
  
  status: {
    verified: '#34A853',
    pending: '#FBBC04',
    ended: '#5F6368',
  },
  
  badge: {
    verified: '#E6F4EA',
    verifiedText: '#137333',
    pending: '#FEF7E0',
    pendingText: '#B06000',
  },
};

const darkColors = {
  primary: '#4285F4',
  primaryDark: '#1A73E8',
  secondary: '#34A853',
  accent: '#FBBC04',
  danger: '#EA4335',
  
  text: {
    primary: '#E8EAED',
    secondary: '#9AA0A6',
    tertiary: '#5F6368',
    white: '#FFFFFF',
  },
  
  background: {
    primary: '#1F1F1F',
    secondary: '#121212',
    tertiary: '#2D2D2D',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  border: {
    light: '#3C4043',
    medium: '#5F6368',
    dark: '#9AA0A6',
  },
  
  status: {
    verified: '#34A853',
    pending: '#FBBC04',
    ended: '#9AA0A6',
  },
  
  badge: {
    verified: '#1E3A2E',
    verifiedText: '#81C995',
    pending: '#3E2E1E',
    pendingText: '#FDD663',
  },
};

export const [ThemeContext, useTheme] = createContextHook(() => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [isDark, setIsDark] = useState(false);

  // Determine if dark mode should be active
  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemColorScheme]);

  // Load theme preference from database
  const loadThemePreference = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('theme_preference')
        .eq('user_id', userId)
        .single();

      if (!error && data?.theme_preference) {
        setThemeMode(data.theme_preference as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  }, []);

  // Save theme preference to database
  const saveThemePreference = useCallback(async (userId: string, mode: ThemeMode) => {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          theme_preference: mode,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      setThemeMode(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);

  const colors = isDark ? darkColors : lightColors;

  return {
    colors,
    isDark,
    themeMode,
    setThemeMode,
    loadThemePreference,
    saveThemePreference,
  };
});

