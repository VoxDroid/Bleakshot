export const SFX_URLS: Record<string, string> = {
  // Local fallback assets served from /public/sfx
  fire: '/sfx/fire.wav',
  hit: '/sfx/hit.wav',
  damage: '/sfx/damage.wav',
  reload: '/sfx/reload.wav',
};
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const buffers: Record<string, AudioBuffer | null> = {};
const audioEls: Record<string, HTMLAudioElement | null> = {};
let _preloaded = false;

function getAudioContext() {
  if (audioCtx) return audioCtx;
  const C = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!C) return null as any;
  audioCtx = new C();
  try {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioCtx.destination);
  } catch (e) {
    masterGain = null;
  }
  return audioCtx;
}

function generateFallbackBuffer(ctx: AudioContext, name: string) {
  const sr = ctx.sampleRate;
  if (name === 'fire') {
    const dur = 0.12;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 4);
      d[i] = (Math.random() * 2 - 1) * env * 0.9;
    }
    return buf;
  }

  if (name === 'hit') {
    const dur = 0.08;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-40 * t);
      const sine = Math.sin(2 * Math.PI * 1200 * t) * env;
      const noise = (Math.random() * 2 - 1) * env * 0.2;
      d[i] = sine + noise;
    }
    return buf;
  }
  if (name === 'reload') {
    const dur = 0.9;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let v = 0;
      // small metallic clack early (magazine release)
      const clackCenter = 0.08;
      const clackEnv = Math.exp(-120 * Math.pow(t - clackCenter, 2));
      v += clackEnv * ((Math.random() * 2 - 1) * 0.8 + Math.sin(2 * Math.PI * 2800 * (t - clackCenter)) * 0.3);

      // slide/back sound (chirp from hi->mid)
      if (t > 0.12 && t < 0.36) {
        const tt = (t - 0.12) / (0.36 - 0.12);
        const freq = 1800 - tt * 1200; // 1800 -> 600
        v += Math.sin(2 * Math.PI * freq * t) * Math.exp(-8 * tt) * 0.6;
        v += (Math.random() * 2 - 1) * 0.12 * Math.exp(-4 * tt);
      }

      // magazine insert thump
      const thumpCenter = 0.48;
      const thumpEnv = Math.exp(-60 * Math.pow(t - thumpCenter, 2));
      v += thumpEnv * Math.sin(2 * Math.PI * 120 * t) * 0.9;

      // bolt click at the end
      const boltCenter = 0.72;
      const boltEnv = Math.exp(-200 * Math.pow(t - boltCenter, 2));
      v += boltEnv * ((Math.random() * 2 - 1) * 0.4 + Math.sin(2 * Math.PI * 2400 * (t - boltCenter)) * 0.2);

      // gentle global decay
      const masterEnv = 1 - t / dur;
      d[i] = v * masterEnv * 0.9;
    }
    return buf;
  }

  // damage / fallback
  const dur = 0.28;
  const len = Math.floor(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.exp(-6 * t);
    const sine = Math.sin(2 * Math.PI * 120 * t) * env * 0.9;
    const noise = (Math.random() * 2 - 1) * env * 0.12;
    d[i] = sine + noise;
  }
  return buf;
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
      try { a.crossOrigin = 'anonymous'; } catch {}
      audioEls[name] = a;
    } catch (e) {
      // worst case: ignore
    }
  }));

  // For any missing decoded buffers, generate a quick synthesized buffer so playback never fails
  if (ctx) {
    for (const name of Object.keys(SFX_URLS)) {
      if (!buffers[name]) {
        try {
          buffers[name] = generateFallbackBuffer(ctx, name);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  _preloaded = true;
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  Object.values(audioEls).forEach(a => {
    if (!a) return;
    const p = a.play();
    if (p && typeof (p as any).then === 'function') {
      (p as Promise<void>).then(() => { try { a.pause(); a.currentTime = 0; } catch {} }).catch(() => {});
    }
  });
}

export function playSfx(name: 'fire' | 'hit' | 'damage' | 'reload', volume = 0.8) {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      let buf = buffers[name];
      if (!buf) {
        try { buf = generateFallbackBuffer(ctx, name); buffers[name] = buf; } catch (e) { buf = null as any; }
      }
      if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = Math.max(0, Math.min(1, volume));
        src.connect(g);
        if (masterGain) g.connect(masterGain); else g.connect(ctx.destination);
        src.start();
        return;
      }
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
  const ctx = getAudioContext();
  if (masterGain) {
    masterGain.gain.value = Math.max(0, Math.min(1, v));
  }
}
