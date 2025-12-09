import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Heart, Shield } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { mockUsers } from '@/mocks/users';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();
  const { getUserRelationship } = useApp();
  
  const user = mockUsers.find((u) => u.id === userId);
  const relationship = user ? getUserRelationship(user.id) : null;

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getRelationshipTypeLabel = (type: string) => {
    const labels = {
      married: 'Married',
      engaged: 'Engaged',
      serious: 'Serious Relationship',
      dating: 'Dating',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {user.fullName.charAt(0)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{user.fullName}</Text>
              {user.verifications.phone && (
                <CheckCircle2 size={20} color={colors.secondary} />
              )}
            </View>

            <View style={styles.verificationBadges}>
              {user.verifications.phone && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Phone Verified</Text>
                </View>
              )}
              {user.verifications.email && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Email Verified</Text>
                </View>
              )}
              {user.verifications.id && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>ID Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Heart size={20} color={colors.danger} />
              <Text style={styles.cardTitle}>Relationship Status</Text>
            </View>
          </View>

          {relationship ? (
            <>
              <View
                style={[
                  styles.statusBanner,
                  relationship.status === 'verified'
                    ? styles.statusBannerVerified
                    : styles.statusBannerPending,
                ]}
              >
                <Shield size={20} color={relationship.status === 'verified' ? colors.secondary : colors.accent} />
                <Text
                  style={[
                    styles.statusBannerText,
                    relationship.status === 'verified'
                      ? styles.statusTextVerified
                      : styles.statusTextPending,
                  ]}
                >
                  {relationship.status === 'verified'
                    ? 'Verified Relationship'
                    : 'Pending Verification'}
                </Text>
              </View>

              <View style={styles.relationshipDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>
                    In a {getRelationshipTypeLabel(relationship.type).toLowerCase()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Partner</Text>
                  <Text style={styles.detailValue}>{relationship.partnerName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Since</Text>
                  <Text style={styles.detailValue}>
                    {new Date(relationship.startDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                {relationship.status === 'verified' && relationship.verifiedDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Verified On</Text>
                    <Text style={styles.detailValue}>
                      {new Date(relationship.verifiedDate).toLocaleDateString(
                        'en-US',
                        {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      )}
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noRelationship}>
              <Heart size={48} color={colors.text.tertiary} strokeWidth={1.5} />
              <Text style={styles.noRelationshipText}>
                No registered relationship
              </Text>
            </View>
          )}
        </View>

        {relationship && relationship.status === 'verified' && (
          <View style={styles.infoCard}>
            <Shield size={18} color={colors.secondary} />
            <Text style={styles.infoText}>
              This relationship has been verified by both partners. The information
              displayed is accurate as of the verification date.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  profileInfo: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  verificationBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: colors.badge.verified,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.badge.verifiedText,
  },
  card: {
    backgroundColor: colors.background.primary,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerVerified: {
    backgroundColor: colors.badge.verified,
  },
  statusBannerPending: {
    backgroundColor: colors.badge.pending,
  },
  statusBannerText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  statusTextVerified: {
    color: colors.badge.verifiedText,
  },
  statusTextPending: {
    color: colors.badge.pendingText,
  },
  relationshipDetails: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '500' as const,
  },
  detailValue: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '600' as const,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  noRelationship: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noRelationshipText: {
    fontSize: 15,
    color: colors.text.secondary,
    marginTop: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.background.primary,
    marginHorizontal: 20,
    marginBottom: 16,
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
});
