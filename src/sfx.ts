export const SFX_URLS: Record<string, string> = {
  // Mixkit preview links (replace if you prefer other assets)
  fire: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-small-gunshot-1699.mp3',
  hit: 'https://assets.mixkit.co/sfx/preview/mixkit-impact-quick-1040.mp3',
  damage: 'https://assets.mixkit.co/sfx/preview/mixkit-player-being-hit-2045.mp3',
};

export function playSfx(name: 'fire' | 'hit' | 'damage', volume = 0.8) {
  const url = SFX_URLS[name];
  if (!url) return;
  try {
    const a = new Audio(url);
    a.volume = volume;
    // ignore play promise rejection (autoplay / user gesture issues)
    a.play().catch(() => {});
  } catch (e) {
    // noop
  }
}
