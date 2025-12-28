import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import TabHeader from '../../components/ui/TabHeader';
import { supabase } from '../../lib/supabase';

type UserMeta = {
  first_name?: string;
  last_name?: string;
  bio?: string;
  people_list?: string[];
  subscription_plan?: string;
  email?: string;
};

export default function Account() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data?.user;
        if (!user) return;
        const meta = (user.user_metadata || {}) as UserMeta;
        if (!mounted) return;
        setFirstName((meta.first_name as string) || (user.user_metadata?.first_name ?? ''));
        setLastName((meta.last_name as string) || (user.user_metadata?.last_name ?? ''));
        setBio((meta.bio as string) || '');
        setPeople(Array.isArray(meta.people_list) ? meta.people_list : (meta.people_list ? [String(meta.people_list)] : []));
        setSubscriptionPlan((meta.subscription_plan as string) || null);
        setEmail((user.email as string) || '');
      } catch (e: any) {
        console.warn('Could not load user', e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function saveProfile() {
    try {
      setSaving(true);
      const meta: Record<string, any> = { first_name: firstName, last_name: lastName, bio };
      // keep people_list and subscription if present
      if (people.length) meta.people_list = people;
      if (subscriptionPlan) meta.subscription_plan = subscriptionPlan;
      const { error } = await supabase.auth.updateUser({ data: meta });
      if (error) throw error;
      Alert.alert('Saved', 'Profile updated');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again');
    } finally {
      setSaving(false);
    }
  }

  async function changePlan(plan: string | null) {
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ data: { subscription_plan: plan } });
      if (error) throw error;
      setSubscriptionPlan(plan);
      Alert.alert('Plan updated', plan ? `Switched to ${plan}` : 'Subscription cleared');
    } catch (e: any) {
      Alert.alert('Plan update failed', e?.message ?? 'Please try again');
    } finally {
      setSaving(false);
    }
  }

  async function addPerson() {
    const name = newPerson.trim();
    if (!name) return;
    const next = [...people, name];
    setPeople(next);
    setNewPerson('');
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ data: { people_list: next } });
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Could not add person', e?.message ?? 'Please try again');
    } finally {
      setSaving(false);
    }
  }

  async function removePerson(index: number) {
    const name = people[index];
    Alert.alert('Remove person', `Remove "${name}" from your people list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const next = people.filter((_, i) => i !== index);
        setPeople(next);
        try {
          setSaving(true);
          const { error } = await supabase.auth.updateUser({ data: { people_list: next } });
          if (error) throw error;
        } catch (e: any) {
          Alert.alert('Could not remove', e?.message ?? 'Please try again');
        } finally {
          setSaving(false);
        }
      } }
    ]);
  }

  const plans = [
    { id: 'free', label: 'Free' },
    { id: 'plus', label: 'Plus' },
    { id: 'pro', label: 'Pro' },
  ];

  const renderHeader = () => (
    <>
      <TabHeader title="Account" actionTitle="Sign out" onAction={async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) {}
        router.replace('/(auth)/login');
      }} />

      <Card>
        <Text style={styles.label}>Profile Information</Text>
        <TextInput placeholder="First name" value={firstName} onChangeText={setFirstName} style={styles.input} />
        <TextInput placeholder="Last name" value={lastName} onChangeText={setLastName} style={styles.input} />
        <TextInput placeholder="Email" value={email} editable={false} style={[styles.input, { opacity: 0.8 }]} />
        <Text style={[styles.label, { marginTop: 8 }]}>Bio</Text>
        <TextInput placeholder="A short bio" value={bio} onChangeText={setBio} style={[styles.input, { height: 110, textAlignVertical: 'top', paddingTop: 12 }]} multiline />
        <View style={styles.row} />
        <Button title={saving ? 'Saving…' : 'Save Profile'} onPress={saveProfile} disabled={saving} />
      </Card>

      <Card>
        <Text style={styles.label}>Subscription</Text>
        <Text style={styles.muted}>Current plan: {subscriptionPlan ?? 'Free'}</Text>
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {plans.map((p) => (
            <Button key={p.id} title={p.label} onPress={() => changePlan(p.id)} disabled={saving || subscriptionPlan === p.id} />
          ))}
          <Button title="Clear" onPress={() => changePlan(null)} disabled={saving || subscriptionPlan === null} />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>People</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput placeholder="Add a person" value={newPerson} onChangeText={setNewPerson} style={[styles.input, { flex: 1 }]} />
          <Button title="Add" onPress={addPerson} disabled={saving || !newPerson.trim()} />
        </View>
      </Card>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.container}
        data={people}
        keyExtractor={(item, i) => `${item}-${i}`}
        renderItem={({ item, index }) => (
          <View style={styles.personRow}>
            <Text style={styles.personText}>{item}</Text>
            <Text onPress={() => removePerson(index)} style={styles.removeLink}>Remove</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No people yet.</Text>}
        ListHeaderComponent={renderHeader}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E4EBF2' },
  container: { padding: 20, gap: 12 },
  label: { fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#111827', marginBottom: 8 },
  row: { height: 8 },
  muted: { color: '#6B7280' },
  personRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFFFFF', marginTop: 8 },
  personText: { color: '#111827', fontWeight: '500' },
  removeLink: { color: '#EF4444', fontWeight: '600' },
});