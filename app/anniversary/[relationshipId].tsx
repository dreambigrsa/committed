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
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Calendar, Heart, Bell, Gift, Cake } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function AnniversaryScreen() {
  const { relationshipId } = useLocalSearchParams();
  const { currentUser } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [relationship, setRelationship] = useState<any>(null);
  const [anniversaries, setAnniversaries] = useState<any[]>([]);
  const [upcomingAnniversary, setUpcomingAnniversary] = useState<any>(null);

  useEffect(() => {
    loadAnniversaryData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationshipId]);

  const loadAnniversaryData = async () => {
    try {
      const { data: relData } = await supabase
        .from('relationships')
        .select('*')
        .eq('id', relationshipId)
        .single();

      setRelationship(relData);

      if (relData) {
        calculateAnniversaries(relData.start_date);
      }

      const { data: annivData } = await supabase
        .from('anniversaries')
        .select('*')
        .eq('relationship_id', relationshipId)
        .order('anniversary_date', { ascending: false });

      if (annivData) {
        setAnniversaries(annivData);
      }
    } catch (error) {
      console.error('Failed to load anniversary data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAnniversaries = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    
    const nextAnniversaryDate = new Date(start);
    nextAnniversaryDate.setMonth(nextAnniversaryDate.getMonth() + monthsDiff + 1);
    
    const daysUntil = Math.ceil((nextAnniversaryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    setUpcomingAnniversary({
      date: nextAnniversaryDate,
      months: monthsDiff + 1,
      daysUntil,
    });
  };

  const createAnniversaryReminder = async () => {
    if (!upcomingAnniversary || !currentUser) return;

    try {
      const { error } = await supabase
        .from('anniversaries')
        .insert({
          relationship_id: relationshipId as string,
          anniversary_date: upcomingAnniversary.date.toISOString(),
          reminder_sent: false,
        });

      if (error) throw error;

      await supabase
        .from('notifications')
        .insert({
          user_id: currentUser.id,
          type: 'relationship_verified',
          title: 'Anniversary Reminder Set',
          message: `You'll be reminded about your ${upcomingAnniversary.months} month anniversary on ${upcomingAnniversary.date.toLocaleDateString()}`,
          read: false,
        });

      Alert.alert('Success', 'Anniversary reminder has been set!');
      loadAnniversaryData();
    } catch (error) {
      console.error('Failed to create reminder:', error);
      Alert.alert('Error', 'Failed to create anniversary reminder');
    }
  };

  const getMilestoneIcon = (months: number) => {
    if (months % 12 === 0) return <Cake size={24} color={colors.primary} />;
    if (months === 6) return <Gift size={24} color={colors.accent} />;
    return <Heart size={24} color={colors.danger} />;
  };

  const getMilestoneLabel = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0 && remainingMonths === 0) {
      return `${years} Year${years > 1 ? 's' : ''}`;
    } else if (years > 0) {
      return `${years} Year${years > 1 ? 's' : ''} ${remainingMonths} Month${remainingMonths > 1 ? 's' : ''}`;
    }
    return `${months} Month${months > 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Anniversaries' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Anniversary Tracker' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {upcomingAnniversary && (
            <View style={styles.upcomingCard}>
              <View style={styles.upcomingHeader}>
                <Calendar size={32} color={colors.primary} />
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingLabel}>Next Anniversary</Text>
                  <Text style={styles.upcomingTitle}>
                    {getMilestoneLabel(upcomingAnniversary.months)}
                  </Text>
                </View>
              </View>

              <View style={styles.countdownContainer}>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownNumber}>{upcomingAnniversary.daysUntil}</Text>
                  <Text style={styles.countdownLabel}>Days</Text>
                </View>
                <Text style={styles.countdownDate}>
                  {upcomingAnniversary.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.reminderButton}
                onPress={createAnniversaryReminder}
              >
                <Bell size={20} color={colors.text.white} />
                <Text style={styles.reminderButtonText}>Set Reminder</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Relationship Timeline</Text>

            {relationship && (
              <View style={styles.timelineCard}>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineIcon}>
                    <Heart size={20} color={colors.danger} fill={colors.danger} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Relationship Started</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(relationship.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                {relationship.verified_date && (
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineIcon}>
                      <Bell size={20} color={colors.secondary} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>Relationship Verified</Text>
                      <Text style={styles.timelineDate}>
                        {new Date(relationship.verified_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {anniversaries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Past Milestones</Text>
              {anniversaries.map((anniversary, index) => {
                const months = Math.floor(
                  (new Date(anniversary.anniversary_date).getTime() - 
                   new Date(relationship.start_date).getTime()) / 
                  (1000 * 60 * 60 * 24 * 30)
                );

                return (
                  <View key={anniversary.id} style={styles.milestoneCard}>
                    <View style={styles.milestoneIcon}>
                      {getMilestoneIcon(months)}
                    </View>
                    <View style={styles.milestoneContent}>
                      <Text style={styles.milestoneTitle}>
                        {getMilestoneLabel(months)}
                      </Text>
                      <Text style={styles.milestoneDate}>
                        {new Date(anniversary.anniversary_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    {anniversary.reminder_sent && (
                      <View style={styles.reminderBadge}>
                        <Bell size={16} color={colors.secondary} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.infoCard}>
            <Heart size={20} color={colors.danger} />
            <Text style={styles.infoText}>
              Track your relationship milestones and get reminded about important anniversaries. 
              Celebrate every moment together!
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  upcomingCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  upcomingTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  countdownLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600' as const,
  },
  countdownDate: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  reminderButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 16,
  },
  timelineCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  milestoneCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  milestoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  milestoneDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  reminderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.badge.verified,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
