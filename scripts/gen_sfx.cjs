const fs = require('fs');
const path = require('path');

fs.mkdirSync(path.join(__dirname, '..', 'public', 'sfx'), { recursive: true });

function writeWav(file, samples, sampleRate = 44100) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1Size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byteRate
  buffer.writeUInt16LE(2, 32); // blockAlign
  buffer.writeUInt16LE(16, 34); // bitsPerSample
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  // samples
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buffer);
}

function genNoiseBurst(sampleRate, dur, amp = 0.9) {
  const len = Math.floor(sampleRate * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const env = Math.pow(1 - i / len, 4);
    out[i] = (Math.random() * 2 - 1) * env * amp;
  }
  return out;
}

function genHit(sampleRate) {
  const dur = 0.08;
  const len = Math.floor(sampleRate * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-40 * t);
    const sine = Math.sin(2 * Math.PI * 1200 * t) * env;
    const noise = (Math.random() * 2 - 1) * env * 0.2;
    out[i] = sine + noise;
  }
  return out;
}

function genDamage(sampleRate) {
  const dur = 0.28;
  const len = Math.floor(sampleRate * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-6 * t);
    const sine = Math.sin(2 * Math.PI * 120 * t) * env * 0.9;
    const noise = (Math.random() * 2 - 1) * env * 0.12;
    out[i] = sine + noise;
  }
  return out;
}

function genReload(sampleRate) {
  const dur = 0.9;
  const len = Math.floor(sampleRate * dur);
  const out = new Float32Array(len);
  const white = new Float32Array(len);
  for (let i = 0; i < len; i++) white[i] = (Math.random() * 2 - 1);

  // timings
  const tRelease = 0.03;
  const tSlide = 0.12;
  const slideDur = 0.26;
  const tMag = 0.44;
  const tBolt = 0.72;

  // modal partials tuned toward realistic metallic timbre (less sci-fi)
  const modes = [
    { f: 900, decay: 6, amp: 0.28 },
    { f: 1400, decay: 7.5, amp: 0.22 },
    { f: 2000, decay: 9, amp: 0.16 },
    { f: 2800, decay: 11, amp: 0.12 }
  ];

  // low body modes for thump
  const lowModes = [
    { f: 90, decay: 3.5, amp: 0.9 },
    { f: 160, decay: 4, amp: 0.5 }
  ];

  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    let v = 0;

    // small metallic contact on release (bandpassed noise + gentle modal excite)
    const dtR = t - tRelease;
    if (dtR >= 0 && dtR < 0.12) {
      const env = Math.exp(-80 * dtR);
      v += white[i] * 0.08 * env; // texture
      for (let m of modes) {
        v += Math.sin(2 * Math.PI * m.f * dtR + (i % 61) * 0.0003) * Math.exp(-m.decay * dtR) * (m.amp * 0.6) * env;
      }
    }

    // scraping/slide friction (noisy, low amplitude)
    if (t >= tSlide && t < tSlide + slideDur) {
      const tt = (t - tSlide) / slideDur;
      const env = Math.exp(-6 * tt);
      const sweep = 1200 + (1 - tt) * 900; // 2100 -> 1200
      v += Math.sin(2 * Math.PI * sweep * t) * env * 0.18;
      v += white[i] * 0.12 * (1 - tt) * Math.exp(-3 * tt);
    }

    // magazine insertion thump (low, punchy)
    const dtM = t - tMag;
    if (dtM >= 0 && dtM < 0.28) {
      const env = Math.exp(-5 * dtM);
      for (let lm of lowModes) {
        v += Math.sin(2 * Math.PI * lm.f * dtM) * Math.exp(-lm.decay * dtM) * (lm.amp * 0.72) * env;
      }
      v += white[i] * 0.03 * Math.exp(-14 * dtM);
    }

    // bolt catch: short click and excite higher metal modes but muted
    const dtB = t - tBolt;
    if (dtB >= 0 && dtB < 0.12) {
      const env = Math.exp(-200 * dtB);
      v += Math.sin(2 * Math.PI * 2600 * dtB) * env * 0.45;
      v += white[i] * 0.015 * env;
    }

    // sustain gentle metallic ringing after bolt
    if (dtB >= 0) {
      for (let m of modes) {
        v += Math.sin(2 * Math.PI * m.f * dtB) * Math.exp(-m.decay * dtB) * (m.amp * 0.5);
      }
    }

    out[i] = v;
  }

  // subtle short metallic reflections
  const delays = [Math.floor(0.018 * sampleRate), Math.floor(0.042 * sampleRate)];
  const gains = [0.22, 0.10];
  for (let di = 0; di < delays.length; di++) {
    const d = delays[di];
    const g = gains[di];
    for (let i = d; i < len; i++) out[i] += out[i - d] * g;
  }

  // mild low-pass filtering (simple one-pole) to tame harsh highs
  let prev = 0;
  const cutoff = 8000;
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  for (let i = 0; i < len; i++) {
    prev = prev + alpha * (out[i] - prev);
    out[i] = prev;
  }

  // normalize
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 1e-6) {
    const norm = 0.92 / peak;
    for (let i = 0; i < len; i++) out[i] *= norm;
  }
  return out;
}

const sr = 44100;

