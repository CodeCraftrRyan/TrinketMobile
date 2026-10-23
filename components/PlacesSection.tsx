import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  addLocation, countItemsAt, deleteLocation, fetchLocations, renameLocation, type LocationOption,
} from '../lib/locations';
import { supabase } from '../lib/supabase';
import { tokens } from '../lib/tokens';

const c = tokens.colors;

// Account → "Your places": the locations a person has added themselves, on top
// of the built-in rooms. Tap one to rename or remove it.
export default function PlacesSection() {
  const [all, setAll] = useState<LocationOption[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState('');

  const own = all.filter((o) => o.own);

  const load = useCallback(async () => {
    const list = await fetchLocations();
    setAll(list);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from('items').select('location').eq('user_id', uid).not('location', 'is', null);
      const tally: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { const k = String(r.location); tally[k] = (tally[k] ?? 0) + 1; });
      setCounts(tally);
    } catch { /* counts are a nicety */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add(name: string) {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const loc = await addLocation(name, all);
      if (!loc.own) {
        Alert.alert('Already a room', `“${loc.label}” is already on the list of rooms.`);
      }
      setDraft('');
      setShowAdd(false);
      await load();
    } catch (e: any) {
      Alert.alert('Could not add that place', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function rename(loc: LocationOption, name: string) {
    if (!name.trim() || name.trim() === loc.label) return;
    setBusy(true);
    try {
      const moved = await renameLocation(loc, name, all);
      await load();
      if (moved > 0) {
        Alert.alert('Renamed', `${moved} object${moved === 1 ? '' : 's'} now live in “${name.trim()}”.`);
      }
    } catch (e: any) {
      Alert.alert('Could not rename', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(loc: LocationOption) {
    const n = await countItemsAt(loc.label);
    const body = n > 0
      ? `${n} object${n === 1 ? ' is' : 's are'} filed here. ${n === 1 ? 'It keeps' : 'They keep'} the name; it just won’t be offered for new objects.`
      : 'It won’t be offered for new objects.';
    Alert.alert(`Remove “${loc.label}”?`, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await deleteLocation(loc); await load(); }
        catch (e: any) { Alert.alert('Could not remove', e?.message ?? 'Please try again.'); }
      } },
    ]);
  }

  function promptAdd() {
    if (Platform.OS === 'ios') {
      Alert.prompt('Add a place', 'Anywhere you keep things — a room, a chest, a storage unit.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add', onPress: (v?: string) => add(v ?? '') },
      ], 'plain-text', '', 'default');
    } else {
      setShowAdd((s) => !s);
    }
  }

  function openPlace(loc: LocationOption) {
    const doRename = () => Alert.prompt?.('Rename place', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: (v?: string) => rename(loc, v ?? '') },
    ], 'plain-text', loc.label);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: loc.label, options: ['Rename', 'Remove', 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (i) => { if (i === 0) doRename(); if (i === 1) remove(loc); },
      );
    } else {
      remove(loc);
    }
  }

  const chip = {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8,
    paddingHorizontal: 15, paddingVertical: 13, minHeight: 44,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    borderRadius: tokens.radius.md,
  };

  return (
    <View>
      <View style={{ paddingHorizontal: 20, marginTop: 26, marginBottom: 12 }}>
        <Text style={{ ...tokens.type.label, color: c.inkLabel }}>Your places</Text>
        <Text style={{ ...tokens.type.fact, color: c.inkLabel, marginTop: 6 }}>
          {own.length
            ? 'Shown first when you choose where an object lives. Tap one to rename or remove it.'
            : 'The rooms are always there. Add your own — a cedar chest, the storage unit, Mom’s house.'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 }}>
        {own.map((loc) => (
          <TouchableOpacity key={loc.id ?? loc.label} style={chip} onPress={() => openPlace(loc)}
            accessibilityRole="button" accessibilityLabel={`${loc.label}, ${counts[loc.label] ?? 0} objects. Rename or remove`}>
            <Ionicons name="location-outline" size={15} color={c.accentCool} />
            <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.ink }}>{loc.label}</Text>
            <Text style={{ color: c.inkFact, fontSize: 15 }}>{counts[loc.label] ?? 0}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={promptAdd}
          disabled={busy}
          accessibilityRole="button"
          style={{ ...chip, backgroundColor: 'transparent', borderStyle: 'dashed' }}>
          <Text style={{ ...tokens.type.ui, fontSize: 15, color: c.accentCool }}>
            {busy ? 'Saving…' : 'Add a place'}
          </Text>
        </TouchableOpacity>
      </View>

      {showAdd && Platform.OS !== 'ios' && (
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 12 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Storage unit"
            placeholderTextColor={c.inkLight}
            returnKeyType="done"
            onSubmitEditing={() => add(draft)}
            style={{
              flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
              borderRadius: tokens.radius.md, paddingHorizontal: 14, minHeight: 48,
              ...tokens.type.ui, color: c.ink,
            }}
          />
          <TouchableOpacity
            onPress={() => add(draft)}
            disabled={!draft.trim() || busy}
            style={{
              paddingHorizontal: 20, justifyContent: 'center', borderRadius: tokens.radius.sm,
              backgroundColor: c.primary, opacity: !draft.trim() || busy ? 0.5 : 1,
            }}>
            <Text style={{ ...tokens.type.button, color: c.primaryText }}>Add</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
