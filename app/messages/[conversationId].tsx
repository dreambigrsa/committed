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
  ImageBackground,
  Keyboard,
  Animated,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Trash2, Image as ImageIcon, FileText, X, Settings, Download, ZoomIn, Flag, MoreVertical, Smile, ChevronUp, ChevronDown } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
// @ts-ignore - legacy path works at runtime, TypeScript definitions may not include it
import * as FileSystem from 'expo-file-system/legacy';
// @ts-ignore - expo-media-library may not be installed yet
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import ReportContentModal from '@/components/ReportContentModal';
import StickerPicker from '@/components/StickerPicker';
import { Sticker } from '@/types';

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { currentUser, getConversation, sendMessage, deleteMessage, getChatBackground, setChatBackground, getMessageWarnings, acknowledgeWarning, reportContent } = useApp();
  const insets = useSafeAreaInsets();
  const [messageText, setMessageText] = useState<string>('');
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [chatBackground, setChatBackgroundState] = useState<any>(null);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{ uri: string; name: string } | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<{ id: string; imageUrl: string } | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0);
  const [overlayColor, setOverlayColor] = useState<string>('#000000');
  const [warnings, setWarnings] = useState<any[]>([]);
  const [warningTemplates, setWarningTemplates] = useState<any[]>([]);
  const [reportingMessage, setReportingMessage] = useState<{ id: string; senderId: string } | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showAttachments, setShowAttachments] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const conversation = getConversation(conversationId);
  
  // Animation for attachment buttons
  const attachmentButtonsOpacity = useRef(new Animated.Value(1)).current;
  const attachmentButtonsWidth = useRef(new Animated.Value(1)).current;

  // Keyboard listeners
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setShowAttachments(false);
        // Animate out attachment buttons when keyboard shows
        Animated.parallel([
          Animated.timing(attachmentButtonsOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(attachmentButtonsWidth, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        // Reset to show attachments when keyboard hides
        setShowAttachments(true);
        Animated.parallel([
          Animated.timing(attachmentButtonsOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(attachmentButtonsWidth, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (conversationId && currentUser) {
      loadMessages();
      loadChatBackground();
      loadWarnings();
      
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
            
            // Only add if not deleted for current user
            if (!deletedForMe) {
              setLocalMessages((prev) => {
                // Check if message already exists (from optimistic update or duplicate)
                const exists = prev.some(m => m.id === newMessage.id);
                if (exists) {
                  // Update existing message (replace optimistic with real)
                  return prev.map(m => 
                    m.id === newMessage.id 
                      ? {
                          id: newMessage.id,
                          conversationId: newMessage.conversation_id,
                          senderId: newMessage.sender_id,
                          receiverId: newMessage.receiver_id,
                          content: newMessage.content,
                          mediaUrl: newMessage.media_url,
                          documentUrl: newMessage.document_url,
                          documentName: newMessage.document_name,
                          stickerId: newMessage.sticker_id,
                          messageType: newMessage.message_type || 'text',
                          deletedForSender: newMessage.deleted_for_sender || false,
                          deletedForReceiver: newMessage.deleted_for_receiver || false,
                          read: newMessage.read,
                          createdAt: newMessage.created_at,
                        }
                      : m
                  );
                }
                // Check if there's an optimistic message to replace
                // Match by: temp ID, same sender, same content, and recent time
                const optimisticMatch = prev.find(m => {
                  const isTemp = m.id.toString().startsWith('temp_');
                  const sameSender = m.senderId === newMessage.sender_id;
                  const sameContent = m.content === newMessage.content || 
                                     (m.messageType === 'image' && newMessage.message_type === 'image') ||
                                     (m.messageType === 'document' && newMessage.message_type === 'document' && m.documentName === newMessage.document_name);
                  const recentTime = Math.abs(new Date(m.createdAt).getTime() - new Date(newMessage.created_at).getTime()) < 10000; // 10 seconds
                  
                  return isTemp && sameSender && sameContent && recentTime;
                });
                
                if (optimisticMatch) {
                  // Replace optimistic message with real one
                  return prev.map(m => 
                    m.id === optimisticMatch.id 
                      ? {
                          id: newMessage.id,
                          conversationId: newMessage.conversation_id,
                          senderId: newMessage.sender_id,
                          receiverId: newMessage.receiver_id,
                          content: newMessage.content,
                          mediaUrl: newMessage.media_url,
                          documentUrl: newMessage.document_url,
                          documentName: newMessage.document_name,
                          stickerId: newMessage.sticker_id,
                          messageType: newMessage.message_type || 'text',
                          deletedForSender: newMessage.deleted_for_sender || false,
                          deletedForReceiver: newMessage.deleted_for_receiver || false,
                          read: newMessage.read,
                          createdAt: newMessage.created_at,
                        }
                      : m
                  );
                }
                
                // Add new message
                return [...prev, {
                  id: newMessage.id,
                  conversationId: newMessage.conversation_id,
                  senderId: newMessage.sender_id,
                  receiverId: newMessage.receiver_id,
                  content: newMessage.content,
                  mediaUrl: newMessage.media_url,
                  documentUrl: newMessage.document_url,
                  documentName: newMessage.document_name,
                  stickerId: newMessage.sticker_id,
                  messageType: newMessage.message_type || 'text',
                  deletedForSender: newMessage.deleted_for_sender || false,
                  deletedForReceiver: newMessage.deleted_for_receiver || false,
                  read: newMessage.read,
                  createdAt: newMessage.created_at,
                }];
              });
            } else {
              // If message is deleted for current user, remove it from local state
              setLocalMessages((prev) => prev.filter(m => m.id !== newMessage.id));
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
            const isSender = updatedMessage.sender_id === currentUser.id;
            const isReceiver = updatedMessage.receiver_id === currentUser.id;
            const deletedForMe = (isSender && updatedMessage.deleted_for_sender) || (isReceiver && updatedMessage.deleted_for_receiver);
            
            setLocalMessages((prev) => {
              // If deleted for current user, remove it completely
              if (deletedForMe) {
                return prev.filter(m => m.id !== updatedMessage.id);
              }
              
              // Otherwise update the message
              return prev.map(m => 
                m.id === updatedMessage.id 
                  ? {
                      ...m,
                      content: updatedMessage.content,
                      deletedForSender: updatedMessage.deleted_for_sender || false,
                      deletedForReceiver: updatedMessage.deleted_for_receiver || false,
                    }
                  : m
              );
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_backgrounds',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            console.log('Chat background changed:', payload);
            // Reload background when it changes
            loadChatBackground();
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
            stickerId: m.sticker_id,
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
    if (!conversationId || !currentUser) {
      console.log('Cannot load chat background - missing conversationId or currentUser');
      return;
    }
    
    try {
      console.log('Loading chat background for conversation:', conversationId, 'user:', currentUser.id);
      const background = await getChatBackground(conversationId);
      console.log('Loaded chat background:', background);
      
      if (background) {
        setChatBackgroundState(background);
        if (background.background_type === 'image') {
          setSelectedBackgroundImage(background.background_value);
          setBackgroundOpacity(background.opacity || 0);
          setOverlayColor(background.overlay_color || '#000000');
        }
      } else {
        console.log('No background found for this conversation');
        setChatBackgroundState(null);
      }
    } catch (error) {
      console.error('Error loading chat background:', error);
    }
  };

  const loadWarnings = async () => {
    if (!conversationId) return;
    try {
      const warningList = await getMessageWarnings(conversationId);
      setWarnings(warningList);
    } catch (error) {
      console.error('Error loading warnings:', error);
    }
  };

  const loadWarningTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('warning_templates')
        .select('*')
        .eq('active', true);
      if (error) throw error;
      setWarningTemplates(data || []);
    } catch (error) {
      console.error('Error loading warning templates:', error);
    }
  };

  useEffect(() => {
    loadWarningTemplates();
  }, []);

  // Subscribe to new warnings
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    const subscription = supabase
      .channel(`warnings:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_warnings',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadWarnings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_warnings',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadWarnings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, currentUser]);

  const downloadImage = async (imageUrl: string) => {
    try {
      setIsDownloading(true);
      
      // Request media library permissions (only photos, not audio)
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to save photos to your gallery.');
        setIsDownloading(false);
        return;
      }

      // Download the image
      const fileUri = `${FileSystem.cacheDirectory}image_${Date.now()}.jpg`;
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
      Alert.alert('Error', 'Failed to save image to gallery. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const filename = `messages/${conversationId}/${Date.now()}.jpg`;
      
      // Check if it's a local file URI
      let fileData: Uint8Array;
      
      if (uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('content://')) {
        // Read local file using FileSystem
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Convert base64 to Uint8Array
        const binaryString = atob(base64);
        fileData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          fileData[i] = binaryString.charCodeAt(i);
        }
      } else {
        // Remote URL - fetch and convert to Uint8Array
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        fileData = new Uint8Array(arrayBuffer);
      }

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filename, fileData, {
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
    let stickerId: string | undefined;
    let messageType: 'text' | 'image' | 'document' | 'sticker' = 'text';

    if (selectedSticker) {
      mediaUrl = selectedSticker.imageUrl;
      stickerId = selectedSticker.id;
      messageType = 'sticker';
    } else if (selectedImage) {
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

    const tempId = `temp_${Date.now()}`;
    const messageContent = messageText.trim() || (messageType === 'image' ? '' : (selectedDocument ? selectedDocument.name : ''));
    const optimisticMessage: any = {
      id: tempId,
      conversationId,
      senderId: currentUser.id,
      receiverId: otherParticipantId,
      content: messageContent,
      mediaUrl,
      documentUrl,
      documentName,
      messageType,
      read: false,
      deletedForSender: false,
      deletedForReceiver: false,
      createdAt: new Date().toISOString(),
    };

    // Add optimistic message immediately
    setLocalMessages(prev => [...prev, optimisticMessage]);
    setMessageText('');
    setSelectedImage(null);
    setSelectedDocument(null);

    // Scroll to bottom to show new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      await sendMessage(
        conversationId,
        otherParticipantId,
        messageContent,
        mediaUrl,
        documentUrl,
        documentName,
        messageType,
        stickerId
      );
      
      // Don't remove optimistic message here - let real-time subscription handle it
      // The real-time subscription will replace the optimistic message with the real one
      // We match by content, sender, and time to replace the optimistic message
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setLocalMessages(prev => prev.filter((m) => m.id !== tempId));
      Alert.alert('Error', 'Failed to send message. Please try again.');
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
                // Update message to show deleted state
                setLocalMessages(prev => prev.map(m => 
                  m.id === messageId 
                    ? { ...m, content: 'This message was deleted', deletedForSender: true, deletedForReceiver: true }
                    : m
                ));
                // Real-time update will also handle this
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
        return { backgroundColor: colors.background.secondary };
      case 'gradient':
        return { backgroundColor: colors.background.secondary };
      default:
        return { backgroundColor: colors.background.secondary };
    }
  };

  const renderBackgroundImage = () => {
    if (!chatBackground || chatBackground.background_type !== 'image' || !chatBackground.background_value) {
      return null;
    }

    const opacity = chatBackground.opacity || 0;
    const overlayOpacity = opacity / 10; // Convert 0-10 to 0-1
    const overlayColorValue = chatBackground.overlay_color || '#000000';
    
    // Convert hex color to rgba
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return (
      <ImageBackground
        source={{ uri: chatBackground.background_value }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(overlayColorValue, overlayOpacity) }]} />
      </ImageBackground>
    );
  };

  const handlePickBackgroundImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedBackgroundImage(result.assets[0].uri);
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

    // Check if this message has a warning
    const messageWarning = warnings.find(w => w.messageId === item.id && !w.acknowledged);

    // Don't render deleted messages at all - they should be filtered out
    if (isDeleted) {
      return null;
    }

    return (
      <>
        {messageWarning && (
          <View style={styles.warningBanner}>
            <View style={[
              styles.warningContent,
              messageWarning.severity === 'high' ? styles.warningHigh : 
              messageWarning.severity === 'medium' ? styles.warningMedium : 
              styles.warningLow
            ]}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>
                  {messageWarning.severity === 'high' ? 'High Risk Warning' :
                   messageWarning.severity === 'medium' ? 'Medium Risk Warning' :
                   'Low Risk Warning'}
                </Text>
                <Text style={styles.warningMessage}>
                  {(() => {
                    const template = warningTemplates.find(t => t.severity === messageWarning.severity);
                    if (template) {
                      return template.in_chat_warning_template
                        .replace('{trigger_words}', messageWarning.triggerWords.join(', '))
                        .replace('{severity}', messageWarning.severity);
                    }
                    return `This message contains potentially inappropriate content. Trigger words detected: ${messageWarning.triggerWords.join(', ')}`;
                  })()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.acknowledgeButton}
                onPress={async () => {
                  const success = await acknowledgeWarning(messageWarning.id);
                  if (success) {
                    setWarnings(prev => prev.map(w => 
                      w.id === messageWarning.id ? { ...w, acknowledged: true } : w
                    ));
                  }
                }}
              >
                <Text style={styles.acknowledgeButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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

          {item.messageType === 'sticker' && item.mediaUrl ? (
            <View style={styles.stickerContainer}>
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.stickerImage}
                contentFit="contain"
              />
            </View>
          ) : null}

          {item.content && typeof item.content === 'string' && item.content.trim() && item.messageType !== 'sticker' ? (
            <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
              {item.content}
            </Text>
          ) : null}

          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.theirMessageTime]}>
              {messageTime}
            </Text>
            <View style={styles.messageActions}>
              {!isMe && (
                <TouchableOpacity
                  onPress={() => setReportingMessage({ id: item.id, senderId: item.senderId })}
                  style={styles.reportMessageButton}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Flag size={14} color={colors.danger} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => handleDeleteMessage(item.id, isMe)}
                style={styles.deleteMessageButton}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Trash2 size={14} color={isMe ? 'rgba(255, 255, 255, 0.7)' : colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      </>
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

    const overlayColors = [
      '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
      '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
      '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000',
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

              <Text style={[styles.backgroundSectionTitle, { marginTop: 24 }]}>Custom Image</Text>
              <TouchableOpacity
                style={styles.imageBackgroundButton}
                onPress={handlePickBackgroundImage}
              >
                <ImageIcon size={20} color={colors.primary} />
                <Text style={styles.imageBackgroundButtonText}>
                  {selectedBackgroundImage ? 'Change Image' : 'Select from Gallery'}
                </Text>
              </TouchableOpacity>

              {selectedBackgroundImage && (
                <>
                  <View style={styles.imagePreviewContainer}>
                    <ImageBackground
                      source={{ uri: selectedBackgroundImage }}
                      style={styles.backgroundPreview}
                      resizeMode="cover"
                    >
                      <View 
                        style={[
                          styles.backgroundPreview, 
                          { 
                            backgroundColor: (() => {
                              const r = parseInt(overlayColor.slice(1, 3), 16);
                              const g = parseInt(overlayColor.slice(3, 5), 16);
                              const b = parseInt(overlayColor.slice(5, 7), 16);
                              return `rgba(${r}, ${g}, ${b}, ${backgroundOpacity / 10})`;
                            })()
                          }
                        ]} 
                      />
                    </ImageBackground>
                  </View>

                  <Text style={[styles.backgroundSectionTitle, { marginTop: 20 }]}>Overlay Color</Text>
                  <View style={styles.colorGrid}>
                    {overlayColors.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption, 
                          { backgroundColor: color },
                          overlayColor === color && styles.selectedColorOption
                        ]}
                        onPress={() => setOverlayColor(color)}
                      />
                    ))}
                  </View>

                  <View style={styles.opacityContainer}>
                    <Text style={styles.opacityLabel}>Opacity: {backgroundOpacity}/10</Text>
                    <View style={styles.sliderContainer}>
                      <Text style={styles.sliderLabel}>0</Text>
                      <View style={styles.sliderWrapper}>
                        <View style={styles.sliderTrack}>
                          <View 
                            style={[
                              styles.sliderFill, 
                              { width: `${(backgroundOpacity / 10) * 100}%` }
                            ]} 
                          />
                          <View 
                            style={[
                              styles.sliderThumb,
                              { left: `${(backgroundOpacity / 10) * 100}%` }
                            ]}
                          />
                        </View>
                        <TouchableOpacity
                          style={StyleSheet.absoluteFill}
                          onPress={(e) => {
                            const { locationX, target } = e.nativeEvent;
                            const width = (target as any)?.layout?.width || 300;
                            const newValue = Math.round((locationX / width) * 10);
                            setBackgroundOpacity(Math.max(0, Math.min(10, newValue)));
                          }}
                          activeOpacity={1}
                        />
                      </View>
                      <Text style={styles.sliderLabel}>10</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={async () => {
                      try {
                        // Upload image to Supabase if it's a local URI
                        let imageUrl = selectedBackgroundImage;
                        if (selectedBackgroundImage && (selectedBackgroundImage.startsWith('file://') || selectedBackgroundImage.startsWith('ph://') || selectedBackgroundImage.startsWith('content://'))) {
                          // Upload to Supabase
                          const uploadedUrl = await uploadImage(selectedBackgroundImage);
                          if (uploadedUrl) {
                            imageUrl = uploadedUrl;
                          } else {
                            Alert.alert('Error', 'Failed to upload background image. Please try again.');
                            return;
                          }
                        }

                        console.log('Applying background with:', { imageUrl, backgroundOpacity, overlayColor });
                        const success = await setChatBackground(conversationId, 'image', imageUrl, backgroundOpacity, overlayColor);
                        
                        if (success) {
                          const newBackground = { 
                            background_type: 'image' as const, 
                            background_value: imageUrl,
                            opacity: backgroundOpacity,
                            overlay_color: overlayColor
                          };
                          setChatBackgroundState(newBackground);
                          setShowBackgroundModal(false);
                          Alert.alert('Success', 'Background saved! It will be available on all your devices.');
                        } else {
                          Alert.alert('Error', 'Failed to save background. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error applying background:', error);
                        Alert.alert('Error', 'Failed to save background. Please try again.');
                      }
                    }}
                  >
                    <Text style={styles.applyButtonText}>Apply Background</Text>
                  </TouchableOpacity>
                </>
              )}
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
        {renderBackgroundImage()}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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

          {(selectedImage || selectedDocument || selectedSticker) && (
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
              {selectedSticker && (
                <View style={styles.stickerPreview}>
                  <Image source={{ uri: selectedSticker.imageUrl }} style={styles.previewSticker} />
                  <TouchableOpacity
                    style={styles.removeStickerButton}
                    onPress={() => setSelectedSticker(null)}
                  >
                    <X size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {/* Attachment Toggle Button - Only show when keyboard is visible */}
            {isKeyboardVisible && (
              <TouchableOpacity
                style={styles.attachmentToggleButton}
                onPress={() => {
                  const newShowState = !showAttachments;
                  setShowAttachments(newShowState);
                  if (newShowState) {
                    Animated.parallel([
                      Animated.timing(attachmentButtonsOpacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                      }),
                      Animated.timing(attachmentButtonsWidth, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: false,
                      }),
                    ]).start();
                  } else {
                    Animated.parallel([
                      Animated.timing(attachmentButtonsOpacity, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                      }),
                      Animated.timing(attachmentButtonsWidth, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: false,
                      }),
                    ]).start();
                  }
                }}
                activeOpacity={0.7}
              >
                {showAttachments ? (
                  <ChevronDown size={20} color={colors.primary} />
                ) : (
                  <ChevronUp size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}

            {/* Attachment Buttons - Animated */}
            <Animated.View
              style={[
                styles.attachmentButtonsContainer,
                {
                  opacity: attachmentButtonsOpacity,
                  width: attachmentButtonsWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 136], // 3 buttons (40px each) + 2 gaps (8px each) = 136px
                  }),
                  overflow: 'hidden',
                },
              ]}
            >
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <ImageIcon size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={handlePickDocument}
                activeOpacity={0.7}
              >
                <FileText size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={() => setShowStickerPicker(true)}
                activeOpacity={0.7}
              >
                <Smile size={22} color={colors.primary} />
              </TouchableOpacity>
            </Animated.View>

            {/* Text Input - Always flex: 1 to fill available space */}
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.text.tertiary}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
              onFocus={() => {
                // Keyboard listener will handle the animation
              }}
            />
            
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() && !selectedImage && !selectedDocument && !selectedSticker) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim() && !selectedImage && !selectedDocument && !selectedSticker}
            >
              <Send
                size={20}
                color={(messageText.trim() || selectedImage || selectedDocument || selectedSticker) ? colors.text.white : colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {renderBackgroundModal()}
      {renderImageViewer()}

      {/* Report Message Modal */}
      <ReportContentModal
        visible={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        contentType="message"
        contentId={reportingMessage?.id}
        reportedUserId={reportingMessage?.senderId}
        onReport={reportContent}
        colors={colors}
      />

      {/* Sticker Picker Modal */}
      <StickerPicker
        visible={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={(sticker: Sticker) => {
          setSelectedSticker({ id: sticker.id, imageUrl: sticker.imageUrl });
          setShowStickerPicker(false);
        }}
      />
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
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportMessageButton: {
    padding: 2,
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
  attachmentToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 0,
  },
  attachmentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text.primary,
    marginHorizontal: 0,
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
  stickerContainer: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerImage: {
    width: 120,
    height: 120,
  },
  stickerPreview: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  previewSticker: {
    width: 80,
    height: 80,
  },
  removeStickerButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  imageBackgroundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginTop: 8,
  },
  imageBackgroundButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text.primary,
  },
  backgroundPreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  opacityContainer: {
    marginTop: 20,
    paddingVertical: 12,
  },
  opacityLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 12,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    minWidth: 24,
    textAlign: 'center',
  },
  sliderWrapper: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    position: 'absolute',
    top: -8,
    marginLeft: -10,
    borderWidth: 2,
    borderColor: colors.text.white,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  applyButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: colors.primary,
    transform: [{ scale: 1.1 }],
  },
  warningBanner: {
    marginBottom: 8,
    marginHorizontal: 16,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  warningHigh: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  warningMedium: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningLow: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  warningIcon: {
    fontSize: 24,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  acknowledgeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  acknowledgeButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
});
