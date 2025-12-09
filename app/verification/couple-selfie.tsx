import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { trpcClient } from '@/lib/trpc';

export default function CoupleSelfieVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const relationshipId = params.relationshipId as string;
  const { currentUser } = useApp();
  
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelfieUri(result.assets[0].uri);
    }
  };

  const handleSubmitVerification = async () => {
    if (!selfieUri) {
      Alert.alert('Error', 'Please take a couple selfie first');
      return;
    }

    setIsUploading(true);
    try {
      const certificateData = await trpcClient.certificates.create.mutate({
        relationshipId,
        verificationSelfieUrl: selfieUri,
      });

      Alert.alert(
        'Success',
        'Your couple verification has been submitted! Certificate will be available soon.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to submit verification:', error);
      Alert.alert('Error', 'Failed to submit verification. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Couple Verification',
          presentation: 'modal',
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Couple Selfie Verification</Text>
            <Text style={styles.subtitle}>
              Take a selfie together with your partner to get a verified couple badge
            </Text>
          </View>

          {selfieUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selfieUri }} style={styles.image} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={pickImage}
              >
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={pickImage}
            >
              <Camera size={48} color={colors.primary} />
              <Text style={styles.cameraButtonText}>Take Couple Selfie</Text>
            </TouchableOpacity>
          )}

          <View style={styles.guidelinesCard}>
            <Text style={styles.guidelinesTitle}>Guidelines</Text>
            <Text style={styles.guidelineText}>
              • Both partners should be clearly visible
            </Text>
            <Text style={styles.guidelineText}>
              • Faces should be unobstructed
            </Text>
            <Text style={styles.guidelineText}>
              • Good lighting is important
            </Text>
            <Text style={styles.guidelineText}>
              • Make it genuine and natural
            </Text>
          </View>

          {selfieUri && (
            <TouchableOpacity
              style={[styles.submitButton, isUploading && styles.submitButtonDisabled]}
              onPress={handleSubmitVerification}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color={colors.text.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit for Verification</Text>
              )}
            </TouchableOpacity>
          )}
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  cameraButton: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed' as const,
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  imageContainer: {
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 16,
  },
  retakeButton: {
    backgroundColor: colors.background.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  guidelinesCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  guidelinesTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 16,
  },
  guidelineText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
});
