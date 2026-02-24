export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  priceCents: number;
  bonusTokens?: number;
  isBestValue?: boolean;
  stripePriceId?: string;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 200,
    priceCents: 1999,
    bonusTokens: 0,
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    tokens: 650,
    priceCents: 4499,
    bonusTokens: 50,
    isBestValue: true,
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    tokens: 1400,
    priceCents: 4999,
    bonusTokens: 200,
  },
];

export function getTokenPackage(id: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((pkg) => pkg.id === id);
}

export function calculateTotalTokens(pkg: TokenPackage): number {
  return pkg.tokens + (pkg.bonusTokens || 0);
}

export function getPricePerToken(pkg: TokenPackage): number {
  const total = calculateTotalTokens(pkg);
  return Math.round((pkg.priceCents / total) * 100) / 100;
}
