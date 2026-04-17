import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BrandHeader from '../components/ui/BrandHeader';

export default function Welcome() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: '#0C1620' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: 60 }}>
          <BrandHeader
            layout="column"
            align="center"
            iconSize={42}
            iconBackgroundSize={28}
            iconBackgroundRadius={28}
            textColor="#FFFFFF"
            subtitle="YOUR PERSONAL ARCHIVE"
            subtitleColor="#4A7A9B"
            style={{ marginBottom: 20 }}
            titleStyle={{ fontSize: 46, fontFamily: 'CormorantGaramond_400Regular', letterSpacing: 0.5 }}
            subtitleStyle={{ fontSize: 20, fontFamily: 'DMSans_500Medium', letterSpacing: 1.2 }}
          />
          <Text style={{ fontSize: 20, color: '#4A7A9B', fontWeight: '600', marginBottom: 32, textAlign: 'center', letterSpacing: 0.2, fontFamily: 'DMSans_500Medium' }}>
            Start Preserving Your{"\n"}Memories Today
          </Text>

          {/* Create Collection Button - prominent, rounded */}
          <TouchableOpacity
            style={{ backgroundColor: '#B8783A', borderRadius: 22, paddingVertical: 18, paddingHorizontal: 12, width: '88%', alignItems: 'center', marginBottom: 18, shadowColor: '#B8783A', shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
            onPress={() => router.push('/(auth)/signup')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap' }}>
              <Text
                style={{ color: '#fff', fontWeight: '400', fontSize: 18, letterSpacing: 0.2, fontFamily: 'DMSans_500Medium', flexShrink: 1 }}
                numberOfLines={1}
              >
                Start Your Collection →
              </Text>
            </View>
          </TouchableOpacity>

          {/* Already have account button - outlined, rounded */}
          <TouchableOpacity
            style={{ backgroundColor: '#F7FAFB', borderRadius: 18, paddingVertical: 16, width: '88%', alignItems: 'center', marginBottom: 18, borderWidth: 2, borderColor: '#D8E6EE' }}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={{ color: '#4A7A9B', fontWeight: '500', fontSize: 18, letterSpacing: 0.1, fontFamily: 'DMSans_500Medium' }}>I already have an account</Text>
          </TouchableOpacity>

          {/* Preview logged-in button */}
          <TouchableOpacity
            style={{ backgroundColor: 'transparent', borderRadius: 18, paddingVertical: 16, width: '88%', alignItems: 'center', marginBottom: 18, borderWidth: 2, borderColor: '#4A7A9B' }}
            onPress={() => router.push('/(tabs)/items')}
          >
            <Text style={{ color: '#4A7A9B', fontWeight: '500', fontSize: 18, letterSpacing: 0.1, fontFamily: 'DMSans_500Medium' }}>Preview logged in</Text>
          </TouchableOpacity>

          {/* Footer Links - muted, spaced */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 18 }}>
            {['Terms of Use', 'Privacy Policy', 'Subscription Terms'].map((txt, i) => (
              <TouchableOpacity key={txt} onPress={() => {}}>
                <Text style={{ color: '#4A7A9B', fontSize: 14, marginHorizontal: 4, fontFamily: 'DMSans_400Regular' }}>{txt}{i < 2 ? ' ·' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
