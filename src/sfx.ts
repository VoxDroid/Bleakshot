export const SFX_URLS: Record<string, string> = {
  // Mixkit preview links (replace if you prefer other assets)
  fire: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-small-gunshot-1699.mp3',
  hit: 'https://assets.mixkit.co/sfx/preview/mixkit-impact-quick-1040.mp3',
  damage: 'https://assets.mixkit.co/sfx/preview/mixkit-player-being-hit-2045.mp3',
};

let audioCtx: AudioContext | null = null;
const buffers: Record<string, AudioBuffer | null> = {};
const audioEls: Record<string, HTMLAudioElement | null> = {};
let _preloaded = false;

function getAudioContext() {
  if (audioCtx) return audioCtx;
  const C = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!C) return null as any;
  audioCtx = new C();
  return audioCtx;
}

export async function preloadSfx() {
  if (_preloaded) return;
  const ctx = getAudioContext();
  const entries = Object.entries(SFX_URLS);
  await Promise.all(entries.map(async ([name, url]) => {
    try {
      if (!ctx) throw new Error('No AudioContext');
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('fetch failed');
      const ab = await res.arrayBuffer();
      try {
        const decoded = await ctx.decodeAudioData(ab);
        buffers[name] = decoded;
        return;
      } catch (e) {
        // fallthrough to audio element fallback
      }
    } catch (e) {
      // ignore and fallback
    }

    try {
      const a = new Audio(SFX_URLS[name]);
      a.preload = 'auto';
      // allow cross-origin if hosted elsewhere
      try { a.crossOrigin = 'anonymous'; } catch {}
      audioEls[name] = a;
    } catch (e) {
      // worst case: ignore
    }
  }));
  _preloaded = true;
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  // Trigger play/pause on HTMLAudio fallbacks to unlock
  Object.values(audioEls).forEach(a => {
    if (!a) return;
    const p = a.play();
    if (p && typeof (p as any).then === 'function') {
      (p as Promise<void>).then(() => { try { a.pause(); a.currentTime = 0; } catch {} }).catch(() => {});
    }
  });
}

export function playSfx(name: 'fire' | 'hit' | 'damage', volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const buf = buffers[name];
    if (ctx && buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = Math.max(0, Math.min(1, volume));
      src.connect(g);
      g.connect(ctx.destination);
      src.start();
      return;
    }
  } catch (e) {
    // fallback
  }

  const a = audioEls[name];
  if (a) {
    try {
      a.volume = Math.max(0, Math.min(1, volume));
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (e) {
      // noop
    }
    return;
  }

  // final fallback: ephemeral HTMLAudio
  const url = SFX_URLS[name];
  if (!url) return;
  try {
    const aa = new Audio(url);
    aa.volume = Math.max(0, Math.min(1, volume));
    aa.play().catch(() => {});
  } catch (e) {
    // noop
  }
}

export function setMasterVolume(v: number) {
  // placeholder for future master-gain support
}
