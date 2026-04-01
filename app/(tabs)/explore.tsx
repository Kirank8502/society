import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCurrentUser } from '../services/authService';
import {
  FriendProfile,
  getAllUsers,
  getOutgoingFriendRequestUserIds,
  getUserFriends,
  sendFriendRequest,
  UserProfile,
} from '../services/firestoreService';

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [sentRequestUserIds, setSentRequestUserIds] = useState<string[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          setProfiles([]);
          setFriends([]);
          return;
        }

        const [users, existingFriends, outgoingRequestUserIds] = await Promise.all([
          getAllUsers(),
          getUserFriends(currentUser.uid),
          getOutgoingFriendRequestUserIds(currentUser.uid),
        ]);

        const matchingCurrentUserProfile = users.find((user) => user.id === currentUser.uid);
        const fallbackCurrentUserProfile: UserProfile = {
          id: currentUser.uid,
          email: currentUser.email || '',
          fullName: currentUser.displayName || 'My Profile',
          location: '',
          profession: '',
          about: '',
          createdAt: '',
          updatedAt: '',
        };

        setCurrentUserProfile(matchingCurrentUserProfile || fallbackCurrentUserProfile);
        setFriends(existingFriends);
        setSentRequestUserIds(outgoingRequestUserIds);
        setProfiles(users.filter((user) => user.id !== currentUser.uid));
      } catch (error) {
        console.error('Error loading profiles:', error);
        Alert.alert('Error', 'Failed to load members. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return profiles;
    }

    return profiles.filter((profile) => {
      return (
        profile.fullName.toLowerCase().includes(query) ||
        profile.profession.toLowerCase().includes(query) ||
        profile.location.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, profiles]);

  const friendIds = useMemo(() => {
    return new Set(friends.map((friend) => friend.id));
  }, [friends]);

  const sentRequestIds = useMemo(() => {
    return new Set(sentRequestUserIds);
  }, [sentRequestUserIds]);

  const handleAddFriend = async (profile: UserProfile) => {
    if (!currentUserProfile) {
      Alert.alert('Login Required', 'Please login again to add friends.');
      return;
    }

    if (friendIds.has(profile.id) || sentRequestIds.has(profile.id)) {
      return;
    }

    setAddingFriendId(profile.id);
    try {
      await sendFriendRequest(currentUserProfile, profile);
      setSentRequestUserIds((prev) => {
        if (prev.includes(profile.id)) {
          return prev;
        }
        return [...prev, profile.id];
      });
      Alert.alert('Request Sent', `Friend request sent to ${profile.fullName}.`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    } finally {
      setAddingFriendId(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.usersBadge}>
            <MaterialIcons name="groups" size={24} color="#3b5998" />
          </View>
          <View style={styles.heroTextWrap}>
            <ThemedText style={styles.title}>Member Directory</ThemedText>
            <ThemedText style={styles.subtitle}>
              Find friends and connect with people in your community.
            </ThemedText>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, job, or city..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.friendListCard}>
        <View style={styles.friendListHeaderRow}>
          <MaterialIcons name="people" size={20} color="#3b5998" />
          <ThemedText style={styles.friendListTitle}>My Friends</ThemedText>
          <ThemedText style={styles.friendCount}>{friends.length}</ThemedText>
        </View>

        {friends.length > 0 ? (
          <View style={styles.friendRowsWrap}>
            {friends.map((friend) => (
              <View key={friend.id} style={styles.friendRow}>
                <View style={styles.friendAvatarWrap}>
                  {friend.profileImageUrl ? (
                    <Image source={{ uri: friend.profileImageUrl }} style={styles.friendAvatarImage} />
                  ) : (
                    <ThemedText style={styles.friendAvatarText}>{friend.fullName.charAt(0)}</ThemedText>
                  )}
                </View>
                <View style={styles.friendTextWrap}>
                  <ThemedText style={styles.friendName}>{friend.fullName}</ThemedText>
                  <ThemedText style={styles.friendMeta}>
                    {friend.profession || friend.email || 'Community Member'}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <ThemedText style={styles.friendEmptyText}>
            You have no friends yet. Tap Add Friend below to connect.
          </ThemedText>
        )}
      </View>

      <View style={styles.cardsWrap}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b5998" />
          </View>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile) => {
            const isFriend = friendIds.has(profile.id);
            const isRequestSent = sentRequestIds.has(profile.id);
            const isAdding = addingFriendId === profile.id;

            const iconName = isFriend ? 'person' : isRequestSent ? 'schedule' : 'person-add';
            const buttonText = isAdding
              ? 'Adding...'
              : isFriend
                ? 'Friend Added'
                : isRequestSent
                  ? 'Request Sent'
                  : 'Add Friend';

            return (
              <View key={profile.id} style={styles.profileCard}>
                <View style={styles.avatarWrap}>
                  {profile.profileImageUrl ? (
                    <Image source={{ uri: profile.profileImageUrl }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarText}>{profile.fullName.charAt(0)}</ThemedText>
                  )}
                </View>

                <ThemedText style={styles.profileName}>{profile.fullName}</ThemedText>
                <ThemedText style={styles.profileProfession}>{profile.profession}</ThemedText>

                <View style={styles.locationPill}>
                  <MaterialIcons name="location-on" size={14} color="#6b7280" />
                  <ThemedText style={styles.locationText}>{profile.location}</ThemedText>
                </View>

                <Pressable
                  style={[styles.addFriendButton, isFriend || isRequestSent ? styles.addedFriendButton : undefined]}
                  onPress={() => handleAddFriend(profile)}
                  disabled={isFriend || isRequestSent || isAdding}>
                  <MaterialIcons name={iconName} size={16} color="#1f2937" />
                  <ThemedText style={styles.addFriendText}>{buttonText}</ThemedText>
                </Pressable>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="groups" size={44} color="#d1d5db" />
            <ThemedText style={styles.emptyTitle}>No Members Found</ThemedText>
            <ThemedText style={styles.emptySubtitle}>Try adjusting your search criteria.</ThemedText>
          </View>
        )}
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
    gap: 14,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 14,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  usersBadge: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#e8f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
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
  cardsWrap: {
    gap: 10,
  },
  friendListCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 10,
  },
  friendListHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendListTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  friendCount: {
    color: '#3b5998',
    fontWeight: '700',
    fontSize: 13,
    backgroundColor: '#e8f0ff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  friendRowsWrap: {
    gap: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  friendAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#e8f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  friendAvatarImage: {
    width: '100%',
    height: '100%',
  },
  friendAvatarText: {
    color: '#3b5998',
    fontWeight: '700',
    fontSize: 15,
  },
  friendTextWrap: {
    flex: 1,
  },
  friendName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  friendMeta: {
    color: '#6b7280',
    fontSize: 12,
  },
  friendEmptyText: {
    color: '#6b7280',
    fontSize: 13,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  avatarWrap: {
    width: 66,
    height: 66,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f0ff',
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#3b5998',
    fontWeight: '700',
    fontSize: 24,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  profileProfession: {
    fontSize: 14,
    color: '#3b5998',
    fontWeight: '600',
  },
  locationPill: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  addFriendButton: {
    marginTop: 8,
    width: '100%',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f2f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addedFriendButton: {
    backgroundColor: '#e8f0ff',
  },
  addFriendText: {
    color: '#1f2937',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySubtitle: {
    color: '#6b7280',
    fontSize: 14,
  },
});
