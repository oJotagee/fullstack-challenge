export type AuthenticatedPlayer = {
  playerId: string;
  username: string;
  email?: string;
  roles: string[];
};