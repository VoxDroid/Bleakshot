import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from './store';

function Enemy({ id, initialPosition }: { id: string, initialPosition: [number, number, number] }) {
  const body = useRef<RapierRigidBody>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const playerPosition = useGameStore(s => s.playerPosition);
  const damagePlayer = useGameStore(s => s.damagePlayer);
  const gameState = useGameStore(s => s.gameState);
  const elapsed = useGameStore(s => s.elapsed);
  const enemyData = useGameStore(s => s.enemies.find(e => e.id === id));
  const lastAttack = useRef(0);
  const walkTime = useRef(0);
  const [showHealth, setShowHealth] = useState(false);

  useFrame((state, delta) => {
    if (!body.current || gameState !== 'playing') return;
    
    const pos = body.current.translation();
    const enemyVec = new THREE.Vector3(pos.x, pos.y, pos.z);
    const dist = enemyVec.distanceTo(playerPosition);
    const velocity = body.current.linvel();
    const speed = new THREE.Vector3(velocity.x, 0, velocity.z).length();

    const difficulty = 1 + (elapsed / 60);
    const moveSpeed = 3 * difficulty;
    const attackDamage = Math.max(1, Math.round(10 * difficulty));

    if (dist < 20 && dist > 2) {
      // Move towards player
      const dir = playerPosition.clone().sub(enemyVec).normalize();
      body.current.setLinvel({ x: dir.x * moveSpeed, y: velocity.y, z: dir.z * moveSpeed }, true);
      
      // Look at player
      const targetRotation = Math.atan2(dir.x, dir.z);
      body.current.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetRotation, 0)), true);
    } else if (dist <= 2) {
      // Attack
      const now = performance.now();
      if (now - lastAttack.current > 1000) {
        damagePlayer(attackDamage);
        lastAttack.current = now;
      }
    }

    // Animations
    if (speed > 0.5) {
      walkTime.current += delta * 10;
      if (leftArm.current) leftArm.current.rotation.x = Math.sin(walkTime.current + Math.PI) * 0.5;
      if (rightArm.current) rightArm.current.rotation.x = Math.sin(walkTime.current) * 0.5;
      if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(walkTime.current) * 0.5;
      if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(walkTime.current + Math.PI) * 0.5;
    } else {
      if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0, delta * 5);
      if (rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, 0, delta * 5);
      if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0, delta * 5);
      if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, 0, delta * 5);
    }

    // Hit flash
    if (materialRef.current && enemyData) {
      const isHit = performance.now() - (enemyData.lastHit || 0) < 150;
      materialRef.current.color.set(isHit ? '#ff0000' : '#444444');
      materialRef.current.emissive.set(isHit ? '#ff0000' : '#000000');
      
      if (enemyData.lastHit && performance.now() - enemyData.lastHit < 2000) {
        if (!showHealth) setShowHealth(true);
      } else {
        if (showHealth) setShowHealth(false);
      }
    }
  });

  return (
    <RigidBody ref={body} position={initialPosition} colliders="cuboid" lockRotations>
      <group userData={{ type: 'enemy', id }}>
        {showHealth && enemyData && (
          <Html position={[0, 2.5, 0]} center>
            <div className="w-16 h-2 bg-black border border-gray-700 rounded overflow-hidden">
              <div 
                className="h-full bg-red-600 transition-all duration-200" 
                style={{ width: `${enemyData.health}%` }}
              />
            </div>
          </Html>
        )}
        {/* Torso */}
        <mesh castShadow position={[0, 1, 0]}>
          <boxGeometry args={[0.8, 1.2, 0.4]} />
          <meshStandardMaterial ref={materialRef} color="#444444" />
        </mesh>
        {/* Head */}
        <mesh castShadow position={[0, 1.9, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
        {/* Left Arm */}
        <group ref={leftArm} position={[-0.55, 1.5, 0]}>
          <mesh castShadow position={[0, -0.4, 0]}>
            <boxGeometry args={[0.25, 0.8, 0.25]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </group>
        {/* Right Arm */}
        <group ref={rightArm} position={[0.55, 1.5, 0]}>
          <mesh castShadow position={[0, -0.4, 0]}>
            <boxGeometry args={[0.25, 0.8, 0.25]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </group>
        {/* Left Leg */}
        <group ref={leftLeg} position={[-0.25, 0.4, 0]}>
          <mesh castShadow position={[0, -0.4, 0]}>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
        </group>
        {/* Right Leg */}
        <group ref={rightLeg} position={[0.25, 0.4, 0]}>
          <mesh castShadow position={[0, -0.4, 0]}>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
        </group>
      </group>
    </RigidBody>
  );
}

export default function Enemies() {
  const enemies = useGameStore(s => s.enemies);
  const spawnEnemy = useGameStore(s => s.spawnEnemy);
  const gameState = useGameStore(s => s.gameState);

  useEffect(() => {
    if (gameState !== 'playing') return;

    let active = true;

    const spawnLoop = async () => {
      if (!active || useGameStore.getState().gameState !== 'playing') return;
      const elapsedNow = useGameStore.getState().elapsed || 0;
      const spawnInterval = Math.max(600, 2000 - elapsedNow * 10);
      const maxEnemies = 15 + Math.floor(elapsedNow / 20);

      if (useGameStore.getState().enemies.length < maxEnemies) {
        spawnEnemy({
          id: Math.random().toString(),
          position: [Math.random() * 80 - 40, 5, Math.random() * 80 - 40],
          health: Math.max(10, Math.round(30 + elapsedNow * 1))
        });
      }

      setTimeout(() => {
        if (active) spawnLoop();
      }, spawnInterval);
    };

    spawnLoop();
    return () => { active = false; };
  }, [gameState, spawnEnemy]);

  return (
    <>
      {enemies.map(e => <Enemy key={e.id} id={e.id} initialPosition={e.position} />)}
    </>
  );
}
