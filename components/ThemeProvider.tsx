import React from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';

// Simple wrapper for ThemeContext Provider
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext>
      {children}
    </ThemeContext>
  );
}

