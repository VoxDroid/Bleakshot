/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import Game from './Game';
import HUD from './HUD';
import Menus from './Menus';
import Bullets from './Bullets';
import { useGameStore } from './store';
import { useEffect, useRef } from 'react';

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
];

export default function App() {
  const gameState = useGameStore(s => s.gameState);
  const setElapsed = useGameStore(s => s.setElapsed);

  useEffect(() => {
    let raf = 0;
    const lastHeal = { current: 0 } as { current: number };
    function tick() {
      if (useGameStore.getState().gameState === 'playing') {
        const st = useGameStore.getState().startTime || performance.now();
        const elapsedSecs = (performance.now() - st) / 1000;
        setElapsed(elapsedSecs);
        // Healing: if not hit for 10s, heal 5 HP every 3s
        const state = useGameStore.getState();
        const now = performance.now();
        const lastHit = state.lastPlayerHit || 0;
        const timeSinceNoHit = lastHit > 0 ? (now - lastHit) : (now - st);
        if (timeSinceNoHit > 10000 && state.health < 100) {
          if (now - lastHeal.current > 3000) {
            useGameStore.setState({ health: Math.min(100, state.health + 5) });
            lastHeal.current = now;
          }
        } else if (timeSinceNoHit <= 10000) {
          // Reset heal timer while being recently hit
          lastHeal.current = 0;
        }
        raf = requestAnimationFrame(tick);
      }
    }
    if (gameState === 'playing') raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [gameState, setElapsed]);
  
  return (
    <KeyboardControls map={keyboardMap}>
      <div className="w-full h-screen bg-black overflow-hidden relative font-mono text-white select-none">
        <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ fov: 75 }}>
          <color attach="background" args={['#222222']} />
          <fog attach="fog" args={['#222222', 10, 80]} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 10]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} />
          
          <Physics gravity={[0, -20, 0]}>
            <Game />
            <Bullets />
          </Physics>
        </Canvas>
        <HUD />
        <Menus />
      </div>
    </KeyboardControls>
  );
}
