import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { logoutUser } from '../services/authService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function SettingsScreen() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const profile = {
    fullName: 'My Profile',
    email: 'you@community.com',
    location: 'Austin, TX',
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    try {
      await logoutUser();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Logout Failed', 'Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handlePushNotificationsToggle = async (enabled: boolean) => {
    if (!enabled) {
      setPushNotifications(false);
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Push notifications are not supported on web in this app.');
      setPushNotifications(false);
      return;
    }

    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow notifications to enable this setting.');
        setPushNotifications(false);
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      setPushNotifications(true);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Push Notifications Enabled',
          body: 'You will now receive updates from chats and activity.',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Push notification setup failed:', error);
      Alert.alert('Error', 'Failed to enable notifications. Please try again.');
      setPushNotifications(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="settings" size={24} color="#3b5998" />
        </View>
        <View style={styles.headerTextWrap}>
          <ThemedText style={styles.title}>Settings</ThemedText>
          <ThemedText style={styles.subtitle}>Manage your app and privacy preferences.</ThemedText>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Profile</ThemedText>

        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <ThemedText style={styles.profileAvatarText}>{profile.fullName.charAt(0)}</ThemedText>
          </View>
          <View style={styles.settingTextWrap}>
            <ThemedText style={styles.settingLabel}>{profile.fullName}</ThemedText>
            <ThemedText style={styles.settingHint}>{profile.email}</ThemedText>
            <ThemedText style={styles.settingHint}>{profile.location}</ThemedText>
          </View>
        </View>

        <Pressable style={styles.actionRow} onPress={() => router.push('/edit-profile')}>
          <MaterialIcons name="edit" size={18} color="#6b7280" />
          <ThemedText style={styles.actionText}>Edit Profile</ThemedText>
        </Pressable>

        <Pressable style={styles.actionRow}>
          <MaterialIcons name="person-add" size={18} color="#6b7280" />
          <ThemedText style={styles.actionText}>Manage Connections</ThemedText>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>

        <View style={styles.settingRow}>
          <View style={styles.settingTextWrap}>
            <ThemedText style={styles.settingLabel}>Push Notifications</ThemedText>
            <ThemedText style={styles.settingHint}>Receive updates from chats and activity.</ThemedText>
          </View>
          <Switch
            value={pushNotifications}
            onValueChange={handlePushNotificationsToggle}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={pushNotifications ? '#3b5998' : '#f3f4f6'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingTextWrap}>
            <ThemedText style={styles.settingLabel}>Private Profile</ThemedText>
            <ThemedText style={styles.settingHint}>Only connections can view your profile.</ThemedText>
          </View>
          <Switch
            value={privateProfile}
            onValueChange={setPrivateProfile}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={privateProfile ? '#3b5998' : '#f3f4f6'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingTextWrap}>
            <ThemedText style={styles.settingLabel}>Show Online Status</ThemedText>
            <ThemedText style={styles.settingHint}>Let others know when you are active.</ThemedText>
          </View>
          <Switch
            value={showOnlineStatus}
            onValueChange={setShowOnlineStatus}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={showOnlineStatus ? '#3b5998' : '#f3f4f6'}
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <ThemedText style={styles.sectionTitle}>Account</ThemedText>

        <Pressable style={styles.actionRow}>
          <MaterialIcons name="lock" size={18} color="#6b7280" />
          <ThemedText style={styles.actionText}>Change Password</ThemedText>
        </Pressable>

        <Pressable style={styles.actionRow}>
          <MaterialIcons name="help-outline" size={18} color="#6b7280" />
          <ThemedText style={styles.actionText}>Help & Support</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.actionRow, styles.actionDanger, loggingOut ? styles.actionDisabled : undefined]}
          onPress={handleLogout}
          disabled={loggingOut}>
          <MaterialIcons name="logout" size={18} color="#b91c1c" />
          <ThemedText style={styles.actionDangerText}>{loggingOut ? 'Logging Out...' : 'Log Out'}</ThemedText>
        </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f0ff',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#e8f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#3b5998',
    fontWeight: '700',
    fontSize: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  settingHint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  actionText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  actionDanger: {
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
  },
  actionDangerText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  actionDisabled: {
    opacity: 0.7,
  },
});
