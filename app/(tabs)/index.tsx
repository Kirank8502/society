import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { auth } from '../config/firebase';
import { createPost, getUserProfile, Post, subscribePosts, UserProfile } from '../services/firestoreService';

const buildFallbackUsername = (fullName: string, email?: string | null) => {
    const fromName = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    if (fromName.length > 0) {
        return fromName;
    }

    const emailPrefix = email?.split('@')[0]?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.') || 'member';
    return emailPrefix;
};

export default function HomeScreen() {
    const [currentUserId, setCurrentUserId] = useState(auth.currentUser?.uid || '');
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [caption, setCaption] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUserId(user?.uid || '');
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadCurrentProfile = async () => {
            if (!currentUserId) {
                if (isMounted) {
                    setCurrentUserProfile(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const profile = await getUserProfile(currentUserId);
                if (isMounted) {
                    setCurrentUserProfile(profile);
                }
            } catch (error) {
                console.error('Error loading current profile:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void loadCurrentProfile();

        return () => {
            isMounted = false;
        };
    }, [currentUserId]);

    useEffect(() => {
        const unsubscribe = subscribePosts(
            (nextPosts) => {
                setPosts(nextPosts);
            },
            (error) => {
                console.error('Error loading posts:', error);
                Alert.alert('Feed Error', 'Unable to load the community feed right now.');
            }
        );

        return unsubscribe;
    }, []);

    const currentAuthorName = currentUserProfile?.fullName || auth.currentUser?.displayName || 'Community Member';
    const currentAuthorUsername = buildFallbackUsername(currentAuthorName, auth.currentUser?.email);
    const currentAuthorImageUrl = currentUserProfile?.profileImageUrl || '';

    const canPublish = useMemo(() => {
        return !publishing && !uploadingMedia && (caption.trim().length > 0 || selectedMedia !== null);
    }, [caption, publishing, selectedMedia, uploadingMedia]);

    const handlePickMedia = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Required', 'Please allow photo library access to attach media to your post.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            setSelectedMedia(result.assets[0]);
        }
    };

    const handleRemoveMedia = () => {
        setSelectedMedia(null);
    };

    const handleCreatePost = async () => {
        if (!currentUserId) {
            Alert.alert('Login Required', 'Please sign in again before creating a post.');
            return;
        }

        if (!canPublish) {
            return;
        }

        setPublishing(true);
        try {
            await createPost({
                authorUid: currentUserId,
                authorName: currentAuthorName,
                authorUsername: currentAuthorUsername,
                authorProfileImageUrl: currentAuthorImageUrl,
                caption: caption.trim(),
                media: selectedMedia
                    ? {
                          uri: selectedMedia.uri,
                          fileName: selectedMedia.fileName || undefined,
                          mimeType: selectedMedia.mimeType || undefined,
                      }
                    : null,
            });

            setCaption('');
            setSelectedMedia(null);
        } catch (error) {
            console.error('Error creating post:', error);
            Alert.alert('Post Failed', 'Could not publish your post. Please try again.');
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#111827" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.composerCard}>
                <View style={styles.composerHeader}>
                    <View style={styles.composerAvatarWrap}>
                        {currentAuthorImageUrl ? (
                            <Image source={{ uri: currentAuthorImageUrl }} style={styles.composerAvatar} />
                        ) : (
                            <ThemedText style={styles.composerAvatarText}>
                                {currentAuthorName.charAt(0).toUpperCase()}
                            </ThemedText>
                        )}
                    </View>

                    <View style={styles.composerHeaderTextWrap}>
                        <ThemedText style={styles.composerName}>{currentAuthorName}</ThemedText>
                        <ThemedText style={styles.composerUsername}>@{currentAuthorUsername}</ThemedText>
                    </View>
                </View>

                <TextInput
                    style={styles.composerInput}
                    placeholder="Share something with the community..."
                    placeholderTextColor="#7d8691"
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                />

                {selectedMedia ? (
                    <View style={styles.selectedMediaWrap}>
                        <Image source={{ uri: selectedMedia.uri }} style={styles.selectedMedia} resizeMode="cover" />
                        <Pressable style={styles.removeMediaButton} onPress={handleRemoveMedia}>
                            <MaterialIcons name="close" size={18} color="#ffffff" />
                        </Pressable>
                    </View>
                ) : null}

                <View style={styles.composerActions}>
                    <Pressable style={styles.mediaButton} onPress={handlePickMedia} disabled={uploadingMedia || publishing}>
                        <MaterialIcons name="photo-library" size={18} color="#111827" />
                        <ThemedText style={styles.mediaButtonText}>Add Media</ThemedText>
                    </Pressable>

                    <Pressable
                        style={[styles.postButton, !canPublish ? styles.postButtonDisabled : undefined]}
                        onPress={handleCreatePost}
                        disabled={!canPublish}>
                        {publishing ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <ThemedText style={styles.postButtonText}>Post</ThemedText>
                        )}
                    </Pressable>
                </View>
            </View>

            <View style={styles.feedWrap}>
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <View key={post.id} style={styles.postCard}>
                            <View style={styles.postHeader}>
                                <View style={styles.postAvatarWrap}>
                                    {post.authorProfileImageUrl ? (
                                        <Image source={{ uri: post.authorProfileImageUrl }} style={styles.postAvatar} />
                                    ) : (
                                        <ThemedText style={styles.postAvatarText}>
                                            {post.authorName.charAt(0).toUpperCase()}
                                        </ThemedText>
                                    )}
                                </View>

                                <View style={styles.postHeaderTextWrap}>
                                    <ThemedText style={styles.postName}>{post.authorName}</ThemedText>
                                    <ThemedText style={styles.postUsername}>@{post.authorUsername}</ThemedText>
                                </View>
                            </View>

                            <ThemedText style={styles.postCaption}>{post.caption}</ThemedText>

                            {post.mediaUrl ? (
                                <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} resizeMode="cover" />
                            ) : null}
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <MaterialIcons name="dynamic-feed" size={28} color="#6b7280" />
                        <ThemedText style={styles.emptyTitle}>No posts yet</ThemedText>
                        <ThemedText style={styles.emptyText}>
                            Be the first to share a caption or a photo. New posts will appear here for everyone.
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
        backgroundColor: '#f3f4f6',
    },
    composerCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 14,
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    composerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    composerAvatarWrap: {
        width: 46,
        height: 46,
        borderRadius: 999,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    composerAvatar: {
        width: '100%',
        height: '100%',
    },
    composerAvatarText: {
        color: '#111827',
        fontSize: 17,
        fontWeight: '700',
    },
    composerHeaderTextWrap: {
        flex: 1,
    },
    composerName: {
        color: '#111827',
        fontSize: 16,
        fontWeight: '700',
    },
    composerUsername: {
        color: '#6b7280',
        fontSize: 12,
    },
    composerInput: {
        minHeight: 92,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 14,
        paddingVertical: 12,
        textAlignVertical: 'top',
        color: '#111827',
        fontSize: 15,
        backgroundColor: '#fafafa',
    },
    selectedMediaWrap: {
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
    },
    selectedMedia: {
        width: '100%',
        height: 220,
        backgroundColor: '#e5e7eb',
    },
    removeMediaButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        borderRadius: 999,
        backgroundColor: 'rgba(17, 24, 39, 0.75)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    composerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    mediaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
    },
    mediaButtonText: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '600',
    },
    postButton: {
        minWidth: 96,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111827',
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 999,
    },
    postButtonDisabled: {
        opacity: 0.45,
    },
    postButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
    feedWrap: {
        gap: 14,
        paddingBottom: 24,
    },
    postCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 14,
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    postAvatarWrap: {
        width: 44,
        height: 44,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    postAvatar: {
        width: '100%',
        height: '100%',
    },
    postAvatarText: {
        color: '#111827',
        fontSize: 16,
        fontWeight: '700',
    },
    postHeaderTextWrap: {
        flex: 1,
    },
    postName: {
        fontWeight: '700',
        color: '#111827',
        fontSize: 15,
    },
    postUsername: {
        color: '#6b7280',
        fontSize: 12,
    },
    postCaption: {
        color: '#1f2937',
        fontSize: 15,
        lineHeight: 22,
    },
    postMedia: {
        width: '100%',
        height: 300,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        color: '#111827',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyText: {
        color: '#6b7280',
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 22,
    },
});
