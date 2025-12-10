import React, { useEffect } from 'react';
import { ThemeContext, useTheme } from '@/contexts/ThemeContext';
import { useApp } from '@/contexts/AppContext';

// Wrapper component that connects ThemeContext with AppContext
function ThemeProviderInner({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();
  const { loadThemePreference } = useTheme();

  useEffect(() => {
    if (currentUser) {
      loadThemePreference(currentUser.id);
    }
  }, [currentUser, loadThemePreference]);

  return <>{children}</>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext>
      <ThemeProviderInner>{children}</ThemeProviderInner>
    </ThemeContext>
  );
}

