import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCurrentUser } from './services/authService';
import { getUserProfile, updateUserProfile } from './services/firestoreService';

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    location: '',
    profession: '',
    about: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      setUserId(user.uid);
      try {
        const profile = await getUserProfile(user.uid);
        setFormData({
          fullName: profile?.fullName || user.displayName || '',
          location: profile?.location || '',
          profession: profile?.profession || '',
          about: profile?.about || '',
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const canSave = useMemo(() => {
    return formData.fullName.trim().length > 0 && !saving;
  }, [formData.fullName, saving]);

  const handleSave = async () => {
    if (!canSave || !userId) {
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(userId, {
        fullName: formData.fullName.trim(),
        location: formData.location.trim(),
        profession: formData.profession.trim(),
        about: formData.about.trim(),
      });
      Alert.alert('Success', 'Profile updated successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/settings'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5998" />
      </View>
    );
  }

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

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.fieldWrap}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                value={formData.fullName}
                onChangeText={(value) => setFormData((previous) => ({ ...previous, fullName: value }))}
                placeholder="Your full name"
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldWrap}>
              <ThemedText style={styles.label}>Profession</ThemedText>
              <TextInput
                value={formData.profession}
                onChangeText={(value) => setFormData((previous) => ({ ...previous, profession: value }))}
                placeholder="e.g. Developer"
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldWrap}>
              <ThemedText style={styles.label}>Location</ThemedText>
              <TextInput
                value={formData.location}
                onChangeText={(value) => setFormData((previous) => ({ ...previous, location: value }))}
                placeholder="e.g. Austin, TX"
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldWrap}>
              <ThemedText style={styles.label}>About</ThemedText>
              <TextInput
                value={formData.about}
                onChangeText={(value) => setFormData((previous) => ({ ...previous, about: value }))}
                placeholder="Tell people about yourself"
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.textArea]}
              />
            </View>

            <View style={styles.actionsRow}>
              <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
                <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, !canSave ? styles.primaryButtonDisabled : undefined]}
                onPress={handleSave}
                disabled={!canSave}>
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={16} color="#ffffff" />
                    <ThemedText style={styles.primaryButtonText}>Save</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  screen: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    color: '#111827',
    fontSize: 14,
  },
  textArea: {
    height: 110,
    paddingTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#3b5998',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});
