import { RigidBody } from '@react-three/rapier';
import { useMemo } from 'react';

export default function Environment() {
  const buildings = useMemo(() => {
    const b = [];
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 160 - 80;
      const z = Math.random() * 160 - 80;
      if (Math.abs(x) < 15 && Math.abs(z) < 15) continue; // Keep center clear
      const w = Math.random() * 8 + 4;
      const d = Math.random() * 8 + 4;
      const h = Math.random() * 30 + 10;
      b.push({ position: [x, h/2, z], args: [w, h, d], color: Math.random() > 0.5 ? '#666666' : '#888888' });
    }
    return b;
  }, []);

  return (
    <>
      <RigidBody type="fixed" position={[0, -0.5, 0]} colliders="cuboid">
        <mesh receiveShadow userData={{ type: 'environment' }}>
          <boxGeometry args={[200, 1, 200]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </RigidBody>
      
      {buildings.map((b, i) => (
        <RigidBody key={i} type="fixed" position={b.position as [number, number, number]} colliders="cuboid">
          <mesh receiveShadow userData={{ type: 'environment' }}>
            <boxGeometry args={b.args as [number, number, number]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
        </RigidBody>
      ))}
      
      {/* Add some obstacles */}
      {Array.from({length: 40}).map((_, i) => (
        <RigidBody key={`obs-${i}`} type="dynamic" position={[Math.random() * 80 - 40, 5, Math.random() * 80 - 40]} colliders="cuboid">
          <mesh castShadow receiveShadow userData={{ type: 'environment' }}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#aaaaaa" />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}
