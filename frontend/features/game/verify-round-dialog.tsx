'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { verifyRound, type VerifyRoundResponse } from './game-api';

interface VerifyRoundDialogProps {
  roundId: string;
  open: boolean;
  onClose: () => void;
}

export function VerifyRoundDialog({ roundId, open, onClose }: VerifyRoundDialogProps) {
  const [data, setData] = useState<VerifyRoundResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (data) return;
    setLoading(true);
    try {
      const result = await verifyRound(roundId);
      setData(result);
    } catch {
      toast.error('Erro ao carregar dados de verificação');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) void load();
    else onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] overflow-y-auto border-white/[0.08] bg-[#0F0F23] text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle
            className="text-sm font-bold tracking-widest text-[#22C55E]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            VERIFICAÇÃO PROVABLY FAIR
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 rounded-full border-2 border-[#22C55E]/20 border-t-[#22C55E] animate-spin" />
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-4 font-mono text-xs">
            <Field label="ROUND ID" value={data.roundId} />
            <Field label="SERVER SEED" value={data.serverSeed} copyable />
            <Field label="SERVER SEED HASH (SHA-256)" value={data.serverSeedHash} copyable />
            <Field label="CLIENT SEED" value={data.clientSeed} copyable />
            <Field label="NONCE" value={String(data.nonce)} />
            <Field label="CRASH POINT" value={`${data.crashPoint}x`} highlight />

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 leading-relaxed text-white/40">
              <p className="font-bold text-white/60 mb-1">Como verificar:</p>
              <p className="overflow-x-auto">
                <code className="whitespace-nowrap text-[#22C55E]/70">
                  HMAC-SHA256(serverSeed, &quot;{data.clientSeed}:{data.nonce}&quot;)
                </code>
              </p>
              <p className="mt-1">
                Pegue os primeiros 13 caracteres hex do resultado, converta para número e aplique:
              </p>
              <p className="mt-1 overflow-x-auto">
                <code className="whitespace-nowrap text-[#22C55E]/70">
                  result = 0.99 / max(1 - (value / 0x1fffffffffffff), 0.000001)
                </code>
              </p>
              <p className="mt-1 overflow-x-auto">
                <code className="whitespace-nowrap text-[#22C55E]/70">
                  crashPoint = max(1, floor(result × 100) / 100)
                </code>
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  copyable,
  highlight,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  highlight?: boolean;
}) {
  function copy() {
    void navigator.clipboard.writeText(value);
    toast.success('Copiado!');
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-white/30 tracking-widest">{label}</span>
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={`min-w-0 break-all font-mono text-xs ${highlight ? 'text-sm font-bold text-[#22C55E]' : 'text-white/70'}`}
          style={highlight ? { textShadow: '0 0 10px rgba(34,197,94,0.4)' } : undefined}
        >
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded p-1 text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors cursor-pointer"
            aria-label={`Copiar ${label}`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
