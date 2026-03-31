import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './store';
import { useRef, useMemo } from 'react';

export default function Bullets() {
  const bullets = useGameStore(s => s.bullets);
  const removeBullet = useGameStore(s => s.removeBullet);

  return (
    <>
      {bullets.map(b => (
        <BulletLine key={b.id} bullet={b} onRemove={() => removeBullet(b.id)} />
      ))}
    </>
  );
}

function BulletLine({ bullet, onRemove }: { bullet: any, onRemove: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  
  const { position, scale, rotation } = useMemo(() => {
    const start = new THREE.Vector3(...bullet.start);
    const end = new THREE.Vector3(...bullet.end);
    const distance = start.distanceTo(end);
    const position = start.clone().lerp(end, 0.5);
    
    const direction = end.clone().sub(start).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);
    
    return { position, scale: [0.05, distance, 0.05], rotation };
  }, [bullet]);

  useFrame(() => {
    const age = performance.now() - bullet.timestamp;
    if (age > 100) {
      onRemove();
    } else if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 1 - (age / 100);
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={scale as any}>
      <cylinderGeometry args={[1, 1, 1, 8]} />
      <meshBasicMaterial color="#ffffaa" transparent opacity={1} />
    </mesh>
  );
}
