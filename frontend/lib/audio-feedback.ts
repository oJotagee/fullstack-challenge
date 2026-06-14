'use client';

type Tone = {
  frequency: number;
  durationMs: number;
  gain: number;
  type?: OscillatorType;
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  audioContext ??= new AudioContextClass();

  return audioContext;
}

export function unlockAudioFeedback(): void {
  const context = getAudioContext();

  if (!context || context.state !== 'suspended') {
    return;
  }

  void context.resume().catch(() => {});
}

export function playBetSound(): void {
  playSequence([
    { frequency: 420, durationMs: 70, gain: 0.04 },
    { frequency: 620, durationMs: 90, gain: 0.05 },
  ]);
}

export function playCashOutSound(): void {
  playSequence([
    { frequency: 660, durationMs: 80, gain: 0.05 },
    { frequency: 880, durationMs: 90, gain: 0.055 },
    { frequency: 1180, durationMs: 120, gain: 0.05 },
  ]);
}

export function playCrashSound(): void {
  playSequence([
    { frequency: 180, durationMs: 140, gain: 0.07, type: 'sawtooth' },
    { frequency: 92, durationMs: 220, gain: 0.06, type: 'sawtooth' },
  ]);
}

function playSequence(tones: Tone[]): void {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  void context.resume().catch(() => {});

  let startsAt = context.currentTime;

  for (const tone of tones) {
    playTone(context, tone, startsAt);
    startsAt += tone.durationMs / 1000;
  }
}

function playTone(context: AudioContext, tone: Tone, startsAt: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const duration = tone.durationMs / 1000;

  oscillator.type = tone.type ?? 'triangle';
  oscillator.frequency.setValueAtTime(tone.frequency, startsAt);

  gain.gain.setValueAtTime(0, startsAt);
  gain.gain.linearRampToValueAtTime(tone.gain, startsAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
