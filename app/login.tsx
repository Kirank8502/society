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
import { loginUser } from './services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0 && !loading;
  }, [email, password, loading]);

  const handleLogin = async () => {
    if (!canSubmit) {
      return;
    }

    setErrorMessage('');
    setEmailError(false);
    setPasswordError(false);
    setLoading(true);
    try {
      await loginUser(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      const errorCode = typeof error?.code === 'string' ? error.code : '';

      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-email') {
        setEmailError(true);
        setErrorMessage('Email does not exist. Please check your email or register first.');
      } else if (errorCode === 'auth/wrong-password') {
        setPasswordError(true);
        setErrorMessage('Incorrect password. Please try again.');
      } else if (errorCode === 'auth/invalid-login' || errorCode === 'auth/invalid-credential') {
        setEmailError(true);
        setPasswordError(true);
        setErrorMessage('Email or password is incorrect.');
      } else {
        setEmailError(true);
        setPasswordError(true);
        setErrorMessage(error?.message || 'Failed to login. Please try again.');
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
          <ThemedText style={styles.formTitle}>Welcome Back</ThemedText>
          <ThemedText style={styles.formSubtitle}>Sign in to continue to your account.</ThemedText>

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
                  if (passwordError) {
                    setPasswordError(false);
                  }
                  if (errorMessage) {
                    setErrorMessage('');
                  }
                }}
                placeholder="Enter your password"
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
            {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={!canSubmit}
            style={[styles.primaryButton, !canSubmit ? styles.primaryButtonDisabled : undefined]}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>Login</ThemedText>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <ThemedText style={styles.footerText}>Don’t have an account?</ThemedText>
            <Link href="/register" style={styles.footerLink}>
              Register
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