function genFireVariant(sampleRate, idx) {
  const paramsList = [
    { dur: 0.12, hf: 3200, lf: 120, noiseAmp: 0.7, lowAmp: 0.25 }, // pistol
    { dur: 0.16, hf: 2600, lf: 140, noiseAmp: 0.8, lowAmp: 0.38 }, // AR
    { dur: 0.18, hf: 1800, lf: 80,  noiseAmp: 0.55, lowAmp: 1.0  }, // shotgun
    { dur: 0.20, hf: 3000, lf: 60,  noiseAmp: 0.45, lowAmp: 1.2  }, // sniper
    { dur: 0.10, hf: 4200, lf: 90,  noiseAmp: 0.9, lowAmp: 0.18 }  // SMG
  ];
  const p = paramsList[idx] || paramsList[0];
  const len = Math.max(64, Math.floor(sampleRate * p.dur));
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-8 * t * (1 / p.dur));
    const noise = (Math.random() * 2 - 1) * p.noiseAmp;
    const hf = Math.sin(2 * Math.PI * p.hf * t) * Math.exp(-6 * t) * 0.6;
    const lf = Math.sin(2 * Math.PI * p.lf * t) * Math.exp(-3 * t) * p.lowAmp;
    out[i] = (noise + hf + lf) * env;
  }
  // normalize
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 1e-6) {
    const norm = 0.95 / peak;
    for (let i = 0; i < len; i++) out[i] *= norm;
  }
  return out;
}

function genReloadVariant(sampleRate, idx) {
  // base metallic reload with small per-weapon variations
  const kind = ['pistol','ar','shotgun','sniper','smg'][idx] || 'pistol';
  const dur = kind === 'sniper' ? 0.95 : (kind === 'shotgun' ? 0.8 : 0.7);
  const len = Math.floor(sampleRate * dur);
  const out = new Float32Array(len);
  const white = new Float32Array(len);
  for (let i = 0; i < len; i++) white[i] = (Math.random() * 2 - 1);

  // modal partials
  const modes = [
    { f: 900, decay: 6, amp: 0.28 },
    { f: 1400, decay: 7.5, amp: 0.22 },
    { f: 2000, decay: 9, amp: 0.16 },
    { f: 2800, decay: 11, amp: 0.12 }
  ];

  const lowModes = [
    { f: 90, decay: 3.5, amp: 0.9 },
    { f: 160, decay: 4, amp: 0.5 }
  ];

  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    let v = 0;

    // small contact
    const dtR = t - 0.03;
    if (dtR >= 0 && dtR < 0.12) {
      const env = Math.exp(-80 * dtR);
      v += white[i] * 0.06 * env * (kind === 'smg' ? 0.7 : 1.0);
      for (let m of modes) {
        v += Math.sin(2 * Math.PI * m.f * dtR + (i % 61) * 0.0003) * Math.exp(-m.decay * dtR) * (m.amp * 0.6);
      }
    }

    // slide friction
    if (t >= 0.12 && t < 0.12 + 0.26) {
      const tt = (t - 0.12) / 0.26;
      const env = Math.exp(-6 * tt);
      const sweep = 1200 + (1 - tt) * 900;
      v += Math.sin(2 * Math.PI * sweep * t) * env * 0.15 * (kind === 'sniper' ? 1.1 : 1.0);
      v += white[i] * 0.12 * (1 - tt) * Math.exp(-3 * tt);
    }

    // mag insertion thump
    const dtM = t - (kind === 'shotgun' ? 0.42 : 0.44);
    if (dtM >= 0 && dtM < 0.28) {
      const env = Math.exp(-5 * dtM);
      for (let lm of lowModes) {
        v += Math.sin(2 * Math.PI * lm.f * dtM) * Math.exp(-lm.decay * dtM) * (lm.amp * 0.72) * env * (kind === 'shotgun' ? 1.2 : 1.0);
      }
      v += white[i] * 0.03 * Math.exp(-14 * dtM);
    }

    // bolt catch
    const dtB = t - (kind === 'sniper' ? 0.78 : 0.72);
    if (dtB >= 0 && dtB < 0.12) {
      const env = Math.exp(-200 * dtB);
      v += Math.sin(2 * Math.PI * 2600 * dtB) * env * (kind === 'sniper' ? 0.6 : 0.45);
      v += white[i] * 0.015 * env;
    }

    // ringing
    if (dtB >= 0) {
      for (let m of modes) {
        v += Math.sin(2 * Math.PI * m.f * dtB) * Math.exp(-m.decay * dtB) * (m.amp * 0.5);
      }
    }

    out[i] = v;
  }

  // reflections and light LP filtering
  const delays = [Math.floor(0.018 * sampleRate), Math.floor(0.042 * sampleRate)];
  const gains = [0.18, 0.08];
  for (let di = 0; di < delays.length; di++) {
    const d = delays[di];
    const g = gains[di];
    for (let i = d; i < len; i++) out[i] += out[i - d] * g;
  }

  let prev = 0;
  const cutoff = 9000;
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  for (let i = 0; i < len; i++) {
    prev = prev + alpha * (out[i] - prev);
    out[i] = prev;
  }

  // normalize
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 1e-6) {
    const norm = 0.9 / peak;
    for (let i = 0; i < len; i++) out[i] *= norm;
  }
  return out;
}

// write variants
for (let i = 0; i < 5; i++) {
  writeWav(path.join(__dirname, '..', 'public', 'sfx', `fire${i}.wav`), genFireVariant(sr, i), sr);
  writeWav(path.join(__dirname, '..', 'public', 'sfx', `reload${i}.wav`), genReloadVariant(sr, i), sr);
}
// legacy names for compatibility
writeWav(path.join(__dirname, '..', 'public', 'sfx', 'fire.wav'), genFireVariant(sr, 0), sr);
writeWav(path.join(__dirname, '..', 'public', 'sfx', 'reload.wav'), genReloadVariant(sr, 0), sr);
writeWav(path.join(__dirname, '..', 'public', 'sfx', 'hit.wav'), genHit(sr), sr);
writeWav(path.join(__dirname, '..', 'public', 'sfx', 'damage.wav'), genDamage(sr), sr);

console.log('WAV sfx variants generated in public/sfx');
