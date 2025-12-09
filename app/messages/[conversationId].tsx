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
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { currentUser, getConversation, sendMessage } = useApp();
  const [messageText, setMessageText] = useState<string>('');
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const conversation = getConversation(conversationId);

  useEffect(() => {
    if (conversationId && currentUser) {
      loadMessages();
      
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
            setLocalMessages((prev) => [...prev, {
              id: newMessage.id,
              conversationId: newMessage.conversation_id,
              senderId: newMessage.sender_id,
              receiverId: newMessage.receiver_id,
              content: newMessage.content,
              read: newMessage.read,
              createdAt: newMessage.created_at,
            }]);
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
        setLocalMessages(data.map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          content: m.content,
          read: m.read,
          createdAt: m.created_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !conversation || !currentUser) return;

    const otherParticipantId = conversation.participants.find(
      (id) => id !== currentUser.id
    );
    if (!otherParticipantId) return;

    const tempId = Date.now().toString();
    const optimisticMessage = {
      id: tempId,
      conversationId,
      senderId: currentUser.id,
      receiverId: otherParticipantId,
      content: messageText.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };

    setLocalMessages([...localMessages, optimisticMessage]);
    setMessageText('');

    try {
      await sendMessage(conversationId, otherParticipantId, optimisticMessage.content);
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

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUser.id;
    const messageTime = new Date(item.createdAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.theirMessageContainer,
        ]}
      >
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.theirMessageTime]}>
            {messageTime}
          </Text>
        </View>
      </View>
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
        }}
      />
      <SafeAreaView style={styles.container}>
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

          <View style={styles.inputContainer}>
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
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim()}
            >
              <Send
                size={20}
                color={messageText.trim() ? colors.text.white : colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  },
  myMessage: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: colors.background.primary,
    borderBottomLeftRadius: 4,
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
  messageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirMessageTime: {
    color: colors.text.tertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
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
});
