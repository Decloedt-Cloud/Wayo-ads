import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Vérifie si l'utilisateur existe encore (session valide).
 * Le callback session invalide déjà si le compte a été supprimé.
 * Utilisé par le middleware pour déconnecter immédiatement.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  return NextResponse.json({ exists: !!session?.user?.id });
}
