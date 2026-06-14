'use client';

import { GamePage } from '@/features/game/game-page';
import { ProtectedRoute } from '@/features/auth/protected-route';

export default function Home() {
  return (
    <ProtectedRoute>
      <GamePage />
    </ProtectedRoute>
  );
}
