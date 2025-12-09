import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Phone, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';

export default function PhoneVerificationScreen() {
  const router = useRouter();
  const { currentUser, updateUserProfile } = useApp();
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser?.phoneNumber || '');
  const [code, setCode] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setIsLoading(true);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(newCode);

    setTimeout(() => {
      setIsLoading(false);
      setStep('verify');
      setCountdown(60);
      Alert.alert(
        'Verification Code Sent',
        `Your code is: ${newCode}\n\n(In a real app, this would be sent via SMS)`,
        [{ text: 'OK' }]
      );
    }, 1500);
  };

  const handleVerifyCode = async () => {
    if (code !== generatedCode) {
      Alert.alert('Error', 'Invalid verification code. Please try again.');
      return;
    }

    setIsLoading(true);
    
    setTimeout(async () => {
      await updateUserProfile({
        verifications: {
          ...currentUser!.verifications,
          phone: true,
        },
      });
      setIsLoading(false);
      Alert.alert('Success', 'Phone number verified successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    }, 1000);
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    handleSendCode();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Phone Verification',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Phone size={40} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.title}>
              {step === 'input' ? 'Verify Phone Number' : 'Enter Code'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'input'
                ? 'We\'ll send you a 6-digit verification code'
                : `Enter the code sent to ${phoneNumber}`}
            </Text>
          </View>

          {step === 'input' ? (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={colors.text.tertiary}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <Text style={styles.buttonText}>Send Code</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor={colors.text.tertiary}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <>
                    <CheckCircle2 size={20} color={colors.text.white} />
                    <Text style={styles.buttonText}>Verify</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendCode}
                disabled={countdown > 0}
              >
                <Text
                  style={[
                    styles.resendText,
                    countdown > 0 && styles.resendTextDisabled,
                  ]}
                >
                  {countdown > 0
                    ? `Resend code in ${countdown}s`
                    : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              This verification helps confirm your identity and builds trust in
              your relationship status.
            </Text>
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
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 10,
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
  codeInput: {
    fontSize: 28,
    fontWeight: '700' as const,
    textAlign: 'center',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  resendTextDisabled: {
    color: colors.text.tertiary,
  },
  infoCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
    textAlign: 'center',
  },
});
