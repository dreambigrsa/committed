import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { currentUser, getConversation, getMessages, sendMessage } = useApp();
  const [messageText, setMessageText] = useState<string>('');

  const conversation = getConversation(conversationId || '');
  const messages = getMessages(conversationId || '');

  if (!currentUser || !conversation) {
    return null;
  }

  const getOtherParticipant = () => {
    const index = conversation.participants.indexOf(currentUser.id);
    const otherIndex = index === 0 ? 1 : 0;
    return {
      id: conversation.participants[otherIndex],
      name: conversation.participantNames[otherIndex],
      avatar: conversation.participantAvatars[otherIndex],
    };
  };

  const otherParticipant = getOtherParticipant();

  const handleSend = async () => {
    if (messageText.trim()) {
      await sendMessage(conversationId || '', otherParticipant.id, messageText.trim());
      setMessageText('');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: otherParticipant.name,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => {
          const isOwnMessage = message.senderId === currentUser.id;
          
          return (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                isOwnMessage ? styles.messageRowOwn : styles.messageRowOther,
              ]}
            >
              {!isOwnMessage && (
                <>
                  {otherParticipant.avatar ? (
                    <Image
                      source={{ uri: otherParticipant.avatar }}
                      style={styles.messageAvatar}
                    />
                  ) : (
                    <View style={styles.messageAvatarPlaceholder}>
                      <Text style={styles.messageAvatarPlaceholderText}>
                        {otherParticipant.name.charAt(0)}
                      </Text>
                    </View>
                  )}
                </>
              )}

              <View
                style={[
                  styles.messageBubble,
                  isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isOwnMessage ? styles.messageTextOwn : styles.messageTextOther,
                  ]}
                >
                  {message.content}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    isOwnMessage ? styles.messageTimeOwn : styles.messageTimeOther,
                  ]}
                >
                  {formatTime(message.createdAt)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.tertiary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !messageText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Send
            size={20}
            color={messageText.trim() ? colors.text.white : colors.text.tertiary}
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAvatarPlaceholderText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageBubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.background.primary,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextOwn: {
    color: colors.text.white,
  },
  messageTextOther: {
    color: colors.text.primary,
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: colors.text.tertiary,
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
  input: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.secondary,
  },
});
