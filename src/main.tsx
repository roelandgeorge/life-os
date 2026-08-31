import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { DebugScreen } from './debug/DebugScreen';
import './styles.css';

// Step 3's harness stays reachable at ?debug — it is still how every
// parameter's independence gets verified — but the app now boots onboarding
// or the main screen (§9 steps 5–6).
const isDebug = new URLSearchParams(window.location.search).has('debug');

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>{isDebug ? <DebugScreen /> : <App />}</StrictMode>,
);
