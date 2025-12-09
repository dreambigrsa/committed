import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { X, Image as ImageIcon } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export default function CreatePostScreen() {
  const router = useRouter();
  const { createPost } = useApp();
  const [content, setContent] = useState<string>('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'You need to allow access to your photos to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const urls = result.assets.map(asset => asset.uri);
      setMediaUrls([...mediaUrls, ...urls]);
    }
  };

  const removeImage = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && mediaUrls.length === 0) {
      Alert.alert('Error', 'Please add some content or images to your post');
      return;
    }

    setIsLoading(true);
    try {
      const mediaType: 'image' | 'video' | 'mixed' = 'image';
      await createPost(content.trim(), mediaUrls, mediaUrls.length > 0 ? mediaType : 'image');
      router.back();
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Create Post',
          presentation: 'modal',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handlePost}
              disabled={isLoading || (!content.trim() && mediaUrls.length === 0)}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.postButton,
                    (!content.trim() && mediaUrls.length === 0) && styles.postButtonDisabled,
                  ]}
                >
                  Post
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={styles.input}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.text.tertiary}
              value={content}
              onChangeText={setContent}
              multiline
              autoFocus
            />

            {mediaUrls.length > 0 && (
              <View style={styles.imagesContainer}>
                {mediaUrls.map((url, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri: url }} style={styles.image} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(index)}
                    >
                      <X size={18} color={colors.text.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.addMediaButton} onPress={pickImages}>
              <ImageIcon size={24} color={colors.primary} />
              <Text style={styles.addMediaText}>Add Photos</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  postButton: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  postButtonDisabled: {
    color: colors.text.tertiary,
  },
  input: {
    fontSize: 18,
    color: colors.text.primary,
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  addMediaText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
  },
});
