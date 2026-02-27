'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

/**
 * Déconnexion automatique (compte supprimé ou session invalide).
 * Redirige vers la page de connexion sans afficher l'URL signout.
 */
export default function SessionExpiredPage() {
  useEffect(() => {
    signOut({ callbackUrl: '/auth/signin', redirect: true });
  }, []);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#F47A1F]" />
        <p className="text-sm text-gray-500">Déconnexion...</p>
      </div>
    </div>
  );
}
