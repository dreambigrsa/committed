import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Image,
  Platform,
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
  Mail,
  Phone,
  IdCard,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  Download,
  Key,
  Smartphone,
  Users,
  Moon,
  Globe,
  Trash2,
  Camera,
  Settings,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen() {
  const router = useRouter();
  const { currentUser, getCurrentUserRelationship, endRelationship, updateUserProfile } = useApp();
  const relationship = getCurrentUserRelationship();

  const [editMode, setEditMode] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Basic Information
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [gender, setGender] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');

  // Notifications
  const [notifications, setNotifications] = useState({
    relationshipUpdates: true,
    cheatingAlerts: true,
    verificationAttempts: true,
    anniversaryReminders: true,
    marketingPromotions: false,
  });

  // Privacy & Security
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public' as 'public' | 'private' | 'verified-only',
    searchVisibility: true,
    allowSearchByPhone: true,
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  // App Preferences
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('default');

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      setEmail(currentUser.email || '');
      loadSettings();
      loadSessions();
      loadBlockedUsers();
    }
  }, [currentUser]);

  const loadSettings = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .limit(1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const settings = data[0];
        if (settings.notification_settings) {
          setNotifications(settings.notification_settings);
        }
        if (settings.privacy_settings) {
          setPrivacy(settings.privacy_settings);
        }
        if (settings.theme_preference) {
          setDarkMode(settings.theme_preference === 'dark');
        }
        if (settings.language) {
          setLanguage(settings.language);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadSessions = async () => {
    if (!currentUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // In a real app, you'd fetch all active sessions from your backend
        setSessions([{ id: session.id, device: 'Current Device', lastActive: new Date().toISOString() }]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadBlockedUsers = async () => {
    // Placeholder - would need a blocked_users table
    setBlockedUsers([]);
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

      await updateUserProfile({
        fullName,
        phoneNumber,
      });

      Alert.alert('Success', 'Profile updated successfully!');
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleProfilePhotoChange = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Upload to Supabase Storage
        const fileExt = result.assets[0].uri.split('.').pop();
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-pictures/${fileName}`;

        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          type: `image/${fileExt}`,
          name: fileName,
        } as any);

        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(filePath, formData, {
            contentType: `image/${fileExt}`,
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        await updateUserProfile({
          profilePicture: publicUrl,
        });

        Alert.alert('Success', 'Profile photo updated!');
      }
    } catch (error) {
      console.error('Failed to update profile photo:', error);
      Alert.alert('Error', 'Failed to update profile photo');
    }
  };

  const handleChangePassword = () => {
    // Note: Alert.prompt is iOS only, for cross-platform use a modal or navigation
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Change Password',
        'Enter your new password (min 6 characters)',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change',
            onPress: async (newPassword?: string) => {
              if (!newPassword || newPassword.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters');
                return;
              }

              try {
                const { error } = await supabase.auth.updateUser({
                  password: newPassword,
                });

                if (error) throw error;
                Alert.alert('Success', 'Password updated successfully!');
              } catch (error: any) {
                console.error('Failed to change password:', error);
                Alert.alert('Error', error.message || 'Failed to change password');
              }
            },
          },
        ],
        'secure-text-input'
      );
    } else {
      // For Android/Web, show an alert directing to password reset
      Alert.alert(
        'Change Password',
        'Please use the password reset feature from the login screen to change your password.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleReVerify = (type: 'phone' | 'email' | 'id') => {
    if (type === 'phone') {
      router.push('/verification/phone' as any);
    } else if (type === 'email') {
      router.push('/verification/email' as any);
    } else if (type === 'id') {
      router.push('/verification/id' as any);
    }
  };

  const handleToggleNotification = async (key: keyof typeof notifications) => {
    const newValue = !notifications[key];
    setNotifications((prev: typeof notifications) => ({
      ...prev,
      [key]: newValue,
    }));

    await saveNotificationSettings({ ...notifications, [key]: newValue });
  };

  const handleTogglePrivacy = async (key: keyof typeof privacy) => {
    if (key === 'profileVisibility') return;

    const newValue = !privacy[key];
    setPrivacy((prev: typeof privacy) => ({
      ...prev,
      [key]: newValue,
    }));

    await savePrivacySettings({ ...privacy, [key]: newValue });
  };

  const saveNotificationSettings = async (settings: typeof notifications) => {
    if (!currentUser) return;
    
    try {
      const { data: existingData } = await supabase
        .from('user_settings')
        .select('privacy_settings')
        .eq('user_id', currentUser.id)
        .limit(1);

      const existingPrivacy = existingData && existingData.length > 0 
        ? existingData[0].privacy_settings 
        : privacy;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: currentUser.id,
          notification_settings: settings,
          privacy_settings: existingPrivacy,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const savePrivacySettings = async (settings: typeof privacy) => {
    if (!currentUser) return;

    try {
      const { data: existingData } = await supabase
        .from('user_settings')
        .select('notification_settings')
        .eq('user_id', currentUser.id)
        .limit(1);

      const existingNotifications = existingData && existingData.length > 0 
        ? existingData[0].notification_settings 
        : notifications;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: currentUser.id,
          privacy_settings: settings,
          notification_settings: existingNotifications,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      Alert.alert('Error', 'Failed to save privacy settings');
    }
  };

  const handleChangePrivacyLevel = async () => {
    Alert.alert(
      'Profile Visibility',
      'Choose who can see your relationship status',
      [
        {
          text: 'Public',
          onPress: async () => {
            const newPrivacy = { ...privacy, profileVisibility: 'public' as const };
            setPrivacy(newPrivacy);
            await savePrivacySettings(newPrivacy);
          },
        },
        {
          text: 'Verified Users Only',
          onPress: async () => {
            const newPrivacy = { ...privacy, profileVisibility: 'verified-only' as const };
            setPrivacy(newPrivacy);
            await savePrivacySettings(newPrivacy);
          },
        },
        {
          text: 'Private',
          onPress: async () => {
            const newPrivacy = { ...privacy, profileVisibility: 'private' as const };
            setPrivacy(newPrivacy);
            await savePrivacySettings(newPrivacy);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDownloadCertificate = () => {
    if (relationship && relationship.status === 'verified') {
      router.push(`/certificates/${relationship.id}` as any);
    } else {
      Alert.alert('Not Available', 'You need a verified relationship to download a certificate');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // In production, you'd want to soft delete or handle this properly
              Alert.alert('Info', 'Account deletion feature requires backend implementation');
            } catch (error) {
              console.error('Failed to delete account:', error);
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const getPrivacyLevelLabel = () => {
    const labels: Record<'public' | 'private' | 'verified-only', string> = {
      public: 'Public',
      private: 'Private',
      'verified-only': 'Verified Users Only',
    };
    return labels[privacy.profileVisibility];
  };

  const getVerificationStatus = (type: 'phone' | 'email' | 'id') => {
    if (type === 'phone') return currentUser.verifications.phone;
    if (type === 'email') return currentUser.verifications.email;
    if (type === 'id') return currentUser.verifications.id;
    return false;
  };

  const getRelationshipVerificationStatus = () => {
    return relationship?.status === 'verified';
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
          {/* Basic Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>

            <View style={styles.settingsList}>
              <View style={styles.profilePhotoSection}>
                <TouchableOpacity onPress={handleProfilePhotoChange}>
                  {currentUser.profilePicture ? (
                    <Image
                      source={{ uri: currentUser.profilePicture }}
                      style={styles.profilePhoto}
                    />
                  ) : (
                    <View style={styles.profilePhotoPlaceholder}>
                      <Camera size={24} color={colors.text.tertiary} />
                    </View>
                  )}
                  <View style={styles.profilePhotoEditBadge}>
                    <Camera size={16} color={colors.text.white} />
                  </View>
                </TouchableOpacity>
              </View>

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
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Email Address</Text>
                  <TextInput
                    style={[styles.editInput, styles.editInputDisabled]}
                    value={email}
                    editable={false}
                    placeholderTextColor={colors.text.tertiary}
                  />
                  <Text style={styles.editHint}>Email cannot be changed</Text>
                </View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Gender (Optional)</Text>
                  <TextInput
                    style={[styles.editInput, !editMode && styles.editInputDisabled]}
                    value={gender}
                    onChangeText={setGender}
                    editable={editMode}
                    placeholder="Male, Female, Other"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Date of Birth (Optional)</Text>
                  <TextInput
                    style={[styles.editInput, !editMode && styles.editInputDisabled]}
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    editable={editMode}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.tertiary}
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
                        setGender('');
                        setDateOfBirth('');
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

          {/* Verification Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Verification Status</Text>
            </View>

            <View style={styles.settingsList}>
              <TouchableOpacity
                style={styles.verificationItem}
                onPress={() => !getVerificationStatus('phone') && handleReVerify('phone')}
              >
                <View style={styles.verificationLeft}>
                  <Phone size={20} color={colors.text.secondary} />
                  <View style={styles.verificationInfo}>
                    <Text style={styles.verificationLabel}>Phone Verification</Text>
                    <Text style={styles.verificationStatus}>
                      {getVerificationStatus('phone') ? 'Verified' : 'Not Verified'}
                    </Text>
                  </View>
                </View>
                {getVerificationStatus('phone') ? (
                  <CheckCircle2 size={24} color={colors.secondary} />
                ) : (
                  <XCircle size={24} color={colors.text.tertiary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.verificationItem}
                onPress={() => !getVerificationStatus('email') && handleReVerify('email')}
              >
                <View style={styles.verificationLeft}>
                  <Mail size={20} color={colors.text.secondary} />
                  <View style={styles.verificationInfo}>
                    <Text style={styles.verificationLabel}>Email Verification</Text>
                    <Text style={styles.verificationStatus}>
                      {getVerificationStatus('email') ? 'Verified' : 'Not Verified'}
                    </Text>
                  </View>
                </View>
                {getVerificationStatus('email') ? (
                  <CheckCircle2 size={24} color={colors.secondary} />
                ) : (
                  <XCircle size={24} color={colors.text.tertiary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.verificationItem}
                onPress={() => !getVerificationStatus('id') && handleReVerify('id')}
              >
                <View style={styles.verificationLeft}>
                  <IdCard size={20} color={colors.text.secondary} />
                  <View style={styles.verificationInfo}>
                    <Text style={styles.verificationLabel}>Government ID Verification</Text>
                    <Text style={styles.verificationStatus}>
                      {getVerificationStatus('id') ? 'Verified' : 'Not Verified'}
                    </Text>
                  </View>
                </View>
                {getVerificationStatus('id') ? (
                  <CheckCircle2 size={24} color={colors.secondary} />
                ) : (
                  <XCircle size={24} color={colors.text.tertiary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.verificationItem}
                onPress={() => relationship && router.push('/verification/couple-selfie' as any)}
              >
                <View style={styles.verificationLeft}>
                  <Heart size={20} color={colors.text.secondary} />
                  <View style={styles.verificationInfo}>
                    <Text style={styles.verificationLabel}>Relationship Verification</Text>
                    <Text style={styles.verificationStatus}>
                      {getRelationshipVerificationStatus() ? 'Verified' : relationship ? 'Pending' : 'None'}
                    </Text>
                  </View>
                </View>
                {getRelationshipVerificationStatus() ? (
                  <CheckCircle2 size={24} color={colors.secondary} />
                ) : (
                  <XCircle size={24} color={colors.text.tertiary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reverifyButton}
                onPress={() => router.push('/verification' as any)}
              >
                <Shield size={18} color={colors.primary} />
                <Text style={styles.reverifyButtonText}>Re-verify Identity</Text>
                <ChevronRight size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Relationship Settings */}
          {relationship && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Heart size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Relationship Settings</Text>
              </View>

              <View style={styles.settingsList}>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Heart size={20} color={colors.text.secondary} />
                    <Text style={styles.settingLabel}>Relationship Status</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={[
                      styles.statusBadgeText,
                      relationship.status === 'verified' && styles.statusBadgeTextVerified
                    ]}>
                      {relationship.status === 'verified' ? 'Verified' : relationship.status === 'pending' ? 'Pending' : 'Ended'}
                    </Text>
                  </View>
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <User size={20} color={colors.text.secondary} />
                    <Text style={styles.settingLabel}>Partner Name</Text>
                  </View>
                  <Text style={styles.settingValue}>{relationship.partnerName}</Text>
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Phone size={20} color={colors.text.secondary} />
                    <Text style={styles.settingLabel}>Partner Phone</Text>
                  </View>
                  <Text style={styles.settingValue}>{relationship.partnerPhone}</Text>
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Calendar size={20} color={colors.text.secondary} />
                    <Text style={styles.settingLabel}>Anniversary Date</Text>
                  </View>
                  <Text style={styles.settingValue}>
                    {new Date(relationship.startDate).toLocaleDateString()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={handleChangePrivacyLevel}
                >
                  <View style={styles.settingLeft}>
                    <Eye size={20} color={colors.text.secondary} />
                    <Text style={styles.settingLabel}>Who Can See My Relationship?</Text>
                  </View>
                  <View style={styles.settingRight}>
                    <Text style={styles.settingValue}>
                      {getPrivacyLevelLabel()}
                    </Text>
                    <ChevronRight size={20} color={colors.text.tertiary} />
                  </View>
                </TouchableOpacity>

                {relationship.status === 'verified' && (
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={handleDownloadCertificate}
                  >
                    <View style={styles.settingLeft}>
                      <Download size={20} color={colors.text.secondary} />
                      <Text style={styles.settingLabel}>Download Certificate</Text>
                    </View>
                    <ChevronRight size={20} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Privacy & Security */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Lock size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Privacy & Security</Text>
            </View>

            <View style={styles.settingsList}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleChangePassword}
              >
                <View style={styles.settingLeft}>
                  <Key size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Change Password</Text>
                </View>
                <ChevronRight size={20} color={colors.text.tertiary} />
              </TouchableOpacity>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Shield size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
                </View>
                <Switch
                  value={twoFactorEnabled}
                  onValueChange={setTwoFactorEnabled}
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={twoFactorEnabled ? colors.primary : colors.text.tertiary}
                />
              </View>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => Alert.alert('Sessions', 'Session management coming soon')}
              >
                <View style={styles.settingLeft}>
                  <Smartphone size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Active Sessions</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>{sessions.length} device(s)</Text>
                  <ChevronRight size={20} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => Alert.alert('Blocked Users', 'Blocked users management coming soon')}
              >
                <View style={styles.settingLeft}>
                  <Users size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Blocked Users</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>{blockedUsers.length} blocked</Text>
                  <ChevronRight size={20} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>

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
                  <Eye size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Search Visibility</Text>
                </View>
                <Switch
                  value={privacy.searchVisibility}
                  onValueChange={() => handleTogglePrivacy('searchVisibility')}
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={privacy.searchVisibility ? colors.primary : colors.text.tertiary}
                />
              </View>
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>

            <View style={styles.settingsList}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Heart size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Relationship Updates</Text>
                </View>
                <Switch
                  value={notifications.relationshipUpdates}
                  onValueChange={() => handleToggleNotification('relationshipUpdates')}
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={notifications.relationshipUpdates ? colors.primary : colors.text.tertiary}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <AlertTriangle size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Cheating Alerts</Text>
                </View>
                <Switch
                  value={notifications.cheatingAlerts}
                  onValueChange={() => handleToggleNotification('cheatingAlerts')}
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={notifications.cheatingAlerts ? colors.primary : colors.text.tertiary}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Shield size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Verification Attempts</Text>
                </View>
                <Switch
                  value={notifications.verificationAttempts}
                  onValueChange={() => handleToggleNotification('verificationAttempts')}
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={notifications.verificationAttempts ? colors.primary : colors.text.tertiary}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Calendar size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Anniversary Reminders</Text>
                </View>
                <Switch
                  value={notifications.anniversaryReminders}
                  onValueChange={() => handleToggleNotification('anniversaryReminders')}
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={notifications.anniversaryReminders ? colors.primary : colors.text.tertiary}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Bell size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Marketing & Promotions</Text>
                </View>
                <Switch
                  value={notifications.marketingPromotions}
                  onValueChange={() => handleToggleNotification('marketingPromotions')}
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={notifications.marketingPromotions ? colors.primary : colors.text.tertiary}
                />
              </View>
            </View>
          </View>

          {/* App Preferences */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Settings size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>App Preferences</Text>
            </View>

            <View style={styles.settingsList}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Moon size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{
                    false: colors.border.light,
                    true: colors.primary + '50',
                  }}
                  thumbColor={darkMode ? colors.primary : colors.text.tertiary}
                />
              </View>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  Alert.alert(
                    'Language',
                    'Select language',
                    [
                      { text: 'English', onPress: () => setLanguage('en') },
                      { text: 'Spanish', onPress: () => setLanguage('es') },
                      { text: 'French', onPress: () => setLanguage('fr') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <View style={styles.settingLeft}>
                  <Globe size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Language</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>
                    {language === 'en' ? 'English' : language === 'es' ? 'Spanish' : 'French'}
                  </Text>
                  <ChevronRight size={20} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  Alert.alert(
                    'Theme',
                    'Select theme',
                    [
                      { text: 'Default', onPress: () => setTheme('default') },
                      { text: 'Colorful', onPress: () => setTheme('colorful') },
                      { text: 'Minimal', onPress: () => setTheme('minimal') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <View style={styles.settingLeft}>
                  <Settings size={20} color={colors.text.secondary} />
                  <Text style={styles.settingLabel}>Theme</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>{theme}</Text>
                  <ChevronRight size={20} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delete Account */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.dangerCard}
              onPress={handleDeleteAccount}
            >
              <Trash2 size={24} color={colors.danger} />
              <View style={styles.dangerContent}>
                <Text style={styles.dangerTitle}>Delete Account</Text>
                <Text style={styles.dangerText}>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {relationship && relationship.status === 'verified' && (
            <View style={styles.section}>
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
                    onPress={async () => {
                      Alert.alert(
                        'End Relationship',
                        `Are you sure you want to end your relationship with ${relationship.partnerName}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'End Relationship',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await endRelationship(relationship.id, 'User requested to end relationship');
                                Alert.alert('Request Sent', 'Your partner will receive a request to confirm ending the relationship.');
                              } catch (error) {
                                Alert.alert('Error', 'Failed to send end relationship request');
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.dangerButtonText}>End Relationship</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.infoCard}>
            <Shield size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Your privacy settings control who can see your profile and
              relationship status. Keep your account secure by enabling two-factor authentication.
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
    backgroundColor: '#F8F9FA',
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
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  settingsList: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
  profilePhotoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profilePhotoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background.primary,
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
  editHint: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
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
  verificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationLabel: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500' as const,
  },
  verificationStatus: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  reverifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.primary + '10',
  },
  reverifyButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  statusBadge: {
    backgroundColor: colors.badge.pending,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.badge.pendingText,
  },
  statusBadgeTextVerified: {
    backgroundColor: colors.badge.verified,
    color: colors.badge.verifiedText,
  },
  dangerCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 2,
    borderColor: colors.danger + '30',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
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
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: colors.primary + '10',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
