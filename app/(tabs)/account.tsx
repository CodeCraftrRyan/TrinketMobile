import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAccessibilitySettings } from '../../lib/accessibility';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const c = tokens.colors;

export default function Account() {
  const router = useRouter();
  const [profile, setProfile] = useState({ name: '', email: '', initials: '', since: '' });
  const [userId, setUserId] = useState<string | null>(null);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [peopleCounts, setPeopleCounts] = useState<Record<string, number>>({});
  const [newPerson, setNewPerson] = useState('');
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [counts, setCounts] = useState({ items: 0, collections: 0, events: 0 });
  const { settings, setLargeText, setHighContrast } = useAccessibilitySettings();
  const [supportUntil, setSupportUntil] = useState<string | null>(null);
  const [supportLog, setSupportLog] = useState<{ looked_at: string; note: string | null }[]>([]);
  const [changingSupport, setChangingSupport] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return;
      const user = data.user;
      const meta = user.user_metadata ?? {};
      const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'User';
      const parts = String(name).trim().split(/\s+/);
      const initials = (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
      const created = user.created_at ? new Date(user.created_at) : null;
      const since = created && !isNaN(created.getTime())
        ? created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '';
      if (mounted) {
        setProfile({ name, email: user.email || '', initials, since });
        setUserId(user.id ?? null);
      }
    }
    loadUser();
    return () => { mounted = false; };
  }, []);

  // The plan, and what the archive holds. Display only — all purchasing and
  // management happens on the web.
  const loadArchive = useCallback(async () => {
    if (!userId) return;
    try {
      const [it, co, ev] = await Promise.all([
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('collections').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      setCounts({ items: it.count ?? 0, collections: co.count ?? 0, events: ev.count ?? 0 });

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_id, subscription_plans ( * )')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const join: any = (sub as any)?.subscription_plans;
      const row = Array.isArray(join) ? join[0] : join;
      if (row) {
        setPlan(row);
      } else {
        const { data: free } = await supabase
          .from('subscription_plans').select('*').eq('is_free', true).limit(1).maybeSingle();
        setPlan(free ?? null);
      }
    } catch (e: any) {
      console.warn('Failed to load the archive summary', e?.message ?? e);
    }
  }, [userId]);

  // Whether the archive is currently open to support, and what has been seen.
  const loadSupportAccess = useCallback(async () => {
    if (!userId) return;
    try {
      const [{ data: grant }, { data: log }] = await Promise.all([
        supabase.from('support_access').select('expires_at').eq('user_id', userId).maybeSingle(),
        supabase.from('support_access_log').select('looked_at,note')
          .eq('user_id', userId).order('looked_at', { ascending: false }).limit(5),
      ]);
      const until = grant?.expires_at ?? null;
      setSupportUntil(until && new Date(until) > new Date() ? until : null);
      setSupportLog(log ?? []);
    } catch (e: any) {
      console.warn('Could not read support access', e?.message ?? e);
    }
  }, [userId]);

  async function setSupportAccess(open: boolean) {
    if (!userId) return;
    try {
      setChangingSupport(true);
      if (open) {
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase
          .from('support_access')
          .upsert({ user_id: userId, granted_at: new Date().toISOString(), expires_at: expires },
                  { onConflict: 'user_id' });
        if (error) throw error;
        setSupportUntil(expires);
      } else {
        const { error } = await supabase.from('support_access').delete().eq('user_id', userId);
        if (error) throw error;
        setSupportUntil(null);
      }
    } catch (e: any) {
      Alert.alert('Could not change that', e?.message ?? 'Please try again.');
    } finally {
      setChangingSupport(false);
    }
  }

  const loadPeople = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('people').select('id,name').eq('user_id', userId).order('name');
      if (error) throw error;
      const list = (data ?? [])
        .filter((row: any) => row?.id && row?.name)
        .map((row: any) => ({ id: String(row.id), name: String(row.name) }));
      setPeople(list);

      // How many objects each person is named on.
      if (list.length) {
        const { data: links } = await supabase
          .from('item_people').select('person_id').in('person_id', list.map((p) => p.id));
        const tally: Record<string, number> = {};
        (links ?? []).forEach((r: any) => {
          const k = String(r.person_id);
          tally[k] = (tally[k] ?? 0) + 1;
        });
        setPeopleCounts(tally);
      }
    } catch (e: any) {
      console.warn('Failed to load people', e?.message ?? e);
      setPeople([]);
    }
  }, [userId]);

  useEffect(() => { loadPeople(); loadArchive(); loadSupportAccess(); }, [loadPeople, loadArchive, loadSupportAccess]);
  useFocusEffect(useCallback(() => { loadPeople(); loadArchive(); loadSupportAccess(); }, [loadPeople, loadArchive, loadSupportAccess]));

  const handleSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => {
        try {
          await supabase.auth.signOut();
        } catch (e: any) {
          Alert.alert('Log out failed', e?.message ?? 'Please try again');
          return;
        }
        router.replace('/(auth)/login');
      } },
    ]);
  };

  async function addPersonFromName(nameInput?: string) {
    const name = (nameInput ?? newPerson).trim();
    if (!name) { Alert.alert('Missing name', 'Please enter a name'); return; }
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

  function promptForPerson() {
    if (Platform.OS === 'ios') {
      Alert.prompt('Add a name', 'Someone an object came from', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add', onPress: (value) => addPersonFromName(value ?? '') },
      ]);
    } else {
      setShowAddPerson((prev) => !prev);
    }
  }

  const money = (v: any) => {
    const n = Number(v ?? 0);
    return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
  };

  // null means the plan does not cap this.
  const usage: { label: string; used: number; cap: number | null }[] = [
    { label: 'Objects', used: counts.items, cap: plan?.max_items ?? null },
    { label: 'Collections', used: counts.collections, cap: plan?.max_collections ?? null },
    { label: 'Events', used: counts.events, cap: plan?.max_events ?? null },
  ];

  const Label = ({ children }: any) => (
    <Text style={{ ...tokens.type.label, color: c.inkLabel, paddingHorizontal: 20, marginTop: 30, marginBottom: 12 }}>
      {children}
    </Text>
  );

  const Row = ({ left, right, onPress, danger, chevron = true }: any) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      style={{
        flexDirection: settings.largeText ? 'column' : 'row',
        alignItems: settings.largeText ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: settings.largeText ? 6 : 12,
        paddingHorizontal: 18,
        paddingVertical: 17,
      }}>
      <Text style={{ ...tokens.type.ui, color: danger ? c.accentDeep : c.ink, flex: settings.largeText ? undefined : 1 }}>
        {left}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {typeof right === 'string' || typeof right === 'number' ? (
          <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.inkLabel }}>{right}</Text>
        ) : right}
        {chevron && onPress && <Ionicons name="chevron-forward" size={16} color={c.inkLabel} />}
      </View>
    </TouchableOpacity>
  );

  const Card = ({ children }: any) => (
    <View style={{
      marginHorizontal: 20,
      backgroundColor: c.card,
      borderWidth: 1, borderColor: c.border,
      borderRadius: tokens.radius.lg,
      overflow: 'hidden',
    }}>{children}</View>
  );

  const Divider = () => (
    <View style={{ height: 1, backgroundColor: c.ruleSoft, marginLeft: 18 }} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: settings.highContrast ? '#FFFFFF' : c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 72, paddingHorizontal: 20, paddingBottom: 32 }}>
          <Text style={{ ...tokens.type.label, color: c.inkGhost, opacity: 0.75 }}>Profile</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 22 }}>
            <View style={{
              width: 68, height: 68,
              borderWidth: 1, borderColor: c.accent,
              borderRadius: tokens.radius.md,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: c.bg, fontSize: 22, fontWeight: '500', letterSpacing: 0.5 }}>
                {profile.initials}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...tokens.type.name, color: c.bg }} numberOfLines={1}>{profile.name}</Text>
              {!!profile.since && (
                <Text style={{ color: c.accent, fontSize: 15, marginTop: 3 }}>
                  Archivist since {profile.since}
                </Text>
              )}
              <Text style={{ color: c.inkGhost, fontSize: 15, marginTop: 2 }} numberOfLines={1}>
                {profile.email}
              </Text>
            </View>
          </View>

        </View>

        {/* What the archive holds, against what the plan allows */}
        <Label>Your archive</Label>
        <Card>
          {usage.map((row, i) => {
            const pct = row.cap ? Math.min(1, row.used / row.cap) : 0;
            const full = row.cap !== null && row.used >= row.cap;
            return (
              <View
                key={row.label}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  borderBottomWidth: i === usage.length - 1 ? 0 : 1,
                  borderBottomColor: c.ruleSoft,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={{ ...tokens.type.ui, color: c.ink }}>{row.label}</Text>
                  <Text style={{ ...tokens.type.ui, fontSize: 15, color: full ? c.inkFact : c.inkLabel }}>
                    {row.cap === null ? `${row.used}` : `${row.used} of ${row.cap}`}
                  </Text>
                </View>
                {row.cap !== null ? (
                  <View style={{ height: 5, backgroundColor: c.ruleSoft, marginTop: 12 }}>
                    <View style={{
                      height: 5,
                      width: `${Math.round(pct * 100)}%`,
                      backgroundColor: c.accent,
                    }} />
                  </View>
                ) : (
                  <Text style={{ ...tokens.type.fact, color: c.inkLabel, marginTop: 8 }}>
                    No limit on your plan.
                  </Text>
                )}
              </View>
            );
          })}
        </Card>

        {/* People */}
        <View style={{
          flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
          paddingHorizontal: 20, marginTop: 26, marginBottom: 12,
        }}>
          <Text style={{ ...tokens.type.label, color: c.inkLabel }}>People</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/items')}>
            <Text style={{ color: c.inkLabel, fontSize: 15 }}></Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 }}>
          {people.map((person) => (
            <View key={person.id} style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingHorizontal: 15, paddingVertical: 13,
              backgroundColor: c.card,
              borderWidth: 1, borderColor: c.border,
              borderRadius: tokens.radius.md,
            }}>
              <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.ink }}>{person.name}</Text>
              <Text style={{ color: c.inkFact, fontSize: 15 }}>{peopleCounts[person.id] ?? 0}</Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={promptForPerson}
            disabled={savingPerson}
            style={{
              paddingHorizontal: 15, paddingVertical: 13,
              borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
              borderRadius: tokens.radius.md,
            }}>
            <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.accentCool }}>
              {savingPerson ? 'Adding…' : 'Add a name'}
            </Text>
          </TouchableOpacity>
        </View>

        {showAddPerson && Platform.OS !== 'ios' && (
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 12 }}>
            <TextInput
              value={newPerson}
              onChangeText={setNewPerson}
              placeholder="Diane Haviland"
              placeholderTextColor={c.inkLight}
              returnKeyType="done"
              onSubmitEditing={() => addPersonFromName()}
              style={{
                flex: 1, backgroundColor: c.card,
                borderWidth: 1, borderColor: c.border,
                borderRadius: tokens.radius.md,
                paddingHorizontal: 14, minHeight: 48,
                ...tokens.type.ui, color: c.ink,
              }}
            />
            <TouchableOpacity
              onPress={() => addPersonFromName()}
              disabled={!newPerson.trim() || savingPerson}
              style={{
                paddingHorizontal: 20, justifyContent: 'center',
                borderRadius: tokens.radius.sm, backgroundColor: c.primary,
                opacity: !newPerson.trim() || savingPerson ? 0.5 : 1,
              }}>
              <Text style={{ ...tokens.type.button, color: c.primaryText }}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plan */}
        <Label>Plan</Label>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/membership')}>
          <Card>
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...tokens.type.name, color: c.ink }}>{plan?.name ?? 'Free'}</Text>
                  <Text style={{ color: c.inkLabel, fontSize: 15, marginTop: 4 }}>
                    {plan?.is_free
                      ? 'No charge'
                      : `${money(plan?.price_yearly_usd)}/yr · ${money(plan?.price_monthly_usd)}/mo`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.inkLabel} style={{ marginTop: 6 }} />
              </View>

            </View>
          </Card>
        </TouchableOpacity>

        {/* Account */}
        <Label>Account</Label>
        <Card>
          <Row left="Name" right={profile.name} chevron={false} />
          <Divider />
          <Row left="Email" right={profile.email} chevron={false} />
          <Divider />
          <Row left="Password" right="Change" onPress={() => {}} />
        </Card>

        {/* Reading */}
        <Label>Reading</Label>
        <Card>
          <View style={{
            flexDirection: settings.largeText ? 'column' : 'row',
            alignItems: settings.largeText ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: settings.largeText ? 10 : 12,
            paddingHorizontal: 18, paddingVertical: 15,
          }}>
            <Text style={{ ...tokens.type.ui, color: c.ink }}>Larger text</Text>
            <Switch value={settings.largeText} onValueChange={setLargeText}
              trackColor={{ false: c.border, true: c.accent }} thumbColor="#FFFFFF"
              ios_backgroundColor={c.border} accessibilityLabel="Larger text" />
          </View>
          <Divider />
          <View style={{
            flexDirection: settings.largeText ? 'column' : 'row',
            alignItems: settings.largeText ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: settings.largeText ? 10 : 12,
            paddingHorizontal: 18, paddingVertical: 15,
          }}>
            <Text style={{ ...tokens.type.ui, color: c.ink }}>High contrast</Text>
            <Switch value={settings.highContrast} onValueChange={setHighContrast}
              trackColor={{ false: c.border, true: c.accent }} thumbColor="#FFFFFF"
              ios_backgroundColor={c.border} accessibilityLabel="High contrast" />
          </View>
        </Card>

        {/* Support access */}
        <Label>Who can see this</Label>
        <Card>
          <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
            <View style={{
              flexDirection: settings.largeText ? 'column' : 'row',
              alignItems: settings.largeText ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: settings.largeText ? 10 : 12,
            }}>
              <Text style={{ ...tokens.type.ui, color: c.ink, flex: settings.largeText ? undefined : 1 }}>
                Let support look at my archive
              </Text>
              <Switch
                value={!!supportUntil}
                onValueChange={setSupportAccess}
                disabled={changingSupport}
                trackColor={{ false: c.border, true: c.accent }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={c.border}
                accessibilityLabel="Let support look at my archive"
              />
            </View>
            <Text style={{ ...tokens.type.fact, color: c.inkLabel, marginTop: 10, lineHeight: 20 }}>
              {supportUntil
                ? `Open until ${new Date(supportUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Turn it off any time.`
                : 'Off. Turn this on only if you have asked for help with something, and it closes itself after a week.'}
            </Text>
          </View>

          {supportLog.length > 0 && (
            <>
              <Divider />
              <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
                <Text style={{ ...tokens.type.label, color: c.inkLabel, marginBottom: 10 }}>
                  When it was looked at
                </Text>
                {supportLog.map((entry, i) => (
                  <View key={`${entry.looked_at}-${i}`} style={{ paddingVertical: 5 }}>
                    <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.ink }}>
                      {new Date(entry.looked_at).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </Text>
                    {!!entry.note && (
                      <Text style={{ color: c.inkLabel, fontSize: 14, marginTop: 2 }}>{entry.note}</Text>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>

        {/* Settings */}
        <Label>Settings</Label>
        <Card>
          <Row left="Questions" onPress={() => router.push('/faq')} />
          <Divider />
          <Row left="Get in touch" onPress={async () => {
            const address = 'admin@yourtrinkets.com';
            try {
              await Linking.openURL(`mailto:${address}?subject=Trinket`);
            } catch {
              Alert.alert('No mail app set up', `Write to us at ${address}`);
            }
          }} />
          <Divider />
          <Row left="Privacy" onPress={() => router.push('/privacy')} />
          <Divider />
          <Row left="Log out" onPress={handleSignOut} danger chevron={false} />
        </Card>

      </ScrollView>
    </View>
  );
}
