import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import {
  IdCard,
  ArrowLeft,
  CheckCircle2,
  Camera,
  Upload,
  FileText,
  X,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';

export default function IdVerificationScreen() {
  const router = useRouter();
  const { currentUser, updateUserProfile } = useApp();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos'
        );
        return false;
      }
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSelectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSelectDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets[0]) {
        if (result.assets[0].mimeType?.startsWith('image/')) {
          setSelectedImage(result.assets[0].uri);
        } else {
          Alert.alert(
            'File Selected',
            'Document uploaded. Please note: Only images can be previewed.',
            [{ text: 'OK' }]
          );
          setSelectedImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select or take a photo of your ID');
      return;
    }

    setIsUploading(true);

    setTimeout(async () => {
      await updateUserProfile({
        verifications: {
          ...currentUser!.verifications,
          id: true,
        },
      });
      setIsUploading(false);
      Alert.alert(
        'Success',
        'ID verification submitted! Your document is being reviewed.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }, 2000);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'ID Verification',
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
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <IdCard size={40} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Upload Government ID</Text>
            <Text style={styles.subtitle}>
              Upload a photo of your driver&apos;s license, passport, or government-issued
              ID for identity verification
            </Text>
          </View>

          {selectedImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveImage}
              >
                <X size={20} color={colors.text.white} />
              </TouchableOpacity>
              <View style={styles.previewLabel}>
                <CheckCircle2 size={16} color={colors.secondary} />
                <Text style={styles.previewLabelText}>ID Selected</Text>
              </View>
            </View>
          ) : (
            <View style={styles.uploadOptions}>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.uploadOption}
                  onPress={handleTakePhoto}
                >
                  <View style={styles.uploadIconContainer}>
                    <Camera size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.uploadOptionTitle}>Take Photo</Text>
                  <Text style={styles.uploadOptionDescription}>
                    Use your camera to capture your ID
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.uploadOption}
                onPress={handleSelectImage}
              >
                <View style={styles.uploadIconContainer}>
                  <Upload size={32} color={colors.primary} />
                </View>
                <Text style={styles.uploadOptionTitle}>Upload Photo</Text>
                <Text style={styles.uploadOptionDescription}>
                  Choose an image from your gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadOption}
                onPress={handleSelectDocument}
              >
                <View style={styles.uploadIconContainer}>
                  <FileText size={32} color={colors.primary} />
                </View>
                <Text style={styles.uploadOptionTitle}>Select Document</Text>
                <Text style={styles.uploadOptionDescription}>
                  Upload a PDF or image file
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedImage || isUploading) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedImage || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <>
                <CheckCircle2 size={20} color={colors.text.white} />
                <Text style={styles.submitButtonText}>Submit for Verification</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Accepted Documents</Text>
              <Text style={styles.infoText}>
                • Driver&apos;s License{'\n'}
                • Passport{'\n'}
                • National ID Card{'\n'}
                • State ID
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Tips for Best Results</Text>
              <Text style={styles.infoText}>
                • Ensure all text is clearly visible{'\n'}
                • Take photo in good lighting{'\n'}
                • Avoid glare and shadows{'\n'}
                • Make sure ID is not expired
              </Text>
            </View>

            <View style={[styles.infoCard, styles.securityCard]}>
              <Text style={styles.infoTitle}>Your Privacy is Protected</Text>
              <Text style={styles.infoText}>
                Your ID is encrypted and only used for verification. We never share
                your personal documents with third parties.
              </Text>
            </View>
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
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  previewContainer: {
    position: 'relative',
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  previewImage: {
    width: '100%',
    height: 240,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.badge.verified,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewLabelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.badge.verifiedText,
  },
  uploadOptions: {
    gap: 12,
    marginBottom: 24,
  },
  uploadOption: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadOptionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  uploadOptionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  infoCards: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  securityCard: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary + '30',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
