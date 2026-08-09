import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { tokens } from '../lib/tokens';

const c = tokens.colors;

export default function CollectionEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('id,name,description')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setName(data.name ?? '');
          setDescription(data.description ?? '');
        }
      } catch (e: any) {
        Alert.alert('Could not load', e?.message ?? 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('A name is needed', 'Give this collection a name before saving.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('collections')
        .update({ name: trimmed, description: description.trim() || null })
        .eq('id', id);
      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* Masthead */}
          <View style={{ backgroundColor: c.surfaceDark, paddingTop: 72, paddingHorizontal: 20, paddingBottom: 26 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => router.back()} hitSlop={10}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="chevron-back" size={19} color={c.inkGhost} />
                <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} disabled={saving} hitSlop={10}>
                {saving
                  ? <ActivityIndicator size="small" color={c.inkGhost} />
                  : <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Save</Text>}
              </TouchableOpacity>
            </View>
            <Text style={{ ...tokens.type.display, fontSize: 32, lineHeight: 38, color: c.bg, marginTop: 24 }}>
              Edit collection
            </Text>
          </View>

          {loading ? (
            <View style={{ paddingTop: 60, alignItems: 'center' }}>
              <ActivityIndicator color={c.surfaceDark} />
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20, paddingTop: 28, gap: 22 }}>
              <View>
                <Text style={{ ...tokens.type.label, color: c.inkLabel, marginBottom: 8 }}>
                  NAME
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name this collection…"
                  placeholderTextColor={c.inkGhost}
                  autoCapitalize="sentences"
                  style={{
                    ...tokens.type.ui,
                    color: c.ink,
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    minHeight: 44,
                  }}
                />
              </View>

              <View>
                <Text style={{ ...tokens.type.label, color: c.inkLabel, marginBottom: 8 }}>
                  DESCRIPTION
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="A few words about what belongs here…"
                  placeholderTextColor={c.inkGhost}
                  multiline
                  autoCapitalize="sentences"
                  spellCheck
                  style={{
                    ...tokens.type.ui,
                    color: c.ink,
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingTop: 12,
                    paddingBottom: 12,
                    minHeight: 110,
                    textAlignVertical: 'top',
                  }}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
