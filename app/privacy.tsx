import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { tokens } from '../lib/tokens';

const c = tokens.colors;

const UPDATED = 'July 31, 2026';
const CONTACT = 'privacy@yourtrinkets.com';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Information we collect',
    body: 'We collect information you provide directly to us, such as when you create an account, upload items to your collection, or contact us for support.',
  },
  {
    title: 'How we use your information',
    body: 'We use the information we collect to provide, maintain, and improve our services, including your personal collection archive.',
  },
  {
    title: 'Data security',
    body: 'We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.',
  },
  {
    title: 'Information sharing',
    body: 'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.',
  },
  {
    title: 'Your rights',
    body: 'You have the right to access, update, or delete your personal information. You can manage most of this information through your account settings.',
  },
];

export default function Privacy() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* Masthead */}
        <View style={{ backgroundColor: c.surfaceDark, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={19} color={c.inkGhost} />
            <Text style={{ ...tokens.type.ui, color: c.inkGhost }}>Settings</Text>
          </TouchableOpacity>

          <Text style={{ ...tokens.type.label, color: c.inkGhost, opacity: 0.75, marginTop: 22 }}>
            Privacy policy
          </Text>
          <Text style={{ ...tokens.type.display, fontSize: 32, lineHeight: 38, color: c.bg, marginTop: 6 }}>
            Your privacy matters.
          </Text>
          <Text style={{ ...tokens.type.ui, color: c.inkGhost, opacity: 0.85, marginTop: 10, lineHeight: 23 }}>
            The things you keep are yours. We treat them that way.
          </Text>
          <Text style={{ ...tokens.type.label, color: c.accent, marginTop: 16 }}>
            Last updated · {UPDATED}
          </Text>
        </View>

        {/* Sections */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          {SECTIONS.map((section, i) => (
            <View
              key={section.title}
              style={{
                paddingVertical: 22,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
                borderTopWidth: i === 0 ? 0 : 0,
              }}>
              <Text style={{ ...tokens.type.nameSmall, color: c.ink, marginBottom: 8 }}>
                {section.title}
              </Text>
              <Text style={{ ...tokens.type.body, color: c.inkLabel }}>
                {section.body}
              </Text>
            </View>
          ))}

          {/* Contact */}
          <View style={{ paddingVertical: 22 }}>
            <Text style={{ ...tokens.type.nameSmall, color: c.ink, marginBottom: 8 }}>
              Contact us
            </Text>
            <Text style={{ ...tokens.type.body, color: c.inkLabel }}>
              If you have any questions about this policy, write to us.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${CONTACT}?subject=Privacy`)}
              style={{
                alignSelf: 'flex-start',
                marginTop: 16,
                paddingHorizontal: 22, paddingVertical: 14,
                borderRadius: tokens.radius.sm,
                borderWidth: 1, borderColor: c.border,
                backgroundColor: c.card,
              }}>
              <Text style={{ ...tokens.type.ui, color: c.ink }}>{CONTACT}</Text>
            </TouchableOpacity>
          </View>

          <Text style={{
            ...tokens.type.fact,
            color: c.inkLabel,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: c.border,
            lineHeight: 21,
          }}>
            Your photographs are stored privately. Nothing in your archive is public
            unless you choose to share it.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
