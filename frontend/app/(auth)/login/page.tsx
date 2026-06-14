'use client';

import { useEffect } from 'react';

import { disconnectGameSocket } from '@/features/game/game-socket';
import { useGameStore } from '@/features/game/game-store';
import { startLoginFlow } from '@/lib/oidc-client';

export default function LoginPage() {
  useEffect(() => {
    disconnectGameSocket();
    useGameStore.getState().resetRound();
  }, []);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0F172A] px-3 py-6 sm:px-4">
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,197,94,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glow center */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-72 w-72 rounded-full bg-[#22C55E]/8 blur-[90px] sm:h-[500px] sm:w-[500px] sm:blur-[120px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        <div
          className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1F1829]/80 p-5 backdrop-blur-sm sm:p-8"
          style={{ boxShadow: '0 0 40px rgba(34,197,94,0.08), 0 25px 50px rgba(0,0,0,0.5)' }}
        >
          {/* Logo area */}
          <div className="mb-6 flex flex-col items-center gap-3 sm:mb-8">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 sm:h-16 sm:w-16"
              style={{ boxShadow: '0 0 20px rgba(34,197,94,0.2)' }}
            >
              {/* Rocket / chart up icon */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22C55E"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>

            <h1
              className="text-3xl font-black tracking-widest text-white sm:text-4xl"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 0 20px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.2)',
              }}
            >
              CRASH
            </h1>

            <p
              className="text-center text-xs text-white/40 sm:text-sm"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Aposte. Multiplique. Saque antes do crash.
            </p>
          </div>

          {/* Divider */}
          <div className="mb-6 h-px bg-gradient-to-r from-transparent via-[#22C55E]/30 to-transparent sm:mb-8" />

          {/* Login button */}
          <button
            type="button"
            onClick={() => void startLoginFlow()}
            className="group relative w-full overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold text-black transition-all duration-200 active:scale-[0.98] sm:px-6"
            style={{
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              boxShadow: '0 0 20px rgba(34,197,94,0.35), 0 4px 12px rgba(0,0,0,0.3)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {/* Key icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              Entrar com Keycloak
            </span>
            {/* Hover shimmer */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </button>

          {/* Footer note */}
          <p
            className="mt-6 text-center text-xs text-white/20"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            Jungle Gaming © 2025
          </p>
        </div>
      </div>
    </div>
  );
}
