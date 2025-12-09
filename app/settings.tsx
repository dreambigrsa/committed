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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Shield,
  Bell,
  Eye,
  Lock,
  Heart,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const { currentUser, getCurrentUserRelationship, endRelationship } = useApp();
  const relationship = getCurrentUserRelationship();

  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [notifications, setNotifications] = useState({
    relationshipRequests: true,
    cheatingAlerts: true,
    partnerActivity: true,
    verificationUpdates: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public' as 'public' | 'private' | 'verified-only',
    showRelationshipHistory: false,
    allowSearchByPhone: true,
  });

  useEffect(() => {
    if (currentUser) {
      loadSettings();
    }
  }, [currentUser]);

  const loadSettings = async () => {
    if (!currentUser) return;
    
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (data) {
        if (data.notification_settings) {
          setNotifications(data.notification_settings);
        }
        if (data.privacy_settings) {
          setPrivacy(data.privacy_settings);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  if (!currentUser) {
    return null;
  }

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!');
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleToggleNotification = async (key: keyof typeof notifications) => {
    const newValue = !notifications[key];
    setNotifications((prev) => ({
      ...prev,
      [key]: newValue,
    }));

    await saveNotificationSettings({ ...notifications, [key]: newValue });
  };

  const handleTogglePrivacy = async (key: keyof typeof privacy) => {
    if (key === 'profileVisibility') return;

    const newValue = !privacy[key];
    setPrivacy((prev) => ({
      ...prev,
      [key]: newValue,
    }));

    await savePrivacySettings({ ...privacy, [key]: newValue });
  };

  const saveNotificationSettings = async (settings: typeof notifications) => {
    if (!currentUser) return;
    
    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: currentUser.id,
          notification_settings: settings,
        });
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const savePrivacySettings = async (settings: typeof privacy) => {
    if (!currentUser) return;

    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: currentUser.id,
          privacy_settings: settings,
        });
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  };

  const handleChangePrivacyLevel = async () => {
    Alert.alert(
      'Profile Visibility',
      'Choose who can see your relationship status',
      [
        {
          text: 'Public',
          onPress: () =>
            setPrivacy((prev) => ({ ...prev, profileVisibility: 'public' })),
        },
        {
          text: 'Verified Users Only',
          onPress: () =>
            setPrivacy((prev) => ({
              ...prev,
              profileVisibility: 'verified-only',
            })),
        },
        {
          text: 'Private',
          onPress: () =>
            setPrivacy((prev) => ({ ...prev, profileVisibility: 'private' })),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleEndRelationship = async () => {
    if (!relationship) return;

    Alert.alert(
      'End Relationship',
      `Are you sure you want to end your relationship with ${relationship.partnerName}? They will be notified and must confirm.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Relationship',
          style: 'destructive',
          onPress: async () => {
            try {
              await endRelationship(relationship.id, 'User requested to end relationship');
              Alert.alert(
                'Request Sent',
                'Your partner will receive a request to confirm ending the relationship. It will be finalized once they confirm or after 7 days.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Failed to end relationship:', error);
              Alert.alert('Error', 'Failed to send end relationship request');
            }
          },
        },
      ]
    );
  };

  const getPrivacyLevelLabel = () => {
    const labels = {
      public: 'Public',
      private: 'Private',
      'verified-only': 'Verified Users Only',
    };
    return labels[privacy.profileVisibility];
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Settings',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Profile Information</Text>
            </View>

            <View style={styles.settingsList}>
              <View style={styles.profileEditSection}>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Full Name</Text>
                  <TextInput
                    style={[styles.editInput, !editMode && styles.editInputDisabled]}
                    value={fullName}
                    onChangeText={setFullName}
                    editable={editMode}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Phone Number</Text>
                  <TextInput
                    style={[styles.editInput, !editMode && styles.editInputDisabled]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    editable={editMode}
                    placeholder="Enter your phone number"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="phone-pad"
                  />
                </View>
                {editMode ? (
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setEditMode(false);
                        setFullName(currentUser?.fullName || '');
                        setPhoneNumber(currentUser?.phoneNumber || '');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSaveProfile}
                    >
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setEditMode(true)}
                  >
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>

            <View style={styles.settingsList}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Heart size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Relationship Requests</Text>
                </View>
                <Switch
                  value={notifications.relationshipRequests}
                  onValueChange={() =>
                    handleToggleNotification('relationshipRequests')
                  }
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={
                    notifications.relationshipRequests
                      ? colors.primary
                      : colors.text.tertiary
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <AlertTriangle size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Cheating Alerts</Text>
                </View>
                <Switch
                  value={notifications.cheatingAlerts}
                  onValueChange={() =>
                    handleToggleNotification('cheatingAlerts')
                  }
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={
                    notifications.cheatingAlerts
                      ? colors.primary
                      : colors.text.tertiary
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Eye size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Partner Activity</Text>
                </View>
                <Switch
                  value={notifications.partnerActivity}
                  onValueChange={() =>
                    handleToggleNotification('partnerActivity')
                  }
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={
                    notifications.partnerActivity
                      ? colors.primary
                      : colors.text.tertiary
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Shield size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Verification Updates</Text>
                </View>
                <Switch
                  value={notifications.verificationUpdates}
                  onValueChange={() =>
                    handleToggleNotification('verificationUpdates')
                  }
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={
                    notifications.verificationUpdates
                      ? colors.primary
                      : colors.text.tertiary
                  }
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Lock size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Privacy & Security</Text>
            </View>

            <View style={styles.settingsList}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleChangePrivacyLevel}
              >
                <View style={styles.settingLeft}>
                  <Eye size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Profile Visibility</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>
                    {getPrivacyLevelLabel()}
                  </Text>
                  <ChevronRight size={20} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Shield size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>
                    Show Relationship History
                  </Text>
                </View>
                <Switch
                  value={privacy.showRelationshipHistory}
                  onValueChange={() =>
                    handleTogglePrivacy('showRelationshipHistory')
                  }
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={
                    privacy.showRelationshipHistory
                      ? colors.primary
                      : colors.text.tertiary
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Eye size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>
                    Allow Search by Phone
                  </Text>
                </View>
                <Switch
                  value={privacy.allowSearchByPhone}
                  onValueChange={() => handleTogglePrivacy('allowSearchByPhone')}
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={
                    privacy.allowSearchByPhone
                      ? colors.primary
                      : colors.text.tertiary
                  }
                />
              </View>
            </View>
          </View>

          {relationship && relationship.status === 'verified' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Heart size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Relationship</Text>
              </View>

              <View style={styles.dangerCard}>
                <AlertTriangle size={24} color={colors.danger} />
                <View style={styles.dangerContent}>
                  <Text style={styles.dangerTitle}>End Relationship</Text>
                  <Text style={styles.dangerText}>
                    This will send a request to your partner. The relationship
                    will end once they confirm or after 7 days.
                  </Text>
                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={handleEndRelationship}
                  >
                    <Text style={styles.dangerButtonText}>
                      End Relationship
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.infoCard}>
            <Shield size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Your privacy settings control who can see your profile and
              relationship status. Cheating alerts will notify you if your
              partner attempts to register with someone else.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  settingsList: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500' as const,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '500' as const,
  },
  dangerCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 2,
    borderColor: colors.danger + '30',
  },
  dangerContent: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.danger,
    marginBottom: 8,
  },
  dangerText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  profileEditSection: {
    padding: 16,
    gap: 16,
  },
  editRow: {
    gap: 8,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  editInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  editInputDisabled: {
    backgroundColor: colors.background.primary,
    color: colors.text.secondary,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
});
