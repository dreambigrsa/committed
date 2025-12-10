// Global colors store that gets updated by ThemeContext
// This is the SINGLE FILE that needs to be changed
// All other files can continue using: import colors from '@/constants/colors'

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

// Create a mutable colors object that maintains the same reference
// This allows StyleSheet.create to reference it, and we update the values
const colors = { ...lightColors };

// Function to update global colors (called by ThemeContext)
export function updateGlobalColors(isDark: boolean) {
  const sourceColors = isDark ? darkColors : lightColors;
  
  // Update all properties in place to maintain object reference
  // This is critical - we mutate the same object so StyleSheet references stay valid
  Object.assign(colors, {
    primary: sourceColors.primary,
    primaryDark: sourceColors.primaryDark,
    secondary: sourceColors.secondary,
    accent: sourceColors.accent,
    danger: sourceColors.danger,
  });
  
  // Update nested objects
  Object.assign(colors.text, sourceColors.text);
  Object.assign(colors.background, sourceColors.background);
  Object.assign(colors.border, sourceColors.border);
  Object.assign(colors.status, sourceColors.status);
  Object.assign(colors.badge, sourceColors.badge);
}

export default colors;
