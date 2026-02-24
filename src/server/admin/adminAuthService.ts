import { userRepository } from './repositories';
import { isSuperAdmin } from '@/lib/roles';

export async function verifySuperAdmin(userId: string) {
  const user = await userRepository.findById(userId);

  if (!user || !isSuperAdmin(user.roles)) {
    return { error: 'Forbidden - Superadmin access required' };
  }

  return { success: true };
}
