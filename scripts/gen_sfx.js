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
  const dur = 0.32;
  const len = Math.floor(sampleRate * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-12 * t);
    const click = (Math.random() * 2 - 1) * Math.pow(1 - t / dur, 3) * 0.6;
    const thump = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-8 * t) * 0.6;
    out[i] = (click + thump) * env;
  }
  return out;
}

const sr = 44100;
writeWav(path.join(__dirname, '..', 'public', 'sfx', 'fire.wav'), genNoiseBurst(sr, 0.12, 0.9), sr);
writeWav(path.join(__dirname, '..', 'public', 'sfx', 'hit.wav'), genHit(sr), sr);
writeWav(path.join(__dirname, '..', 'public', 'sfx', 'damage.wav'), genDamage(sr), sr);
writeWav(path.join(__dirname, '..', 'public', 'sfx', 'reload.wav'), genReload(sr), sr);

console.log('WAV sfx generated in public/sfx');
