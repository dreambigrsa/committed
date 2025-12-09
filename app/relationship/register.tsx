import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Heart, X, Search, CheckCircle2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { RelationshipType } from '@/types';

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'married', label: 'Married' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'serious', label: 'Serious Relationship' },
  { value: 'dating', label: 'Dating' },
];

export default function RegisterRelationshipScreen() {
  const router = useRouter();
  const { createRelationship, searchUsers } = useApp();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);
  
  const [formData, setFormData] = useState({
    partnerName: '',
    partnerPhone: '',
    partnerUserId: '',
    type: 'serious' as RelationshipType,
  });

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setTimeout(async () => {
      const results = await searchUsers(text);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setFormData({
      ...formData,
      partnerName: user.fullName,
      partnerPhone: user.phoneNumber || '',
      partnerUserId: user.id || undefined, // May be undefined for non-registered users
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleNext = () => {
    if (step === 1 && !formData.partnerName && !selectedUser) {
      alert('Please search and select a partner or enter partner\'s name');
      return;
    }
    if (step === 2 && !formData.partnerPhone && !selectedUser) {
      alert('Please enter partner\'s phone number');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      router.back();
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      // Use selected user's ID if available, otherwise use form data
      const partnerUserId = selectedUser?.id || formData.partnerUserId || undefined;
      await createRelationship(
        formData.partnerName,
        formData.partnerPhone,
        formData.type,
        partnerUserId
      );
      
      router.back();
    } catch (error) {
      console.error('Failed to register relationship:', error);
      alert('Failed to register relationship. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Register Relationship',
          presentation: 'modal',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
              </View>
              <Text style={styles.stepText}>Step {step} of 3</Text>
            </View>
            <View style={styles.iconContainer}>
              <Heart size={40} color={colors.danger} fill={colors.danger} />
            </View>
            <Text style={styles.title}>Register Your Relationship</Text>
            <Text style={styles.subtitle}>
              {step === 1 && "Let's start with your partner's information"}
              {step === 2 && "How can we reach your partner?"}
              {step === 3 && "What type of relationship is this?"}
            </Text>
          </View>

          <Animated.View 
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {step === 1 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Search Partner by Username, Name, or Phone</Text>
                <View style={styles.searchContainer}>
                  <Search size={20} color={colors.text.tertiary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by username, name, or phone..."
                    placeholderTextColor={colors.text.tertiary}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    autoFocus
                  />
                </View>

                {isSearching && (
                  <View style={styles.searchLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}

                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.searchResultItem}
                          onPress={() => handleSelectUser(item)}
                        >
                          {item.profilePicture ? (
                            <Image source={{ uri: item.profilePicture }} style={styles.resultAvatar} />
                          ) : (
                            <View style={styles.resultAvatarPlaceholder}>
                              <Text style={styles.resultAvatarText}>{item.fullName.charAt(0)}</Text>
                            </View>
                          )}
                          <View style={styles.resultInfo}>
                            <View style={styles.resultNameRow}>
                              <Text style={styles.resultName}>{item.fullName}</Text>
                              {item.username && (
                                <Text style={styles.resultUsername}>@{item.username}</Text>
                              )}
                              {!item.isRegisteredUser && (
                                <View style={styles.nonRegisteredBadge}>
                                  <Text style={styles.nonRegisteredText}>Not Registered</Text>
                                </View>
                              )}
                              {item.verifications?.phone && (
                                <CheckCircle2 size={16} color={colors.secondary} />
                              )}
                            </View>
                            {item.phoneNumber && (
                              <Text style={styles.resultPhone}>{item.phoneNumber}</Text>
                            )}
                            {!item.isRegisteredUser && item.relationshipType && (
                              <Text style={styles.resultRelationship}>
                                Partner in {item.relationshipType} relationship
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      )}
                      style={styles.searchResultsList}
                    />
                  </View>
                )}

                {selectedUser && (
                  <View style={styles.selectedUserCard}>
                    <View style={styles.selectedUserInfo}>
                      {selectedUser.profilePicture ? (
                        <Image source={{ uri: selectedUser.profilePicture }} style={styles.selectedAvatar} />
                      ) : (
                        <View style={styles.selectedAvatarPlaceholder}>
                          <Text style={styles.selectedAvatarText}>{selectedUser.fullName.charAt(0)}</Text>
                        </View>
                      )}
                      <View>
                        <View style={styles.selectedNameRow}>
                          <Text style={styles.selectedName}>{selectedUser.fullName}</Text>
                          {selectedUser.username && (
                            <Text style={styles.selectedUsername}>@{selectedUser.username}</Text>
                          )}
                        </View>
                        <Text style={styles.selectedPhone}>{selectedUser.phoneNumber}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.clearSelection}
                      onPress={() => {
                        setSelectedUser(null);
                        setFormData({ ...formData, partnerName: '', partnerPhone: '', partnerUserId: '' });
                      }}
                    >
                      <X size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}

                {!selectedUser && (
                  <>
                    <Text style={styles.orLabel}>OR</Text>
                    <Text style={styles.label}>Enter Partner&apos;s Full Name Manually</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter partner's name"
                      placeholderTextColor={colors.text.tertiary}
                      value={formData.partnerName}
                      onChangeText={(text) =>
                        setFormData({ ...formData, partnerName: text })
                      }
                      autoCapitalize="words"
                    />
                  </>
                )}
              </View>
            )}

            {step === 2 && !selectedUser && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Partner&apos;s Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.partnerPhone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, partnerPhone: text })
                  }
                  keyboardType="phone-pad"
                  autoFocus
                />
              </View>
            )}

            {step === 3 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Relationship Type</Text>
                <View style={styles.typeOptions}>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        formData.type === type.value && styles.typeOptionActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, type: type.value })
                      }
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          formData.type === type.value &&
                            styles.typeOptionTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Your partner will receive a notification to confirm this relationship.
                  Once confirmed, your relationship status will be verified and publicly
                  visible.
                </Text>
              </View>
            )}

            {step < 3 ? (
              <TouchableOpacity
                style={styles.button}
                onPress={handleNext}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <Text style={styles.buttonText}>Register Relationship</Text>
                )}
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border.light,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  stepText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
    flex: 1,
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
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  searchLoading: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchResults: {
    maxHeight: 300,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 12,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  resultAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  resultInfo: {
    flex: 1,
  },
  resultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  resultUsername: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  resultPhone: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  selectedAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  selectedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  selectedUsername: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  selectedPhone: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  clearSelection: {
    padding: 8,
  },
  nonRegisteredBadge: {
    backgroundColor: colors.accent + '30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  nonRegisteredText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: colors.accent,
  },
  resultRelationship: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  orLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    textAlign: 'center',
    marginVertical: 16,
  },
  typeOptions: {
    gap: 12,
  },
  typeOption: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  typeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  typeOptionTextActive: {
    color: colors.primary,
  },
  infoBox: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
});
