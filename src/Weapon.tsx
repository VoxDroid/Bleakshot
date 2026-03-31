import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from './store';
import { WEAPONS } from './weapons';

export default function Weapon() {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const weaponIndex = useGameStore(s => s.weaponIndex);
  const isReloading = useGameStore(s => s.isReloading);
  const isAiming = useGameStore(s => s.isAiming);
  const recoilTrigger = useGameStore(s => s.recoilTrigger);
  
  const weapon = WEAPONS[weaponIndex];
  const recoilOffset = useRef(0);
  const reloadProgress = useRef(0);
  const lastCamPos = useRef(new THREE.Vector3());
  const walkTime = useRef(0);

  useFrame((state, delta) => {
    if (!group.current) return;
    
    // Calculate movement speed for bobbing
    const speed = camera.position.distanceTo(lastCamPos.current) / delta;
    lastCamPos.current.copy(camera.position);
    
    if (speed > 1) {
      walkTime.current += delta * (speed > 15 ? 15 : 10); // Faster bobbing when sprinting
    } else {
      // Return to center
      walkTime.current += (0 - walkTime.current) * delta * 5;
    }

    // Base position
    group.current.position.copy(camera.position);
    group.current.rotation.copy(camera.rotation);
    
    // Recoil
    if (recoilOffset.current > 0) {
      recoilOffset.current = THREE.MathUtils.lerp(recoilOffset.current, 0, 15 * delta);
    }
    
    // Reload animation
    if (isReloading) {
      reloadProgress.current = THREE.MathUtils.lerp(reloadProgress.current, 1, 10 * delta);
    } else {
      reloadProgress.current = THREE.MathUtils.lerp(reloadProgress.current, 0, 10 * delta);
    }

    // Apply transforms
    const bobX = Math.sin(walkTime.current) * 0.02;
    const bobY = Math.abs(Math.cos(walkTime.current)) * 0.02;
    
    const targetX = isAiming ? 0 : 0.3;
    const targetY = isAiming ? -0.15 : -0.3;
    const targetZ = isAiming ? -0.3 : -0.5;
    
    group.current.translateZ(targetZ + recoilOffset.current * 4);
    group.current.translateX(targetX + bobX);
    group.current.translateY(targetY + bobY - (reloadProgress.current * 0.5));
    
    // Recoil rotation
    group.current.rotateX(recoilOffset.current * 2.5);
    // Reload rotation
    group.current.rotateX(reloadProgress.current * Math.PI / 4);

    // Muzzle flash fade
    if (flash.current) {
      (flash.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (flash.current.material as THREE.MeshBasicMaterial).opacity - delta * 15);
    }
  });

  useFrame(() => {
    if (recoilTrigger > 0) {
      // Always apply a recoil increment and flash on each trigger so rapid fire still shows flash
      recoilOffset.current += weapon.recoil;
      if (flash.current) {
        (flash.current.material as THREE.MeshBasicMaterial).opacity = 1;
        flash.current.rotation.z = Math.random() * Math.PI;
      }
      useGameStore.setState({ recoilTrigger: 0 });
    }
  });

  const flashZ = weaponIndex === 0 ? -0.3 : weaponIndex === 3 ? -1.0 : weaponIndex === 2 ? -0.7 : -0.6;

  return (
    <group ref={group}>
      {/* Weapon Models based on index */}
      {weaponIndex === 0 && ( // Pistol
        <group>
          <mesh position={[0, 0, -0.1]} castShadow><boxGeometry args={[0.05, 0.05, 0.2]} /><meshStandardMaterial color="#444" /></mesh>
          <mesh position={[0, -0.05, 0]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[0.04, 0.1, 0.05]} /><meshStandardMaterial color="#222" /></mesh>
        </group>
      )}
      {weaponIndex === 1 && ( // AR
        <group>
          <mesh position={[0, 0, -0.2]} castShadow><boxGeometry args={[0.06, 0.08, 0.6]} /><meshStandardMaterial color="#333" /></mesh>
          <mesh position={[0, -0.1, -0.05]} castShadow><boxGeometry args={[0.04, 0.15, 0.08]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0, -0.08, 0.15]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[0.04, 0.12, 0.06]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0, 0, 0.2]} castShadow><boxGeometry args={[0.06, 0.1, 0.2]} /><meshStandardMaterial color="#222" /></mesh>
        </group>
      )}
      {weaponIndex === 2 && ( // Shotgun
        <group>
          <mesh position={[0, 0, -0.2]} castShadow><boxGeometry args={[0.08, 0.08, 0.7]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0, -0.05, -0.2]} castShadow><boxGeometry args={[0.1, 0.06, 0.2]} /><meshStandardMaterial color="#444" /></mesh>
          <mesh position={[0, -0.08, 0.2]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[0.04, 0.12, 0.06]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      )}
      {weaponIndex === 3 && ( // Sniper
        <group>
          <mesh position={[0, 0, -0.3]} castShadow><boxGeometry args={[0.05, 0.06, 0.9]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0, 0.06, -0.1]} castShadow><boxGeometry args={[0.04, 0.04, 0.3]} /><meshStandardMaterial color="#000" /></mesh>
          <mesh position={[0, -0.08, 0.2]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[0.04, 0.12, 0.06]} /><meshStandardMaterial color="#222" /></mesh>
        </group>
      )}
      {weaponIndex === 4 && ( // SMG
        <group>
          <mesh position={[0, 0, -0.1]} castShadow><boxGeometry args={[0.06, 0.08, 0.4]} /><meshStandardMaterial color="#555" /></mesh>
          <mesh position={[0, -0.15, -0.1]} castShadow><boxGeometry args={[0.04, 0.25, 0.06]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0, -0.08, 0.1]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[0.04, 0.12, 0.06]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      )}

      {/* Muzzle Flash */}
      <mesh ref={flash} position={[0, 0, flashZ]}>
        <planeGeometry args={[0.3, 0.3]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
