import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCurrentUser } from '../services/authService';
import { Message, sendMessage, subscribeMessages } from '../services/firestoreService';

type PersonalMessage = {
  id: string;
  text: string;
  sender: 'me' | 'them';
};

export default function PersonalChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  const chatName = useMemo(() => name || 'Personal Chat', [name]);

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<PersonalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeMessages(
      id,
      (dbMessages: Message[]) => {
        const mappedMessages: PersonalMessage[] = dbMessages.map((message) => ({
          id: message.id,
          text: message.text,
          sender: message.senderUid === user.uid ? 'me' : 'them',
        }));
        setMessages(mappedMessages);
        setLoading(false);
      },
      () => {
        setLoading(false);
        Alert.alert('Error', 'Failed to load messages. Please try again.');
      }
    );

    return unsubscribe;
  }, [id]);

  const handleSend = async () => {
    if (!id || !newMessage.trim()) {
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      Alert.alert('Login Required', 'Please login again to send messages.');
      return;
    }

    try {
      await sendMessage(id, newMessage.trim(), user.uid, user.displayName || 'You');
      setNewMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Stack.Screen
        options={{
          title: chatName,
          headerStyle: { backgroundColor: '#3b5998' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#3b5998" />
        </View>
      ) : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContent}
        style={styles.chatArea}
        renderItem={({ item }) => {
          const isMe = item.sender === 'me';
          return (
            <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                <ThemedText style={isMe ? styles.myText : styles.otherText}>{item.text}</ThemedText>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputArea}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder={`Message ${chatName}...`}
          placeholderTextColor="#9ca3af"
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!newMessage.trim()}
          style={[styles.sendButton, !newMessage.trim() ? styles.sendButtonDisabled : undefined]}>
          <ThemedText style={styles.sendText}>Send</ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  loadingWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    zIndex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  messageRow: {
    maxWidth: '82%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  myBubble: {
    backgroundColor: '#3b5998',
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderBottomLeftRadius: 6,
  },
  myText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 20,
  },
  otherText: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 20,
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    backgroundColor: '#f9fafb',
    color: '#111827',
    fontSize: 15,
  },
  sendButton: {
    height: 44,
    borderRadius: 999,
    backgroundColor: '#3b5998',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
