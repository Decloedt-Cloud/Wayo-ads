import { db } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures');
const MAX_IMAGE_SIZE = 500 * 1024;

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  roles: string;
  createdAt: Date;
}

async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function saveImage(base64Data: string, userId: string): Promise<string> {
  await ensureUploadDir();
  
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image format');
  }
  
  const ext = matches[1];
  const data = matches[2];
  const buffer = Buffer.from(data, 'base64');
  
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE / 1024}KB`);
  }
  
  const filename = `${userId}-${Date.now()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  await fs.writeFile(filepath, buffer);
  
  return `/uploads/profile-pictures/${filename}`;
}

export async function deleteImage(imagePath: string): Promise<void> {
  try {
    const filepath = path.join(process.cwd(), 'public', imagePath);
    await fs.unlink(filepath);
  } catch {
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      roles: true,
      createdAt: true,
    },
  });
}

export interface UpdateProfileInput {
  name?: string;
  image?: string | null;
  removeImage?: boolean;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<UserProfile> {
  const { name, image, removeImage } = input;

  const updateData: { name?: string | null; image?: string | null } = {};

  if (name !== undefined) {
    updateData.name = name.trim() || null;
  }

  if (removeImage) {
    const currentUser = await db.user.findUnique({ where: { id: userId } });
    if (currentUser?.image) {
      await deleteImage(currentUser.image);
    }
    updateData.image = null;
  } else if (image !== undefined && image !== null) {
    if (typeof image !== 'string') {
      throw new Error('Invalid image format');
    }

    if (image.startsWith('data:image/')) {
      const imagePath = await saveImage(image, userId);
      
      const currentUser = await db.user.findUnique({ where: { id: userId } });
      if (currentUser?.image) {
        await deleteImage(currentUser.image);
      }
      
      updateData.image = imagePath;
    } else if (image === '') {
      updateData.image = null;
    } else {
      throw new Error('Invalid image format. Must be a data URL.');
    }
  }

  return db.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      roles: true,
      createdAt: true,
    },
  });
}

export type UserRole = 'ADVERTISER' | 'CREATOR';

function parseRoles(rolesString: string): string[] {
  if (!rolesString) return [];
  return rolesString.split(',').map(r => r.trim()).filter(Boolean);
}

export async function grantUserRole(userId: string, role: UserRole): Promise<string[]> {
  const currentUser = await db.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser) {
    throw new Error('User not found');
  }

  const roles = parseRoles(currentUser.roles);
  
  if (!roles.includes(role)) {
    roles.push(role);
    await db.user.update({
      where: { id: userId },
      data: { roles: roles.join(',') },
    });
  }

  return roles;
}

export async function completeOnboarding(userId: string, userType: 'advertiser' | 'creator'): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const roles = user.roles || '';
  
  if (userType === 'advertiser' && !roles.includes('ADVERTISER')) {
    throw new Error('User is not an advertiser');
  }

  if (userType === 'creator' && !roles.includes('CREATOR')) {
    throw new Error('User is not a creator');
  }

  await db.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true },
  });
}

export async function getOnboardingStatus(userId: string, userType: 'advertiser' | 'creator'): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { 
      onboardingCompleted: true,
      roles: true,
    },
  });

  if (!user) {
    return false;
  }

  const roles = user.roles || '';

  if (userType === 'advertiser' && roles.includes('ADVERTISER')) {
    return user.onboardingCompleted ?? false;
  } else if (userType === 'creator' && roles.includes('CREATOR')) {
    return user.onboardingCompleted ?? false;
  }

  return false;
}

export interface TrustScoreInfo {
  trustScore: number;
  rawTrustScore: number;
  tier: string | null;
  qualityMultiplier: number;
  rawQualityMultiplier: number;
  verificationLevel: string | null;
  isVerified: boolean;
  potentialCpmIncrease: string | null;
}

export async function getCreatorTrustScore(userId: string): Promise<TrustScoreInfo | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      trustScore: true,
      tier: true,
      qualityMultiplier: true,
      verificationLevel: true,
    },
  });

  if (!user) {
    return null;
  }

  const isVerified = user.verificationLevel === 'YOUTUBE_VERIFIED';
  const effectiveTrustScore = isVerified 
    ? user.trustScore 
    : Math.min(Math.round(user.trustScore * 0.75), 70);
  const effectiveMultiplier = isVerified
    ? user.qualityMultiplier
    : Math.round(user.qualityMultiplier * 0.85 * 100) / 100;
  const multiplierDifference = user.qualityMultiplier - effectiveMultiplier;

  return {
    trustScore: effectiveTrustScore,
    rawTrustScore: user.trustScore,
    tier: user.tier,
    qualityMultiplier: effectiveMultiplier,
    rawQualityMultiplier: user.qualityMultiplier,
    verificationLevel: user.verificationLevel,
    isVerified,
    potentialCpmIncrease: multiplierDifference > 0 
      ? `+${Math.round(multiplierDifference * 100)}%` 
      : null,
  };
}
