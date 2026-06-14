'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#1F1829',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
