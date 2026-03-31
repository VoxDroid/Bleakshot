import { useState } from 'react';
import { useGameStore } from './store';
import { unlockAudio } from './sfx';

export default function Menus() {
  const { gameState, resetGame, score, health, settings, updateSettings, revives, useRevive } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);

  const handlePlay = () => {
    // Try to unlock/resume audio on the user gesture that starts the game
    try { unlockAudio(); } catch (_) {}
    if (gameState === 'gameover' || (gameState === 'menu' && score === 0 && health === 100)) {
      resetGame();
    }
    
    try {
      const promise = document.body.requestPointerLock();
      if (promise !== undefined) {
        promise.catch(e => {
          console.warn("Pointer lock wait", e);
          useGameStore.getState().setGameState('playing');
        });
      }
    } catch (e) {
      console.warn(e);
      useGameStore.getState().setGameState('playing');
    }
  };

  if (gameState === 'playing') return null;

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50">
      <div className="bg-zinc-900 p-12 rounded-xl border border-zinc-700 text-center max-w-md w-full shadow-2xl">
        <h1 className="text-5xl font-black text-white mb-8 tracking-tighter">bleakshot</h1>
        
        {gameState === 'gameover' && !showSettings && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-900/50 rounded-lg">
            <h2 className="text-3xl text-red-500 font-bold mb-2">YOU DIED</h2>
            <p className="text-xl text-gray-300">FINAL SCORE: {score}</p>
          </div>
        )}
        
        {showSettings ? (
          <div className="space-y-6 text-left">
            <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
              <div>
                <label className="block text-gray-400 mb-2">Mouse Sensitivity: {settings.sensitivity.toFixed(1)}</label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="3" 
                  step="0.1" 
                  value={settings.sensitivity}
                  onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-white"
                />
              </div>
              <div className="mt-4">
                <label className="block text-gray-400 mb-2">Crosshair Size: {(settings.crosshairSize || 1).toFixed(1)}</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.crosshairSize ?? 1}
                  onChange={(e) => updateSettings({ crosshairSize: parseFloat(e.target.value) })}
                  className="w-full accent-white"
                />
              </div>
              <div className="mt-4">
                <label className="block text-gray-400 mb-2">Audio: {settings.audioEnabled ? 'On' : 'Off'}</label>
                <button
                  onClick={() => {
                    updateSettings({ audioEnabled: !settings.audioEnabled });
                    if (!settings.audioEnabled) {
                      // if enabling audio, try to unlock/resume audio now
                      try { unlockAudio(); } catch (_) {}
                    }
                  }}
                  className="w-full py-2 bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors rounded-lg border border-zinc-600"
                >
                  {settings.audioEnabled ? 'MUTE' : 'UNMUTE'}
                </button>
              </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-3 mt-4 bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors rounded-lg border border-zinc-600"
            >
              BACK
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handlePlay}
              className="w-full py-4 bg-white text-black font-bold text-xl hover:bg-gray-200 transition-colors rounded-lg"
            >
              {gameState === 'menu' && (score > 0 || health < 100) ? 'RESUME' : (gameState === 'menu' ? 'START GAME' : 'PLAY AGAIN')}
            </button>

            {gameState === 'gameover' && revives > 0 && (
              <button
                onClick={() => {
                  useRevive();
                  try {
                    const promise = document.body.requestPointerLock();
                    if (promise !== undefined) {
                      promise.catch(e => {
                        console.warn("Pointer lock wait", e);
                        useGameStore.getState().setGameState('playing');
                      });
                    }
                  } catch (e) {
                    console.warn(e);
                    useGameStore.getState().setGameState('playing');
                  }
                }}
                className="w-full py-3 mt-4 bg-emerald-700 text-white font-bold hover:bg-emerald-600 transition-colors rounded-lg border border-emerald-800"
              >
                REVIVE ({revives})
              </button>
            )}
            
            {gameState === 'menu' && (score > 0 || health < 100) && (
              <button
                onClick={() => {
                  resetGame();
                  try {
                    const promise = document.body.requestPointerLock();
                    if (promise !== undefined) {
                      promise.catch(e => {
                        console.warn("Pointer lock wait", e);
                        useGameStore.getState().setGameState('playing');
                      });
                    }
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                className="w-full py-3 bg-red-900/50 text-white font-bold hover:bg-red-900 transition-colors rounded-lg border border-red-700"
              >
                RESTART GAME
              </button>
            )}
            
            <button
              onClick={() => setShowSettings(true)}
              className="w-full py-3 bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors rounded-lg border border-zinc-600"
            >
              SETTINGS
            </button>
            
            <div className="text-left mt-8 text-gray-400 text-sm bg-black/50 p-6 rounded-lg border border-zinc-800">
              <h3 className="text-white font-bold mb-4 uppercase tracking-wider">Controls</h3>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-white">WASD</span> - Move</div>
                <div><span className="text-white">SPACE</span> - Jump</div>
                <div><span className="text-white">CLICK</span> - Shoot</div>
                <div><span className="text-white">1-5</span> - Weapons</div>
                <div><span className="text-white">R</span> - Reload</div>
                <div><span className="text-white">ESC</span> - Pause</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
