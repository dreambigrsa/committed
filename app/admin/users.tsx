import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Search, Shield, Ban, CheckCircle, XCircle, Edit2, Trash2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import colors from '@/constants/colors';
import { User } from '@/types';

export default function AdminUsersScreen() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedUsers: User[] = data.map((u: any) => ({
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          phoneNumber: u.phone_number,
          profilePicture: u.profile_picture,
          role: u.role,
          verifications: {
            phone: u.phone_verified,
            email: u.email_verified,
            id: u.id_verified,
          },
          createdAt: u.created_at,
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    Alert.alert(
      'Ban User',
      'Are you sure you want to ban this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.admin.updateUserById(userId, { ban_duration: 'infinity' });
              Alert.alert('Success', 'User has been banned');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to ban user');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = async (userId: string) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to permanently delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('users')
                .delete()
                .eq('id', userId);
              Alert.alert('Success', 'User has been deleted');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleVerifyUser = async (userId: string, verificationType: 'phone' | 'email' | 'id') => {
    try {
      const updateData: any = {};
      if (verificationType === 'phone') updateData.phone_verified = true;
      if (verificationType === 'email') updateData.email_verified = true;
      if (verificationType === 'id') updateData.id_verified = true;

      await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      Alert.alert('Success', `User ${verificationType} verified`);
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to verify user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Users', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access Denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Manage Users', headerShown: true }} />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{users.length}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {users.filter(u => u.verifications.phone).length}
              </Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
              </Text>
              <Text style={styles.statLabel}>Admins</Text>
            </View>
          </View>

          <View style={styles.usersList}>
            {filteredUsers.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <Image
                    source={{ uri: user.profilePicture || 'https://via.placeholder.com/100' }}
                    style={styles.userAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{user.fullName}</Text>
                      {user.verifications.id && (
                        <CheckCircle size={16} color={colors.secondary} />
                      )}
                    </View>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userPhone}>{user.phoneNumber}</Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleText}>{user.role.replace('_', ' ')}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.verificationsRow}>
                  <TouchableOpacity
                    style={[styles.verificationBadge, user.verifications.phone && styles.verified]}
                    onPress={() => !user.verifications.phone && handleVerifyUser(user.id, 'phone')}
                  >
                    <Text style={styles.verificationText}>
                      Phone {user.verifications.phone ? '✓' : '✗'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.verificationBadge, user.verifications.email && styles.verified]}
                    onPress={() => !user.verifications.email && handleVerifyUser(user.id, 'email')}
                  >
                    <Text style={styles.verificationText}>
                      Email {user.verifications.email ? '✓' : '✗'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.verificationBadge, user.verifications.id && styles.verified]}
                    onPress={() => !user.verifications.id && handleVerifyUser(user.id, 'id')}
                  >
                    <Text style={styles.verificationText}>
                      ID {user.verifications.id ? '✓' : '✗'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {user.id !== currentUser.id && (
                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.banButton]}
                      onPress={() => handleBanUser(user.id)}
                    >
                      <Ban size={16} color={colors.text.white} />
                      <Text style={styles.actionButtonText}>Ban</Text>
                    </TouchableOpacity>
                    {currentUser.role === 'super_admin' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 size={16} color={colors.text.white} />
                        <Text style={styles.actionButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: colors.text.primary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  usersList: {
    padding: 16,
    gap: 16,
  },
  userCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  verificationsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  verificationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.background.secondary,
  },
  verified: {
    backgroundColor: colors.secondary + '20',
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  banButton: {
    backgroundColor: colors.danger,
  },
  deleteButton: {
    backgroundColor: '#8B0000',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
});
