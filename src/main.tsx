import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const suppress = (...args: any[]) => {
  const text = args.map(a => {
    if (typeof a === 'string') return a;
    if (a && typeof a.message === 'string') return a.message;
    try { return String(a); } catch { return '' }
  }).join(' ');
  if (
    text.includes('THREE.Clock') ||
    text.includes('deprecated parameters') ||
    text.includes('PCFSoftShadowMap') ||
    text.includes('PointerLockControls') ||
    text.includes('Pointer lock cannot be acquired')
  ) return true;
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
