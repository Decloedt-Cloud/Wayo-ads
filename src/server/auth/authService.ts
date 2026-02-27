import { db } from '@/lib/db';
import { authApiRegister, AuthApiError } from '@/lib/auth-api';

export interface RegisterInput {
  name: string;
  email: string;
  role?: 'ADVERTISER' | 'CREATOR';
  password: string;
}

export interface RegisterResult {
  id: string;
  email: string;
  name: string | null;
  roles: string;
}

/**
 * Registers a user via the centralized Authentication_project API,
 * then syncs the user record to the local Prisma database.
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const { name, email, role = 'ADVERTISER', password } = input;

  if (!email || !name) {
    throw new Error('Name and email are required');
  }

  if (!password) {
    throw new Error('Password is required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  try {
    const authData = await authApiRegister({ name, email, password, role });

    const appRole = authData.user.app_role || role;
    const userRoles = appRole === 'USER' ? 'USER' : `USER,${appRole}`;

    const existing = await db.user.findUnique({ where: { email } });

    let localUser;
    if (existing) {
      localUser = await db.user.update({
        where: { email },
        data: { name, roles: userRoles },
      });
    } else {
      localUser = await db.user.create({
        data: { email, name, roles: userRoles },
      });
    }

    return {
      id: localUser.id,
      email: localUser.email,
      name: localUser.name,
      roles: localUser.roles,
    };
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.errors?.email) {
        throw new Error('User already exists');
      }
      throw new Error(error.message);
    }
    console.error('[Register] Auth API error:', error);
    throw new Error('Authentication service unavailable');
  }
}
