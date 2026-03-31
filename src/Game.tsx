import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from './store';
import { WEAPONS } from './weapons';
import Environment from './Environment';
import Player from './Player';
import Enemies from './Enemies';
import Weapon from './Weapon';

export default function Game() {
  return (
    <>
      <Environment />
      <Player />
      <Enemies />
      <Weapon />
    </>
  );
}
