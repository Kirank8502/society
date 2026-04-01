import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '../config/firebase';
import {
    ChatPreview,
    getBusinessListings,
    getIncomingFriendRequests,
    getUserFriends,
    getUserProfile,
    subscribeChatPreviews,
    updateUserProfile,
} from '../services/firestoreService';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const [currentUserId, setCurrentUserId] = useState<string | null>(auth.currentUser?.uid || null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [newFriendBusinessCount, setNewFriendBusinessCount] = useState(0);
  const [newChatMessageCount, setNewChatMessageCount] = useState(0);
  const lastSeenBusinessAtRef = useRef(0);
  const lastSeenFriendRequestAtRef = useRef(0);
  const lastSeenChatAtRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const previousFriendCountRef = useRef(0);
  const previousChatCountRef = useRef(0);
  const notificationsModuleRef = useRef<typeof import('expo-notifications') | null>(null);
  const permissionsCheckedRef = useRef(false);
  const canNotifyRef = useRef(false);

  const totalNotificationCount = useMemo(() => {
    return pendingRequestCount + newFriendBusinessCount + newChatMessageCount;
  }, [pendingRequestCount, newFriendBusinessCount, newChatMessageCount]);

  const getNotificationsModule = async () => {
    if (notificationsModuleRef.current) {
      return notificationsModuleRef.current;
    }

    const notificationsModule = await import('expo-notifications');
    notificationsModuleRef.current = notificationsModule;
    return notificationsModule;
  };

  const sendLocalNotification = async (title: string, body: string) => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const Notifications = await getNotificationsModule();

      if (!permissionsCheckedRef.current) {
        const permission = await Notifications.getPermissionsAsync();
        canNotifyRef.current = permission.granted;
        permissionsCheckedRef.current = true;
      }

      if (!canNotifyRef.current) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  };

  const markFriendRequestsAsSeen = async () => {
    if (!currentUserId) {
      return;
    }

    const nowIso = new Date().toISOString();
    lastSeenFriendRequestAtRef.current = new Date(nowIso).getTime();
    setPendingRequestCount(0);

    try {
      await updateUserProfile(currentUserId, {
        notificationsLastSeenFriendRequestAt: nowIso,
      });
    } catch (error) {
      console.error('Error persisting seen friend request state:', error);
    }
  };

  const markFriendBusinessesAsSeen = async () => {
    if (!currentUserId) {
      return;
    }

    const nowIso = new Date().toISOString();
    lastSeenBusinessAtRef.current = new Date(nowIso).getTime();
    setNewFriendBusinessCount(0);

    try {
      await updateUserProfile(currentUserId, {
        notificationsLastSeenBusinessAt: nowIso,
      });
    } catch (error) {
      console.error('Error persisting seen business notification state:', error);
    }
  };

  const markChatsAsSeen = async () => {
    if (!currentUserId) {
      return;
    }

    const nowIso = new Date().toISOString();
    lastSeenChatAtRef.current = new Date(nowIso).getTime();
    setNewChatMessageCount(0);

    try {
      await updateUserProfile(currentUserId, {
        notificationsLastSeenChatAt: nowIso,
      });
    } catch (error) {
      console.error('Error persisting seen chat notification state:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let unsubscribeChats: (() => void) | null = null;

    if (!currentUserId) {
      setPendingRequestCount(0);
      setNewFriendBusinessCount(0);
      setNewChatMessageCount(0);
      hasInitializedRef.current = false;
      previousFriendCountRef.current = 0;
      previousChatCountRef.current = 0;
      return;
    }

    const loadLastSeenState = async () => {
      try {
        const profile = await getUserProfile(currentUserId);
        lastSeenBusinessAtRef.current = profile?.notificationsLastSeenBusinessAt
          ? new Date(profile.notificationsLastSeenBusinessAt).getTime()
          : 0;
        lastSeenFriendRequestAtRef.current = profile?.notificationsLastSeenFriendRequestAt
          ? new Date(profile.notificationsLastSeenFriendRequestAt).getTime()
          : 0;
        lastSeenChatAtRef.current = profile?.notificationsLastSeenChatAt
          ? new Date(profile.notificationsLastSeenChatAt).getTime()
          : 0;
      } catch (error) {
        console.error('Error loading notification seen state:', error);
      }
    };

    const refreshNotificationCounts = async () => {
      try {
        const [incomingRequests, friends, businesses] = await Promise.all([
          getIncomingFriendRequests(currentUserId),
          getUserFriends(currentUserId),
          getBusinessListings(),
        ]);

        if (!isMounted) {
          return;
        }

        const friendIds = new Set(friends.map((friend) => friend.id));
        const lastSeenBusinessTime = lastSeenBusinessAtRef.current;
        const lastSeenFriendRequestTime = lastSeenFriendRequestAtRef.current;

        const unseenFriendRequests = incomingRequests.filter((request) => {
          const createdTime = new Date(request.createdAt || 0).getTime();
          return createdTime > lastSeenFriendRequestTime;
        });

        const newFriendBusinesses = businesses.filter((business) => {
          const createdTime = new Date(business.createdAt || 0).getTime();
          return (
            friendIds.has(business.authorUid) &&
            business.authorUid !== currentUserId &&
            createdTime > lastSeenBusinessTime
          );
        });

        setPendingRequestCount(unseenFriendRequests.length);
        setNewFriendBusinessCount(newFriendBusinesses.length);

        if (hasInitializedRef.current && unseenFriendRequests.length > previousFriendCountRef.current) {
          const newCount = unseenFriendRequests.length - previousFriendCountRef.current;
          await sendLocalNotification(
            'New Friend Request',
            `${newCount} new friend request${newCount > 1 ? 's' : ''} received.`
          );
        }

        previousFriendCountRef.current = unseenFriendRequests.length;
      } catch (error) {
        console.error('Error loading header notifications:', error);
      }
    };

    const refreshChatNotifications = async (chats: ChatPreview[]) => {
      if (!isMounted) {
        return;
      }

      const unseenChats = chats.filter((chat) => {
        const updatedAt = chat.updatedAt ? new Date(chat.updatedAt).getTime() : 0;
        return updatedAt > lastSeenChatAtRef.current && chat.lastMessageSenderUid && chat.lastMessageSenderUid !== currentUserId;
      });

      setNewChatMessageCount(unseenChats.length);

      if (hasInitializedRef.current && unseenChats.length > previousChatCountRef.current) {
        const newCount = unseenChats.length - previousChatCountRef.current;
        await sendLocalNotification(
          'New Chat Message',
          `${newCount} new message${newCount > 1 ? 's' : ''} received.`
        );
      }

      previousChatCountRef.current = unseenChats.length;
    };

    loadLastSeenState().finally(() => {
      refreshNotificationCounts();
      intervalId = setInterval(refreshNotificationCounts, 30000);
      unsubscribeChats = subscribeChatPreviews(
        currentUserId,
        (chats) => {
          void refreshChatNotifications(chats);
        },
        (error) => {
          console.error('Error loading chat notifications:', error);
        }
      );
      hasInitializedRef.current = true;
    });

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (unsubscribeChats) {
        unsubscribeChats();
      }
    };
  }, [currentUserId]);

  useEffect(() => {
    if (pathname === '/friends') {
      void markFriendRequestsAsSeen();
    }
    if (pathname === '/(tabs)/messages' || pathname === '/messages') {
      void markChatsAsSeen();
    }
  }, [pathname]);

  const handleOpenNotifications = () => {
    if (!currentUserId) {
      return;
    }

    const summary = [
      `Friend Requests: ${pendingRequestCount}`,
      `New Friend Business Posts: ${newFriendBusinessCount}`,
      `New Chat Messages: ${newChatMessageCount}`,
    ].join('\n');

    Alert.alert('Notifications', summary, [
      {
        text: 'View Requests',
        onPress: async () => {
          await markFriendRequestsAsSeen();
          router.push('/friends');
        },
      },
      {
        text: 'View Businesses',
        onPress: async () => {
          await markFriendBusinessesAsSeen();
          router.push('/(tabs)/business');
        },
      },
      {
        text: 'View Messages',
        onPress: async () => {
          await markChatsAsSeen();
          router.push('/(tabs)/messages');
        },
      },
      {
        text: 'Close',
        style: 'cancel',
      },
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b5998',
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
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
        headerRight: () => (
          <Pressable style={styles.bellButton} onPress={handleOpenNotifications}>
            <MaterialIcons name="notifications-none" size={24} color="#ffffff" />
            {totalNotificationCount > 0 ? (
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{totalNotificationCount > 99 ? '99+' : totalNotificationCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ),
        sceneStyle: {
          backgroundColor: '#f0f2f5',
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          title: 'Businesses',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="message.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    marginRight: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    position: 'absolute',
    right: -6,
    top: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#3b5998',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
