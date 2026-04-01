import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { storage } from './config/firebase';
import { getCurrentUser } from './services/authService';
import { getUserProfile, updateUserProfile } from './services/firestoreService';

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [userId, setUserId] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    profileImageUrl: '',
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
          profileImageUrl: profile?.profileImageUrl || '',
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
    return formData.fullName.trim().length > 0 && !saving && !uploadingPhoto;
  }, [formData.fullName, saving, uploadingPhoto]);

  const uploadAndSetProfilePhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!userId) {
      Alert.alert('Login Required', 'Please login again and try updating your profile photo.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExtension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = asset.mimeType || 'image/jpeg';
      const storageRef = ref(storage, `profile-images/${userId}/${Date.now()}.${fileExtension}`);

      const response = await fetch(asset.uri);
      if (!response.ok) {
        throw new Error('Unable to read selected image file for upload.');
      }

      const imageBlob = await response.blob();
      await uploadBytes(storageRef, imageBlob, { contentType });

      const downloadUrl = await getDownloadURL(storageRef);
      setFormData((previous) => ({ ...previous, profileImageUrl: downloadUrl }));
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : '';

      Alert.alert(
        'Upload Failed',
        message.includes('permission')
          ? 'Storage permission denied. Please check Firebase Storage rules for authenticated users.'
          : 'Could not upload profile photo. Please try again.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadAndSetProfilePhoto(result.assets[0]);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take a profile picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadAndSetProfilePhoto(result.assets[0]);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((previous) => ({ ...previous, profileImageUrl: '' }));
  };

  const handleSave = async () => {
    if (!canSave || !userId) {
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(userId, {
        fullName: formData.fullName.trim(),
        profileImageUrl: formData.profileImageUrl.trim(),
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
            <View style={styles.profilePhotoSection}>
              <View style={styles.profilePhotoWrap}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#3b5998" />
                ) : formData.profileImageUrl.trim().length > 0 ? (
                  <Image source={{ uri: formData.profileImageUrl.trim() }} style={styles.profilePhoto} />
                ) : (
                  <MaterialIcons name="person" size={40} color="#6b7280" />
                )}
              </View>

              <View style={styles.photoActionsRow}>
                <Pressable
                  style={[styles.photoActionButton, uploadingPhoto ? styles.photoActionButtonDisabled : undefined]}
                  onPress={handlePickFromGallery}
                  disabled={uploadingPhoto}>
                  <MaterialIcons name="photo-library" size={16} color="#374151" />
                  <ThemedText style={styles.photoActionText}>Upload</ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.photoActionButton, uploadingPhoto ? styles.photoActionButtonDisabled : undefined]}
                  onPress={handleTakePhoto}
                  disabled={uploadingPhoto}>
                  <MaterialIcons name="photo-camera" size={16} color="#374151" />
                  <ThemedText style={styles.photoActionText}>Take Photo</ThemedText>
                </Pressable>

                {formData.profileImageUrl.trim().length > 0 ? (
                  <Pressable
                    style={[styles.photoActionButton, uploadingPhoto ? styles.photoActionButtonDisabled : undefined]}
                    onPress={handleRemovePhoto}
                    disabled={uploadingPhoto}>
                    <MaterialIcons name="delete-outline" size={16} color="#b91c1c" />
                    <ThemedText style={styles.photoRemoveText}>Remove</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>

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
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: 6,
  },
  profilePhotoWrap: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  photoActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  photoActionButtonDisabled: {
    opacity: 0.5,
  },
  photoActionText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  photoRemoveText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
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
