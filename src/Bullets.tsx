import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './store';
import { useRef, useMemo, useEffect } from 'react';

export default function Bullets() {
  const bullets = useGameStore(s => s.bullets);
  const removeBullet = useGameStore(s => s.removeBullet);
  const POOL = 60;

  const geom = useMemo(() => new THREE.CylinderGeometry(0.02, 0.02, 1, 6), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, depthWrite: false }), []);

  const poolRef = useRef<Array<THREE.Mesh | null>>([]);

  useEffect(() => {
    poolRef.current = new Array(POOL).fill(null);
  }, [POOL]);

  useFrame(() => {
    const now = performance.now();
    const snapshot = bullets.slice(0, POOL);

    for (let i = 0; i < POOL; i++) {
      const mesh = poolRef.current[i];
      if (!mesh) continue;

      if (i < snapshot.length) {
        const b = snapshot[i];
        const start = new THREE.Vector3(...b.start);
        const end = new THREE.Vector3(...b.end);
        const dir = end.clone().sub(start);
        const dist = dir.length();

        // keep bullets visible and clipped away from near plane
        const safeDist = Math.max(dist, 0.4);
        const mid = start.clone().lerp(end, 0.5);

        mesh.position.copy(mid);
        const up = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize() || new THREE.Vector3(0,1,0));
        mesh.quaternion.copy(q);
        mesh.scale.set(0.04, safeDist, 0.04);
        mesh.frustumCulled = false;

        const age = now - b.timestamp;
        const life = 220;
        if (age > life) {
          mesh.visible = false;
          removeBullet(b.id);
        } else {
          mesh.visible = true;
          const opacity = Math.max(0.2, 1 - age / life);
          (mesh.material as THREE.Material & any).opacity = opacity;
        }
      } else {
        mesh.visible = false;
      }
    }
  });

  return (
    <>
      {Array.from({ length: POOL }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { poolRef.current[i] = el as any; }}
          geometry={geom}
          material={mat}
          visible={false}
        />
      ))}
    </>
  );
}
