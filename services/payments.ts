import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

type CreateSessionResult = { url?: string; id?: string };
type PortalSessionResult = { url?: string; id?: string };

export async function createCheckoutSession(plan: 'pro' | 'premium', userId?: string, customerEmail?: string): Promise<CreateSessionResult> {
  // Use Supabase Edge Function `create-checkout-session` that we deploy to the project
  try {
    const body = { plan, userId, customerEmail } as any;
    const res = await (supabase as any).functions.invoke('create-checkout-session', {
      body: JSON.stringify(body),
    });
    if (res?.error || res?.data?.error) {
      const details = res?.data?.details ? ` ${JSON.stringify(res.data.details)}` : '';
      const context = (res?.error as any)?.context;
      const contextBody = context?.body ? ` ${context.body}` : '';
      const message = res?.data?.error
        ? `${res.data.error}${details}`
        : `${res.error?.message || 'Checkout session failed.'}${contextBody}`;
      throw new Error(message);
    }
    return res.data as CreateSessionResult;
  } catch (err) {
    console.error('createCheckoutSession error', err);
    throw err;
  }
}

export async function openCheckout(url: string) {
  // Open the Stripe Checkout URL in the system browser
  await Linking.openURL(url);
}

export async function createCustomerPortalSession(customerId?: string, customerEmail?: string): Promise<PortalSessionResult> {
  try {
    const body = { customerId, customerEmail } as any;
    const res = await (supabase as any).functions.invoke('create-customer-portal', {
      body: JSON.stringify(body),
    });
    if (res?.error) throw res.error;
    return res.data as PortalSessionResult;
  } catch (err) {
    console.error('createCustomerPortalSession error', err);
    throw err;
  }
}

export async function openCustomerPortal(url: string) {
  await Linking.openURL(url);
}
