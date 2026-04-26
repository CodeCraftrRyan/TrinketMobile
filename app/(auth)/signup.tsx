import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type CountryCode, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BrandHeader from '../../components/ui/BrandHeader';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string; email?: string; phone?: string }>();
  const devParams = useLocalSearchParams<{ devDummy?: string }>();

  const COUNTRY_OPTIONS: { code: CountryCode; label: string }[] = [
    { code: 'US', label: 'United States' },
    { code: 'CA', label: 'Canada' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'AU', label: 'Australia' },
    { code: 'NZ', label: 'New Zealand' },
    { code: 'IE', label: 'Ireland' },
    { code: 'DE', label: 'Germany' },
    { code: 'FR', label: 'France' },
  ];

  // Steps: 0 = Welcome, 1 = Name, 2 = Plan selection, 3 = People List
  const [step, setStep] = useState<number>(() => {
    const s = parseInt(params.step ?? '0', 10);
    return isNaN(s) ? 0 : s;
  });
  const totalSteps = 4;

  // Form state
  const [email, setEmail] = useState(params.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(params.phone ?? '');
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('US');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'premium' | null>('pro');
  const [purchasing, setPurchasing] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  // animated value for cross-fading monthly/yearly prices (0 = monthly, 1 = yearly)
  const priceAnim = useRef(new Animated.Value(billingInterval === 'monthly' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(priceAnim, {
      toValue: billingInterval === 'monthly' ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [billingInterval, priceAnim]);

  const scaleAnim = priceAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const parsedPhone = parsePhoneNumberFromString(phoneNumber, phoneCountry);
  const normalizedPhone = parsedPhone?.number ?? '';
  const isPhoneValidValue = parsedPhone?.isValid() ?? false;
  const canNextFromWelcome =
    email.trim().length > 0 &&
  isPhoneValidValue &&
    password.length >= 6 &&
    password === confirmPassword;
  const canNextFromName = firstName.trim().length > 0 && lastName.trim().length > 0;
  const canNextFromPlan = selectedPlan !== null;
  

  async function createAccount() {
    // Dev shortcut: if ?devDummy=1 is present, prefill a dummy account and
    // skip real network sign up so QA can test onboarding UI locally.
    if (devParams?.devDummy === '1') {
      // Prefill sensible dummy values and return false to simulate 'needs verification'
      setEmail('dev+[email protected]');
      setPhoneNumber('+15551234567');
      setFirstName('Test');
      setLastName('User');
      setPassword('DevTest123!');
      setConfirmPassword('DevTest123!');
      // Simulate the no-session path so the app navigates to verify flow
      const userId = 'dev-dummy-user';
      const returnTo = `/(auth)/signup?step=1&email=${encodeURIComponent('dev+[email protected]')}&phone=${encodeURIComponent('+15551234567')}`;
      router.push(`/(auth)/verify?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent('dev+[email protected]')}&phone=${encodeURIComponent('+15551234567')}&returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!isPhoneValidValue) {
      throw new Error('Please enter a valid phone number for 2FA, including country code.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          phone_number: normalizedPhone,
          phone_country: phoneCountry,
        },
      },
    });
    if (error) throw error;
    if (!data.session) {
      // No immediate session returned; proceed to verification flow where the user
      // can choose email or SMS to receive a confirmation code and finish setup.
    const userId = data.user?.id ?? '';
    const returnTo = `/(auth)/signup?step=1&email=${encodeURIComponent(trimmedEmail)}&phone=${encodeURIComponent(normalizedPhone)}`;
    router.push(`/(auth)/verify?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(trimmedEmail)}&phone=${encodeURIComponent(normalizedPhone)}&returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    }
    return true;
  }

  async function saveName() {
    const full_name = `${firstName} ${lastName}`.trim();
    try {
      const { error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName, full_name } });
      if (error) throw error;
    } catch (e: any) {
      // Dev bypass: allow continuing through onboarding even if updateUser fails
      if (devParams?.devDummy === '1' || __DEV__) {
        console.warn('saveName: updateUser failed but continuing in dev mode:', e?.message ?? e);
        return;
      }
      throw e;
    }
  }

  async function savePeopleAndFinish() {
  try {
    const { error } = await supabase.auth.updateUser({ data: { people_list: people } });
    if (error) throw error;
  } catch (e: any) {
    if (devParams?.devDummy === '1' || __DEV__) {
      console.warn('savePeopleAndFinish: updateUser failed but continuing in dev mode:', e?.message ?? e);
    } else {
      throw e;
    }
  }
  
      // After saving people, navigate to home
      router.replace('/(tabs)/home');
    }

    async function purchasePlan(plan: 'pro' | 'premium') {
    try {
      setPurchasing(true);
      // Attempt to create a Stripe Checkout session via the backend
        const session = await (await import('../../services/payments')).createCheckoutSession(plan, undefined, email || undefined, billingInterval);
      if (!session?.url) throw new Error('Could not create checkout session');
      await (await import('../../services/payments')).openCheckout(session.url);
        // After opening checkout, show waiting UI and poll for webhook confirmation
        setWaitingForPayment(true);
        setPaymentAttempts(0);
        // Polling loop
        const maxAttempts = 60; // ~5 minutes at 5s interval
        const intervalMs = 5000;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((res) => setTimeout(res, intervalMs));
          setPaymentAttempts(i + 1);
          try {
            const { data, error } = await supabase.auth.getUser();
            if (!error && data?.user) {
              const meta = data.user.user_metadata || {};
              const status = String(meta.subscription_status || '').toLowerCase();
              const planMeta = String(meta.subscription_plan || '').toLowerCase();
              if ((status === 'active' || status === 'paid' || planMeta === plan) && planMeta) {
                setWaitingForPayment(false);
                setStep(3);
                break;
              }
            }
          } catch (e) {
            // ignore transient errors during polling
          }
          if (i === maxAttempts - 1) {
            setWaitingForPayment(false);
            Alert.alert('Payment not confirmed', 'We did not detect a confirmed payment yet. If you completed payment, please wait a moment and try "Check status" or return to the membership screen.');
          }
        }
    } catch (e: any) {
      Alert.alert('Purchase failed', e?.message ?? 'Could not start checkout');
    } finally {
      setPurchasing(false);
    }
  }

  function back() {
    if (step > 0) setStep(step - 1);
    else router.back();
  }

  async function next() {
    try {
      setSaving(true);
      if (step === 0) {
        if (!canNextFromWelcome) return;
        const created = await createAccount();
        if (!created) return;
        setStep(1);
      } else if (step === 1) {
        if (!canNextFromName) return;
        await saveName();
        setStep(2);
      } else if (step === 2) {
        if (!canNextFromPlan) return;
        if (selectedPlan === 'free') {
          // No checkout required, advance to people list
          setStep(3);
        } else {
          // selectedPlan is pro|premium
          await purchasePlan(selectedPlan as 'pro' | 'premium');
        }
      }
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again');
    } finally {
      setSaving(false);
    }
  }

  async function finish(skipPeople = false) {
    try {
      setSaving(true);
      if (!skipPeople) {
        await savePeopleAndFinish();
      } else {
        // Save empty list and finish
  const { error } = await supabase.auth.updateUser({ data: { people_list: [] } });
  if (error) throw error;
  router.replace('/(tabs)/home');
      }
    } catch (e: any) {
      Alert.alert('Could not finish onboarding', e?.message ?? 'Please try again');
    } finally {
      setSaving(false);
    }
  }

  function addPerson() {
    const name = newPerson.trim();
    if (!name) return;
    setPeople((prev) => [...prev, name]);
    setNewPerson('');
  }
  function removePerson(index: number) {
    setPeople((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Top bar */}
          <View style={styles.topBar}>
            <Text onPress={back} style={styles.backLink}>← Back</Text>
            <View style={styles.dots}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View key={i} style={[styles.dot, i <= step ? styles.dotActive : undefined]} />
              ))}
            </View>
            <View style={{ width: 48 }} />
          </View>

          <BrandHeader layout="row" align="center" style={{ marginBottom: 8 }} />

          {step === 0 && (
            <View style={styles.centerWrap}>
              <Text style={styles.welcomeTitle}>Welcome!</Text>
              <Text style={styles.subtitle}>Create your account to get started.</Text>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.fieldLabel}>Phone number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryPickerCompact}>
                  <Text style={styles.countryPickerValue}>
                    {`${phoneCountry} +${getCountryCallingCode(phoneCountry)}`}
                  </Text>
                  <Picker
                    selectedValue={phoneCountry}
                    onValueChange={(value) => setPhoneCountry(value as CountryCode)}
                    style={styles.countryPickerCompactInput}
                  >
                    {COUNTRY_OPTIONS.map((country) => (
                      <Picker.Item
                        key={country.code}
                        label={`${country.code} +${getCountryCallingCode(country.code as any)}`}
                        value={country.code}
                      />
                    ))}
                  </Picker>
                </View>
                <TextInput
                  placeholder="Phone number for 2FA"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  style={[styles.input, styles.phoneInput]}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />
              </View>
              <Text style={styles.helperText}>We’ll use this for two-factor verification.</Text>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                placeholder="Password (min 6 chars)"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                autoComplete="password"
                passwordRules="minlength: 8; required: lower; required: upper; required: digit; required: [-@#$%^&+=];"
                importantForAutofill="yes"
              />
              <Text style={styles.fieldLabel}>Confirm password</Text>
              <TextInput
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="password"
                importantForAutofill="yes"
              />
              <Pressable onPress={() => {
                // generate a strong random password and fill both fields
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
                let generated = '';
                for (let i = 0; i < 16; i++) generated += chars.charAt(Math.floor(Math.random() * chars.length));
                setPassword(generated);
                setConfirmPassword(generated);
                Alert.alert('Suggested password filled', 'A strong password has been generated and filled for you. Consider saving it in your device password manager.');
              }} style={[styles.secondaryBtn, { marginTop: 10 }]}> 
                <Text style={styles.secondaryBtnText}>Suggest a strong password</Text>
              </Pressable>
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.link}>{showPassword ? 'Hide password' : 'Show password'}</Text>
              </Pressable>
              <Pressable disabled={!canNextFromWelcome || saving} onPress={next} style={[styles.primaryBtn, (!canNextFromWelcome || saving) && styles.btnDisabled]}>
                <Text style={styles.primaryBtnText}>{saving ? 'Creating…' : 'Create Account'}</Text>
              </Pressable>
            </View>
          )}

          {step === 1 && (
            <View style={styles.formWrap}>
              <Text style={styles.bigTitle}>What’s your name?</Text>
              <Text style={styles.subtitle}>Let’s get to know you.</Text>
              <TextInput
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
              <Pressable disabled={!canNextFromName || saving} onPress={next} style={[styles.primaryBtn, (!canNextFromName || saving) && styles.btnDisabled]}>
                <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Next  →'}</Text>
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.formWrap}>
              <Text style={styles.bigTitle}>Choose a plan</Text>
              <Text style={styles.subtitle}>Pick a plan to access Pro features. You can also skip and continue onboarding.</Text>

              <View style={styles.intervalWrap}>
                <View style={styles.intervalToggle}>
                  <Pressable onPress={() => setBillingInterval('monthly')} style={[styles.intervalOption, billingInterval === 'monthly' && styles.intervalSelected]}>
                    <Text style={[styles.intervalText, billingInterval === 'monthly' && styles.intervalTextSelected]}>Monthly</Text>
                  </Pressable>
                  <Pressable onPress={() => setBillingInterval('yearly')} style={[styles.intervalOption, billingInterval === 'yearly' && styles.intervalSelected]}>
                    <Text style={[styles.intervalText, billingInterval === 'yearly' && styles.intervalTextSelected]}>Yearly</Text>
                  </Pressable>
                </View>
              </View>

              {/* Plan cards */}
              {
                // compute prices based on the billing interval toggle
              }
              {(
                (() => {
                  const plans = [
                    { id: 'free', name: 'Free', features: ['Up to 50 items', 'Basic search', 'Photo storage'], icon: '📦' },
                    { id: 'pro', name: 'Pro', features: ['Up to 500 items', 'Advanced search', 'Priority support'], icon: '⭐' },
                    { id: 'premium', name: 'Premium', features: ['Unlimited items', 'AI-powered search', 'Unlimited storage'], icon: '💎' },
                  ] as const;

                  function priceFor(id: typeof plans[number]['id'], interval: 'monthly' | 'yearly') {
                    if (id === 'free') return 'Free';
                    if (id === 'pro') return interval === 'monthly' ? '$9 / month' : '$79 / year';
                    if (id === 'premium') return interval === 'monthly' ? '$19 / month' : '$169 / year';
                    return '';
                  }

                  return plans.map((p) => {
                    const price = priceFor(p.id, billingInterval);
                    return (
                      <AnimatedPressable
                        key={p.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Plan ${p.name}. ${price}${selectedPlan === p.id ? ', selected' : ''}`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        onPress={() => setSelectedPlan(p.id as any)}
                        style={({ pressed }) => [
                          styles.planCard,
                          selectedPlan === p.id && styles.planCardSelected,
                          pressed && styles.planCardPressed,
                          { transform: [{ scale: selectedPlan === p.id ? scaleAnim : 1 }] },
                        ]}
                      >
                        {/* 'Most popular' badge removed per request */}

                        <View style={styles.planHeader}>
                          <View style={styles.planHeaderLeft}>
                            <Text style={styles.planIcon}>{p.icon}</Text>
                            <View style={{ alignItems: 'flex-start', marginLeft: 8 }}>
                              <Text style={styles.planName}>{p.name}</Text>
                              <Text style={styles.planSubtitle}>{p.id === 'free' ? 'No cost' : p.id === 'premium' ? 'Best value' : ''}</Text>
                            </View>
                          </View>
                          <View style={styles.planHeaderRight}>
                            <View style={styles.pricePill}>
                              <Text style={styles.planPrice}>{priceFor(p.id, billingInterval)}</Text>
                            </View>
                            <View style={[styles.radioButtonWrap, selectedPlan === p.id && styles.radioButtonWrapSelected]}>
                              <Pressable onPress={() => setSelectedPlan(p.id as any)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={`Select ${p.name}`}>
                                <View style={[styles.radioButton, selectedPlan === p.id && styles.radioButtonSelected]}>
                                  {selectedPlan === p.id && <View style={styles.radioButtonInner} />}
                                </View>
                              </Pressable>
                            </View>
                          </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.featuresList}>
                          {p.features.map((f, i) => (
                            <View key={i} style={styles.featureRow}>
                              <Text style={styles.checkmark}>✓</Text>
                              <Text style={styles.featureText}>{f}</Text>
                            </View>
                          ))}
                        </View>
                      </AnimatedPressable>
                    );
                  });
                })()
              )}

              <Pressable disabled={!canNextFromPlan || purchasing} onPress={next} style={[styles.primaryBtn, (!canNextFromPlan || purchasing) && styles.btnDisabled, { marginTop: 18 }]}> 
                <Text style={styles.primaryBtnText}>{purchasing ? 'Opening…' : 'Next  →'}</Text>
              </Pressable>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formWrap}>
              <Text style={styles.bigTitle}>Create your People List</Text>
              <Text style={styles.subtitle}>Add family and friends to easily tag them in events.</Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  placeholder="Add a person (e.g., Mom, Alex)"
                  value={newPerson}
                  onChangeText={setNewPerson}
                  style={[styles.input, { flex: 1 }]}
                  placeholderTextColor="#9CA3AF"
                />
                <Pressable onPress={addPerson} style={[styles.secondaryBtn, { paddingHorizontal: 16 }]}>
                  <Text style={styles.secondaryBtnText}>Add</Text>
                </Pressable>
              </View>

              <FlatList
                data={people}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item, index }) => (
                  <View style={styles.personRow}>
                    <Text style={styles.personText}>{item}</Text>
                    <Pressable onPress={() => removePerson(index)}>
                      <Text style={styles.removeLink}>Remove</Text>
                    </Pressable>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.muted}>No people yet. Add a few now or skip.</Text>}
                style={{ marginTop: 8 }}
              />

              <Pressable onPress={() => finish(false)} disabled={saving} style={[styles.primaryBtn, saving && styles.btnDisabled]}>
                <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save & Finish'}</Text>
              </Pressable>

              <Pressable onPress={() => finish(true)} style={[styles.secondaryBtn, { marginTop: 10 }]}> 
                <Text style={styles.secondaryBtnText}>Skip for Now & Finish</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FAFB' },
  scroll: { flexGrow: 1, padding: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backLink: { color: '#B8783A', fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D8E6EE' },
  dotActive: { backgroundColor: '#0C1620' },
  centerWrap: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-start', paddingTop: 24, gap: 8 },
  welcomeTitle: { fontSize: 32, fontWeight: '800', color: '#0C1620' },
  bigTitle: { fontSize: 32, fontWeight: '800', color: '#0C1620', marginTop: 16 },
  subtitle: { color: '#4A7A9B', marginTop: 4, marginBottom: 8, textAlign: 'left' },
  formWrap: { gap: 12, width: '100%' },
  fieldLabel: { color: '#4A7A9B', fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginTop: 4, marginBottom: -2 },
  helperText: { color: '#7B8E9C', fontSize: 12, marginTop: -2, marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8E6EE', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#0C1620', height: 48 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryPickerCompact: { width: 96, height: 48, borderWidth: 1, borderColor: '#D8E6EE', borderRadius: 10, justifyContent: 'center', backgroundColor: '#FFFFFF', position: 'relative' },
  countryPickerValue: { color: '#0C1620', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  countryPickerCompactInput: { width: '100%', height: 44, color: '#0C1620', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0 },
  phoneInput: { flex: 1 },
  primaryBtn: { backgroundColor: '#B8783A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#F7FAFB', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#0C1620', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  link: { color: '#B8783A', fontWeight: '600' },
  muted: { color: '#4A7A9B', marginTop: 10, textAlign: 'center' },
  personRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D8E6EE', borderRadius: 8, backgroundColor: '#FFFFFF', marginTop: 8 },
  personText: { color: '#0C1620', fontWeight: '500' },
  removeLink: { color: '#B8783A', fontWeight: '600' },
  intervalWrap: { alignItems: 'center', marginBottom: 12 },
  intervalToggle: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 4, elevation: 1 },
  intervalOption: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  intervalSelected: { backgroundColor: '#B8783A' },
  intervalText: { color: '#0C1620', fontWeight: '600' },
  intervalTextSelected: { color: '#FFFFFF' },
  planCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 22, marginBottom: 36, borderWidth: 2, borderColor: '#0C1620' },
  planCardSelected: {
    borderColor: '#B8783A',
    backgroundColor: '#F3EBE1',
    // subtle shadow for selected card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  planCardElevated: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planHeaderRight: { alignItems: 'flex-end', flexDirection: 'row', alignContent: 'center', gap: 12 },
  planHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIcon: { fontSize: 36, marginRight: 8 },
  planName: { fontSize: 20, fontWeight: '800', color: '#0C1620' },
  planPrice: { fontSize: 15, color: '#4A7A9B', marginTop: 6 },
  planSubtitle: { fontSize: 12, color: '#7B8E9C', marginTop: 2 },
  pricePill: { backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#E6E6E6' },
  radioButtonWrap: { marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
  radioButtonWrapSelected: {  },
  // mostPopularBadge removed
  radioButton: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D8E6EE', justifyContent: 'center', alignItems: 'center' },
  radioButtonSelected: { borderColor: '#B8783A' },
  radioButtonInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#B8783A' },
  divider: { height: 1, backgroundColor: '#D8E6EE', marginBottom: 16 },
  featuresList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkmark: { fontSize: 16, color: '#B8783A', fontWeight: '700' },
  featureText: { fontSize: 15, color: '#0C1620' },
  planCardPressed: { opacity: 0.85, transform: [{ scale: 0.998 }] },
});