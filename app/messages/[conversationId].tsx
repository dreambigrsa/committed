import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
  Image as RNImage,
  Linking,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Trash2, Image as ImageIcon, FileText, X, Settings, Download, ZoomIn } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
// @ts-expect-error - legacy path works at runtime
import * as FileSystem from 'expo-file-system/legacy';
// @ts-expect-error - expo-media-library may not be installed yet
import * as MediaLibrary from 'expo-media-library';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { currentUser, getConversation, sendMessage, deleteMessage, getChatBackground, setChatBackground } = useApp();
  const [messageText, setMessageText] = useState<string>('');
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [chatBackground, setChatBackgroundState] = useState<any>(null);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{ uri: string; name: string } | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const conversation = getConversation(conversationId);

  useEffect(() => {
    if (conversationId && currentUser) {
      loadMessages();
      loadChatBackground();
      
      const subscription = supabase
        .channel(`conversation:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMessage = payload.new;
            const isSender = newMessage.sender_id === currentUser.id;
            const isReceiver = newMessage.receiver_id === currentUser.id;
            const deletedForMe = (isSender && newMessage.deleted_for_sender) || (isReceiver && newMessage.deleted_for_receiver);
            
            if (!deletedForMe) {
              setLocalMessages((prev) => [...prev, {
                id: newMessage.id,
                conversationId: newMessage.conversation_id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id,
                content: newMessage.content,
                mediaUrl: newMessage.media_url,
                documentUrl: newMessage.document_url,
                documentName: newMessage.document_name,
                messageType: newMessage.message_type || 'text',
                deletedForSender: newMessage.deleted_for_sender || false,
                deletedForReceiver: newMessage.deleted_for_receiver || false,
                read: newMessage.read,
                createdAt: newMessage.created_at,
              }]);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const updatedMessage = payload.new;
            setLocalMessages((prev) => prev.map(m => 
              m.id === updatedMessage.id 
                ? {
                    ...m,
                    content: updatedMessage.content,
                    deletedForSender: updatedMessage.deleted_for_sender || false,
                    deletedForReceiver: updatedMessage.deleted_for_receiver || false,
                  }
                : m
            ));
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUser]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const filteredMessages = data
          .filter((m: any) => {
            const isSender = m.sender_id === currentUser!.id;
            const isReceiver = m.receiver_id === currentUser!.id;
            return !((isSender && m.deleted_for_sender) || (isReceiver && m.deleted_for_receiver));
          })
          .map((m: any) => ({
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            content: m.content,
            mediaUrl: m.media_url,
            documentUrl: m.document_url,
            documentName: m.document_name,
            messageType: m.message_type || 'text',
            deletedForSender: m.deleted_for_sender || false,
            deletedForReceiver: m.deleted_for_receiver || false,
            read: m.read,
            createdAt: m.created_at,
          }));
        setLocalMessages(filteredMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadChatBackground = async () => {
    if (!conversationId || !currentUser) return;
    const background = await getChatBackground(conversationId);
    setChatBackgroundState(background);
  };

  const downloadImage = async (imageUrl: string) => {
    try {
      setIsDownloading(true);
      
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to save photos to your gallery.');
        setIsDownloading(false);
        return;
      }

      // Download the image
      const fileUri = FileSystem.documentDirectory + `image_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download image');
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      await MediaLibrary.createAlbumAsync('Committed', asset, false);

      Alert.alert('Success', 'Image saved to gallery!');
    } catch (error) {
      console.error('Download image error:', error);
      Alert.alert('Error', 'Failed to save image to gallery');
    } finally {
      setIsDownloading(false);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const filename = `messages/${conversationId}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Upload image error:', error);
      return null;
    }
  };

  const uploadDocument = async (uri: string, name: string): Promise<string | null> => {
    try {
      const filename = `documents/${conversationId}/${Date.now()}_${name}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filename, blob, {
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Upload document error:', error);
      return null;
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setSelectedDocument(null);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedDocument({
          uri: result.assets[0].uri,
          name: result.assets[0].name || 'Document',
        });
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSend = async () => {
    if (!conversation || !currentUser) return;

    const otherParticipantId = conversation.participants.find(
      (id) => id !== currentUser.id
    );
    if (!otherParticipantId) return;

    let mediaUrl: string | undefined;
    let documentUrl: string | undefined;
    let documentName: string | undefined;
    let messageType: 'text' | 'image' | 'document' = 'text';

    if (selectedImage) {
      const uploadedUrl = await uploadImage(selectedImage);
      if (uploadedUrl) {
        mediaUrl = uploadedUrl;
        messageType = 'image';
      } else {
        Alert.alert('Error', 'Failed to upload image');
        return;
      }
    } else if (selectedDocument) {
      const uploadedUrl = await uploadDocument(selectedDocument.uri, selectedDocument.name);
      if (uploadedUrl) {
        documentUrl = uploadedUrl;
        documentName = selectedDocument.name;
        messageType = 'document';
      } else {
        Alert.alert('Error', 'Failed to upload document');
        return;
      }
    } else if (!messageText.trim()) {
      return;
    }

    const tempId = Date.now().toString();
    const optimisticMessage: any = {
      id: tempId,
      conversationId,
      senderId: currentUser.id,
      receiverId: otherParticipantId,
      content: messageText.trim() || (messageType === 'image' ? '' : (selectedDocument ? selectedDocument.name : '')),
      mediaUrl,
      documentUrl,
      documentName,
      messageType,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setLocalMessages([...localMessages, optimisticMessage]);
    setMessageText('');
    setSelectedImage(null);
    setSelectedDocument(null);

    try {
      await sendMessage(
        conversationId,
        otherParticipantId,
        optimisticMessage.content,
        mediaUrl,
        documentUrl,
        documentName,
        messageType
      );
      // Remove optimistic message and let real-time update handle it
      setLocalMessages(prev => prev.filter(m => m.id !== tempId));
    } catch (error) {
      console.error('Failed to send message:', error);
      setLocalMessages(localMessages.filter((m) => m.id !== tempId));
    }
  };

  const getOtherParticipant = () => {
    if (!conversation) return null;
    const index = conversation.participants.indexOf(currentUser!.id);
    const otherIndex = index === 0 ? 1 : 0;
    return {
      name: conversation.participantNames[otherIndex],
      avatar: conversation.participantAvatars[otherIndex],
    };
  };

  const otherParticipant = getOtherParticipant();

  if (!currentUser || !conversation || !otherParticipant) {
    return null;
  }

  const handleDeleteMessage = async (messageId: string, isSender: boolean) => {
    const message = localMessages.find(m => m.id === messageId);
    if (!message) return;

    if (isSender) {
      // Sender can delete for everyone or just for themselves
      Alert.alert(
        'Delete Message',
        'How would you like to delete this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete for me',
            style: 'default',
            onPress: async () => {
              const success = await deleteMessage(messageId, conversationId, false);
              if (success) {
                setLocalMessages(prev => prev.filter(m => m.id !== messageId));
              } else {
                Alert.alert('Error', 'Failed to delete message');
              }
            },
          },
          {
            text: 'Delete for everyone',
            style: 'destructive',
            onPress: async () => {
              const success = await deleteMessage(messageId, conversationId, true);
              if (success) {
                setLocalMessages(prev => prev.map(m => 
                  m.id === messageId 
                    ? { ...m, content: 'This message was deleted', deletedForSender: true, deletedForReceiver: true }
                    : m
                ));
              } else {
                Alert.alert('Error', 'Failed to delete message');
              }
            },
          },
        ]
      );
    } else {
      // Receiver can only delete for themselves
      Alert.alert(
        'Delete Message',
        'Delete this message for yourself?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const success = await deleteMessage(messageId, conversationId, false);
              if (success) {
                setLocalMessages(prev => prev.filter(m => m.id !== messageId));
              } else {
                Alert.alert('Error', 'Failed to delete message');
              }
            },
          },
        ]
      );
    }
  };

  const getBackgroundStyle = () => {
    if (!chatBackground) {
      return { backgroundColor: colors.background.secondary };
    }

    switch (chatBackground.background_type) {
      case 'color':
        return { backgroundColor: chatBackground.background_value };
      case 'image':
        return { 
          backgroundColor: colors.background.secondary,
          // Note: For image backgrounds, you'd need to use ImageBackground component
        };
      case 'gradient':
        // For gradients, you'd need a gradient library like react-native-linear-gradient
        return { backgroundColor: colors.background.secondary };
      default:
        return { backgroundColor: colors.background.secondary };
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    if (!item || !item.id) return null;
    
    const isMe = item.senderId === currentUser.id;
    const isDeleted = (isMe && item.deletedForSender) || (!isMe && item.deletedForReceiver);
    const messageTime = new Date(item.createdAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (isDeleted && item.content === 'This message was deleted') {
      return (
        <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.theirMessageContainer]}>
          <Text style={styles.deletedMessageText}>This message was deleted</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.theirMessageContainer,
        ]}
        onLongPress={() => handleDeleteMessage(item.id, isMe)}
        activeOpacity={0.9}
      >
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
          {item.messageType === 'image' && item.mediaUrl ? (
            <TouchableOpacity
              onPress={() => setViewingImage(item.mediaUrl)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.messageImage}
                contentFit="cover"
              />
            </TouchableOpacity>
          ) : null}
          
          {item.messageType === 'document' && item.documentUrl ? (
            <TouchableOpacity
              style={styles.documentContainer}
              onPress={() => {
                if (item.documentUrl) {
                  Linking.openURL(item.documentUrl);
                }
              }}
            >
              <FileText size={24} color={isMe ? colors.text.white : colors.primary} />
              <Text style={[styles.documentName, isMe ? styles.myMessageText : styles.theirMessageText]}>
                {item.documentName || 'Document'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {item.content && typeof item.content === 'string' && item.content.trim() ? (
            <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
              {item.content}
            </Text>
          ) : null}

          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.theirMessageTime]}>
              {messageTime}
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteMessage(item.id, isMe)}
              style={styles.deleteMessageButton}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Trash2 size={14} color={isMe ? 'rgba(255, 255, 255, 0.7)' : colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderImageViewer = () => {
    return (
      <Modal
        visible={viewingImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setViewingImage(null)}
          >
            <X size={28} color={colors.text.white} />
          </TouchableOpacity>
          {viewingImage && (
            <>
              <Image
                source={{ uri: viewingImage }}
                style={styles.fullScreenImage}
                contentFit="contain"
              />
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => downloadImage(viewingImage)}
                disabled={isDownloading}
              >
                <Download size={24} color={colors.text.white} />
                <Text style={styles.downloadButtonText}>
                  {isDownloading ? 'Saving...' : 'Save to Gallery'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    );
  };

  const renderBackgroundModal = () => {
    const backgroundColors = [
      '#FFFFFF', '#F0F0F0', '#E8F5E9', '#E3F2FD', '#FFF3E0',
      '#FCE4EC', '#F3E5F5', '#E0F2F1', '#FFF9C4', '#FFEBEE',
    ];

    return (
      <Modal
        visible={showBackgroundModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBackgroundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat Background</Text>
              <TouchableOpacity onPress={() => setShowBackgroundModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.backgroundOptions}>
              <Text style={styles.backgroundSectionTitle}>Colors</Text>
              <View style={styles.colorGrid}>
                {backgroundColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }]}
                    onPress={async () => {
                      const success = await setChatBackground(conversationId, 'color', color);
                      if (success) {
                        setChatBackgroundState({ background_type: 'color', background_value: color });
                        setShowBackgroundModal(false);
                      }
                    }}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerLeft}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={colors.text.primary} />
              {otherParticipant.avatar ? (
                <Image
                  source={{ uri: otherParticipant.avatar }}
                  style={styles.headerAvatar}
                />
              ) : (
                <View style={styles.headerAvatarPlaceholder}>
                  <Text style={styles.headerAvatarPlaceholderText}>
                    {otherParticipant.name.charAt(0)}
                  </Text>
                </View>
              )}
              <Text style={styles.headerName}>{otherParticipant.name}</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowBackgroundModal(true)}
              style={styles.headerRight}
            >
              <Settings size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={[styles.container, getBackgroundStyle()]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={localMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          {(selectedImage || selectedDocument) && (
            <View style={styles.attachmentPreview}>
              {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeAttachment}
                    onPress={() => setSelectedImage(null)}
                  >
                    <X size={20} color={colors.text.white} />
                  </TouchableOpacity>
                </View>
              )}
              {selectedDocument && (
                <View style={styles.documentPreview}>
                  <FileText size={24} color={colors.primary} />
                  <Text style={styles.documentPreviewText} numberOfLines={1}>
                    {selectedDocument.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeDocumentButton}
                    onPress={() => setSelectedDocument(null)}
                  >
                    <X size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={handlePickImage}
            >
              <ImageIcon size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={handlePickDocument}
            >
              <FileText size={22} color={colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.text.tertiary}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() && !selectedImage && !selectedDocument) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim() && !selectedImage && !selectedDocument}
            >
              <Send
                size={20}
                color={(messageText.trim() || selectedImage || selectedDocument) ? colors.text.white : colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {renderBackgroundModal()}
      {renderImageViewer()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    padding: 4,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarPlaceholderText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  myMessage: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: colors.background.primary,
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: 250,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  myMessageText: {
    color: colors.text.white,
  },
  theirMessageText: {
    color: colors.text.primary,
  },
  deletedMessageText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 11,
  },
  deleteMessageButton: {
    padding: 2,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirMessageTime: {
    color: colors.text.tertiary,
  },
  attachmentPreview: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  documentPreviewText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  removeAttachment: {
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
  removeDocumentButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  attachmentButton: {
    padding: 8,
  },
  input: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  backgroundOptions: {
    padding: 20,
  },
  backgroundSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  downloadButton: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  downloadButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
