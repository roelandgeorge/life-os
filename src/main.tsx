import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { reloadOnWorkerUpdate } from './app/swUpdate';
import './styles.css';

// Before the first render, so a deploy that lands mid-session is picked up
// on one refresh rather than two.
reloadOnWorkerUpdate();

// The step-3 parameter harness is gone with the parametric figure it drove:
// with five drawn states per layer there is nothing continuous left to slide.
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
