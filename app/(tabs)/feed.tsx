import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, Share2, Plus, X, ExternalLink, MoreVertical, Edit2, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Post, Advertisement } from '@/types';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
  const router = useRouter();
  const { currentUser, posts, toggleLike, getComments, getActiveAds, recordAdImpression, recordAdClick, addComment, editPost, deletePost, sharePost, adminDeletePost, adminRejectPost } = useApp();
  const { colors } = useTheme();
  const [showComments, setShowComments] = useState<string | null>(null);
  const [viewedAds, setViewedAds] = useState<Set<string>>(new Set());
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [editMediaUrls, setEditMediaUrls] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.secondary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: colors.text.primary,
    },
    createButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingBottom: 100,
    },
    post: {
      backgroundColor: colors.background.primary,
      marginBottom: 12,
      paddingTop: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    postUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    postAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    postAvatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    postAvatarPlaceholderText: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.white,
    },
    postUserName: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    postTime: {
      fontSize: 13,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    postContent: {
      fontSize: 15,
      color: colors.text.primary,
      lineHeight: 22,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    mediaContainer: {
      marginBottom: 12,
    },
    postImage: {
      width,
      height: width,
    },
    postActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionText: {
      fontSize: 15,
      color: colors.text.secondary,
      fontWeight: '600' as const,
    },
    actionTextActive: {
      color: colors.danger,
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
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentsList: {
      flex: 1,
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
    commentActions: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    commentActionText: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '600' as const,
    },
    commentActionSave: {
      color: colors.primary,
    },
    commentEditInput: {
      backgroundColor: colors.background.secondary,
      borderRadius: 8,
      padding: 8,
      fontSize: 14,
      color: colors.text.primary,
      minHeight: 60,
      textAlignVertical: 'top',
      marginBottom: 4,
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
      fontSize: 15,
      color: colors.text.primary,
      maxHeight: 100,
    },
    sendButton: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.primary,
    },
    sendButtonDisabled: {
      backgroundColor: colors.background.secondary,
    },
    sendButtonText: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.text.white,
    },
    sendButtonTextDisabled: {
      color: colors.text.tertiary,
    },
    adCard: {
      backgroundColor: colors.background.primary,
      marginBottom: 12,
      position: 'relative',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    adBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      zIndex: 1,
    },
    adBadgeText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: colors.text.white,
    },
    adImage: {
      width: '100%',
      height: 200,
    },
    adContent: {
      padding: 16,
    },
    adTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.primary,
      marginBottom: 8,
    },
    adDescription: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    adLinkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    adLinkText: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 100,
      paddingHorizontal: 40,
    },
    emptyStateTitle: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: colors.text.primary,
      marginTop: 32,
      marginBottom: 12,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    emptyStateButton: {
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
    emptyStateButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text.white,
    },
    emptyStateNote: {
      fontSize: 13,
      color: colors.text.tertiary,
      textAlign: 'center',
      lineHeight: 18,
      fontStyle: 'italic' as const,
    },
    menuButton: {
      padding: 8,
    },
    postMenu: {
      backgroundColor: colors.background.secondary,
      borderRadius: 8,
      padding: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    menuItemText: {
      fontSize: 15,
      color: colors.text.primary,
      fontWeight: '500' as const,
    },
    deleteText: {
      color: colors.danger,
    },
    editContainer: {
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    editInput: {
      backgroundColor: colors.background.secondary,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      color: colors.text.primary,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    editActions: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'flex-end',
    },
    editButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    cancelButton: {
      backgroundColor: colors.background.secondary,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    editButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text.secondary,
    },
    saveButtonText: {
      color: colors.text.white,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    editMediaContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    editMediaWrapper: {
      position: 'relative',
      width: 80,
      height: 80,
    },
    editMediaImage: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
    },
    editRemoveButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addMediaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.background.secondary,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    addMediaText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.primary,
    },
  }), [colors]);

  if (!currentUser) {
    return null;
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderPostMedia = (post: Post) => {
    if (post.mediaUrls.length === 0) return null;

    const isVideo = (url: string) => {
      return url.includes('.mp4') || url.includes('.mov') || url.includes('video');
    };

    return (
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.mediaContainer}
      >
        {post.mediaUrls.map((url, index) => {
          if (isVideo(url)) {
            return (
              <Video
                key={index}
                source={{ uri: url }}
                style={styles.postImage}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
              />
            );
          }
          return (
            <Image
              key={index}
              source={{ uri: url }}
              style={styles.postImage}
              contentFit="cover"
            />
          );
        })}
      </ScrollView>
    );
  };

  const handleAdPress = async (ad: Advertisement) => {
    await recordAdClick(ad.id);
    if (ad.linkUrl) {
      await WebBrowser.openBrowserAsync(ad.linkUrl);
    }
  };

  const renderAd = (ad: Advertisement) => {
    if (!viewedAds.has(ad.id)) {
      recordAdImpression(ad.id);
      setViewedAds(prev => new Set([...prev, ad.id]));
    }

    return (
      <TouchableOpacity
        key={`ad-${ad.id}`}
        style={styles.adCard}
        onPress={() => handleAdPress(ad)}
        activeOpacity={0.9}
      >
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Sponsored</Text>
        </View>
        <Image source={{ uri: ad.imageUrl }} style={styles.adImage} contentFit="cover" />
        <View style={styles.adContent}>
          <Text style={styles.adTitle}>{ad.title}</Text>
          <Text style={styles.adDescription} numberOfLines={2}>
            {ad.description}
          </Text>
          {ad.linkUrl && (
            <View style={styles.adLinkButton}>
              <Text style={styles.adLinkText}>Learn More</Text>
              <ExternalLink size={16} color={colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deletePost(postId);
            if (success) {
              Alert.alert('Success', 'Post deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
    setShowPostMenu(null);
  };

  const uploadMedia = async (uris: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const uri of uris) {
      try {
        // Check if it's already a URL (existing media) or a local URI (new media)
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          uploadedUrls.push(uri);
          continue;
        }

        // Determine file type
        const isVideo = uri.includes('video') || uri.includes('.mp4') || uri.includes('.mov');
        const fileName = isVideo 
          ? `post_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`
          : `post_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        
        const response = await fetch(uri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const { error } = await supabase.storage
          .from('media')
          .upload(fileName, uint8Array, {
            contentType: isVideo ? 'video/mp4' : 'image/jpeg',
            upsert: false,
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Failed to upload media:', error);
        throw error;
      }
    }
    
    return uploadedUrls;
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post.id);
    setEditContent(post.content);
    setEditMediaUrls([...post.mediaUrls]);
    setShowPostMenu(null);
  };

  const handlePickMedia = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'You need to allow access to your photos and videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets) {
      const urls = result.assets.map(asset => asset.uri);
      setEditMediaUrls([...editMediaUrls, ...urls]);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setEditMediaUrls(editMediaUrls.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    setIsUploadingMedia(true);
    try {
      // Upload new media (local URIs) and keep existing media (URLs)
      const uploadedMediaUrls = await uploadMedia(editMediaUrls);
      
      // Determine media type
      const hasVideo = uploadedMediaUrls.some(url => url.includes('video') || url.includes('.mp4') || url.includes('.mov'));
      const hasImage = uploadedMediaUrls.some(url => !url.includes('video') && !url.includes('.mp4') && !url.includes('.mov'));
      let mediaType: 'image' | 'video' | 'mixed' = 'image';
      if (hasVideo && hasImage) {
        mediaType = 'mixed';
      } else if (hasVideo) {
        mediaType = 'video';
      }
      
      const success = await editPost(postId, editContent, uploadedMediaUrls, mediaType);
      if (success) {
        setEditingPost(null);
        setEditContent('');
        setEditMediaUrls([]);
        Alert.alert('Success', 'Post updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update post');
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      Alert.alert('Error', 'Failed to upload media. Please try again.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleAdminDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post (Admin)',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await adminDeletePost(postId);
            if (success) {
              Alert.alert('Success', 'Post deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
    setShowPostMenu(null);
  };

  const handleAdminRejectPost = async (postId: string) => {
    Alert.alert(
      'Reject Post (Admin)',
      'Are you sure you want to reject this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const success = await adminRejectPost(postId, 'Rejected by admin');
            if (success) {
              Alert.alert('Success', 'Post rejected successfully');
            } else {
              Alert.alert('Error', 'Failed to reject post');
            }
          },
        },
      ]
    );
    setShowPostMenu(null);
  };

  const renderPost = (post: Post) => {
    const isLiked = post.likes.includes(currentUser.id);
    const postComments = getComments(post.id);
    const isOwner = post.userId === currentUser.id;
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'moderator';

    return (
      <View key={post.id} style={styles.post}>
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.postUserInfo}
            onPress={() => router.push(`/profile/${post.userId}` as any)}
          >
            {post.userAvatar ? (
              <Image
                source={{ uri: post.userAvatar }}
                style={styles.postAvatar}
              />
            ) : (
              <View style={styles.postAvatarPlaceholder}>
                <Text style={styles.postAvatarPlaceholderText}>
                  {post.userName.charAt(0)}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.postUserName}>{post.userName}</Text>
              <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          {(isOwner || isAdmin) && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
            >
              <MoreVertical size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {showPostMenu === post.id && (
          <View style={styles.postMenu}>
            {isOwner && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleEditPost(post)}
                >
                  <Edit2 size={18} color={colors.text.primary} />
                  <Text style={styles.menuItemText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleDeletePost(post.id)}
                >
                  <Trash2 size={18} color={colors.danger} />
                  <Text style={[styles.menuItemText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
            {isAdmin && !isOwner && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAdminDeletePost(post.id)}
                >
                  <Trash2 size={18} color={colors.danger} />
                  <Text style={[styles.menuItemText, styles.deleteText]}>Delete (Admin)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAdminRejectPost(post.id)}
                >
                  <X size={18} color={colors.danger} />
                  <Text style={[styles.menuItemText, styles.deleteText]}>Reject (Admin)</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {editingPost === post.id ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              placeholder="Edit your post..."
              placeholderTextColor={colors.text.tertiary}
            />
            
            {editMediaUrls.length > 0 && (
              <View style={styles.editMediaContainer}>
                {editMediaUrls.map((url, index) => (
                  <View key={index} style={styles.editMediaWrapper}>
                    <Image
                      source={{ uri: url }}
                      style={styles.editMediaImage}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={styles.editRemoveButton}
                      onPress={() => handleRemoveMedia(index)}
                    >
                      <X size={16} color={colors.text.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity 
              style={styles.addMediaButton}
              onPress={handlePickMedia}
              disabled={isUploadingMedia}
            >
              <ImageIcon size={20} color={colors.primary} />
              <Text style={styles.addMediaText}>Add/Change Media</Text>
            </TouchableOpacity>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => {
                  setEditingPost(null);
                  setEditContent('');
                  setEditMediaUrls([]);
                }}
                disabled={isUploadingMedia}
              >
                <Text style={styles.editButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton, isUploadingMedia && styles.saveButtonDisabled]}
                onPress={() => handleSaveEdit(post.id)}
                disabled={isUploadingMedia}
              >
                {isUploadingMedia ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <Text style={[styles.editButtonText, styles.saveButtonText]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {post.content.length > 0 && (
              <Text style={styles.postContent}>{post.content}</Text>
            )}
            {renderPostMedia(post)}
          </>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleLike(post.id)}
          >
            <Heart
              size={24}
              color={isLiked ? colors.danger : colors.text.secondary}
              fill={isLiked ? colors.danger : 'transparent'}
            />
            <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
              {post.likes.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowComments(post.id)}
          >
            <MessageCircle size={24} color={colors.text.secondary} />
            <Text style={styles.actionText}>{post.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => sharePost(post.id)}
          >
            <Share2 size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {showComments === post.id && (
          <CommentsModal
            postId={post.id}
            visible={showComments === post.id}
            onClose={() => setShowComments(null)}
            comments={postComments}
            colors={colors}
            styles={styles}
            addComment={addComment}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/post/create' as any)}
        >
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {posts.length === 0 ? (
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <Heart size={80} color={colors.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>No Posts Yet</Text>
            <Text style={styles.emptyStateText}>
              Be the first to share your relationship journey!
              Create a post to get started.
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/post/create' as any)}
            >
              <Plus size={20} color={colors.text.white} />
              <Text style={styles.emptyStateButtonText}>Create Your First Post</Text>
            </TouchableOpacity>
            <Text style={styles.emptyStateNote}>
              💡 Tip: Run the seed-sample-data.sql script in Supabase to see sample posts
            </Text>
          </Animated.View>
        ) : (
          posts.map((post, index) => {
            const ads = getActiveAds('feed');
            // Improved ad distribution: show ad every 3 posts, rotating through available ads
            // This ensures fair distribution across all active ads
            const shouldShowAd = (index + 1) % 3 === 0 && ads.length > 0;
            const adIndex = Math.floor(index / 3) % ads.length;
            
            return (
              <React.Fragment key={post.id}>
                {renderPost(post)}
                {shouldShowAd && renderAd(ads[adIndex])}
              </React.Fragment>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CommentsModal({
  postId,
  visible,
  onClose,
  comments,
  colors,
  styles,
  addComment,
}: {
  postId: string;
  visible: boolean;
  onClose: () => void;
  comments: any[];
  colors: any;
  styles: any;
  addComment: (postId: string, content: string) => Promise<any>;
}) {
  const { currentUser, editComment, deleteComment } = useApp();
  const [commentText, setCommentText] = useState<string>('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState<string>('');

  const handleSubmit = async () => {
    if (commentText.trim()) {
      await addComment(postId, commentText.trim());
      setCommentText('');
    }
  };

  const handleEditComment = (comment: any) => {
    setEditingComment(comment.id);
    setEditCommentText(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    const success = await editComment(commentId, editCommentText);
    if (success) {
      setEditingComment(null);
      setEditCommentText('');
    } else {
      Alert.alert('Error', 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteComment(commentId);
            if (!success) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
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
          {comments.map((comment) => {
            const isOwner = comment.userId === currentUser?.id;
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
                      {isOwner && (
                        <View style={styles.commentActions}>
                          {editingComment === comment.id ? (
                            <>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingComment(null);
                                  setEditCommentText('');
                                }}
                              >
                                <Text style={styles.commentActionText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleSaveEdit(comment.id)}
                              >
                                <Text style={[styles.commentActionText, styles.commentActionSave]}>Save</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <>
                              <TouchableOpacity
                                onPress={() => handleEditComment(comment)}
                              >
                                <Edit2 size={14} color={colors.text.secondary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 size={14} color={colors.danger} />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                    {editingComment === comment.id ? (
                      <TextInput
                        style={styles.commentEditInput}
                        value={editCommentText}
                        onChangeText={setEditCommentText}
                        multiline
                        placeholderTextColor={colors.text.tertiary}
                      />
                    ) : (
                      <Text style={styles.commentText}>{comment.content}</Text>
                    )}
                    <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
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
