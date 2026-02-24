import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { db } from './db';
import { parseRoles, hasRole } from './roles';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(role: 'ADVERTISER' | 'CREATOR' | 'SUPERADMIN') {
  const user = await requireAuth();
  if (!user.roles.includes(role)) {
    throw new Error(`Forbidden: Requires ${role} role`);
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAuth();
  if (!user.roles.includes('SUPERADMIN')) {
    throw new Error('Forbidden: Requires SUPERADMIN role');
  }
  return user;
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  
  if (!user) return false;
  return hasRole(user.roles, 'SUPERADMIN');
}

export async function grantRole(userId: string, role: 'ADVERTISER' | 'CREATOR') {
  const user = await db.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const roles = parseRoles(user.roles);
  if (!roles.includes(role)) {
    roles.push(role);
    await db.user.update({
      where: { id: userId },
      data: { roles: roles.join(',') },
    });
  }
  
  return roles;
}

export async function hasUserRole(userId: string, role: 'ADVERTISER' | 'CREATOR' | 'SUPERADMIN'): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  
  if (!user) return false;
  return hasRole(user.roles, role);
}
