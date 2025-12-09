import React, { useState } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, Share2, Plus, X, ExternalLink } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { Post, Advertisement } from '@/types';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
  const router = useRouter();
  const { currentUser, posts, toggleLike, getComments, getActiveAds, recordAdImpression, recordAdClick } = useApp();
  const [showComments, setShowComments] = useState<string | null>(null);
  const [viewedAds, setViewedAds] = useState<Set<string>>(new Set());

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

    return (
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.mediaContainer}
      >
        {post.mediaUrls.map((url, index) => (
          <Image
            key={index}
            source={{ uri: url }}
            style={styles.postImage}
            contentFit="cover"
          />
        ))}
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

  const renderPost = (post: Post) => {
    const isLiked = post.likes.includes(currentUser.id);
    const postComments = getComments(post.id);

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
        </View>

        <Text style={styles.postContent}>{post.content}</Text>

        {renderPostMedia(post)}

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
            <Text style={styles.actionText}>{post.likes.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowComments(post.id)}
          >
            <MessageCircle size={24} color={colors.text.secondary} />
            <Text style={styles.actionText}>{post.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Share2 size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {showComments === post.id && (
          <CommentsModal
            postId={post.id}
            visible={showComments === post.id}
            onClose={() => setShowComments(null)}
            comments={postComments}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <View style={styles.emptyState}>
            <Heart size={64} color={colors.text.tertiary} strokeWidth={1.5} />
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
          </View>
        ) : (
          posts.map((post, index) => {
            const ads = getActiveAds('feed');
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
}: {
  postId: string;
  visible: boolean;
  onClose: () => void;
  comments: any[];
}) {
  const { addComment } = useApp();
  const [commentText, setCommentText] = useState<string>('');

  const handleSubmit = async () => {
    if (commentText.trim()) {
      await addComment(postId, commentText.trim());
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
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.commentsList}>
          {comments.map((comment) => (
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
                  <Text style={styles.commentUserName}>{comment.userName}</Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                </View>
              </View>
            </View>
          ))}
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

const styles = StyleSheet.create({
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
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  post: {
    backgroundColor: colors.background.primary,
    marginBottom: 8,
    paddingTop: 16,
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
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  postUserName: {
    fontSize: 15,
    fontWeight: '600' as const,
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
    lineHeight: 20,
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
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: colors.text.secondary,
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
  commentsList: {
    flex: 1,
  },
  comment: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  commentUserName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 18,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.secondary,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  sendButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  adCard: {
    backgroundColor: colors.background.primary,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  adBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1,
  },
  adBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
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
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 6,
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
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 24,
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
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
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
});
