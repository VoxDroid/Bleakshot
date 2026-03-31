import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const suppress = (...args: any[]) => {
  if (typeof args[0] === 'string' && (
    args[0].includes('THREE.Clock') || 
    args[0].includes('deprecated parameters') ||
    args[0].includes('PCFSoftShadowMap') ||
    args[0].includes('PointerLockControls') ||
    args[0].includes('Pointer lock cannot be acquired')
  )) {
    return true;
  }
  return false;
};

const originalWarn = console.warn;
console.warn = (...args) => {
  if (suppress(...args)) return;
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (suppress(...args)) return;
  originalError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
