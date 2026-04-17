import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BrandHeader from '../components/ui/BrandHeader';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body:
      'We collect information you provide directly to us, such as when you create an account, upload items to your collection, or contact us for support.',
  },
  {
    title: 'How We Use Your Information',
    body:
      'We use the information we collect to provide, maintain, and improve our services, including your personal collection archive.',
  },
  {
    title: 'Data Security',
    body:
      'We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.',
  },
  {
    title: 'Information Sharing',
    body:
      'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.',
  },
  {
    title: 'Your Rights',
    body:
      'You have the right to access, update, or delete your personal information. You can manage most of this information through your account settings.',
  },
  {
    title: 'Contact Us',
    body:
      'If you have any questions about this Privacy Policy, please contact us at privacy@trinket.app.',
  },
];

export default function PrivacyPolicy() {
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
        Your Privacy Matters
      </Text>
      <Text style={{ color: '#4A7A9B', fontSize: 16, marginBottom: 18 }}>
        We’re committed to keeping your collection safe, secure, and respected.
      </Text>

      {SECTIONS.map((section) => (
        <View
          key={section.title}
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
            {section.title}
          </Text>
          <Text style={{ color: '#2E4A5E', fontSize: 15, lineHeight: 22 }}>
            {section.body}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
