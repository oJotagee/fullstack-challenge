'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

import { useAuthStore } from '@/features/auth/auth-store';
import { exchangeCodeForTokens } from '@/lib/oidc-client';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((s) => s.setTokens);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      router.replace('/login');
      return;
    }

    exchangeCodeForTokens(code, state)
      .then((tokens) => {
        setTokens(tokens);
        router.replace('/');
      })
      .catch(() => {
        router.replace('/login?error=token_exchange_failed');
      });
  }, [searchParams, setTokens, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0F172A]">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div
          className="h-10 w-10 rounded-full border-2 border-[#22C55E]/20 border-t-[#22C55E] animate-spin"
          role="status"
          aria-label="Autenticando..."
        />
        <p className="text-sm text-white/40" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Autenticando...
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#0F172A]">
          <div className="h-10 w-10 rounded-full border-2 border-[#22C55E]/20 border-t-[#22C55E] animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
