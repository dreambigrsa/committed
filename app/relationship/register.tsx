import React, { useState } from 'react';
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Heart, X } from 'lucide-react-native';
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
  const { createRelationship } = useApp();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    partnerName: '',
    partnerPhone: '',
    type: 'serious' as RelationshipType,
  });

  const handleRegister = async () => {
    if (!formData.partnerName || !formData.partnerPhone) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await createRelationship(
        formData.partnerName,
        formData.partnerPhone,
        formData.type
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
            <TouchableOpacity onPress={() => router.back()}>
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
            <View style={styles.iconContainer}>
              <Heart size={40} color={colors.danger} fill={colors.danger} />
            </View>
            <Text style={styles.title}>Register Your Relationship</Text>
            <Text style={styles.subtitle}>
              Your partner will need to confirm this relationship for it to become
              verified
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Partner&apos;s Full Name</Text>
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
            </View>

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
              />
            </View>

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

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Your partner will receive a notification to confirm this relationship.
                Once confirmed, your relationship status will be verified and publicly
                visible.
              </Text>
            </View>

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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    flexGrow: 1,
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
  typeOptions: {
    gap: 12,
  },
  typeOption: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.border.light,
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
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
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
