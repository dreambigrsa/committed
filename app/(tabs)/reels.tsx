import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Plus, Film, MoreVertical, Edit2, Trash2, X, UserPlus } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Reel } from '@/types';

const { width, height } = Dimensions.get('window');

export default function ReelsScreen() {
  const router = useRouter();
  const { currentUser, reels, toggleReelLike, editReel, deleteReel, shareReel, adminDeleteReel, adminRejectReel, follows, followUser, unfollowUser, addReelComment, getReelComments } = useApp();
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentReelId, setCurrentReelId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showReelMenu, setShowReelMenu] = useState<string | null>(null);
  const [editingReel, setEditingReel] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState<string>('');
  const [lastTap, setLastTap] = useState<{ time: number; reelId: string } | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: Video | null }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Stop all videos when component unmounts or loses focus
  useFocusEffect(
    React.useCallback(() => {
      // Play current video when screen gains focus
      if (currentReelId && videoRefs.current[currentReelId]) {
        videoRefs.current[currentReelId]?.playAsync().catch(() => {});
      }
      
      return () => {
        // Stop all videos when leaving the screen
        Object.keys(videoRefs.current).forEach((reelId) => {
          const video = videoRefs.current[reelId];
          if (video) {
            video.pauseAsync().catch(() => {});
          }
        });
      };
    }, [currentReelId])
  );

  useEffect(() => {
    // Initialize: play first video if available
    if (reels.length > 0 && !currentReelId) {
      const firstReelId = reels[0]?.id;
      if (firstReelId) {
        setCurrentReelId(firstReelId);
        setCurrentIndex(0);
        // Wait a bit for the ref to be set
        setTimeout(() => {
          if (videoRefs.current[firstReelId]) {
            videoRefs.current[firstReelId]?.playAsync().catch(() => {});
          }
        }, 100);
      }
    }
    
    return () => {
      // Cleanup: stop all videos on unmount
      Object.keys(videoRefs.current).forEach((reelId) => {
        const video = videoRefs.current[reelId];
        if (video) {
          video.pauseAsync().catch(() => {});
        }
      });
    };
  }, [reels.length]);
  
  // Ensure only the current reel is playing
  useEffect(() => {
    Object.keys(videoRefs.current).forEach((reelId) => {
      const video = videoRefs.current[reelId];
      if (video) {
        if (reelId === currentReelId) {
          // This is the current reel, ensure it's playing
          video.playAsync().catch(() => {});
        } else {
          // This is not the current reel, ensure it's paused
          video.pauseAsync().catch(() => {});
        }
      }
    });
  }, [currentReelId]);

  if (!currentUser) {
    return null;
  }

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / height);
    
    if (index !== currentIndex && index >= 0 && index < reels.length) {
      const newReelId = reels[index]?.id;
      
      // Pause all videos first
      Object.keys(videoRefs.current).forEach((reelId) => {
        const video = videoRefs.current[reelId];
        if (video && reelId !== newReelId) {
          video.pauseAsync().catch(() => {});
        }
      });
      
      // Play the current video
      if (newReelId && videoRefs.current[newReelId]) {
        videoRefs.current[newReelId]?.playAsync().catch(() => {});
      }
      
      setCurrentIndex(index);
      setCurrentReelId(newReelId || null);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    Alert.alert(
      'Delete Reel',
      'Are you sure you want to delete this reel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteReel(reelId);
            if (success) {
              Alert.alert('Success', 'Reel deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete reel');
            }
          },
        },
      ]
    );
    setShowReelMenu(null);
  };

  const handleEditReel = (reel: Reel) => {
    setEditingReel(reel.id);
    setEditCaption(reel.caption || '');
    setShowReelMenu(null);
  };

  const handleSaveEdit = async (reelId: string) => {
    const success = await editReel(reelId, editCaption);
    if (success) {
      setEditingReel(null);
      setEditCaption('');
      Alert.alert('Success', 'Reel updated successfully');
    } else {
      Alert.alert('Error', 'Failed to update reel');
    }
  };

  const handleAdminDeleteReel = async (reelId: string) => {
    Alert.alert(
      'Delete Reel (Admin)',
      'Are you sure you want to delete this reel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await adminDeleteReel(reelId);
            if (success) {
              Alert.alert('Success', 'Reel deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete reel');
            }
          },
        },
      ]
    );
    setShowReelMenu(null);
  };

  const handleAdminRejectReel = async (reelId: string) => {
    Alert.alert(
      'Reject Reel (Admin)',
      'Are you sure you want to reject this reel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const success = await adminRejectReel(reelId, 'Rejected by admin');
            if (success) {
              Alert.alert('Success', 'Reel rejected successfully');
            } else {
              Alert.alert('Error', 'Failed to reject reel');
            }
          },
        },
      ]
    );
    setShowReelMenu(null);
  };

  const handleVideoPress = (reelId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap && lastTap.reelId === reelId && (now - lastTap.time) < DOUBLE_TAP_DELAY) {
      // Double tap detected - toggle like
      toggleReelLike(reelId);
      setLastTap(null);
    } else {
      // Single tap - pause/play video
      const video = videoRefs.current[reelId];
      if (video) {
        video.getStatusAsync().then((status: any) => {
          if (status.isLoaded) {
            if (status.isPlaying) {
              video.pauseAsync();
            } else {
              video.playAsync();
            }
          }
        });
      }
      setLastTap({ time: now, reelId });
      setTimeout(() => setLastTap(null), DOUBLE_TAP_DELAY);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!currentUser) return;
    const following = isFollowing(userId);
    if (following) {
      await unfollowUser(userId);
    } else {
      await followUser(userId);
    }
  };

  const isFollowing = (userId: string) => {
    if (!currentUser || !follows) return false;
    return follows.some((f: any) => f.followerId === currentUser.id && f.followingId === userId);
  };

  const renderReel = (reel: Reel, index: number) => {
    const isLiked = reel.likes.includes(currentUser.id);
    const isOwner = reel.userId === currentUser.id;
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'moderator';

    return (
      <View key={reel.id} style={styles.reelContainer}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => handleVideoPress(reel.id)}
          style={styles.videoTouchable}
        >
          <Video
            ref={(ref) => {
              videoRefs.current[reel.id] = ref;
            }}
            source={{ uri: reel.videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={index === currentIndex && reel.id === currentReelId}
            isMuted={isMuted}
            onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
              if (status.isLoaded) {
                // Only auto-play if this is the current reel and it's not playing
                if (index === currentIndex && reel.id === currentReelId && !status.isPlaying) {
                  videoRefs.current[reel.id]?.playAsync().catch(() => {});
                }
                // Pause if this is not the current reel
                if (reel.id !== currentReelId && status.isPlaying) {
                  videoRefs.current[reel.id]?.pauseAsync().catch(() => {});
                }
              }
            }}
          />
        </TouchableOpacity>

        <View style={styles.overlay}>
          {/* Left side - User info and caption */}
          <View style={styles.leftSide}>
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <TouchableOpacity 
                  onPress={() => router.push(`/profile/${reel.userId}` as any)}
                  activeOpacity={0.7}
                >
                  {reel.userAvatar ? (
                    <Image
                      source={{ uri: reel.userAvatar }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {reel.userName.charAt(0)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.userNameContainer}>
                  <View style={styles.userNameRow}>
                    <TouchableOpacity 
                      onPress={() => router.push(`/profile/${reel.userId}` as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.userName}>@{reel.userName.replace(/\s+/g, '').toLowerCase()}</Text>
                    </TouchableOpacity>
                    {!isOwner && currentUser && (
                      <TouchableOpacity
                        style={[styles.followButton, isFollowing(reel.userId) && styles.followButtonActive]}
                        onPress={() => handleFollow(reel.userId)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.followButtonText}>
                          {isFollowing(reel.userId) ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {editingReel === reel.id ? (
                    <View style={styles.editCaptionContainer}>
                      <TextInput
                        style={styles.editCaptionInput}
                        value={editCaption}
                        onChangeText={setEditCaption}
                        multiline
                        placeholder="Edit caption..."
                        placeholderTextColor={colors.text.tertiary}
                      />
                      <View style={styles.editCaptionActions}>
                        <TouchableOpacity
                          style={styles.editCaptionButton}
                          onPress={() => {
                            setEditingReel(null);
                            setEditCaption('');
                          }}
                        >
                          <X size={16} color={colors.text.white} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.editCaptionButton}
                          onPress={() => handleSaveEdit(reel.id)}
                        >
                          <Text style={styles.editCaptionSaveText}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.caption} numberOfLines={3}>
                      {reel.caption}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Right side - Action buttons */}
          <View style={styles.rightSide}>

          {showReelMenu === reel.id && (
            <View style={styles.reelMenu}>
              {isOwner && (
                <>
                  <TouchableOpacity
                    style={styles.reelMenuItem}
                    onPress={() => handleEditReel(reel)}
                  >
                    <Edit2 size={18} color={colors.text.white} />
                    <Text style={styles.reelMenuItemText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reelMenuItem}
                    onPress={() => handleDeleteReel(reel.id)}
                  >
                    <Trash2 size={18} color={colors.danger} />
                    <Text style={[styles.reelMenuItemText, styles.reelMenuItemDelete]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
              {isAdmin && !isOwner && (
                <>
                  <TouchableOpacity
                    style={styles.reelMenuItem}
                    onPress={() => handleAdminDeleteReel(reel.id)}
                  >
                    <Trash2 size={18} color={colors.danger} />
                    <Text style={[styles.reelMenuItemText, styles.reelMenuItemDelete]}>Delete (Admin)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reelMenuItem}
                    onPress={() => handleAdminRejectReel(reel.id)}
                  >
                    <X size={18} color={colors.danger} />
                    <Text style={[styles.reelMenuItemText, styles.reelMenuItemDelete]}>Reject (Admin)</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleReelLike(reel.id)}
            >
              <View style={[styles.actionIconContainer, isLiked && styles.actionIconContainerActive]}>
                <Heart
                  size={32}
                  color={colors.text.white}
                  fill={isLiked ? colors.text.white : 'transparent'}
                  strokeWidth={isLiked ? 0 : 2.5}
                />
              </View>
              <Text style={styles.actionCount}>{formatCount(reel.likes.length)}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowComments(reel.id)}
            >
              <View style={styles.actionIconContainer}>
                <MessageCircle size={32} color={colors.text.white} strokeWidth={2.5} />
              </View>
              <Text style={styles.actionCount}>{formatCount(reel.commentCount)}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => shareReel(reel.id)}
            >
              <View style={styles.actionIconContainer}>
                <Share2 size={32} color={colors.text.white} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsMuted(!isMuted)}
            >
              <View style={styles.actionIconContainer}>
                {isMuted ? (
                  <VolumeX size={30} color={colors.text.white} strokeWidth={2.5} />
                ) : (
                  <Volume2 size={30} color={colors.text.white} strokeWidth={2.5} />
                )}
              </View>
            </TouchableOpacity>

            {(isOwner || isAdmin) && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowReelMenu(showReelMenu === reel.id ? null : reel.id)}
              >
                <View style={styles.actionIconContainer}>
                  <MoreVertical size={28} color={colors.text.white} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {showComments === reel.id && (
          <ReelCommentsModal
            reelId={reel.id}
            visible={showComments === reel.id}
            onClose={() => setShowComments(null)}
            comments={getReelComments(reel.id)}
            colors={colors}
            styles={styles}
            addComment={addReelComment}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {reels.length === 0 ? (
        <>
          <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
            <Film size={80} color={colors.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Reels Yet</Text>
            <Text style={styles.emptyText}>
              Create and share short video moments from your relationship journey!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/reel/create' as any)}
            >
              <Plus size={20} color={colors.text.white} />
              <Text style={styles.emptyButtonText}>Create Your First Reel</Text>
            </TouchableOpacity>
            <Text style={styles.emptyNote}>
              💡 Tip: Run the seed-sample-data.sql script in Supabase to see sample reels
            </Text>
          </Animated.View>
          <View style={styles.emptyHeader}>
            <Text style={[styles.headerTitle, styles.emptyHeaderTitle]}>Reels</Text>
            <TouchableOpacity
              style={styles.emptyCreateButton}
              onPress={() => router.push('/reel/create' as any)}
            >
              <Plus size={24} color={colors.text.white} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <ScrollView
            ref={scrollViewRef}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.scrollView}
          >
            {reels.map((reel, index) => renderReel(reel, index))}
          </ScrollView>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Reels</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/reel/create' as any)}
            >
              <Plus size={24} color={colors.text.white} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  reelContainer: {
    width,
    height,
    position: 'relative',
  },
  videoTouchable: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  leftSide: {
    flex: 1,
    paddingRight: 16,
    maxWidth: width * 0.7, // Limit width so it doesn't cover too much
  },
  rightSide: {
    alignItems: 'center',
    gap: 24,
    paddingLeft: 8,
  },
  userInfo: {
    // Removed flex: 1 to prevent vertical centering
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  userNameContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text.white,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  followButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  followButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.text.white,
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 14,
    color: colors.text.white,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: 8,
    paddingRight: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionIconContainerActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.text.white,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 2,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  createButton: {
    position: 'absolute',
    right: 20,
    top: 56,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: colors.background.secondary,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text.primary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  emptyNote: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic' as const,
  },
  emptyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  emptyHeaderTitle: {
    color: colors.text.primary,
    textShadowColor: 'transparent',
  },
  emptyCreateButton: {
    position: 'absolute',
    right: 20,
    top: 56,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  reelMenuButton: {
    marginLeft: 8,
    padding: 4,
  },
  reelMenu: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 8,
    minWidth: 150,
    zIndex: 10,
  },
  reelMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  reelMenuItemText: {
    fontSize: 15,
    color: colors.text.white,
    fontWeight: '500' as const,
  },
  reelMenuItemDelete: {
    color: colors.danger,
  },
  editCaptionContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 8,
  },
  editCaptionInput: {
    color: colors.text.white,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  editCaptionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editCaptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  editCaptionSaveText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
  },
  emptyCommentsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCommentsText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  comment: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  commentHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarPlaceholderText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  commentContent: {
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  commentText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: colors.text.primary,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.secondary,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  sendButtonTextDisabled: {
    color: colors.text.tertiary,
  },
});

function ReelCommentsModal({
  reelId,
  visible,
  onClose,
  comments,
  colors,
  styles,
  addComment,
}: {
  reelId: string;
  visible: boolean;
  onClose: () => void;
  comments: any[];
  colors: any;
  styles: any;
  addComment: (reelId: string, content: string) => Promise<any>;
}) {
  const { currentUser } = useApp();
  const [commentText, setCommentText] = useState<string>('');

  const handleSubmit = async () => {
    if (commentText.trim()) {
      await addComment(reelId, commentText.trim());
      setCommentText('');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Comments</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.commentsList}>
          {comments.length === 0 ? (
            <View style={styles.emptyCommentsContainer}>
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
              <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
            </View>
          ) : (
            comments.map((comment) => {
              return (
                <View key={comment.id} style={styles.comment}>
                  <View style={styles.commentHeader}>
                    {comment.userAvatar ? (
                      <Image
                        source={{ uri: comment.userAvatar }}
                        style={styles.commentAvatar}
                      />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder}>
                        <Text style={styles.commentAvatarPlaceholderText}>
                          {comment.userName.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeaderRow}>
                        <Text style={styles.commentUserName}>{comment.userName}</Text>
                      </View>
                      <Text style={styles.commentText}>{comment.content}</Text>
                      <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.commentInputContainer}
        >
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor={colors.text.tertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !commentText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!commentText.trim()}
          >
            <Text
              style={[
                styles.sendButtonText,
                !commentText.trim() && styles.sendButtonTextDisabled,
              ]}
            >
              Send
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
