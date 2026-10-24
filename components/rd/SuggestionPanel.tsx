// Redesign → the AI suggestion on Add a piece (TRINKET_SPEC v5 §7.1, mockup #3).
// A single bronze hairline panel headed SUGGESTED with two lines (the object
// and its dating; what it's made of and its kind), then Accept (navy fill)
// and Edit (hairline). It is a proposal, never an auto-fill: nothing reaches
// the form until the person accepts it, and Edit lets them rewrite it first.
//
// Before a suggestion exists the same panel offers to read the photograph,
// with the month's lookups. The photo is read by the existing describe-item
// function on the server; nothing AI runs in the app.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { rd } from '../../lib/rdTokens';

export type Suggestion = {
  name?: string | null;
  description?: string | null;
  category?: string | null;
  era?: string | null;
  materials?: string | null;
  estimated_value?: number | string | null;
};

type Props = {
  hasNewPhoto: boolean;
  isEditing: boolean;
  suggesting: boolean;
  lookupsLine: string | null;      // "38 of 50 lookups left this month", or null
  spent: boolean;                  // no lookups left
  proposal: Suggestion | null;
  accepted: string[] | null;       // fields filled by the last Accept
  onRead: () => void;
  onAccept: (s: Suggestion) => void;
  onDismiss: () => void;
};

export default function SuggestionPanel(p: Props) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftStory, setDraftStory] = useState('');

  // After Accept: say plainly what changed.
  if (p.accepted && !p.proposal) {
    return (
      <View style={[styles.panel, styles.quiet]}>
        <Text style={rd.type.label}>Suggested</Text>
        <Text style={[rd.type.body, { marginTop: 6 }]}>
          {p.accepted.length
            ? `Added the ${p.accepted.join(', ')}. Change anything that isn’t right.`
            : 'Everything was already written in, so nothing was changed.'}
        </Text>
      </View>
    );
  }

  // A proposal waiting for an answer.
  if (p.proposal) {
    const s = p.proposal;
    const line1 = [s.name, s.era].filter(Boolean).join(' · ') || 'Something kept';
    const line2 = [s.materials, s.category].filter(Boolean).join(' · ');

    if (editing) {
      return (
        <View style={styles.panel}>
          <Text style={[rd.type.label, { color: rd.color.bronzeDeep }]}>Suggested · editing</Text>
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Name</Text>
          <TextInput value={draftName} onChangeText={setDraftName} style={styles.input}
            accessibilityLabel="Suggested name" placeholder="A short name" placeholderTextColor={rd.color.steel} />
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Story</Text>
          <TextInput value={draftStory} onChangeText={setDraftStory} style={[styles.input, styles.multi]} multiline
            accessibilityLabel="Suggested story" placeholder="A few lines" placeholderTextColor={rd.color.steel} />
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.accept}
              accessibilityRole="button"
              onPress={() => {
                setEditing(false);
                p.onAccept({ ...s, name: draftName.trim() || null, description: draftStory.trim() || null, era: null, materials: null });
              }}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.edit} onPress={() => setEditing(false)} accessibilityRole="button">
              <Text style={rd.type.uiMedium}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.panel} accessible={false}>
        <View style={styles.headRow}>
          <Text style={[rd.type.label, { color: rd.color.bronzeDeep }]}>Suggested</Text>
          <TouchableOpacity onPress={p.onDismiss} style={styles.close} accessibilityRole="button" accessibilityLabel="Dismiss the suggestion">
            <Ionicons name="close" size={18} color={rd.color.steel} />
          </TouchableOpacity>
        </View>
        <Text style={styles.line1}>{line1}</Text>
        {!!line2 && <Text style={styles.line2}>{line2}</Text>}
        {!!s.description && <Text style={styles.story} numberOfLines={4}>{s.description}</Text>}
        <Text style={[rd.type.fact, { marginTop: 10 }]}>Accept fills only the fields you haven’t written in.</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.accept} onPress={() => p.onAccept(s)} accessibilityRole="button" accessibilityLabel="Accept the suggestion">
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.edit}
            accessibilityRole="button"
            accessibilityLabel="Edit the suggestion before accepting"
            onPress={() => {
              setDraftName(String(s.name ?? ''));
              const extra = [s.era, s.materials].filter(Boolean).join(' · ');
              setDraftStory([s.description, extra ? `(${extra})` : ''].filter(Boolean).join(' ').trim());
              setEditing(true);
            }}>
            <Text style={rd.type.uiMedium}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Nothing read yet: offer it.
  const canRead = p.hasNewPhoto && !p.spent && !p.suggesting;
  return (
    <View style={[styles.panel, !p.hasNewPhoto && styles.quiet]}>
      <Text style={[rd.type.label, p.hasNewPhoto && { color: rd.color.bronzeDeep }]}>Read the photograph</Text>
      <Text style={[rd.type.body, { marginTop: 6 }]}>
        {p.hasNewPhoto
          ? 'Trinket can suggest what this is and roughly when it was made. You decide what to keep.'
          : p.isEditing
            ? 'Add a new photograph and Trinket can suggest what it is.'
            : 'Photograph one thing first, then Trinket can suggest what it is.'}
      </Text>
      {p.hasNewPhoto && (
        <TouchableOpacity
          style={[styles.edit, { marginTop: 14, alignSelf: 'flex-start', opacity: canRead ? 1 : 0.5 }]}
          onPress={p.onRead}
          disabled={!canRead}
          accessibilityRole="button"
          accessibilityState={{ busy: p.suggesting, disabled: !canRead }}>
          {p.suggesting
            ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator size="small" color={rd.color.steel} /><Text style={rd.type.uiMedium}>Reading…</Text></View>
            : <Text style={rd.type.uiMedium}>Suggest details</Text>}
        </TouchableOpacity>
      )}
      {!!p.lookupsLine && (
        <Text style={[rd.type.fact, { marginTop: 10, color: p.spent ? rd.color.bronzeDeep : rd.color.steelDeep }]}>
          {p.spent ? 'No lookups left this month. They renew on the 1st.' : `Uses one lookup · ${p.lookupsLine}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 18, padding: 16,
    backgroundColor: rd.color.paper,
    borderWidth: rd.hairline, borderColor: rd.color.bronze, borderRadius: rd.radius.lg,
  },
  quiet: { borderColor: rd.color.mist },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: rd.minTarget, height: 32, alignItems: 'flex-end', justifyContent: 'center' },
  line1: { ...rd.type.name, marginTop: 4 },
  line2: { ...rd.type.fact, marginTop: 4 },
  story: { ...rd.type.body, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  accept: {
    minHeight: rd.minTarget, paddingHorizontal: 20, borderRadius: rd.radius.md,
    backgroundColor: rd.color.navy, alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { ...rd.type.uiMedium, color: rd.color.paper },
  edit: {
    minHeight: rd.minTarget, paddingHorizontal: 20, borderRadius: rd.radius.md,
    borderWidth: rd.hairline, borderColor: rd.color.mist, backgroundColor: rd.color.paper,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldLabel: { ...rd.type.label },
  input: {
    ...rd.type.ui, marginTop: 6, minHeight: rd.minTarget, paddingHorizontal: 12,
    borderWidth: rd.hairline, borderColor: rd.color.mist, borderRadius: rd.radius.md, backgroundColor: rd.color.frost,
  },
  multi: { minHeight: 96, paddingTop: 10, textAlignVertical: 'top' },
});
