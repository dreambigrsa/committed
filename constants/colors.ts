import { useTheme } from '@/contexts/ThemeContext';

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
    secondary: '#2D2D2D',
    tertiary: '#3C3C3C',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  border: {
    light: '#3C3C3C',
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
    pending: '#3D2E1E',
    pendingText: '#FDD663',
  },
};

// Default export for backward compatibility (uses light theme)
// This is used in StyleSheet.create() blocks which are evaluated at module scope
const colors = lightColors;

// Named export for StyleSheet usage (same as default)
export { colors };

// Also export lightColors and darkColors for direct access if needed
export { lightColors, darkColors };

// Hook to get theme-aware colors (use this in component JSX for dynamic theming)
export const useColors = () => {
  try {
    const { isDark } = useTheme();
    return isDark ? darkColors : lightColors;
  } catch {
    // If theme context is not available, return light colors
    return lightColors;
  }
};

export default colors;
