import { useGameStore } from './store';
import { WEAPONS } from './weapons';
import { useEffect, useState } from 'react';

export default function HUD() {
  const { health, score, weaponIndex, ammo, gameState, isReloading, recoilTrigger, isAiming, lastPlayerHit, diamonds, revives, elapsed } = useGameStore();
  const [crosshairSpread, setCrosshairSpread] = useState(0);
  const [isHit, setIsHit] = useState(false);

  useEffect(() => {
    if (lastPlayerHit > 0) {
      setIsHit(true);
      const timeout = setTimeout(() => setIsHit(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [lastPlayerHit]);

  useEffect(() => {
    if (recoilTrigger > 0) {
      setCrosshairSpread(20);
      const timeout = setTimeout(() => setCrosshairSpread(0), 100);
      return () => clearTimeout(timeout);
    }
  }, [recoilTrigger]);

  if (gameState !== 'playing') return null;
  const weapon = WEAPONS[weaponIndex];

  const baseSpread = isAiming ? 2 : 12;
  const currentSpread = baseSpread + crosshairSpread;

  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
  const timeFormatted = `${minutes}:${seconds}`;

  return (
    <>
      {/* Damage Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-300 z-0 ${isHit ? 'bg-red-600/40' : 'bg-transparent'}`} />
      
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
        <div className="flex justify-between items-start">
          <div className="text-4xl font-bold text-white drop-shadow-md">HP: {health}</div>
          <div className="text-4xl font-bold text-white drop-shadow-md">SCORE: {score}</div>
          <div className="text-4xl font-bold text-white drop-shadow-md">💎 {diamonds} &nbsp; | &nbsp; {timeFormatted}</div>
        </div>
      
      {/* Crosshair */}
      {/* Crosshair (hidden while scoped with sniper) */}
      {!(isAiming && weapon.name === 'Sniper') && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-1 h-1 bg-white rounded-full opacity-80 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          <div className="w-4 h-0.5 bg-white/50 absolute top-1/2 transform -translate-y-1/2 transition-all duration-75" style={{ left: `-${currentSpread + 16}px` }} />
          <div className="w-4 h-0.5 bg-white/50 absolute top-1/2 transform -translate-y-1/2 transition-all duration-75" style={{ left: `${currentSpread}px` }} />
          <div className="w-0.5 h-4 bg-white/50 absolute left-1/2 transform -translate-x-1/2 transition-all duration-75" style={{ top: `-${currentSpread + 16}px` }} />
          <div className="w-0.5 h-4 bg-white/50 absolute left-1/2 transform -translate-x-1/2 transition-all duration-75" style={{ top: `${currentSpread}px` }} />
        </div>
      )}

      {/* Sniper scope overlay */}
      {isAiming && weapon.name === 'Sniper' && (
        <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(0,0,0,0) 200px, rgba(0,0,0,0.95) 230px)'
          }} />
          <div style={{ position: 'absolute', width: '2px', height: '60px', background: 'rgba(255,255,255,0.9)' }} />
          <div style={{ position: 'absolute', width: '60px', height: '2px', background: 'rgba(255,255,255,0.9)' }} />
        </div>
      )}
      
      <div className="flex justify-between items-end">
        <div className="text-2xl text-gray-300 flex flex-col gap-2">
          {WEAPONS.map((w, i) => (
            <div key={i} className={i === weaponIndex ? 'text-white font-bold' : 'opacity-50'}>
              [{i + 1}] {w.name}
            </div>
          ))}
        </div>
        <div className="text-4xl font-bold text-white drop-shadow-md text-right">
          {weapon.name}
          <div className="text-2xl text-gray-400 mt-2">
            {isReloading ? (
              <span className="text-yellow-400 animate-pulse">RELOADING...</span>
            ) : (
              `AMMO: ${ammo[weaponIndex]} / ${weapon.maxAmmo}`
            )}
          </div>
          <div className="text-sm text-gray-400 mt-1">REVIVES: {revives}</div>
          <div className="text-sm text-gray-500 mt-1">[R] Reload</div>
          </div>
        </div>
      </div>
    </>
  );
}
