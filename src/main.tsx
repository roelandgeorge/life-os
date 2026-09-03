import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';

// The step-3 parameter harness is gone with the parametric figure it drove:
// with five drawn states per layer there is nothing continuous left to slide.
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
