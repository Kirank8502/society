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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Collapsible } from '@/components/ui/collapsible';
import { submitSupportRequest } from './services/firestoreService';

type SupportType = 'query' | 'bug';

const FAQS = [
  {
    question: 'How do I update my profile details?',
    answer: 'Go to Settings > Edit Profile to update your name, photo, location, and bio details.',
  },
  {
    question: 'Why am I not receiving notifications?',
    answer:
      'Push notifications require permission and may need a development build instead of Expo Go on Android SDK 53+.',
  },
  {
    question: 'How can I report a problem in chats or posts?',
    answer:
      'Use the form below, choose Bug Report, and share steps to reproduce the issue so support can investigate quickly.',
  },
  {
    question: 'How long does support take to respond?',
    answer: 'Most requests are reviewed within 24 to 48 hours, depending on request volume.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [supportType, setSupportType] = useState<SupportType>('query');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit = useMemo(() => {
    return subject.trim().length > 2 && message.trim().length > 9 && !submitting;
  }, [subject, message, submitting]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      setErrorMessage('Please add a clear subject and a detailed message.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await submitSupportRequest({
        type: supportType,
        subject,
        message,
      });

      Alert.alert('Request Submitted', 'Thanks for contacting support. We will review your request soon.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      const errorCode = typeof error?.code === 'string' ? error.code : '';

      if (errorCode === 'permission-denied' || errorCode === 'firestore/permission-denied') {
        setErrorMessage('Support request permission was denied. Please login again and retry.');
      } else {
        setErrorMessage(error?.message || 'Failed to submit your request. Please try again.');
      }
    } finally {
      setSubmitting(false);
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
          headerTitle: 'Help & Support',
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 88 }]}
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled">
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="live-help" size={20} color="#3b5998" />
              <ThemedText style={styles.sectionTitle}>FAQs</ThemedText>
            </View>

            {FAQS.map((faq) => (
              <View key={faq.question} style={styles.faqItem}>
                <Collapsible title={faq.question}>
                  <ThemedText style={styles.faqAnswer}>{faq.answer}</ThemedText>
                </Collapsible>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="report-problem" size={20} color="#3b5998" />
              <ThemedText style={styles.sectionTitle}>Contact Support</ThemedText>
            </View>
            <ThemedText style={styles.sectionHint}>Send a question or report a bug using the form below.</ThemedText>

            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeButton, supportType === 'query' ? styles.typeButtonActive : undefined]}
                onPress={() => setSupportType('query')}>
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={16}
                  color={supportType === 'query' ? '#ffffff' : '#4b5563'}
                />
                <ThemedText style={[styles.typeButtonText, supportType === 'query' ? styles.typeButtonTextActive : undefined]}>
                  Query
                </ThemedText>
              </Pressable>

              <Pressable
                style={[styles.typeButton, supportType === 'bug' ? styles.typeButtonActive : undefined]}
                onPress={() => setSupportType('bug')}>
                <MaterialIcons
                  name="bug-report"
                  size={16}
                  color={supportType === 'bug' ? '#ffffff' : '#4b5563'}
                />
                <ThemedText style={[styles.typeButtonText, supportType === 'bug' ? styles.typeButtonTextActive : undefined]}>
                  Bug Report
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.fieldWrap}>
              <ThemedText style={styles.label}>Subject</ThemedText>
              <TextInput
                value={subject}
                onChangeText={(value) => {
                  setSubject(value);
                  if (errorMessage) {
                    setErrorMessage('');
                  }
                }}
                placeholder={supportType === 'bug' ? 'Example: App crashes when opening messages' : 'What do you need help with?'}
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldWrap}>
              <ThemedText style={styles.label}>Details</ThemedText>
              <TextInput
                value={message}
                onChangeText={(value) => {
                  setMessage(value);
                  if (errorMessage) {
                    setErrorMessage('');
                  }
                }}
                placeholder={
                  supportType === 'bug'
                    ? 'Tell us what happened, what you expected, and steps to reproduce.'
                    : 'Share your question in detail so we can help faster.'
                }
                placeholderTextColor="#9ca3af"
                style={styles.textArea}
                multiline
                textAlignVertical="top"
              />
            </View>

            {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[styles.primaryButton, !canSubmit ? styles.primaryButtonDisabled : undefined]}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>Submit Request</ThemedText>
              )}
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
    padding: 16,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHint: {
    color: '#6b7280',
    fontSize: 13,
  },
  faqItem: {
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: '#f9fafb',
  },
  faqAnswer: {
    color: '#4b5563',
    fontSize: 13,
    lineHeight: 18,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#3b5998',
    borderColor: '#3b5998',
  },
  typeButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#ffffff',
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
    minHeight: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
  },
  primaryButton: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#3b5998',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
