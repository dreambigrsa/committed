import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Award, Share2, Camera, CheckCircle2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export default function CertificateScreen() {
  const { relationshipId } = useLocalSearchParams();
  const { currentUser } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [certificate, setCertificate] = useState<any>(null);
  const [relationship, setRelationship] = useState<any>(null);
  const [verificationSelfie, setVerificationSelfie] = useState<string | null>(null);

  useEffect(() => {
    loadCertificate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationshipId]);

  const loadCertificate = async () => {
    try {
      const { data: relData } = await supabase
        .from('relationships')
        .select('*')
        .eq('id', relationshipId)
        .single();

      setRelationship(relData);

      const { data: certData } = await supabase
        .from('couple_certificates')
        .select('*')
        .eq('relationship_id', relationshipId)
        .single();

      if (certData) {
        setCertificate(certData);
        setVerificationSelfie(certData.verification_selfie_url);
      }
    } catch (error) {
      console.error('Failed to load certificate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCertificate = async () => {
    if (!relationship || !currentUser) return;

    setIsLoading(true);
    try {
      const certificateUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${relationshipId}`;

      const { data, error } = await supabase
        .from('couple_certificates')
        .insert({
          relationship_id: relationshipId as string,
          certificate_url: certificateUrl,
          verification_selfie_url: verificationSelfie,
          issued_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setCertificate(data);
      Alert.alert('Success', 'Certificate generated successfully!');
    } catch (error) {
      console.error('Failed to generate certificate:', error);
      Alert.alert('Error', 'Failed to generate certificate');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadVerificationSelfie = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to take a verification selfie.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const fileName = `verification_${Date.now()}.jpg`;
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const { error } = await supabase.storage
          .from('media')
          .upload(fileName, uint8Array, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);

        setVerificationSelfie(publicUrl);

        if (certificate) {
          await supabase
            .from('couple_certificates')
            .update({ verification_selfie_url: publicUrl })
            .eq('id', certificate.id);
        }

        Alert.alert('Success', 'Verification selfie uploaded!');
      } catch (error) {
        console.error('Failed to upload selfie:', error);
        Alert.alert('Error', 'Failed to upload selfie');
      }
    }
  };

  const shareCertificate = async () => {
    if (!certificate) return;

    try {
      await Share.share({
        message: `Check out our verified relationship certificate! ${certificate.certificate_url}`,
        title: 'Relationship Certificate',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Certificate' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Relationship Certificate' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {certificate ? (
            <>
              <View style={styles.certificateCard}>
                <View style={styles.certificateHeader}>
                  <Award size={48} color={colors.primary} />
                  <Text style={styles.certificateTitle}>Official Relationship Certificate</Text>
                </View>

                <View style={styles.certificateBody}>
                  <Text style={styles.certificateLabel}>This certifies that</Text>
                  <Text style={styles.partnerName}>{relationship?.partner_name}</Text>
                  <Text style={styles.certificateLabel}>and</Text>
                  <Text style={styles.partnerName}>{currentUser?.fullName}</Text>
                  <Text style={styles.certificateLabel}>are in a verified relationship</Text>

                  <View style={styles.detailsRow}>
                    <Text style={styles.detailLabel}>Relationship Type:</Text>
                    <Text style={styles.detailValue}>
                      {relationship?.type.charAt(0).toUpperCase() + relationship?.type.slice(1)}
                    </Text>
                  </View>

                  <View style={styles.detailsRow}>
                    <Text style={styles.detailLabel}>Start Date:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(relationship?.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailsRow}>
                    <Text style={styles.detailLabel}>Verified Date:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                {verificationSelfie && (
                  <View style={styles.selfieSection}>
                    <Text style={styles.selfieLabel}>Verification Photo</Text>
                    <Image
                      source={{ uri: verificationSelfie }}
                      style={styles.selfieImage}
                      contentFit="cover"
                    />
                  </View>
                )}

                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={20} color={colors.secondary} />
                  <Text style={styles.verifiedText}>Verified Relationship</Text>
                </View>
              </View>

              <View style={styles.actions}>
                {!verificationSelfie && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={uploadVerificationSelfie}
                  >
                    <Camera size={20} color={colors.primary} />
                    <Text style={styles.actionButtonText}>Add Verification Photo</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={shareCertificate}
                >
                  <Share2 size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Share Certificate</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noCertificate}>
              <Award size={80} color={colors.text.tertiary} strokeWidth={1.5} />
              <Text style={styles.noCertificateTitle}>No Certificate Yet</Text>
              <Text style={styles.noCertificateText}>
                Generate an official certificate for your verified relationship
              </Text>

              {verificationSelfie ? (
                <View style={styles.previewSelfie}>
                  <Text style={styles.previewLabel}>Verification Photo Ready</Text>
                  <Image
                    source={{ uri: verificationSelfie }}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selfieButton}
                  onPress={uploadVerificationSelfie}
                >
                  <Camera size={24} color={colors.primary} />
                  <Text style={styles.selfieButtonText}>Take Verification Photo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  !verificationSelfie && styles.generateButtonDisabled,
                ]}
                onPress={generateCertificate}
                disabled={!verificationSelfie}
              >
                <Text style={styles.generateButtonText}>Generate Certificate</Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  certificateCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  certificateHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  certificateTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 12,
  },
  certificateBody: {
    alignItems: 'center',
    marginBottom: 24,
  },
  certificateLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    marginVertical: 8,
  },
  partnerName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.primary,
    marginVertical: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '600' as const,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600' as const,
  },
  selfieSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selfieLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  selfieImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.badge.verified,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  verifiedText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.badge.verifiedText,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.background.primary,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  noCertificate: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noCertificateTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  noCertificateText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  previewSelfie: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.secondary,
    marginBottom: 12,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  selfieButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  selfieButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  generateButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
});
