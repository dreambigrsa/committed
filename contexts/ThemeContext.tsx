import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  userId?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, userId }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, [userId]);

  // Update theme when mode or system preference changes
  useEffect(() => {
    if (themeMode === 'auto') {
      setTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    } else {
      setTheme(themeMode);
    }
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      // Try to load from AsyncStorage first (for quick access)
      const stored = await AsyncStorage.getItem('themeMode');
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
        setThemeModeState(stored as ThemeMode);
      }

      // Then load from database if user is logged in
      if (userId) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('theme_preference')
          .eq('user_id', userId)
          .single();

        if (!error && data?.theme_preference) {
          const dbTheme = data.theme_preference === 'dark' ? 'dark' : 'light';
          setThemeModeState(dbTheme);
          await AsyncStorage.setItem('themeMode', dbTheme);
        }
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('themeMode', mode);

      // Save to database if user is logged in
      if (userId) {
        const themePreference = mode === 'auto' 
          ? (systemColorScheme === 'dark' ? 'dark' : 'light')
          : mode;

        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            theme_preference: themePreference,
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Failed to save theme preference:', error);
        }
      }
    } catch (error) {
      console.error('Failed to set theme mode:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        isDark: theme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

