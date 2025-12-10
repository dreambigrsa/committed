import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, Heart, ArrowLeft } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';

export default function AuthScreen() {
  const router = useRouter();
  const { currentUser, signup, login, resetPassword } = useApp();
  const [isSignUp, setIsSignUp] = useState<boolean>(true);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });

  useEffect(() => {
    if (currentUser) {
      router.replace('/(tabs)/home');
    }
  }, [currentUser, router]);

  const handleResetPassword = async () => {
    setIsLoading(true);
    try {
      if (!formData.email) {
        alert('Please enter your email address');
        setIsLoading(false);
        return;
      }

      await resetPassword(formData.email);
      alert('Password reset link sent! Please check your email.');
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('Reset password error:', error);
      alert(error.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.password) {
          alert('Please fill in all fields');
          setIsLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          alert('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        await signup(formData.fullName, formData.email, formData.phoneNumber, formData.password);
        router.replace('/(tabs)/home');
      } else {
        if (!formData.email || !formData.password) {
          alert('Please enter email and password');
          setIsLoading(false);
          return;
        }

        await login(formData.email, formData.password);
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      let errorMessage = error.message || 'An error occurred. Please try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before signing in.';
      } else if (error.code === 'PGRST116') {
        errorMessage = 'Database setup incomplete. Please check DATABASE-FIX-INSTRUCTIONS.md';
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Shield size={48} color={colors.primary} strokeWidth={2} />
            <Heart size={32} color={colors.danger} fill={colors.danger} style={styles.heartLogo} />
          </View>

          <Text style={styles.title}>Committed</Text>
          <Text style={styles.subtitle}>
            Verify your relationship.{'\n'}Build trust. Stay accountable.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {!showForgotPassword ? (
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, isSignUp && styles.activeTab]}
                onPress={() => setIsSignUp(true)}
              >
                <Text style={[styles.tabText, isSignUp && styles.activeTabText]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isSignUp && styles.activeTab]}
                onPress={() => setIsSignUp(false)}
              >
                <Text style={[styles.tabText, !isSignUp && styles.activeTabText]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.header}>
              <Text style={styles.resetTitle}>Reset Password</Text>
              <Text style={styles.resetSubtitle}>
                Enter your email address and we&apos;ll send you a link to reset your password.
              </Text>
            </View>
          )}

          {isSignUp && !showForgotPassword && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your full name"
                placeholderTextColor={colors.text.tertiary}
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your email"
              placeholderTextColor={colors.text.tertiary}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {!showForgotPassword && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.text.tertiary}
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                keyboardType="phone-pad"
              />
            </View>
          )}

          {!showForgotPassword && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor={colors.text.tertiary}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.authButton, isLoading && styles.buttonDisabled]}
            onPress={showForgotPassword ? handleResetPassword : handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <Text style={styles.authButtonText}>
                {showForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Text>
            )}
          </TouchableOpacity>

          {!isSignUp && !showForgotPassword && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => setShowForgotPassword(true)}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {showForgotPassword && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => {
                setShowForgotPassword(false);
                setIsSignUp(false);
              }}
            >
              <Text style={styles.forgotPasswordText}>Back to Sign In</Text>
            </TouchableOpacity>
          )}

          {isSignUp && (
            <Text style={styles.disclaimer}>
              By signing up, you agree to verify your relationship status and maintain transparency with your partner.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heartLogo: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  title: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.background.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  authButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  resetTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  resetSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
});
