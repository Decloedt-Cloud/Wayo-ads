import { userRepository } from './repositories';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export interface AdminUserListParams {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
  verificationLevel?: 'VERIFIED' | 'UNVERIFIED' | 'ALL';
}

export interface AdminUserInfo {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  roles: string;
  trustScore?: number;
  tier?: string;
  verificationLevel?: string;
  qualityMultiplier?: number;
}

export async function getUsers(params: AdminUserListParams): Promise<{
  users: AdminUserInfo[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { role, search, page = 1, limit = 50, verificationLevel = 'ALL' } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  
  if (role) {
    where.roles = { contains: role };
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (verificationLevel === 'VERIFIED') {
    where.verificationLevel = 'YOUTUBE_VERIFIED';
  } else if (verificationLevel === 'UNVERIFIED') {
    where.verificationLevel = 'UNVERIFIED';
  }

  const [users, total] = await Promise.all([
    userRepository.findMany({ where, skip, take: limit }),
    userRepository.count(where),
  ]);

  return {
    users: users as AdminUserInfo[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserById(id: string): Promise<AdminUserInfo | null> {
  const user = await userRepository.findByIdWithDetails(id);
  return user as AdminUserInfo | null;
}

export async function updateUserRoles(userId: string, roles: string): Promise<AdminUserInfo> {
  const user = await userRepository.update(userId, { roles });
  return user as AdminUserInfo;
}

export async function deleteUser(userId: string): Promise<void> {
  const account = await db.account.findFirst({
    where: { userId, provider: 'wayo-auth' },
    select: { providerAccountId: true },
  });

  if (account?.providerAccountId) {
    try {
      const authUrl = env.AUTH_API_URL.replace(/\/$/, '');
      const res = await fetch(`${authUrl}/api/internal/delete-user`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': env.AUTH_APP_KEY,
        },
        body: JSON.stringify({ auth_user_id: parseInt(account.providerAccountId, 10) }),
      });

      if (!res.ok && res.status !== 404) {
        console.warn(`[cross-delete] Auth server responded ${res.status}:`, await res.text());
      }
    } catch (err) {
      console.error('[cross-delete] Failed to notify auth server:', err);
    }
  }

  await userRepository.delete(userId);
}
