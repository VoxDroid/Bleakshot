import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, useRapier, RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls, PointerLockControls } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { playSfx, unlockAudio } from './sfx';
import { useGameStore } from './store';
import { WEAPONS } from './weapons';

const SPEED = 12;
const JUMP_FORCE = 8;

export default function Player() {
  const body = useRef<RapierRigidBody>(null);
  const [, get] = useKeyboardControls();
  const { camera, scene } = useThree();
  const { rapier, world } = useRapier();
  const setPlayerPosition = useGameStore(s => s.setPlayerPosition);
  const weaponIndex = useGameStore(s => s.weaponIndex);
  const setWeaponIndex = useGameStore(s => s.setWeaponIndex);
  const damageEnemy = useGameStore(s => s.damageEnemy);
  const shoot = useGameStore(s => s.shoot);
  const reload = useGameStore(s => s.reload);
  const gameState = useGameStore(s => s.gameState);
  const setGameState = useGameStore(s => s.setGameState);
  const sensitivity = useGameStore(s => s.settings.sensitivity);
  const isAiming = useGameStore(s => s.isAiming);
  const setAiming = useGameStore(s => s.setAiming);

  // Handle weapon switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.code === 'Digit1') setWeaponIndex(0);
      if (e.code === 'Digit2') setWeaponIndex(1);
      if (e.code === 'Digit3') setWeaponIndex(2);
      if (e.code === 'Digit4') setWeaponIndex(3);
      if (e.code === 'Digit5') setWeaponIndex(4);
      if (e.code === 'KeyR') reload();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setWeaponIndex, reload, gameState]);

  // Shooting logic
  const lastShot = useRef(0);
  const bobTime = useRef(0);
  const bobAmount = useRef(0);
  const isShooting = useRef(false);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => { 
      if (e.button === 0) isShooting.current = true; 
      if (e.button === 2) setAiming(true);
    };
    const handleMouseUp = (e: MouseEvent) => { 
      if (e.button === 0) isShooting.current = false; 
      if (e.button === 2) setAiming(false);
    };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => { 
      window.removeEventListener('mousedown', handleMouseDown); 
      window.removeEventListener('mouseup', handleMouseUp); 
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [setAiming]);

  useFrame((state, delta) => {
    if (!body.current || gameState !== 'playing') return;

    const { forward, backward, left, right, jump, sprint, crouch } = get();
    const velocity = body.current.linvel();
    const position = body.current.translation();
    const currentSpeed = isAiming ? SPEED * 0.4 : (sprint ? SPEED * 1.6 : (crouch ? SPEED * 0.5 : SPEED));

    setPlayerPosition(new THREE.Vector3(position.x, position.y, position.z));

    // Movement
    const frontVector = new THREE.Vector3(0, 0, (backward ? 1 : 0) - (forward ? 1 : 0));
    const sideVector = new THREE.Vector3((left ? 1 : 0) - (right ? 1 : 0), 0, 0);
    const direction = new THREE.Vector3().subVectors(frontVector, sideVector).normalize().multiplyScalar(currentSpeed).applyEuler(camera.rotation);

    body.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    // Jump
    if (jump && Math.abs(velocity.y) < 0.05) {
      body.current.setLinvel({ x: velocity.x, y: JUMP_FORCE, z: velocity.z }, true);
    }

    // Camera follow and head bobbing
    const speed2D = new THREE.Vector3(velocity.x, 0, velocity.z).length();
    if (speed2D > 1) {
      bobTime.current += delta * (sprint ? 15 : 10);
      bobAmount.current = THREE.MathUtils.lerp(bobAmount.current, 1, delta * 10);
    } else {
      bobTime.current += delta * 5; // keep time moving slightly so it doesn't freeze awkwardly
      bobAmount.current = THREE.MathUtils.lerp(bobAmount.current, 0, delta * 10);
    }
    const bobOffset = Math.sin(bobTime.current) * 0.05 * bobAmount.current;
    const aimOffset = isAiming ? -0.1 : 0;
    const cameraBaseY = crouch ? 0.4 : 0.8;
    const cameraY = position.y + cameraBaseY + bobOffset + aimOffset;
    camera.position.set(position.x, cameraY, position.z);

    // Shooting
    const now = performance.now();
    const weapon = WEAPONS[weaponIndex];
    const isReloading = useGameStore.getState().isReloading;
    
    if (isShooting.current && !isReloading && now - lastShot.current > weapon.fireRate) {
      if (shoot()) {
        lastShot.current = now;
        try { playSfx('fire', 0.7); } catch (_) {}
        
        // Raycast
        const raycaster = new THREE.Raycaster();
        const raysToCast = weapon.rays || 1;
        
        // Start position: when aiming, originate from camera forward (center),
        // otherwise from the shoulder offset so bullets appear to come from the weapon model.
        let startPos = new THREE.Vector3().copy(camera.position);
        if (isAiming) {
          const dir = new THREE.Vector3();
          camera.getWorldDirection(dir);
          startPos.add(dir.multiplyScalar(0.6));
        } else {
          startPos.add(new THREE.Vector3(0.3, -0.3, -0.5).applyEuler(camera.rotation));
        }
        
        for (let i = 0; i < raysToCast; i++) {
          const spreadMultiplier = isAiming ? 0.2 : 1;
          const spreadX = (Math.random() - 0.5) * weapon.spread * spreadMultiplier;
          const spreadY = (Math.random() - 0.5) * weapon.spread * spreadMultiplier;
          
          raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);
          const intersects = raycaster.intersectObjects(scene.children, true).filter(
            h => {
              let obj: THREE.Object3D | null = h.object;
              while (obj && !obj.userData?.type) obj = obj.parent;
              return obj?.userData?.type === 'enemy' || obj?.userData?.type === 'environment';
            }
          );
          
          let endPos = new THREE.Vector3().copy(raycaster.ray.origin).add(raycaster.ray.direction.multiplyScalar(50));
          
          if (intersects.length > 0) {
            const hit = intersects[0];
            endPos.copy(hit.point);
            
            let hitObj: THREE.Object3D | null = hit.object;
            while (hitObj && !hitObj.userData?.type) {
              hitObj = hitObj.parent;
            }
            
            if (hitObj?.userData?.type === 'enemy') {
              damageEnemy(hitObj.userData.id, weapon.damage);
            }
          }
          
          useGameStore.getState().addBullet({
            id: Math.random().toString(),
            start: [startPos.x, startPos.y, startPos.z],
            end: [endPos.x, endPos.y, endPos.z],
            timestamp: performance.now()
          });
        }
      }
      if (!weapon.auto) isShooting.current = false;
    }
      // Smooth camera FOV change for sniper scope
      const desiredFov = (isAiming && WEAPONS[weaponIndex].name === 'Sniper') ? 30 : 75;
      const cam = camera as THREE.PerspectiveCamera;
      if (typeof cam.fov === 'number') {
        cam.fov = THREE.MathUtils.lerp(cam.fov, desiredFov, delta * 8);
        cam.updateProjectionMatrix();
      }
  });

  return (
    <>
      <PointerLockControls 
        pointerSpeed={sensitivity}
        onLock={() => { try { unlockAudio(); } catch (_) {} ; setGameState('playing'); }} 
        onUnlock={() => {
          if (useGameStore.getState().health > 0) setGameState('menu');
        }} 
      />
      <RigidBody ref={body} colliders={false} mass={1} type="dynamic" position={[0, 5, 0]} enabledRotations={[false, false, false]}>
        <CapsuleCollider args={[0.5, 0.5]} />
        <mesh visible={false}>
          <capsuleGeometry args={[0.5, 1, 4]} />
          <meshBasicMaterial color="red" />
        </mesh>
      </RigidBody>
    </>
  );
}
