import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { registerUser } from './services/authService';

const PASSWORD_RULE_MESSAGE =
  'Password must be 6-10 characters and include uppercase, lowercase, number, and special character.';

const isValidPassword = (value: string): boolean => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,10}$/.test(value);
};

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fullNameError, setFullNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordHasValue = password.trim().length > 0;
  const passwordIsValid = isValidPassword(password);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      passwordIsValid &&
      !loading
    );
  }, [fullName, email, password, passwordIsValid, loading]);

  const handleRegister = async () => {
    if (!canSubmit) {
      if (passwordHasValue && !passwordIsValid) {
        setPasswordError(true);
        setErrorMessage(PASSWORD_RULE_MESSAGE);
      }
      return;
    }

    setErrorMessage('');
    setFullNameError(false);
    setEmailError(false);
    setPasswordError(false);
    setLoading(true);
    try {
      await registerUser(email, password, fullName);
      router.replace('/(tabs)');
    } catch (error: any) {
      const errorCode = typeof error?.code === 'string' ? error.code : '';

      if (errorCode === 'auth/email-already-in-use') {
        setEmailError(true);
        setErrorMessage('Email already exists. Please login or use another email.');
      } else if (errorCode === 'auth/invalid-email') {
        setEmailError(true);
        setErrorMessage('Please enter a valid email address.');
      } else if (errorCode === 'auth/weak-password' || errorCode === 'auth/invalid-password-format') {
        setPasswordError(true);
        setErrorMessage(PASSWORD_RULE_MESSAGE);
      } else {
        setFullNameError(true);
        setEmailError(true);
        setPasswordError(true);
        setErrorMessage(error?.message || 'Failed to register. Please try again.');
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
          <ThemedText style={styles.formTitle}>Create Account</ThemedText>
          <ThemedText style={styles.formSubtitle}>Join the community and start connecting.</ThemedText>

          <View style={styles.fieldWrap}>
            <ThemedText style={styles.label}>Full Name</ThemedText>
            <TextInput
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (fullNameError) {
                  setFullNameError(false);
                }
                if (errorMessage) {
                  setErrorMessage('');
                }
              }}
              placeholder="Your full name"
              placeholderTextColor="#9ca3af"
              style={[styles.input, fullNameError ? styles.inputError : undefined]}
            />
          </View>

          <View style={styles.fieldWrap}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) {
                  setEmailError(false);
                }
                if (errorMessage) {
                  setErrorMessage('');
                }
              }}
              placeholder="you@community.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, emailError ? styles.inputError : undefined]}
            />
          </View>

          <View style={styles.fieldWrap}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <View style={[styles.passwordInputWrap, passwordError ? styles.inputError : undefined]}>
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError && isValidPassword(text)) {
                    setPasswordError(false);
                  }
                  if (errorMessage && (errorMessage === PASSWORD_RULE_MESSAGE ? isValidPassword(text) : true)) {
                    setErrorMessage('');
                  }
                }}
                placeholder="Create a password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.iconButton}
                hitSlop={8}>
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color="#6b7280"
                />
              </Pressable>
            </View>
            {passwordHasValue && !passwordIsValid ? (
              <ThemedText style={styles.errorText}>{PASSWORD_RULE_MESSAGE}</ThemedText>
            ) : null}
            {errorMessage && errorMessage !== PASSWORD_RULE_MESSAGE ? (
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            ) : null}
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={!canSubmit}
            style={[styles.primaryButton, !canSubmit ? styles.primaryButtonDisabled : undefined]}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>Register</ThemedText>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <ThemedText style={styles.footerText}>Already have an account?</ThemedText>
            <Link href="/login" style={styles.footerLink}>
              Login
            </Link>
          </View>
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
  inputError: {
    borderColor: '#dc2626',
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 13,
  },
  footerLink: {
    color: '#3b5998',
    fontSize: 13,
    fontWeight: '700',
  },
});
