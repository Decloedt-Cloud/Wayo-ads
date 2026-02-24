import { userRepository } from '@/server/admin/repositories';
import { hashPassword } from '@/lib/password';

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

  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    throw new Error('User already exists');
  }

  const userRoles = role === 'ADVERTISER' ? 'USER,ADVERTISER' : 'USER,CREATOR';
  const hashedPassword = hashPassword(password);

  const user = await userRepository.create({
    email,
    name,
    password: hashedPassword,
    roles: userRoles,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
  };
}
