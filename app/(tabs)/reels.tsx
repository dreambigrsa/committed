import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { Reel } from '@/types';

const { width, height } = Dimensions.get('window');

export default function ReelsScreen() {
  const { currentUser, reels, toggleReelLike } = useApp();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const videoRefs = useRef<{ [key: string]: Video | null }>({});
  const scrollViewRef = useRef<ScrollView>(null);

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
    if (index !== currentIndex) {
      setCurrentIndex(index);
      
      Object.keys(videoRefs.current).forEach((key, idx) => {
        if (videoRefs.current[key]) {
          if (idx === index) {
            videoRefs.current[key]?.playAsync();
          } else {
            videoRefs.current[key]?.pauseAsync();
          }
        }
      });
    }
  };

  const renderReel = (reel: Reel, index: number) => {
    const isLiked = reel.likes.includes(currentUser.id);

    return (
      <View key={reel.id} style={styles.reelContainer}>
        <Video
          ref={(ref) => {
            videoRefs.current[reel.id] = ref;
          }}
          source={{ uri: reel.videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={index === currentIndex}
          isMuted={isMuted}
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (status.isLoaded && !status.isPlaying && index === currentIndex) {
              videoRefs.current[reel.id]?.playAsync();
            }
          }}
        />

        <View style={styles.overlay}>
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
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
              <Text style={styles.userName}>{reel.userName}</Text>
            </View>
            <Text style={styles.caption}>{reel.caption}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleReelLike(reel.id)}
            >
              <Heart
                size={32}
                color={colors.text.white}
                fill={isLiked ? colors.text.white : 'transparent'}
              />
              <Text style={styles.actionCount}>{formatCount(reel.likes.length)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <MessageCircle size={32} color={colors.text.white} />
              <Text style={styles.actionCount}>{formatCount(reel.commentCount)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Share2 size={32} color={colors.text.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <VolumeX size={28} color={colors.text.white} />
              ) : (
                <Volume2 size={28} color={colors.text.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  reelContainer: {
    width,
    height,
    position: 'relative',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  userInfo: {
    flex: 1,
    marginBottom: 80,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.text.white,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.text.white,
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    fontSize: 14,
    color: colors.text.white,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actions: {
    gap: 20,
    marginBottom: 80,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.white,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
});
