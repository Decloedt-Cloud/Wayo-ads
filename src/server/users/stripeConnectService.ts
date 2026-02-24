import { userRepository } from '@/server/admin/repositories';
import { getStripeCredentials } from '@/server/admin/stripeSettingsService';
import Stripe from 'stripe';

interface UserWithStripe {
  id: string;
  email: string;
  stripeAccountId: string | null;
  stripeOnboardingCompleted: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
}

export async function getStripeConnectOnboardingLink(
  userId: string,
  appUrl: string
): Promise<{ url: string } | { error: string }> {
  const user = (await userRepository.findByIdFull(userId)) as UserWithStripe | null;

  if (!user) {
    return { error: 'User not found' };
  }

  const credentials = await getStripeCredentials();
  
  if (!credentials?.secretKey) {
    return { error: 'Stripe not configured. Contact admin.' };
  }

  const stripe = new Stripe(credentials.secretKey, {
    apiVersion: '2026-01-28.clover',
  });

  let accountId = user.stripeAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      metadata: {
        userId: user.id,
        platform: 'wayo-ads',
      },
      capabilities: {
        transfers: { requested: true },
      },
    });

    accountId = account.id;

    await userRepository.updateUser(user.id, {
        stripeAccountId: accountId,
      });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/dashboard/creator/wallet?stripe=refresh`,
    return_url: `${appUrl}/dashboard/creator/wallet?stripe=success`,
    type: 'account_onboarding',
  });

  return { url: accountLink.url };
}

export async function getStripeConnectLoginLink(
  userId: string,
  appUrl: string
): Promise<{ url: string } | { error: string }> {
  const user = await userRepository.findByIdFull(userId);

  if (!user?.stripeAccountId) {
    return { error: 'No Stripe account found. Please complete onboarding first.' };
  }

  const credentials = await getStripeCredentials();
  
  if (!credentials?.secretKey) {
    return { error: 'Stripe not configured. Contact admin.' };
  }

  const stripe = new Stripe(credentials.secretKey, {
    apiVersion: '2026-01-28.clover',
  });

  const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);

  return { url: loginLink.url };
}
