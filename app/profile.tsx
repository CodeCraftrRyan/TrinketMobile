import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import { supabase } from '../lib/supabase';
import { tokens } from '../lib/tokens';

export default function Profile() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const user = data?.user;
      if (!user) return;
      const meta = user.user_metadata || {};
      setFirstName(meta.first_name || '');
      setLastName(meta.last_name || '');
      setEmail(user.email || '');
      setBio(meta.bio || '');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      setSaving(true);
      const meta: Record<string, any> = { 
        first_name: firstName, 
        last_name: lastName, 
        bio 
      };
      const { error } = await supabase.auth.updateUser({ data: meta });
      if (error) throw error;
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile Information</Text>
          <TouchableOpacity onPress={saveProfile} disabled={saving}>
            <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor={tokens.colors.accentCool}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor={tokens.colors.accentCool}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
              placeholderTextColor={tokens.colors.accentCool}
            />
            <Text style={styles.helperText}>Email cannot be changed here</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor={tokens.colors.accentCool}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: tokens.colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cancelButton: {
  color: tokens.colors.accent,
    fontSize: 17,
    width: 70,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  color: tokens.colors.ink,
  },
  saveButton: {
  color: tokens.colors.accent,
    fontSize: 17,
    fontWeight: '600',
    width: 70,
    textAlign: 'right',
  },
  saveButtonDisabled: {
  color: tokens.colors.accentCool,
  },
  form: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  color: tokens.colors.ink,
    marginBottom: 8,
  },
  input: {
  backgroundColor: tokens.colors.card,
  borderWidth: 1,
  borderColor: tokens.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
  color: tokens.colors.ink,
  },
  disabledInput: {
  backgroundColor: tokens.colors.border,
  color: tokens.colors.accentCool,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 13,
  color: tokens.colors.accentCool,
    marginTop: 6,
  },
});
