import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { tokens } from '../lib/tokens';

const c = tokens.colors;
const CONTACT = 'admin@yourtrinkets.com';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is Trinket?',
    a: 'A personal archive. It helps you catalogue what you keep — heirlooms, collections, small meaningful objects — along with the stories behind them.',
  },
  {
    q: 'How do I add an object?',
    a: 'Tap the bronze plus at the bottom of the screen. Photograph the object, give it a name and a date, and note where it came from. Everything else can be filled in later.',
  },
  {
    q: 'Can I group objects by event or person?',
    a: 'Yes. Create an event and file objects under it, and name the people an object came from or passed through. The history stays attached to the thing itself.',
  },
  {
    q: 'Is my archive private?',
    a: 'Your photographs are stored privately and are only readable by you. Nothing in your archive is public unless you choose to share it.',
  },
  {
    q: 'Can I export my collection?',
    a: 'Yes. You can export your collection data at any time from your account settings on the web.',
  },
  {
    q: 'What plans are available?',
    a: 'There is a free plan for a small archive, and paid plans that lift the limits on objects, collections and events. Plans are managed on yourtrinkets.com.',
  },
];

export default function FAQ() {
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
            Questions
          </Text>
          <Text style={{ ...tokens.type.display, fontSize: 32, lineHeight: 38, color: c.bg, marginTop: 6 }}>
            Things people ask.
          </Text>
        </View>

        {/* Questions */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          {FAQS.map((faq) => (
            <View
              key={faq.q}
              style={{
                paddingVertical: 22,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}>
              <Text style={{ ...tokens.type.nameSmall, color: c.ink, marginBottom: 8 }}>
                {faq.q}
              </Text>
              <Text style={{ ...tokens.type.body, color: c.inkLabel }}>
                {faq.a}
              </Text>
            </View>
          ))}

          {/* Still stuck */}
          <View style={{ paddingVertical: 22 }}>
            <Text style={{ ...tokens.type.nameSmall, color: c.ink, marginBottom: 8 }}>
              Still stuck?
            </Text>
            <Text style={{ ...tokens.type.body, color: c.inkLabel }}>
              We read everything that comes in.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${CONTACT}?subject=Trinket`)}
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
        </View>

      </ScrollView>
    </View>
  );
}
