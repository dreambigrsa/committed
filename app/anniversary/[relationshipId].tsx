import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Calendar, Heart, Plus, Bell, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

interface Anniversary {
  id: string;
  relationship_id: string;
  anniversary_date: string;
  reminder_sent: boolean;
  created_at: string;
}

export default function AnniversaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const relationshipId = params.relationshipId as string;
  const { currentUser, getCurrentUserRelationship } = useApp();
  const relationship = getCurrentUserRelationship();

  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAnniversaries();
  }, [relationshipId]);

  const loadAnniversaries = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('anniversaries')
        .select('*')
        .eq('relationship_id', relationshipId)
        .order('anniversary_date', { ascending: true });

      if (data) {
        setAnniversaries(data);
      }
    } catch (error) {
      console.error('Failed to load anniversaries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [relationshipId]);

  const handleCreateAnniversary = async () => {
    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('anniversaries')
        .insert({
          relationship_id: relationshipId,
          anniversary_date: selectedDate.toISOString(),
          reminder_sent: false,
        });

      if (error) throw error;

      Alert.alert('Success', 'Anniversary reminder added!');
      setShowDatePicker(false);
      loadAnniversaries();
    } catch (error) {
      console.error('Failed to create anniversary:', error);
      Alert.alert('Error', 'Failed to add anniversary reminder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAnniversary = async (id: string) => {
    try {
      await supabase
        .from('anniversaries')
        .delete()
        .eq('id', id);

      loadAnniversaries();
    } catch (error) {
      console.error('Failed to delete anniversary:', error);
    }
  };

  const calculateDaysUntil = (date: string) => {
    const today = new Date();
    const anniversaryDate = new Date(date);
    const diffTime = anniversaryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Anniversaries' }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!relationship) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Anniversaries' }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              No relationship found
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const relationshipStartDate = new Date(relationship.startDate);
  const daysTogether = Math.floor(
    (Date.now() - relationshipStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Anniversaries' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.summaryCard}>
            <Heart size={48} color={colors.danger} fill={colors.danger} />
            <Text style={styles.summaryTitle}>
              {currentUser?.fullName} & {relationship.partnerName}
            </Text>
            <Text style={styles.summarySubtitle}>Together for {daysTogether} days</Text>
            <Text style={styles.summaryDate}>
              Since {relationshipStartDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Anniversary Reminders</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Plus size={20} color={colors.text.white} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {anniversaries.length > 0 ? (
            <View style={styles.anniversariesList}>
              {anniversaries.map((anniversary) => {
                const daysUntil = calculateDaysUntil(anniversary.anniversary_date);
                const isPast = daysUntil < 0;
                const isToday = daysUntil === 0;

                return (
                  <View key={anniversary.id} style={styles.anniversaryCard}>
                    <View style={styles.anniversaryIcon}>
                      <Calendar size={24} color={isToday ? colors.danger : colors.primary} />
                    </View>
                    <View style={styles.anniversaryInfo}>
                      <Text style={styles.anniversaryDate}>
                        {new Date(anniversary.anniversary_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.anniversaryDays,
                          isToday && styles.anniversaryDaysToday,
                          isPast && styles.anniversaryDaysPast,
                        ]}
                      >
                        {isToday
                          ? 'Today! 🎉'
                          : isPast
                          ? `${Math.abs(daysUntil)} days ago`
                          : `In ${daysUntil} days`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteAnniversary(anniversary.id)}
                      style={styles.deleteButton}
                    >
                      <X size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Bell size={48} color={colors.text.tertiary} strokeWidth={1.5} />
              <Text style={styles.emptyStateTitle}>No Reminders Yet</Text>
              <Text style={styles.emptyStateText}>
                Add anniversary reminders to celebrate your special moments
              </Text>
            </View>
          )}

          {showDatePicker && (
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerCard}>
                <Text style={styles.datePickerTitle}>Select Anniversary Date</Text>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) setSelectedDate(date);
                  }}
                  minimumDate={new Date()}
                />
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleCreateAnniversary}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <ActivityIndicator color={colors.text.white} size="small" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Add Reminder</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    marginTop: 8,
  },
  summaryDate: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  anniversariesList: {
    gap: 12,
  },
  anniversaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  anniversaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anniversaryInfo: {
    flex: 1,
  },
  anniversaryDate: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  anniversaryDays: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  anniversaryDaysToday: {
    color: colors.danger,
    fontWeight: '700' as const,
  },
  anniversaryDaysPast: {
    color: colors.text.tertiary,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  datePickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
});
