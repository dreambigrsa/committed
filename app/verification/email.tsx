import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { currentUser, updateUserProfile } = useApp();
  const [email, setEmail] = useState(currentUser?.email || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sendVerificationCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setIsLoading(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      await supabase
        .from('verification_codes')
        .insert({
          user_id: currentUser?.id,
          email,
          code,
          type: 'email',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

      console.log('Verification code:', code);
      setCodeSent(true);
      Alert.alert('Code Sent', `Verification code sent to ${email}. Code: ${code} (Demo mode)`);
    } catch (error) {
      console.error('Failed to send verification code:', error);
      Alert.alert('Error', 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('user_id', currentUser?.id)
        .eq('email', email)
        .eq('code', verificationCode)
        .eq('type', 'email')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        throw new Error('Invalid or expired code');
      }

      await updateUserProfile({
        verifications: {
          ...currentUser?.verifications!,
          email: true,
        },
      });

      await supabase
        .from('verification_codes')
        .delete()
        .eq('user_id', currentUser?.id)
        .eq('type', 'email');

      Alert.alert('Success', 'Email verified successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Verification failed:', error);
      Alert.alert('Error', 'Invalid or expired verification code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Email Verification',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Mail size={48} color={colors.primary} />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We&apos;ll send you a verification code to confirm your email address
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!codeSent}
              />
            </View>

            {codeSent && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor={colors.text.tertiary}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            )}

            {!codeSent ? (
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={sendVerificationCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <Text style={styles.buttonText}>Send Code</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={verifyCode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.text.white} />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    setCodeSent(false);
                    setVerificationCode('');
                  }}
                >
                  <Text style={styles.resendText}>Send New Code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: colors.primary + '30',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  input: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  resendButton: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600' as const,
  },
});
