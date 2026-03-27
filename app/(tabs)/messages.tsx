import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCurrentUser } from '../services/authService';
import { ChatPreview, subscribeChatPreviews } from '../services/firestoreService';

export default function MessagesScreen() {
    const router = useRouter();
    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeChatPreviews(
            user.uid,
            (nextChats) => {
                setChats(nextChats);
                setLoading(false);
            },
            () => {
                setLoading(false);
                Alert.alert('Error', 'Failed to load chats. Please try again.');
            }
        );

        return unsubscribe;
    }, []);

    const filteredChats = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return chats;
        }
        return chats.filter((chat) => {
            return (
                chat.name.toLowerCase().includes(query) ||
                chat.lastMessage.toLowerCase().includes(query)
            );
        });
    }, [searchQuery, chats]);

    const openChat = (chat: ChatPreview) => {
        router.push({
            pathname: '/chat/[id]',
            params: { id: chat.id, name: chat.name },
        });
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
                <View style={styles.headerTopRow}>
                    <View style={styles.headerIconWrap}>
                        <MaterialIcons name="chat" size={24} color="#3b5998" />
                    </View>
                    <View style={styles.headerTextWrap}>
                        <ThemedText style={styles.headerTitle}>Chats</ThemedText>
                        <ThemedText style={styles.headerSubtitle}>
                            Open a conversation to chat personally.
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.searchWrap}>
                    <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <Pressable style={styles.newChatButton} onPress={() => router.push('/new-chat')}>
                    <MaterialIcons name="add-comment" size={16} color="#ffffff" />
                    <ThemedText style={styles.newChatButtonText}>Start New Chat</ThemedText>
                </Pressable>
            </View>

            <View style={styles.listWrap}>
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#3b5998" />
                    </View>
                ) : null}

                {filteredChats.map((chat) => (
                    <Pressable key={chat.id} style={styles.chatCard} onPress={() => openChat(chat)}>
                        <View style={styles.avatarWrap}>
                            <ThemedText style={styles.avatarText}>{chat.name.charAt(0)}</ThemedText>
                        </View>

                        <View style={styles.chatInfoWrap}>
                            <View style={styles.chatTopRow}>
                                <ThemedText style={styles.chatName}>{chat.name}</ThemedText>
                                <ThemedText style={styles.chatTime}>{chat.time}</ThemedText>
                            </View>
                            <ThemedText numberOfLines={1} style={styles.lastMessage}>
                                {chat.lastMessage}
                            </ThemedText>
                        </View>

                        {chat.unreadCount > 0 ? (
                            <View style={styles.badgeWrap}>
                                <ThemedText style={styles.badgeText}>{chat.unreadCount}</ThemedText>
                            </View>
                        ) : null}
                    </Pressable>
                ))}

                {!loading && filteredChats.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <MaterialIcons name="chat-bubble-outline" size={42} color="#d1d5db" />
                        <ThemedText style={styles.emptyTitle}>No Chats Found</ThemedText>
                        <ThemedText style={styles.emptySubtitle}>Try another search term.</ThemedText>
                    </View>
                ) : null}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    content: {
        padding: 16,
        gap: 12,
        paddingBottom: 24,
    },
    headerCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        gap: 12,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: '#e8f0ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    searchWrap: {
        position: 'relative',
        justifyContent: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: 12,
        zIndex: 2,
    },
    searchInput: {
        height: 46,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
        paddingLeft: 40,
        paddingRight: 12,
        color: '#111827',
        fontSize: 15,
    },
    newChatButton: {
        height: 42,
        borderRadius: 8,
        backgroundColor: '#3b5998',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    newChatButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
    listWrap: {
        gap: 8,
    },
    loadingWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
    },
    chatCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatarWrap: {
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: '#e8f0ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#3b5998',
        fontWeight: '700',
        fontSize: 18,
    },
    chatInfoWrap: {
        flex: 1,
        gap: 2,
    },
    chatTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    chatName: {
        color: '#111827',
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },
    chatTime: {
        color: '#6b7280',
        fontSize: 12,
        fontWeight: '500',
    },
    lastMessage: {
        color: '#6b7280',
        fontSize: 14,
    },
    badgeWrap: {
        minWidth: 22,
        height: 22,
        borderRadius: 999,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b5998',
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        paddingHorizontal: 16,
        gap: 6,
    },
    emptyTitle: {
        color: '#111827',
        fontSize: 18,
        fontWeight: '700',
    },
    emptySubtitle: {
        color: '#6b7280',
        fontSize: 14,
    },
});