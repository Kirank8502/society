import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
import { PASSWORD_RULE_MESSAGE, changePassword, isValidPassword, logoutUser } from './services/authService';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const newPasswordHasValue = newPassword.trim().length > 0;
  const passwordMatches = newPassword.trim() === confirmPassword.trim();
  const passwordIsValid = isValidPassword(newPassword.trim());

  const canSubmit = useMemo(() => {
    return (
      currentPassword.trim().length > 0 &&
      newPassword.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      passwordIsValid &&
      passwordMatches &&
      !loading
    );
  }, [currentPassword, newPassword, confirmPassword, passwordIsValid, passwordMatches, loading]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!passwordIsValid && newPasswordHasValue) {
        setErrorMessage(PASSWORD_RULE_MESSAGE);
      } else if (!passwordMatches && confirmPassword.trim().length > 0) {
        setErrorMessage('New password and confirm password must match.');
      }
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await changePassword(currentPassword.trim(), newPassword.trim());
      await logoutUser();
      Alert.alert('Password Updated', 'Please login again with your new password.');
      router.replace('/login');
    } catch (error: any) {
      const errorCode = typeof error?.code === 'string' ? error.code : '';

      if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setErrorMessage('Current password is incorrect.');
      } else if (errorCode === 'auth/requires-recent-login') {
        setErrorMessage('Please login again and retry changing your password.');
      } else if (errorCode === 'auth/invalid-password-format' || errorCode === 'auth/weak-password') {
        setErrorMessage(PASSWORD_RULE_MESSAGE);
      } else if (errorCode === 'auth/password-change-not-supported') {
        setErrorMessage('Password change is not available for this account type.');
      } else if (errorCode === 'auth/no-current-user') {
        setErrorMessage('Your session has expired. Please login again.');
      } else {
        setErrorMessage(error?.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
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

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <ThemedText style={styles.formTitle}>Change Password</ThemedText>
            <ThemedText style={styles.formSubtitle}>Keep your account secure with a strong password.</ThemedText>

            <View style={styles.fieldWrap}>
              <ThemedText style={styles.label}>Current Password</ThemedText>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    if (errorMessage) {
                      setErrorMessage('');
                    }
                  }}
                  placeholder="Enter current password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showCurrentPassword}
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => setShowCurrentPassword((prev) => !prev)}
                  style={styles.iconButton}
                  hitSlop={8}>
                  <MaterialIcons
                    name={showCurrentPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#6b7280"
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <ThemedText style={styles.label}>New Password</ThemedText>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (errorMessage) {
                      setErrorMessage('');
                    }
                  }}
                  placeholder="Create a new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showNewPassword}
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  style={styles.iconButton}
                  hitSlop={8}>
                  <MaterialIcons
                    name={showNewPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#6b7280"
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <ThemedText style={styles.label}>Confirm New Password</ThemedText>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errorMessage) {
                      setErrorMessage('');
                    }
                  }}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.iconButton}
                  hitSlop={8}>
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#6b7280"
                  />
                </Pressable>
              </View>
            </View>

            {newPasswordHasValue && !passwordIsValid ? (
              <ThemedText style={styles.errorText}>{PASSWORD_RULE_MESSAGE}</ThemedText>
            ) : null}

            {confirmPassword.trim().length > 0 && !passwordMatches ? (
              <ThemedText style={styles.errorText}>New password and confirm password must match.</ThemedText>
            ) : null}

            {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[styles.primaryButton, !canSubmit ? styles.primaryButtonDisabled : undefined]}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>Update Password</ThemedText>
              )}
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
              <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 12,
  },
  formTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  formSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: -6,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  passwordInputWrap: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    color: '#111827',
    fontSize: 14,
  },
  iconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 2,
  },
  primaryButton: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#3b5998',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});
