import type { NextAuthOptions, Profile } from 'next-auth';
import type { OAuthConfig } from 'next-auth/providers/oauth';
import type { Adapter } from 'next-auth/adapters';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from './db';
import { parseRoles } from './roles';
import { env } from './env';

/**
 * Wraps the PrismaAdapter to skip automatic user/account creation for wayo-auth.
 * The signIn callback handles wayo-auth user sync and account linking manually.
 */
function createAdapter(): Adapter {
  const base = PrismaAdapter(db) as Adapter;
  return {
    ...base,
    getUserByAccount: async (providerAccount) => {
      if (providerAccount.provider === 'wayo-auth') {
        const account = await db.account.findFirst({
          where: {
            provider: providerAccount.provider,
            providerAccountId: providerAccount.providerAccountId,
          },
          include: { user: true },
        });
        return account?.user ?? null;
      }
      return base.getUserByAccount!(providerAccount);
    },
    createUser: async (data) => {
      // @ts-ignore - check if this is called from wayo-auth context
      return base.createUser!(data);
    },
    linkAccount: async (account) => {
      if (account.provider === 'wayo-auth') {
        // Already handled in signIn callback — skip adapter's auto-creation
        return account as any;
      }
      return base.linkAccount!(account);
    },
  };
}

/**
 * Syncs a user from the centralized auth server to the local Prisma database.
 * The auth server (Authentication_project) is the source of truth for credentials;
 * the local DB keeps the user record for foreign-key relationships with business data.
 */
async function syncUserToLocalDb(authUser: {
  id: number | string;
  name: string;
  email: string;
  app_role?: string | null;
}): Promise<{ id: string; email: string; name: string | null; roles: string }> {
  const role = authUser.app_role || 'USER';
  const roles = role === 'USER' ? 'USER' : `USER,${role}`;

  const existing = await db.user.findUnique({
    where: { email: authUser.email },
  });

  if (existing) {
    const updated = await db.user.update({
      where: { email: authUser.email },
      data: { name: authUser.name, roles },
    });
    return updated;
  }

  const created = await db.user.create({
    data: {
      email: authUser.email,
      name: authUser.name,
      roles,
    },
  });
  return created;
}

/**
 * Custom OAuth provider for the centralized Authentication_project (Passport).
 * This replaces the CredentialsProvider — passwords are never handled by Wayo-ads.
 */
function WayoAuthProvider(): OAuthConfig<Profile> {
  return {
    id: 'wayo-auth',
    name: 'Wayo Auth',
    type: 'oauth',
    authorization: {
      url: `${env.AUTH_API_URL}/oauth/authorize`,
      params: { scope: 'user:read' },
    },
    token: {
      url: `${env.AUTH_API_URL}/oauth/token`,
    },
    userinfo: {
      url: `${env.AUTH_API_URL}/api/auth/user?app=${env.AUTH_APP_NAME}`,
    },
    clientId: env.AUTH_OAUTH_CLIENT_ID,
    clientSecret: env.AUTH_OAUTH_CLIENT_SECRET,
    profile(profile: any) {
      const user = profile.data?.user || profile.user || profile;
      return {
        id: String(user.id),
        name: user.name,
        email: user.email,
        emailVerified: user.email_verified_at ? new Date(user.email_verified_at) : null,
        roles: user.app_role ? ['USER', user.app_role] : ['USER'],
      };
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: createAdapter(),
  providers: [
    WayoAuthProvider(),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session, account, profile }) {
      if (user) {
        token.id = user.id;
        const roles = (user as any).roles;
        token.roles = Array.isArray(roles) ? roles : parseRoles(String(roles || 'USER'));
        token.emailVerified = (user as any).emailVerified ?? null;
      }

      if (trigger === 'update') {
        if (session?.roles) {
          token.roles = Array.isArray(session.roles)
            ? session.roles
            : parseRoles(String(session.roles || 'USER'));
        }
        if (session?.emailVerified !== undefined) {
          token.emailVerified = session.emailVerified;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        const userId = token.id as string;
        const iat = token.iat ? new Date((token.iat as number) * 1000) : null;

        // Compte supprimé en base → invalider la session
        const userExists = await db.user.findUnique({
          where: { id: userId },
        });
        if (!userExists) {
          return {} as any;
        }

        const logoutEvent = await db.logoutEvent.findFirst({
          where: { wayoUserId: userId },
          orderBy: { createdAt: 'desc' },
        });
        if (logoutEvent && iat && logoutEvent.createdAt > iat) {
          return {} as any;
        }

        session.user.id = userId;
        const roles = token.roles;
        session.user.roles = Array.isArray(roles) ? roles : parseRoles(String(roles || 'USER'));
        session.user.emailVerified = token.emailVerified as Date | null;
      }

      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'wayo-auth') {
        if (!user.email) return false;

        const p = (profile as any)?.data?.user || (profile as any)?.user || profile;

        // Sync user to local DB (upsert)
        const localUser = await syncUserToLocalDb({
          id: p?.id || user.id,
          name: p?.name || user.name || '',
          email: user.email,
          app_role: p?.app_role,
        });

        // Upsert the OAuth account link
        const providerAccountId = String(p?.id || user.id);
        const existingAccount = await db.account.findFirst({
          where: { provider: 'wayo-auth', providerAccountId },
        });

        if (!existingAccount) {
          await db.account.create({
            data: {
              userId: localUser.id,
              type: account.type || 'oauth',
              provider: 'wayo-auth',
              providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
            },
          });
        } else {
          await db.account.update({
            where: { id: existingAccount.id },
            data: {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
            },
          });
        }

        // Override user fields so jwt callback uses the local DB id
        user.id = localUser.id;
        user.roles = parseRoles(localUser.roles);
        // Preserve emailVerified from auth server (critical for verify-email gate)
        const verifiedAt = p?.email_verified_at ?? (user as any).emailVerified;
        (user as any).emailVerified = verifiedAt ? (verifiedAt instanceof Date ? verifiedAt : new Date(verifiedAt)) : null;
        return true;
      }

      if (account?.provider === 'google') {
        if (!user.email) {
          return false;
        }
        
        const existingUser = await db.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });
        
        if (existingUser) {
          const hasGoogleAccount = existingUser.accounts.some(
            acc => acc.provider === 'google'
          );
          
          if (!hasGoogleAccount) {
            await db.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            });
          }
        }
      }
      
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (!url || !baseUrl) {
        return '/';
      }
      if (url.startsWith('/')) {
        return url;
      }
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          return url;
        }
      } catch {
        return '/';
      }
      return '/';
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  secret: env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

declare module 'next-auth' {
  interface User {
    id: string;
    roles: string[];
    emailVerified?: Date | null;
  }
  interface Session {
    user: User & {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: string[];
      emailVerified?: Date | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    roles: string[];
    emailVerified?: Date | null;
  }
}
