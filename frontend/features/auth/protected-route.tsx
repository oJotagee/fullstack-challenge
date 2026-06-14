'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { disconnectGameSocket } from '@/features/game/game-socket';
import { useGameStore } from '@/features/game/game-store';

import { useAuthStore } from './auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectGameSocket();
      useGameStore.getState().resetRound();
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0F172A]">
        <div
          className="h-10 w-10 rounded-full border-2 border-[#22C55E]/20 border-t-[#22C55E] animate-spin"
          role="status"
          aria-label="Carregando..."
        />
      </div>
    );
  }

  return <>{children}</>;
}
