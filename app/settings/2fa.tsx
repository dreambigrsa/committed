import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Shield, CheckCircle2, XCircle, Key } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useColors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function TwoFactorAuthScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { isDark } = useTheme();
  const colors = useColors();
  
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    load2FAStatus();
  }, [currentUser]);

  const load2FAStatus = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_2fa')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setEnabled(data.enabled || false);
        if (data.backup_codes) {
          setBackupCodes(data.backup_codes);
        }
      }
    } catch (error) {
      console.error('Failed to load 2FA status:', error);
      Alert.alert('Error', 'Failed to load 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  const generateSecret = () => {
    // Generate a random secret (in production, use a proper TOTP library)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const generateBackupCodes = () => {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      codes.push(code);
    }
    return codes;
  };

  const handleEnable2FA = async () => {
    if (!currentUser) return;

    try {
      setSettingUp(true);
      
      // Generate secret and backup codes
      const newSecret = generateSecret();
      const newBackupCodes = generateBackupCodes();
      
      // Generate QR code URL (in production, use a proper TOTP library)
      const issuer = 'Committed App';
      const accountName = currentUser.email;
      const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${newSecret}&issuer=${encodeURIComponent(issuer)}`;
      
      setSecret(newSecret);
      setQrCode(qrCodeUrl);
      setBackupCodes(newBackupCodes);
      
      Alert.alert(
        'Scan QR Code',
        'Please scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) and enter the verification code.',
        [
          { text: 'Cancel', onPress: () => setSettingUp(false) },
          { text: 'Continue', onPress: () => {} }
        ]
      );
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      Alert.alert('Error', 'Failed to enable 2FA');
      setSettingUp(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!currentUser || !verificationCode || !secret) return;

    try {
      // In production, verify the code using a TOTP library
      // For now, we'll just accept any 6-digit code as a placeholder
      if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
        Alert.alert('Error', 'Please enter a valid 6-digit code');
        return;
      }

      // Save 2FA settings
      const { error } = await supabase
        .from('user_2fa')
        .upsert({
          user_id: currentUser.id,
          secret: secret,
          enabled: true,
          backup_codes: backupCodes,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setEnabled(true);
      setSettingUp(false);
      setVerificationCode('');
      setSecret(null);
      setQrCode(null);
      
      Alert.alert(
        'Success',
        'Two-factor authentication has been enabled. Please save your backup codes in a safe place.',
        [
          {
            text: 'View Backup Codes',
            onPress: () => {
              Alert.alert(
                'Backup Codes',
                `Save these codes in a safe place:\n\n${backupCodes.join('\n')}\n\nYou can use these codes to access your account if you lose your device.`,
                [{ text: 'OK' }]
              );
            }
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    }
  };

  const handleDisable2FA = async () => {
    if (!currentUser) return;

    Alert.alert(
      'Disable Two-Factor Authentication',
      'Are you sure you want to disable 2FA? This will make your account less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_2fa')
                .update({
                  enabled: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', currentUser.id);

              if (error) throw error;

              setEnabled(false);
              Alert.alert('Success', 'Two-factor authentication has been disabled');
            } catch (error) {
              console.error('Failed to disable 2FA:', error);
              Alert.alert('Error', 'Failed to disable 2FA');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Two-Factor Authentication',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Two-Factor Authentication',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.background.primary }]}>
          <View style={styles.sectionHeader}>
            <Shield size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Security Status
            </Text>
          </View>

          <View style={styles.statusCard}>
            {enabled ? (
              <>
                <CheckCircle2 size={48} color={colors.secondary} />
                <Text style={[styles.statusTitle, { color: colors.text.primary }]}>
                  Two-Factor Authentication Enabled
                </Text>
                <Text style={[styles.statusText, { color: colors.text.secondary }]}>
                  Your account is protected with an additional layer of security.
                </Text>
                <TouchableOpacity
                  style={[styles.disableButton, { backgroundColor: colors.danger }]}
                  onPress={handleDisable2FA}
                >
                  <Text style={styles.buttonText}>Disable 2FA</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <XCircle size={48} color={colors.text.tertiary} />
                <Text style={[styles.statusTitle, { color: colors.text.primary }]}>
                  Two-Factor Authentication Disabled
                </Text>
                <Text style={[styles.statusText, { color: colors.text.secondary }]}>
                  Add an extra layer of security to your account.
                </Text>
                <TouchableOpacity
                  style={[styles.enableButton, { backgroundColor: colors.primary }]}
                  onPress={handleEnable2FA}
                  disabled={settingUp}
                >
                  {settingUp ? (
                    <ActivityIndicator color={colors.text.white} />
                  ) : (
                    <Text style={styles.buttonText}>Enable 2FA</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {settingUp && secret && (
          <View style={[styles.section, { backgroundColor: colors.background.primary }]}>
            <View style={styles.sectionHeader}>
              <Key size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Setup Instructions
              </Text>
            </View>

            <View style={styles.setupCard}>
              <Text style={[styles.instructionText, { color: colors.text.primary }]}>
                1. Install an authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
              </Text>
              <Text style={[styles.instructionText, { color: colors.text.primary }]}>
                2. Scan the QR code or enter this secret manually:
              </Text>
              <View style={[styles.secretBox, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
                <Text style={[styles.secretText, { color: colors.text.primary }]}>{secret}</Text>
              </View>
              <Text style={[styles.instructionText, { color: colors.text.primary }]}>
                3. Enter the 6-digit code from your authenticator app:
              </Text>
              <TextInput
                style={[styles.codeInput, { backgroundColor: colors.background.secondary, borderColor: colors.border.light, color: colors.text.primary }]}
                placeholder="000000"
                placeholderTextColor={colors.text.tertiary}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.verifyButton, { backgroundColor: colors.primary }]}
                onPress={handleVerifyAndEnable}
                disabled={verificationCode.length !== 6}
              >
                <Text style={styles.buttonText}>Verify and Enable</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {enabled && backupCodes.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.background.primary }]}>
            <View style={styles.sectionHeader}>
              <Key size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Backup Codes
              </Text>
            </View>
            <View style={styles.backupCodesCard}>
              <Text style={[styles.backupCodesText, { color: colors.text.secondary }]}>
                Save these codes in a safe place. You can use them to access your account if you lose your device.
              </Text>
              <View style={[styles.codesContainer, { backgroundColor: colors.background.secondary }]}>
                {backupCodes.map((code, index) => (
                  <Text key={index} style={[styles.codeText, { color: colors.text.primary }]}>
                    {code}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  enableButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  disableButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  setupCard: {
    gap: 16,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  secretBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  secretText: {
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  verifyButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backupCodesCard: {
    gap: 12,
  },
  backupCodesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  codesContainer: {
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  codeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    padding: 8,
    minWidth: 80,
    textAlign: 'center',
  },
});

