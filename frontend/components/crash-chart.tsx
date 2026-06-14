'use client';

import { useEffect, useRef } from 'react';

import { useGameStore } from '@/features/game/game-store';

function getPadding(width: number) {
  if (width < 520) {
    return { top: 18, right: 12, bottom: 28, left: 34 };
  }

  return { top: 24, right: 24, bottom: 40, left: 56 };
}

function getColor(phase: string) {
  if (phase === 'CRASHED') return '#EF4444';
  return '#22C55E';
}

export function CrashChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const currentRound = useGameStore((s) => s.currentRound);

  // History of multiplier values to draw the curve
  const historyRef = useRef<number[]>([1]);

  useEffect(() => {
    if (phase === 'BETTING' || phase === 'IDLE') {
      historyRef.current = [1];
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'RUNNING') {
      historyRef.current.push(multiplier);
      if (historyRef.current.length > 600) historyRef.current.shift();
    }
    if (phase === 'CRASHED') {
      historyRef.current.push(multiplier);
    }
  }, [multiplier, phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;

    function draw() {
      const ctx = canvas!.getContext('2d');
      if (!ctx) return;

      const W = canvas!.width;
      const H = canvas!.height;
      const padding = getPadding(W);
      const pw = W - padding.left - padding.right;
      const ph = H - padding.top - padding.bottom;

      ctx.clearRect(0, 0, W, H);

      const history = historyRef.current;
      const maxMult = Math.max(...history, 2);
      const color = getColor(phase);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      const gridLines = [1, 2, 5, 10, 20, 50, 100];
      for (const val of gridLines) {
        if (val > maxMult * 1.1) break;
        const y = padding.top + ph - (ph * (val - 1)) / (maxMult - 1);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + pw, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = W < 520 ? '9px JetBrains Mono, monospace' : '10px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${val.toFixed(0)}x`, padding.left - 6, y + 4);
      }

      if (history.length < 2) {
        animId = requestAnimationFrame(draw);
        return;
      }

      // Curve
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.lineJoin = 'round';

      for (let i = 0; i < history.length; i++) {
        const x = padding.left + (pw * i) / (history.length - 1);
        const y = padding.top + ph - (ph * (history[i] - 1)) / Math.max(maxMult - 1, 1);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Fill under curve
      const lastX = padding.left + pw;
      const baseY = padding.top + ph;
      ctx.lineTo(lastX, baseY);
      ctx.lineTo(padding.left, baseY);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + ph);
      gradient.addColorStop(0, `${color}33`);
      gradient.addColorStop(1, `${color}00`);
      ctx.fillStyle = gradient;
      ctx.fill();

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [phase, multiplier]);

  const isBetting = phase === 'BETTING' || phase === 'IDLE';
  const isCrashed = phase === 'CRASHED';

  return (
    <div className="relative flex flex-col h-full w-full rounded-xl border border-white/[0.08] bg-[#0F0F23] overflow-hidden">
      {/* Seed hash bar */}
      {currentRound?.serverSeedHash && (
        <div className="flex min-w-0 items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2 sm:px-4">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22C55E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span
            className="min-w-0 truncate font-mono text-[9px] text-white/30 sm:text-[10px]"
            title={currentRound.serverSeedHash}
          >
            hash: {currentRound.serverSeedHash}
          </span>
          {isCrashed && currentRound.serverSeed && (
            <span
              className="ml-1 min-w-0 truncate font-mono text-[9px] text-[#22C55E]/70 sm:ml-2 sm:text-[10px]"
              title={currentRound.serverSeed}
            >
              seed: {currentRound.serverSeed}
            </span>
          )}
        </div>
      )}

      {/* Main canvas area */}
      <div className="relative flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full"
          aria-label={`Multiplicador atual: ${multiplier.toFixed(2)}x`}
        />

        {/* Multiplier overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          {isBetting ? (
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-center text-3xl font-black tracking-widest text-white/20 min-[420px]:text-4xl sm:text-5xl"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                APOSTAS
              </span>
              <span className="font-mono text-xs text-white/30 sm:text-sm">
                aguardando início...
              </span>
            </div>
          ) : (
            <span
              className="max-w-full px-3 text-center text-4xl font-black tracking-widest drop-shadow-lg transition-all duration-75 sm:text-6xl"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                color: isCrashed ? '#EF4444' : '#22C55E',
                textShadow: isCrashed
                  ? '0 0 30px rgba(239,68,68,0.7)'
                  : '0 0 30px rgba(34,197,94,0.7)',
              }}
            >
              {isCrashed
                ? `${currentRound?.crashPoint ?? multiplier.toFixed(2)}x`
                : `${multiplier.toFixed(2)}x`}
            </span>
          )}
          {isCrashed && (
            <span
              className="mt-2 text-base font-bold text-[#EF4444] sm:text-xl"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 0 15px rgba(239,68,68,0.5)',
              }}
            >
              CRASHED!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
