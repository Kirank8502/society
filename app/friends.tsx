import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCurrentUser } from './services/authService';
import {
  acceptFriendRequest,
  FriendProfile,
  FriendRequest,
  getIncomingFriendRequests,
  getUserFriends,
  rejectFriendRequest,
} from './services/firestoreService';

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);

  useEffect(() => {
    const loadFriendsData = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.replace('/login');
        return;
      }

      try {
        const [nextFriends, nextRequests] = await Promise.all([
          getUserFriends(currentUser.uid),
          getIncomingFriendRequests(currentUser.uid),
        ]);
        setFriends(nextFriends);
        setRequests(nextRequests);
      } catch (error) {
        console.error('Error loading friends:', error);
        Alert.alert('Error', 'Failed to load friends. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadFriendsData();
  }, [router]);

  const handleAcceptRequest = async (request: FriendRequest) => {
    setRequestActionId(request.id);
    try {
      await acceptFriendRequest(request);
      setRequests((prev) => prev.filter((currentRequest) => currentRequest.id !== request.id));
      const updatedFriends = await getUserFriends(request.toUid);
      setFriends(updatedFriends);
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request. Please try again.');
    } finally {
      setRequestActionId(null);
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    setRequestActionId(request.id);
    try {
      await rejectFriendRequest(request.id);
      setRequests((prev) => prev.filter((currentRequest) => currentRequest.id !== request.id));
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    } finally {
      setRequestActionId(null);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#3b5998',
          },
          headerTintColor: '#ffffff',
          headerTitle: 'My Friends',
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />

      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <MaterialIcons name="people" size={24} color="#3b5998" />
          </View>
          <View style={styles.headerTextWrap}>
            <ThemedText style={styles.headerTitle}>Friend List</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Manage and view your saved connections.</ThemedText>
          </View>
          <View style={styles.countPill}>
            <ThemedText style={styles.countText}>{friends.length}</ThemedText>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Friend Requests</ThemedText>

          {requests.length > 0 ? (
            <View style={styles.requestListWrap}>
              {requests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestTextWrap}>
                    <ThemedText style={styles.requestName}>{request.fromName}</ThemedText>
                    <ThemedText style={styles.requestDetail}>{request.fromEmail}</ThemedText>
                  </View>

                  <View style={styles.requestActionsWrap}>
                    <Pressable
                      style={[styles.requestButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(request)}
                      disabled={requestActionId === request.id}>
                      <ThemedText style={styles.acceptButtonText}>
                        {requestActionId === request.id ? '...' : 'Accept'}
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      style={[styles.requestButton, styles.rejectButton]}
                      onPress={() => handleRejectRequest(request)}
                      disabled={requestActionId === request.id}>
                      <ThemedText style={styles.rejectButtonText}>Reject</ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.noRequestText}>No pending requests.</ThemedText>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#3b5998" />
          </View>
        ) : friends.length > 0 ? (
          <View style={styles.listWrap}>
            {friends.map((friend) => (
              <Pressable key={friend.id} style={styles.friendCard}>
                <View style={styles.avatarWrap}>
                  {friend.profileImageUrl ? (
                    <Image source={{ uri: friend.profileImageUrl }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarText}>{friend.fullName.charAt(0)}</ThemedText>
                  )}
                </View>

                <View style={styles.friendInfoWrap}>
                  <ThemedText style={styles.friendName}>{friend.fullName}</ThemedText>
                  <ThemedText style={styles.friendDetail}>{friend.email}</ThemedText>
                  <ThemedText style={styles.friendDetail}>
                    {friend.profession || friend.location || 'Community Member'}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="person-search" size={42} color="#d1d5db" />
            <ThemedText style={styles.emptyTitle}>No Friends Yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>Go to Community tab and tap Add Friend.</ThemedText>
          </View>
        )}
      </ScrollView>
    </>
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
    padding: 14,
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
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  requestListWrap: {
    gap: 8,
  },
  requestCard: {
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  requestTextWrap: {
    gap: 1,
  },
  requestName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  requestDetail: {
    color: '#6b7280',
    fontSize: 12,
  },
  requestActionsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acceptButton: {
    backgroundColor: '#3b5998',
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectButtonText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  noRequestText: {
    color: '#6b7280',
    fontSize: 13,
  },
  countPill: {
    backgroundColor: '#e8f0ff',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countText: {
    color: '#3b5998',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  listWrap: {
    gap: 8,
  },
  friendCard: {
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#3b5998',
    fontWeight: '700',
    fontSize: 18,
  },
  friendInfoWrap: {
    flex: 1,
  },
  friendName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  friendDetail: {
    color: '#6b7280',
    fontSize: 13,
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
