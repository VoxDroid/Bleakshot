import { create } from 'zustand';
import * as THREE from 'three';
import { WEAPONS } from './weapons';
import { playSfx } from './sfx';

type GameState = 'menu' | 'playing' | 'gameover';

interface Enemy {
  id: string;
  position: [number, number, number];
  health: number;
  type?: 'scout' | 'grunt' | 'heavy';
  maxHealth: number;
  lastHit?: number;
}

interface Bullet {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  timestamp: number;
}

interface Settings {
  sensitivity: number;
  crosshairSize?: number;
  audioEnabled?: boolean;
}

interface GameStore {
  score: number;
  health: number;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  playerPosition: THREE.Vector3;
  setPlayerPosition: (pos: THREE.Vector3) => void;
  weaponIndex: number;
  setWeaponIndex: (idx: number) => void;
  ammo: number[];
  isReloading: boolean;
  isAiming: boolean;
  setAiming: (val: boolean) => void;
  bullets: Bullet[];
  addBullet: (b: Bullet) => void;
  removeBullet: (id: string) => void;
  shoot: () => boolean;
  reload: () => void;
  enemies: Enemy[];
  spawnEnemy: (enemy: Enemy) => void;
  damageEnemy: (id: string, amount: number) => void;
  addScore: (amount: number) => void;
  xp: number;
  level: number;
  addXp: (amount: number) => void;
  damagePlayer: (amount: number) => void;
  diamonds: number;
  addDiamonds: (amount: number) => void;
  revives: number;
  useRevive: () => void;
  startTime: number;
  elapsed: number;
  setElapsed: (n: number) => void;
  resetGame: () => void;
  recoilTrigger: number;
  triggerRecoil: () => void;
  lastPlayerHit: number;
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  score: 0,
  health: 100,
  gameState: 'menu',
  setGameState: (state) => set({ gameState: state }),
  playerPosition: new THREE.Vector3(0, 5, 0),
  setPlayerPosition: (pos) => set({ playerPosition: pos }),
  weaponIndex: 0,
  setWeaponIndex: (idx) => set({ weaponIndex: idx }),
  ammo: WEAPONS.map(w => w.maxAmmo),
  isReloading: false,
  isAiming: false,
  setAiming: (val) => set({ isAiming: val }),
  bullets: [],
  addBullet: (b) => set(s => ({ bullets: [...s.bullets, b] })),
  removeBullet: (id) => set(s => ({ bullets: s.bullets.filter(b => b.id !== id) })),
  shoot: () => {
    const { ammo, weaponIndex, isReloading, reload } = get();
    if (isReloading) return false;
    if (ammo[weaponIndex] <= 0) {
      reload();
      return false;
    }
    const newAmmo = [...ammo];
    newAmmo[weaponIndex] -= 1;
    set({ ammo: newAmmo });
    get().triggerRecoil();
    return true;
  },
  reload: () => {
    const { ammo, weaponIndex, isReloading } = get();
    if (isReloading || ammo[weaponIndex] === WEAPONS[weaponIndex].maxAmmo) return;
    set({ isReloading: true });
    try { if (get().settings.audioEnabled) playSfx(`reload${weaponIndex}`, 0.9); } catch (_) {}
    setTimeout(() => {
      const newAmmo = [...get().ammo];
      newAmmo[get().weaponIndex] = WEAPONS[get().weaponIndex].maxAmmo;
      set({ ammo: newAmmo, isReloading: false });
    }, 1000);
  },
  enemies: [],
  spawnEnemy: (enemy) => set((s) => ({ enemies: [...s.enemies, enemy] })),
  damageEnemy: (id, amount) => set((s) => {
    const now = performance.now();
    const enemies = s.enemies.map(e => e.id === id ? { ...e, health: e.health - amount, lastHit: now } : e);
    const dead = enemies.find(e => e.id === id && e.health <= 0);
    try { if (get().settings.audioEnabled) playSfx('hit', 0.6); } catch (_) {}
    if (dead) {
      setTimeout(() => {
        get().addScore(10);
        get().addDiamonds(1);
        get().addXp(15);
      }, 0);
    }
    return { enemies: enemies.filter(e => e.health > 0) };
  }),
  addScore: (amount) => set((s) => ({ score: s.score + amount })),
  xp: 0,
  level: 1,
  addXp: (amount) => set((s) => {
    const total = s.xp + amount;
    let lvl = s.level;
    let remaining = total;
    while (remaining >= lvl * 100) {
      remaining -= lvl * 100;
      lvl += 1;
    }
    return { xp: remaining, level: lvl };
  }),
  diamonds: 0,
  addDiamonds: (amount) => set(s => ({ diamonds: s.diamonds + amount })),
  revives: 0,
  useRevive: () => set(s => ({ revives: Math.max(0, s.revives - 1), health: 50, gameState: 'playing', lastPlayerHit: 0 })),
  startTime: 0,
  elapsed: 0,
  setElapsed: (n) => set({ elapsed: n }),
  damagePlayer: (amount) => set((s) => {
    if (s.gameState !== 'playing') return {} as any;
    const newHealth = Math.max(0, s.health - amount);
    try { if (get().settings.audioEnabled) playSfx('damage', 0.8); } catch (_) {}
    if (newHealth === 0) return { health: 0, gameState: 'gameover', lastPlayerHit: performance.now(), revives: s.revives + 1 } as any;
    return { health: newHealth, lastPlayerHit: performance.now() } as any;
  }),
  resetGame: () => set({ 
    health: 100, 
    score: 0, 
    gameState: 'playing', 
    enemies: [], 
    bullets: [],
    ammo: WEAPONS.map(w => w.maxAmmo),
    isReloading: false,
    playerPosition: new THREE.Vector3(0, 5, 0),
    lastPlayerHit: 0,
    startTime: performance.now(),
    elapsed: 0
  }),
  recoilTrigger: 0,
  triggerRecoil: () => set(s => ({ recoilTrigger: s.recoilTrigger + 1 })),
  lastPlayerHit: 0,
  settings: { sensitivity: 1, crosshairSize: 1, audioEnabled: true },
  updateSettings: (s) => set(state => ({ settings: { ...state.settings, ...s } }))
}));
