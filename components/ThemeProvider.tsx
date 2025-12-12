import React from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { LanguageContext } from '@/contexts/LanguageContext';

// Wrapper for ThemeContext and LanguageContext Providers
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext>
      <LanguageContext>
        {children}
      </LanguageContext>
    </ThemeContext>
  );
}

