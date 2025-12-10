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
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Users, UserX, UserPlus } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useColors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { currentUser, searchUsers } = useApp();
  const { isDark } = useTheme();
  const colors = useColors();
  
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlockedUsers();
  }, [currentUser]);

  const loadBlockedUsers = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          blocked_id,
          created_at,
          users:blocked_id (
            id,
            full_name,
            profile_picture,
            username
          )
        `)
        .eq('blocker_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          setBlockedUsers([]);
          return;
        }
        throw error;
      }

      if (data) {
        const formatted = data.map((item: any) => ({
          id: item.blocked_id,
          blockedAt: item.created_at,
          ...(item.users || {}),
        }));
        setBlockedUsers(formatted);
      }
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string, userName: string) => {
    if (!currentUser) return;

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('blocked_users')
                .delete()
                .eq('blocker_id', currentUser.id)
                .eq('blocked_id', userId);

              if (error) throw error;

              setBlockedUsers(blockedUsers.filter(u => u.id !== userId));
              Alert.alert('Success', `${userName} has been unblocked`);
            } catch (error) {
              console.error('Failed to unblock user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          }
        }
      ]
    );
  };

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBlockUser = () => {
    setShowSearchModal(true);
  };

  const handleSearchAndBlock = async () => {
    if (!searchQuery.trim() || !currentUser) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    try {
      const results = await searchUsers(searchQuery);
      if (results.length === 0) {
        Alert.alert('Not Found', 'No users found matching your search');
        setShowSearchModal(false);
        setSearchQuery('');
        return;
      }

      if (results.length === 1) {
        const user = results[0];
        if (user.id === currentUser.id) {
          Alert.alert('Error', 'You cannot block yourself');
          setShowSearchModal(false);
          setSearchQuery('');
          return;
        }
        await blockUser(user.id, user.fullName);
        setShowSearchModal(false);
        setSearchQuery('');
      } else {
        // Show selection dialog
        Alert.alert(
          'Select User',
          'Multiple users found. Please select one:',
          results.map((user: any) => ({
            text: user.fullName,
            onPress: () => {
              if (user.id === currentUser.id) {
                Alert.alert('Error', 'You cannot block yourself');
                return;
              }
              blockUser(user.id, user.fullName);
              setShowSearchModal(false);
              setSearchQuery('');
            }
          })).concat([{ text: 'Cancel', style: 'cancel', onPress: () => {
            setShowSearchModal(false);
            setSearchQuery('');
          } }])
        );
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      Alert.alert('Error', 'Failed to search users');
      setShowSearchModal(false);
      setSearchQuery('');
    }
  };

  const blockUser = async (userId: string, userName: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUser.id,
          blocked_id: userId,
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already Blocked', 'This user is already blocked');
          return;
        }
        throw error;
      }

      // Reload blocked users
      await loadBlockedUsers();
      Alert.alert('Success', `${userName} has been blocked`);
    } catch (error) {
      console.error('Failed to block user:', error);
      Alert.alert('Error', 'Failed to block user');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Blocked Users',
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
          title: 'Blocked Users',
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
        <TouchableOpacity
          style={[styles.blockButton, { backgroundColor: colors.primary }]}
          onPress={handleBlockUser}
        >
          <UserX size={20} color={colors.text.white} />
          <Text style={styles.blockButtonText}>Block User</Text>
        </TouchableOpacity>

        {blockedUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={64} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No Blocked Users
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Users you block won't be able to see your profile or contact you.
            </Text>
          </View>
        ) : (
          <FlatList
            data={blockedUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.userCard, { backgroundColor: colors.background.primary }]}>
                <View style={styles.userLeft}>
                  {item.profile_picture ? (
                    <Image
                      source={{ uri: item.profile_picture }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>
                        {item.full_name?.charAt(0) || '?'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text.primary }]}>
                      {item.full_name || 'Unknown User'}
                    </Text>
                    {item.username && (
                      <Text style={[styles.username, { color: colors.text.secondary }]}>
                        @{item.username}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unblockButton}
                  onPress={() => handleUnblock(item.id, item.full_name || 'User')}
                >
                  <UserPlus size={20} color={colors.secondary} />
                  <Text style={[styles.unblockButtonText, { color: colors.secondary }]}>
                    Unblock
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            scrollEnabled={false}
          />
        )}

        {/* Search Modal */}
        <Modal
          visible={showSearchModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowSearchModal(false);
            setSearchQuery('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background.primary }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Block User
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
                Enter username, name, or phone number
              </Text>
              <TextInput
                style={[styles.searchInput, { 
                  backgroundColor: colors.background.secondary, 
                  borderColor: colors.border.light,
                  color: colors.text.primary 
                }]}
                placeholder="Search for user..."
                placeholderTextColor={colors.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border.light }]}
                  onPress={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text.secondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.searchButton, { backgroundColor: colors.primary }]}
                  onPress={handleSearchAndBlock}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text.white }]}>
                    Search
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  blockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  searchButton: {
    // backgroundColor set inline
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

