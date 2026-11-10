import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Registrazione automatica Service Worker per funzionamento PWA Offline
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('[PWA] Nuova versione di LavagnaTattica disponibile.');
  },
  onOfflineReady() {
    console.info('[PWA] LavagnaTattica è pronta per funzionare offline a bordo campo.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
