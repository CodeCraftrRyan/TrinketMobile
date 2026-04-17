import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BrandHeader from '../components/ui/BrandHeader';

const FAQ_ITEMS = [
  {
    question: 'What is Trinket?',
    answer:
      'Trinket is a personal archive platform that helps you catalog and preserve your treasured possessions and their stories for future generations.',
  },
  {
    question: 'How do I add items to my collection?',
    answer:
      "Click the 'Add Item' button from your Home or navigation menu. You can upload photos, add descriptions, and categorize your items.",
  },
  {
    question: 'Can I organize items by events or people?',
    answer:
      'Yes! You can create events and associate items with them, as well as tag people who were part of those memories.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We use industry-standard encryption and security practices to protect your personal collection data.',
  },
  {
    question: 'Can I export my collection data?',
    answer:
      'Yes, you can export your collection data at any time from your account settings.',
  },
  {
    question: 'What subscription plans are available?',
    answer:
      'We offer different plans with varying storage limits and features. Check our Pricing page for current options.',
  },
];

export default function FAQ() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <BrandHeader style={{ marginTop: 52, marginBottom: 16 }} />

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/account')}
        style={{
          marginBottom: 16,
          marginTop: 6,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: '#D8E6EE',
          borderRadius: 8,
          alignSelf: 'flex-start',
        }}
      >
        <Text style={{ color: '#0C1620', fontWeight: '600' }}>← Back to Settings</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 28, fontWeight: '300', color: '#0C1620', fontFamily: 'CormorantGaramond_300Light', marginBottom: 8 }}>
        FAQ
      </Text>
      <Text style={{ color: '#4A7A9B', fontSize: 16, marginBottom: 18 }}>
        Quick answers to the most common questions.
      </Text>

      {FAQ_ITEMS.map((item) => (
        <View
          key={item.question}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: '#D8E6EE',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#0C1620', marginBottom: 6 }}>
            {item.question}
          </Text>
          <Text style={{ color: '#2E4A5E', fontSize: 15, lineHeight: 22 }}>
            {item.answer}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
