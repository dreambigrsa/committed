import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Smartphone, Trash2, CheckCircle2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useColors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function SessionsScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { isDark } = useTheme();
  const colors = useColors();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [currentUser]);

  const loadSessions = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Load from user_sessions table
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .order('last_active', { ascending: false });

      if (error) {
        // Fallback: create a session entry for current device
        if (currentSession) {
          setSessions([{
            id: currentSession.id || `session-current-${Date.now()}`,
            device: 'Current Device',
            lastActive: new Date().toISOString(),
            isCurrent: true,
          }]);
        }
        return;
      }

      const formattedSessions = (data || []).map((s: any, index: number) => ({
        id: s.id || `session-${index}`,
        device: s.device_info || 'Unknown Device',
        lastActive: s.last_active,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        isCurrent: s.session_token === currentSession?.access_token,
      }));

      // If no sessions found, add current one
      if (formattedSessions.length === 0 && currentSession) {
        formattedSessions.push({
          id: currentSession.id || `session-current-${Date.now()}`,
          device: 'Current Device',
          lastActive: new Date().toISOString(),
          isCurrent: true,
        });
      }

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      Alert.alert('Error', 'You cannot revoke your current session');
      return;
    }

    Alert.alert(
      'Revoke Session',
      'Are you sure you want to revoke this session? The device will be logged out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_sessions')
                .update({ is_active: false })
                .eq('id', sessionId);

              if (error) throw error;

              setSessions(sessions.filter(s => s.id !== sessionId));
              Alert.alert('Success', 'Session revoked successfully');
            } catch (error) {
              console.error('Failed to revoke session:', error);
              Alert.alert('Error', 'Failed to revoke session');
            }
          }
        }
      ]
    );
  };

  const handleRevokeAllSessions = () => {
    Alert.alert(
      'Revoke All Sessions',
      'This will log you out from all devices except this one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              
              const { error } = await supabase
                .from('user_sessions')
                .update({ is_active: false })
                .eq('user_id', currentUser?.id)
                .neq('session_token', currentSession?.access_token || '');

              if (error) throw error;

              setSessions(sessions.filter(s => s.isCurrent));
              Alert.alert('Success', 'All other sessions have been revoked');
            } catch (error) {
              console.error('Failed to revoke sessions:', error);
              Alert.alert('Error', 'Failed to revoke sessions');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Active Sessions',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Active Sessions',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.background.primary }]}>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            You are currently logged in on {sessions.length} device{sessions.length !== 1 ? 's' : ''}. 
            You can revoke access for any device you don't recognize.
          </Text>
        </View>

        <FlatList
          data={sessions}
          keyExtractor={(item, index) => item.id || `session-${index}`}
          renderItem={({ item }) => (
            <View style={[styles.sessionCard, { backgroundColor: colors.background.primary }]}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionLeft}>
                  <Smartphone size={24} color={colors.primary} />
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionTitleRow}>
                      <Text style={[styles.sessionDevice, { color: colors.text.primary }]}>
                        {item.device}
                      </Text>
                      {item.isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: colors.secondary + '20' }]}>
                          <CheckCircle2 size={14} color={colors.secondary} />
                          <Text style={[styles.currentBadgeText, { color: colors.secondary }]}>
                            Current
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.sessionTime, { color: colors.text.secondary }]}>
                      Last active: {formatDate(item.lastActive)}
                    </Text>
                    {item.ipAddress && (
                      <Text style={[styles.sessionIP, { color: colors.text.tertiary }]}>
                        IP: {item.ipAddress}
                      </Text>
                    )}
                  </View>
                </View>
                {!item.isCurrent && (
                  <TouchableOpacity
                    style={styles.revokeButton}
                    onPress={() => handleRevokeSession(item.id, item.isCurrent)}
                  >
                    <Trash2 size={20} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          scrollEnabled={false}
        />

        {sessions.filter(s => !s.isCurrent).length > 0 && (
          <TouchableOpacity
            style={[styles.revokeAllButton, { backgroundColor: colors.danger }]}
            onPress={handleRevokeAllSessions}
          >
            <Text style={styles.revokeAllButtonText}>Revoke All Other Sessions</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sessionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sessionDevice: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionTime: {
    fontSize: 14,
  },
  sessionIP: {
    fontSize: 12,
  },
  revokeButton: {
    padding: 8,
  },
  revokeAllButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  revokeAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

