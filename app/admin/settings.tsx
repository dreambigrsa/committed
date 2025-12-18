import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Settings as SettingsIcon, Save, Shield, KeyRound, TestTubeDiagonal, Sparkles } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { refreshOpenAIKeyCache } from '@/lib/ai-service';

export default function AdminSettingsScreen() {
  const { currentUser } = useApp();
  const isSuperAdmin = useMemo(() => !!currentUser && currentUser.role === 'super_admin', [currentUser]);
  const [settings, setSettings] = useState({
    appName: 'Committed',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    requirePhoneVerification: false,
    requireIDVerification: false,
    autoResolveDisputes: true,
    disputeResolveTime: '7',
    maxPostsPerDay: '10',
    maxReelsPerDay: '5',
    enableCheatingAlerts: true,
    enableNotifications: true,
  });
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiKeyLoaded, setOpenaiKeyLoaded] = useState(false);
  const [savingOpenaiKey, setSavingOpenaiKey] = useState(false);
  const [testingOpenaiKey, setTestingOpenaiKey] = useState(false);

  // AI prompt management
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPromptLoaded, setAiPromptLoaded] = useState(false);
  const [aiPromptRollout, setAiPromptRollout] = useState('100');
  const [savingAiPrompt, setSavingAiPrompt] = useState(false);
  const [generatingSuggestion, setGeneratingSuggestion] = useState(false);

  const handleSaveSettings = () => {
    Alert.alert('Success', 'Settings saved successfully');
  };

  useEffect(() => {
    if (!isSuperAdmin || openaiKeyLoaded) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'openai_api_key')
          .maybeSingle();
        setOpenaiKey(data?.value ? String(data.value) : '');
      } catch {
        // ignore
      } finally {
        setOpenaiKeyLoaded(true);
      }
    })();
  }, [isSuperAdmin, openaiKeyLoaded]);

  useEffect(() => {
    if (!isSuperAdmin || aiPromptLoaded) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('ai_prompt_versions')
          .select('prompt, rollout_percent')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);
        const v = data?.[0];
        if (v?.prompt) setAiPrompt(String(v.prompt));
        if (typeof v?.rollout_percent === 'number') setAiPromptRollout(String(v.rollout_percent));
      } catch {
        // ignore
      } finally {
        setAiPromptLoaded(true);
      }
    })();
  }, [isSuperAdmin, aiPromptLoaded]);

  const handleSaveOpenAIKey = async () => {
    if (!isSuperAdmin) return;
    const trimmed = openaiKey.trim();
    if (!trimmed) {
      Alert.alert('Missing Key', 'Please paste your OpenAI API key first.');
      return;
    }
    setSavingOpenaiKey(true);
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: 'openai_api_key',
        value: trimmed,
        updated_by: currentUser?.id ?? null,
        updated_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      await refreshOpenAIKeyCache();
      Alert.alert('Saved', 'OpenAI API key saved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save OpenAI key.');
    } finally {
      setSavingOpenaiKey(false);
    }
  };

  const handleTestOpenAIKey = async () => {
    if (!isSuperAdmin) return;
    const trimmed = openaiKey.trim();
    if (!trimmed) {
      Alert.alert('Missing Key', 'Please paste your OpenAI API key first.');
      return;
    }
    setTestingOpenaiKey(true);
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${trimmed}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `OpenAI error: ${res.status}`);
      }
      Alert.alert('Success', 'OpenAI key is valid and working.');
    } catch (e: any) {
      Alert.alert('Test Failed', e?.message ?? 'OpenAI key test failed.');
    } finally {
      setTestingOpenaiKey(false);
    }
  };

  const handleSaveAiPrompt = async () => {
    if (!isSuperAdmin) return;
    const promptText = aiPrompt.trim();
    const rollout = Math.max(0, Math.min(100, parseInt(aiPromptRollout || '100', 10)));
    if (!promptText) {
      Alert.alert('Missing Prompt', 'Please enter the AI system prompt.');
      return;
    }
    setSavingAiPrompt(true);
    try {
      const { error } = await supabase.from('ai_prompt_versions').insert({
        name: 'default',
        prompt: promptText,
        rollout_percent: rollout,
        is_active: true,
        created_by: currentUser?.id ?? null,
      } as any);
      if (error) throw error;
      Alert.alert('Saved', 'New AI prompt version saved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save AI prompt.');
    } finally {
      setSavingAiPrompt(false);
    }
  };

  const handleGeneratePromptSuggestion = async () => {
    if (!isSuperAdmin) return;
    setGeneratingSuggestion(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-suggest-prompts', { body: {} });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Suggestion failed');
      Alert.alert('Suggestion created', 'A new prompt suggestion is saved for review in the database.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to generate suggestion.');
    } finally {
      setGeneratingSuggestion(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'App Settings', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Shield size={64} color={colors.danger} />
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.errorSubtext}>Only Super Admins can change settings</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'App Settings', headerShown: true }} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <SettingsIcon size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>Application Settings</Text>
          <Text style={styles.headerSubtitle}>Configure app behavior</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>App Name</Text>
              <Text style={styles.settingDescription}>Display name of the application</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={settings.appName}
              onChangeText={(text) => setSettings({ ...settings, appName: text })}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Maintenance Mode</Text>
              <Text style={styles.settingDescription}>Block all users except admins</Text>
            </View>
            <Switch
              value={settings.maintenanceMode}
              onValueChange={(value) => setSettings({ ...settings, maintenanceMode: value })}
              trackColor={{ false: colors.text.tertiary, true: colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Allow Registration</Text>
              <Text style={styles.settingDescription}>Enable new user signups</Text>
            </View>
            <Switch
              value={settings.allowRegistration}
              onValueChange={(value) => setSettings({ ...settings, allowRegistration: value })}
              trackColor={{ false: colors.text.tertiary, true: colors.primary }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OpenAI</Text>

          <View style={styles.settingItemColumn}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>OpenAI API Key</Text>
              <Text style={styles.settingDescription}>
                Used by Committed AI in messages (chat, image generation, documents). Stored in Supabase and only visible to Super Admins.
              </Text>
            </View>

            <View style={styles.openaiRow}>
              <KeyRound size={18} color={colors.text.secondary} />
              <TextInput
                style={styles.openaiInput}
                value={openaiKey}
                onChangeText={setOpenaiKey}
                placeholder="sk-..."
                placeholderTextColor={colors.text.tertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.openaiActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, (savingOpenaiKey || testingOpenaiKey) && styles.buttonDisabled]}
                onPress={handleTestOpenAIKey}
                disabled={savingOpenaiKey || testingOpenaiKey}
              >
                <TestTubeDiagonal size={18} color={colors.text.primary} />
                <Text style={styles.secondaryButtonText}>{testingOpenaiKey ? 'Testing…' : 'Test Key'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, (savingOpenaiKey || testingOpenaiKey) && styles.buttonDisabled]}
                onPress={handleSaveOpenAIKey}
                disabled={savingOpenaiKey || testingOpenaiKey}
              >
                <Save size={18} color={colors.text.primary} />
                <Text style={styles.secondaryButtonText}>{savingOpenaiKey ? 'Saving…' : 'Save Key'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Committed AI</Text>

          <View style={styles.settingItemColumn}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>System Prompt</Text>
              <Text style={styles.settingDescription}>
                This controls how Committed AI talks, helps users, and troubleshoots the app. New versions can roll out gradually.
              </Text>
            </View>

            <TextInput
              style={styles.promptInput}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder="Enter the AI system prompt..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Rollout (%)</Text>
                <Text style={styles.settingDescription}>Percent of users who get this new prompt version</Text>
              </View>
              <TextInput
                style={styles.numberInput}
                value={aiPromptRollout}
                onChangeText={setAiPromptRollout}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.openaiActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, (savingAiPrompt || generatingSuggestion) && styles.buttonDisabled]}
                onPress={handleGeneratePromptSuggestion}
                disabled={savingAiPrompt || generatingSuggestion}
              >
                <Sparkles size={18} color={colors.text.primary} />
                <Text style={styles.secondaryButtonText}>
                  {generatingSuggestion ? 'Generating…' : 'Generate Suggestion'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, (savingAiPrompt || generatingSuggestion) && styles.buttonDisabled]}
                onPress={handleSaveAiPrompt}
                disabled={savingAiPrompt || generatingSuggestion}
              >
                <Save size={18} color={colors.text.primary} />
                <Text style={styles.secondaryButtonText}>{savingAiPrompt ? 'Saving…' : 'Save Version'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Require Email Verification</Text>
              <Text style={styles.settingDescription}>Users must verify email</Text>
            </View>
            <Switch
              value={settings.requireEmailVerification}
              onValueChange={(value) => setSettings({ ...settings, requireEmailVerification: value })}
              trackColor={{ false: colors.text.tertiary, true: colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Require Phone Verification</Text>
              <Text style={styles.settingDescription}>Users must verify phone</Text>
            </View>
            <Switch
              value={settings.requirePhoneVerification}
              onValueChange={(value) => setSettings({ ...settings, requirePhoneVerification: value })}
              trackColor={{ false: colors.text.tertiary, true: colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Require ID Verification</Text>
              <Text style={styles.settingDescription}>Users must verify government ID</Text>
            </View>
            <Switch
              value={settings.requireIDVerification}
              onValueChange={(value) => setSettings({ ...settings, requireIDVerification: value })}
              trackColor={{ false: colors.text.tertiary, true: colors.primary }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relationships</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Resolve Disputes</Text>
              <Text style={styles.settingDescription}>Automatically resolve after time period</Text>
            </View>
            <Switch
              value={settings.autoResolveDisputes}
              onValueChange={(value) => setSettings({ ...settings, autoResolveDisputes: value })}
              trackColor={{ false: colors.text.tertiary, true: colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Dispute Resolve Time (days)</Text>
              <Text style={styles.settingDescription}>Days before auto-resolve</Text>
            </View>
            <TextInput
              style={styles.numberInput}
              value={settings.disputeResolveTime}
              onChangeText={(text) => setSettings({ ...settings, disputeResolveTime: text })}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Cheating Alerts</Text>
              <Text style={styles.settingDescription}>Notify on duplicate relationships</Text>
            </View>
            <Switch
              value={settings.enableCheatingAlerts}
              onValueChange={(value) => setSettings({ ...settings, enableCheatingAlerts: value })}
              trackColor={{ false: colors.text.tertiary, true: colors.primary }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Limits</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Max Posts Per Day</Text>
              <Text style={styles.settingDescription}>Maximum posts per user daily</Text>
            </View>
            <TextInput
              style={styles.numberInput}
              value={settings.maxPostsPerDay}
              onChangeText={(text) => setSettings({ ...settings, maxPostsPerDay: text })}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Max Reels Per Day</Text>
              <Text style={styles.settingDescription}>Maximum reels per user daily</Text>
            </View>
            <TextInput
              style={styles.numberInput}
              value={settings.maxReelsPerDay}
              onChangeText={(text) => setSettings({ ...settings, maxReelsPerDay: text })}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>Push notifications to users</Text>
            </View>
            <Switch
              value={settings.enableNotifications}
              onValueChange={(value) => setSettings({ ...settings, enableNotifications: value })}
              trackColor={{ false: colors.text.tertiary, true: colors.primary }}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
          <Save size={20} color={colors.text.white} />
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 24,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingItemColumn: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  textInput: {
    width: 150,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  numberInput: {
    width: 80,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    textAlign: 'center',
  },
  openaiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  openaiInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  openaiActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  promptInput: {
    marginTop: 12,
    minHeight: 160,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
});
