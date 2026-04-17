import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import { supabase } from '../lib/supabase';

export default function People() {
  const router = useRouter();
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const user = data?.user;
      if (!user) return;
      const meta = user.user_metadata || {};
      setPeople(Array.isArray(meta.people_list) ? meta.people_list : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load people');
    } finally {
      setLoading(false);
    }
  }

  async function addPerson() {
    const name = newPerson.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    
    const next = [...people, name];
    setPeople(next);
    setNewPerson('');
    
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ data: { people_list: next } });
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not add person');
      setPeople(people); // Revert on error
    } finally {
      setSaving(false);
    }
  }

  async function removePerson(index: number) {
    const name = people[index];
    Alert.alert('Remove Person', `Remove "${name}" from your people list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const next = people.filter((_, i) => i !== index);
          setPeople(next);
          try {
            setSaving(true);
            const { error } = await supabase.auth.updateUser({ data: { people_list: next } });
            if (error) throw error;
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not remove person');
            setPeople(people); // Revert on error
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B8783A" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>People</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.addSection}>
          <TextInput
            style={styles.input}
            value={newPerson}
            onChangeText={setNewPerson}
            placeholder="Add a person"
            placeholderTextColor="#4A7A9B"
            returnKeyType="done"
            onSubmitEditing={addPerson}
          />
          <TouchableOpacity 
            style={[styles.addButton, (!newPerson.trim() || saving) && styles.addButtonDisabled]} 
            onPress={addPerson}
            disabled={!newPerson.trim() || saving}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {people.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No people yet</Text>
            <Text style={styles.emptySubtext}>Add people you want to track items for</Text>
          </View>
        ) : (
          <FlatList
            data={people}
            keyExtractor={(item, index) => `${item}-${index}`}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item, index }) => (
              <View style={styles.personRow}>
                <View style={styles.personLeft}>
                  <Text style={styles.personIcon}>👤</Text>
                  <Text style={styles.personName}>{item}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removePerson(index)}
                  disabled={saving}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: '#F7FAFB',
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
  backgroundColor: '#FFFFFF',
  borderBottomWidth: 1,
  borderBottomColor: '#D8E6EE',
  },
  backButton: {
  color: '#B8783A',
    fontSize: 17,
    width: 70,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  color: '#0C1620',
  },
  addSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  backgroundColor: '#FFFFFF',
  borderBottomWidth: 1,
  borderBottomColor: '#D8E6EE',
  },
  input: {
    flex: 1,
  backgroundColor: '#D8E6EE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
  color: '#0C1620',
  },
  addButton: {
  backgroundColor: '#B8783A',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  addButtonDisabled: {
  backgroundColor: '#D8E6EE',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  personIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  personName: {
    fontSize: 17,
  color: '#0C1620',
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeButtonText: {
  color: '#B8783A',
    fontSize: 15,
    fontWeight: '600',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
  color: '#4A7A9B',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
  color: '#4A7A9B',
    textAlign: 'center',
  },
});
