import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import { tokens } from '../lib/tokens';

export default function Contact() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    try {
      setSending(true);
      
      // TODO: Replace with actual API endpoint or email service
      // For now, this is a placeholder that simulates sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Message Sent',
        'Thank you for contacting us! We\'ll get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => {
              setName('');
              setEmail('');
              setSubject('');
              setMessage('');
              router.back();
            }
          }
        ]
      );
    } catch (error: any) {
      console.warn('Failed to send contact message', error);
      Alert.alert('Error', 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Contact Us</Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.introSection}>
            <Text style={styles.introTitle}>Get in Touch</Text>
            <Text style={styles.introText}>
              Have a question or feedback? We&apos;d love to hear from you. Fill out the form below and we&apos;ll get back to you as soon as possible.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={tokens.colors.accentCool}
                editable={!sending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@example.com"
                placeholderTextColor={tokens.colors.accentCool}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!sending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject *</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="What is this about?"
                placeholderTextColor={tokens.colors.accentCool}
                editable={!sending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us more..."
                placeholderTextColor={tokens.colors.accentCool}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!sending}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, sending && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color={tokens.colors.card} />
              ) : (
                <Text style={styles.submitButtonText}>Send Message</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.contactInfo}>
            <Text style={styles.contactInfoTitle}>Other Ways to Reach Us</Text>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Email:</Text>
              <Text style={styles.contactValue}>support@trinket.app</Text>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Response Time:</Text>
              <Text style={styles.contactValue}>Within 24-48 hours</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: tokens.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  backgroundColor: tokens.colors.card,
  borderBottomWidth: 1,
  borderBottomColor: tokens.colors.border,
  },
  backButton: {
  color: tokens.colors.accent,
    fontSize: 17,
    width: 70,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  color: tokens.colors.ink,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  introSection: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
  color: tokens.colors.ink,
    marginBottom: 8,
  },
  introText: {
    fontSize: 15,
  color: tokens.colors.accentCool,
    lineHeight: 22,
  },
  form: {
    backgroundColor: tokens.colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  color: tokens.colors.ink,
    marginBottom: 8,
  },
  input: {
  backgroundColor: tokens.colors.border,
  borderWidth: 1,
  borderColor: tokens.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
  color: tokens.colors.ink,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  submitButton: {
  backgroundColor: tokens.colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
  backgroundColor: tokens.colors.border,
  },
  submitButtonText: {
    color: tokens.colors.card,
    fontSize: 17,
    fontWeight: '600',
  },
  contactInfo: {
  backgroundColor: tokens.colors.card,
    borderRadius: 12,
    padding: 20,
  },
  contactInfoTitle: {
    fontSize: 17,
    fontWeight: '600',
  color: tokens.colors.ink,
    marginBottom: 16,
  },
  contactItem: {
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 13,
  color: tokens.colors.accentCool,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
  color: tokens.colors.ink,
  },
});
