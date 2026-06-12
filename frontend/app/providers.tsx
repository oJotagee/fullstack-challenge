'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClientProvider = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClientProvider}>{children}</QueryClientProvider>;
}
