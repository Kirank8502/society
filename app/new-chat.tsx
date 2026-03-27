import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCurrentUser } from './services/authService';
import { createOrGetDirectChat, getAllUsers, UserProfile } from './services/firestoreService';

export default function NewChatScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChatWithId, setStartingChatWithId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.replace('/login');
        return;
      }

      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers.filter((user) => user.id !== currentUser.uid));
      } catch (error) {
        Alert.alert('Error', 'Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [router]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.profession.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, users]);

  const handleStartChat = async (targetUser: UserProfile) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setStartingChatWithId(targetUser.id);
    try {
      const { chatId, chatName } = await createOrGetDirectChat(
        currentUser.uid,
        currentUser.displayName || 'You',
        targetUser.id,
        targetUser.fullName || targetUser.email
      );

      router.replace({
        pathname: '/chat/[id]',
        params: { id: chatId, name: chatName },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    } finally {
      setStartingChatWithId(null);
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
          headerTitle: 'Maru Rajput Samaj',
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />

      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <ThemedText style={styles.headerTitle}>Start New Chat</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Choose a community member to start chatting.</ThemedText>

          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users by name, email, or profession..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#3b5998" />
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredUsers.map((user) => (
              <Pressable
                key={user.id}
                style={styles.userCard}
                onPress={() => handleStartChat(user)}
                disabled={startingChatWithId === user.id}>
                <View style={styles.avatarWrap}>
                  <ThemedText style={styles.avatarText}>{user.fullName.charAt(0)}</ThemedText>
                </View>

                <View style={styles.userInfoWrap}>
                  <ThemedText style={styles.userName}>{user.fullName}</ThemedText>
                  <ThemedText style={styles.userDetail}>{user.email}</ThemedText>
                  <ThemedText style={styles.userDetail}>{user.profession || 'Community Member'}</ThemedText>
                </View>

                {startingChatWithId === user.id ? (
                  <ActivityIndicator color="#3b5998" />
                ) : (
                  <MaterialIcons name="chevron-right" size={22} color="#9ca3af" />
                )}
              </Pressable>
            ))}

            {filteredUsers.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="person-search" size={42} color="#d1d5db" />
                <ThemedText style={styles.emptyTitle}>No Users Found</ThemedText>
                <ThemedText style={styles.emptySubtitle}>Try another search term.</ThemedText>
              </View>
            ) : null}
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
    padding: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: -4,
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
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  listWrap: {
    gap: 8,
  },
  userCard: {
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
  userInfoWrap: {
    flex: 1,
    gap: 1,
  },
  userName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  userDetail: {
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
