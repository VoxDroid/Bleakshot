export const SFX_URLS: Record<string, string> = {
  // Default/legacy names
  fire: '/sfx/fire0.wav',
  reload: '/sfx/reload0.wav',
  // Per-weapon fire SFX: fire0..fire4 (Pistol, AR, Shotgun, Sniper, SMG)
  fire0: '/sfx/fire0.wav',
  fire1: '/sfx/fire1.wav',
  fire2: '/sfx/fire2.wav',
  fire3: '/sfx/fire3.wav',
  fire4: '/sfx/fire4.wav',
  // Per-weapon reloads
  reload0: '/sfx/reload0.wav',
  reload1: '/sfx/reload1.wav',
  reload2: '/sfx/reload2.wav',
  reload3: '/sfx/reload3.wav',
  reload4: '/sfx/reload4.wav',
  // Hit and damage
  hit: '/sfx/hit.wav',
  damage: '/sfx/damage.wav',
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

  const noiseArray = (len: number) => {
    const a = new Float32Array(len);
    for (let i = 0; i < len; i++) a[i] = Math.random() * 2 - 1;
    return a;
  };

  // Fire variants (fire0..fire4)
  const fireMatch = name.match(/^fire(\d+)$/);
  if (fireMatch || name === 'fire') {
    const idx = fireMatch ? parseInt(fireMatch[1], 10) : 0;
    const params = [
      { dur: 0.12, hf: 3200, lf: 120, noiseAmp: 0.7, lowAmp: 0.25 }, // pistol
      { dur: 0.16, hf: 2600, lf: 140, noiseAmp: 0.8, lowAmp: 0.38 }, // AR
      { dur: 0.18, hf: 1800, lf: 80,  noiseAmp: 0.55, lowAmp: 1.0  }, // shotgun
      { dur: 0.20, hf: 3000, lf: 60,  noiseAmp: 0.45, lowAmp: 1.2  }, // sniper
      { dur: 0.10, hf: 4200, lf: 90,  noiseAmp: 0.9, lowAmp: 0.18 }  // SMG
    ][idx] || { dur: 0.12, hf: 3200, lf: 120, noiseAmp: 0.7, lowAmp: 0.25 };

    const dur = params.dur;
    const len = Math.max(64, Math.floor(sr * dur));
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const n = noiseArray(len);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-8 * t * (1 / dur));
      const hf = Math.sin(2 * Math.PI * params.hf * t) * Math.exp(-6 * t) * 0.6;
      const lf = Math.sin(2 * Math.PI * params.lf * t) * Math.exp(-3 * t) * params.lowAmp;
      d[i] = (n[i] * params.noiseAmp + hf + lf) * env;
    }
    return buf;
  }

  // Reload variants reload0..reload4
  const reloadMatch = name.match(/^reload(\d+)$/);
  if (reloadMatch || name === 'reload') {
    const idx = reloadMatch ? parseInt(reloadMatch[1], 10) : 0;
    const kind = ['pistol', 'ar', 'shotgun', 'sniper', 'smg'][idx] || 'pistol';
    const dur = 0.7;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const n = noiseArray(len);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let v = 0;
      v += Math.sin(2 * Math.PI * 90 * t) * Math.exp(-2 * t) * 0.4; // body

      if (kind === 'pistol') {
        const clickEnv = Math.exp(-80 * Math.max(0, t - 0.04));
        v += Math.sin(2 * Math.PI * 3000 * t) * clickEnv * 0.25;
        v += n[i] * 0.02 * Math.exp(-6 * t);
      } else if (kind === 'ar') {
        v += n[i] * 0.06 * Math.exp(-4 * t);
        const mag = Math.exp(-6 * Math.abs(t - 0.42));
        v += Math.sin(2 * Math.PI * 160 * t) * mag * 0.9;
      } else if (kind === 'shotgun') {
        v += Math.sin(2 * Math.PI * 120 * t) * Math.exp(-3 * t) * 0.9;
        if (t > 0.2 && t < 0.5) v += n[i] * 0.04 * Math.exp(-4 * (t - 0.2));
      } else if (kind === 'sniper') {
        const boltEnv = Math.exp(-6 * Math.max(0, t - 0.58));
        v += Math.sin(2 * Math.PI * 420 * t) * boltEnv * 0.9;
        v += Math.sin(2 * Math.PI * 1600 * t) * Math.exp(-12 * t) * 0.25;
      } else if (kind === 'smg') {
        v += n[i] * 0.03 * Math.exp(-6 * t);
        v += Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-12 * t) * 0.22;
      }

      d[i] = v;
    }
    return buf;
  }

  // hit
  if (name === 'hit') {
    const dur = 0.08;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-40 * t);
      const sine = Math.sin(2 * Math.PI * 1200 * t) * env;
      const noiseVal = (Math.random() * 2 - 1) * env * 0.2;
      d[i] = sine + noiseVal;
    }
    return buf;
  }

  // damage / fallback
  if (name === 'damage') {
    const dur = 0.28;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-6 * t);
      const sine = Math.sin(2 * Math.PI * 120 * t) * env * 0.9;
      const noiseVal = (Math.random() * 2 - 1) * env * 0.12;
      d[i] = sine + noiseVal;
    }
    return buf;
  }

  return null as any;
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

export function playSfx(name: string, volume = 0.8) {
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
