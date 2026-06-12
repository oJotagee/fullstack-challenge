import type { AuthenticatedPlayer } from '@crash/shared/auth';

export type { AuthenticatedPlayer };

export type AuthenticatedRequest = {
  user: AuthenticatedPlayer;
};
