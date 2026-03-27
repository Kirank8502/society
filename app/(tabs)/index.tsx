import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Post = {
    id: string;
    author: string;
    content: string;
};

export default function HomeScreen() {
    const [user] = useState({ full_name: 'My Profile' });
    const [posts, setPosts] = useState<Post[]>([
        { id: '1', author: 'Community Admin', content: 'Welcome to the community feed!' },
    ]);
    const [newPost, setNewPost] = useState('');
    const [loading] = useState(false);

    const handlePostCreated = () => {
        if (!newPost.trim()) return;

        const createdPost: Post = {
            id: Date.now().toString(),
            author: user.full_name,
            content: newPost.trim(),
        };

        setPosts((previousPosts) => [createdPost, ...previousPosts]);
        setNewPost('');
    };

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#3b5998" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {/* <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <ThemedText style={styles.avatarText}>{user.full_name.charAt(0)}</ThemedText>
                </View>
                <ThemedText style={styles.profileName}>{user.full_name}</ThemedText>
            </View> */}

            {/* <View style={styles.shortcutsRow}>
                <View style={styles.shortcutItem}>
                    <IconSymbol size={22} name="person.2.fill" color="#3b5998" />
                    <ThemedText style={styles.shortcutText}>Find Friends</ThemedText>
                </View>
                <View style={styles.shortcutItem}>
                    <IconSymbol size={22} name="briefcase.fill" color="#3b5998" />
                    <ThemedText style={styles.shortcutText}>Businesses</ThemedText>
                </View>
            </View> */}

            <View style={styles.composerCard}>
                <TextInput
                    style={styles.composerInput}
                    placeholder="Share something with the community..."
                    placeholderTextColor="#7d8691"
                    value={newPost}
                    onChangeText={setNewPost}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.postButton, !newPost.trim() ? styles.postButtonDisabled : undefined]}
                    onPress={handlePostCreated}
                    disabled={!newPost.trim()}>
                    <ThemedText style={styles.postButtonText}>Post</ThemedText>
                </TouchableOpacity>
            </View>

            <View style={styles.feedWrap}>
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <View key={post.id} style={styles.postCard}>
                            <ThemedText style={styles.postAuthor}>{post.author}</ThemedText>
                            <ThemedText style={styles.postContent}>{post.content}</ThemedText>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <ThemedText style={styles.emptyText}>
                            No posts yet. Be the first to share something with the community!
                        </ThemedText>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    content: {
        padding: 16,
        gap: 14,
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    profileCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 999,
        backgroundColor: '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#1e40af',
        fontWeight: '700',
    },
    profileName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    shortcutsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    shortcutItem: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    shortcutText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    composerCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 10,
    },
    composerInput: {
        minHeight: 84,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 12,
        paddingVertical: 10,
        textAlignVertical: 'top',
        color: '#111827',
        fontSize: 15,
        backgroundColor: '#ffffff',
    },
    postButton: {
        alignSelf: 'flex-end',
        backgroundColor: '#3b5998',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 8,
    },
    postButtonDisabled: {
        opacity: 0.5,
    },
    postButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    feedWrap: {
        gap: 10,
        paddingBottom: 20,
    },
    postCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 6,
    },
    postAuthor: {
        fontWeight: '700',
        color: '#111827',
        fontSize: 14,
    },
    postContent: {
        color: '#374151',
        fontSize: 15,
        lineHeight: 20,
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    emptyText: {
        color: '#6b7280',
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 22,
    },
});