
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../../components/Screen';
import { useAccessibilitySettings } from '../../lib/accessibility';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { createCustomerPortalSession, openCustomerPortal } from '../../services/payments';

export default function Account() {
  const router = useRouter();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    initial: '',
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return;
      const user = data.user;
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      const email = user.email || '';
      const initial = name.charAt(0).toUpperCase();
      if (mounted) {
        setProfile({ name, email, initial });
        setUserId(user.id ?? null);
      }
    }
    loadUser();
    return () => { mounted = false; };
  }, []);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [newPerson, setNewPerson] = useState('');
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const { settings, setLargeText, setHighContrast } = useAccessibilitySettings();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        try {
          await supabase.auth.signOut();
        } catch (e: any) {
          Alert.alert('Sign out failed', e?.message ?? 'Please try again');
          return;
        }
        // Replace the navigation stack with the login screen
        router.replace('/(auth)/login');
      } },
    ]);
  };

  async function handleManageSubscription() {
    if (openingPortal) return;
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const user = data?.user;
      const session = await createCustomerPortalSession(undefined, user?.email ?? undefined);
      if (!session?.url) throw new Error('Portal session not available.');
      await openCustomerPortal(session.url);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not open billing portal');
    } finally {
      setOpeningPortal(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function loadPeople() {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('people')
          .select('id,name')
          .eq('user_id', userId)
          .order('name');
        if (error) throw error;
        if (mounted) {
          const list = (data ?? [])
            .filter((row: { id?: string | number | null; name?: string | null }) => row?.id && row?.name)
            .map((row: { id?: string | number | null; name?: string | null }) => ({
              id: String(row.id),
              name: String(row.name),
            }));
          setPeople(list);
        }
      } catch (e: any) {
        console.warn('Failed to load people', e?.message ?? e);
        if (mounted) setPeople([]);
      }
    }
    loadPeople();
    return () => { mounted = false; };
  }, [userId]);

  async function addPersonFromName(nameInput?: string) {
    const name = (nameInput ?? newPerson).trim();
    if (!name) {
      Alert.alert('Missing name', 'Please enter a name');
      return;
    }
    if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already added', 'That person is already in your list');
      return;
    }
    setNewPerson('');
    setShowAddPerson(false);
    if (!userId) return;
    try {
      setSavingPerson(true);
      const { data, error } = await supabase
        .from('people')
        .insert([{ name, user_id: userId }])
        .select('id,name')
        .maybeSingle();
      if (error) throw error;
      if (data?.id && data?.name) {
        setPeople((prev) => [...prev, { id: String(data.id), name: String(data.name) }]);
      } else {
        setPeople((prev) => [...prev, { id: `local-${Date.now()}`, name }]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not add person');
    } finally {
      setSavingPerson(false);
    }
  }

  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.sectionHeader}>{children}</Text>
  );

  const Card = ({ children, style }: any) => (
    <View style={[styles.card, style]}>{children}</View>
  );

  const Row = ({ left, right, onPress, danger, chevron = true }: any) => {
    const leftContent = (
      <Text style={[styles.rowLeft, danger && styles.dangerText]}>{left}</Text>
    );
    const rightContent =
      right === undefined || right === null
        ? null
        : typeof right === 'string' || typeof right === 'number'
          ? <Text style={[styles.rowRight, danger && styles.dangerText]}>{right}</Text>
          : right;

    return (
      <TouchableOpacity
        style={[styles.row, settings.largeText && styles.rowLargeText, danger && styles.dangerRow]}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        {leftContent}
        <View style={styles.rowRightWrap}>
          {rightContent}
          {chevron && <Ionicons name="chevron-forward" size={16} color={danger ? '#B8783A' : '#4A7A9B'} />}
        </View>
      </TouchableOpacity>
    );
  };

  const ToggleRow = ({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (next: boolean) => void }) => (
  <View style={[styles.row, settings.largeText && styles.rowLargeText, settings.largeText && styles.toggleRowLargeText]}>
      <Text style={styles.rowLeft}>{label}</Text>
      <Switch
        style={[styles.toggleSwitch, settings.largeText && styles.toggleSwitchLargeText]}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D8E6EE', true: '#B8783A' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
        ios_backgroundColor="#D8E6EE"
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, backgroundColor: settings.highContrast ? '#FFFFFF' : tokens.colors.bg }}
        contentContainerStyle={{ padding: 0, paddingBottom: 24 }}
      >
        {/* Profile Card */}
        <View style={styles.profileCardWrap}>
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{profile.initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
            </View>
          </View>
        </View>

        {/* Account Details */}
        <SectionHeader>ACCOUNT DETAILS</SectionHeader>
        <Card>
          <Row left="Name" right={profile.name} chevron={false} />
          <View style={styles.divider} />
          <Row left="Email" right={profile.email} chevron={false} />
          <View style={styles.divider} />
          <Row left="Password" right="Change" onPress={() => {}} />
          <View style={styles.divider} />
          <Row left="Sign Out" right={null} onPress={handleSignOut} danger chevron={false} />
        </Card>

        {/* People */}
        <SectionHeader>PEOPLE</SectionHeader>
        <Card>
          {people.map((person, i) => (
            <View key={`${person.id}-${i}`}>
              <Row left={person.name} onPress={() => {}} />
              {i < people.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>
        {showAddPerson && Platform.OS !== 'ios' ? (
          <View style={styles.inlineAddWrap}>
            <TextInput
              value={newPerson}
              onChangeText={setNewPerson}
              placeholder="Add a person"
              placeholderTextColor="#9AAAB5"
              style={styles.inlineAddInput}
              returnKeyType="done"
              onSubmitEditing={() => addPersonFromName()}
            />
            <TouchableOpacity
              style={[styles.inlineAddButton, (!newPerson.trim() || savingPerson) && styles.inlineAddButtonDisabled]}
              onPress={() => addPersonFromName()}
              disabled={!newPerson.trim() || savingPerson}
            >
              <Text style={styles.inlineAddButtonText}>{savingPerson ? 'Adding…' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.addPersonBtn}
          onPress={() => {
            if (Platform.OS === 'ios') {
              Alert.prompt('Add Person', 'Enter a name', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Add', onPress: (value) => addPersonFromName(value ?? '') },
              ]);
            } else {
              setShowAddPerson((prev) => !prev);
            }
          }}
          disabled={savingPerson}
        >
          <Text style={styles.addPersonText}>Add Person</Text>
        </TouchableOpacity>

        {/* Subscription */}
        <SectionHeader>SUBSCRIPTION</SectionHeader>
        <Card>
          <Row left="Current Plan" right={<Text style={styles.freeBadge}>Free</Text>} chevron={false} />
          <View style={styles.divider} />
          <Row left="Upgrade to Pro" right={<Text style={styles.subPrice}>$2.99 / mo</Text>} onPress={() => router.push('/membership?plan=pro')} />
          <View style={styles.divider} />
          <Row left="Lifetime Access" right={<Text style={styles.subPrice}>$49.99</Text>} onPress={() => router.push('/membership?plan=lifetime')} />
          <View style={styles.divider} />
          <Row left="Manage Subscription" right={openingPortal ? <Text style={styles.rowRight}>Opening…</Text> : 'Billing'} onPress={openingPortal ? undefined : handleManageSubscription} />
        </Card>

        {/* Accessibility */}
        <SectionHeader>ACCESSIBILITY</SectionHeader>
        <Card>
          <ToggleRow label="Larger Text" value={settings.largeText} onValueChange={setLargeText} />
          <View style={styles.divider} />
          <ToggleRow label="High Contrast" value={settings.highContrast} onValueChange={setHighContrast} />
        </Card>

        {/* Help */}
        <SectionHeader>HELP</SectionHeader>
        <Card>
          <Row left="FAQ" onPress={() => router.push('/faq')} />
          <View style={styles.divider} />
          <Row left="Contact Support" onPress={() => Linking.openURL('mailto:admin@yourtrinkets.com')} />
        </Card>

        {/* Privacy */}
        <SectionHeader>PRIVACY</SectionHeader>
        <Card>
          <Row left="Privacy Policy" onPress={() => router.push('/privacy')} />
        </Card>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCardWrap: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B8783A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 28,
  },
  profileName: {
    fontWeight: '700',
    fontSize: 19,
    color: '#0C1620',
    marginBottom: 2,
  },
  profileEmail: {
    color: '#B8783A',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  sectionHeader: {
    color: '#4A7A9B',
    fontWeight: '700',
    fontSize: 13.5,
    letterSpacing: 1.1,
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 22,
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 17,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  rowLargeText: {
    alignItems: 'flex-start',
  },
  rowLeft: {
    fontWeight: '700',
    fontSize: 15.5,
    color: '#0C1620',
    flex: 1,
    flexWrap: 'wrap',
    paddingRight: 12,
  },
  rowRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    maxWidth: '45%',
    justifyContent: 'flex-end',
  },
  rowRight: {
    fontWeight: '600',
    fontSize: 15.5,
    color: '#4A7A9B',
    marginRight: 2,
    textAlign: 'right',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  divider: {
    height: 1,
    backgroundColor: '#D8E6EE',
    marginLeft: 18,
  },
  dangerRow: {
    backgroundColor: 'transparent',
  },
  dangerText: {
    color: '#B8783A',
    fontWeight: '700',
  },
  addPersonBtn: {
    marginLeft: 22,
    marginBottom: 8,
  },
  addPersonText: {
    color: '#B8783A',
    fontWeight: '700',
    fontSize: 15.5,
    paddingVertical: 4,
  },
  inlineAddWrap: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inlineAddInput: {
    flex: 1,
    backgroundColor: '#F2F6F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0C1620',
    fontSize: 15.5,
  },
  inlineAddButton: {
    backgroundColor: '#B8783A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineAddButtonDisabled: {
    backgroundColor: '#D8E6EE',
  },
  inlineAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14.5,
  },
  toggleSwitch: {
    alignSelf: 'center',
  },
  toggleRowLargeText: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  toggleSwitchLargeText: {
    alignSelf: 'flex-start',
  },
  freeBadge: {
    backgroundColor: '#D8E6EE',
    color: '#B8783A',
    fontWeight: '700',
    fontSize: 14.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  subPrice: {
    color: '#4A7A9B',
    fontWeight: '700',
    fontSize: 15.5,
  },
});