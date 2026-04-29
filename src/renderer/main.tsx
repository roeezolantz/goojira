import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { SettingsApp } from './SettingsApp';
import { ThemeApplier } from './components/ThemeApplier';
import { useStore } from './store';
import { api } from './api';

const root = createRoot(document.getElementById('root')!);

if (api.windowKind === 'settings') {
  root.render(
    <StrictMode>
      <ThemeApplier />
      <SettingsApp />
    </StrictMode>,
  );
} else {
  void useStore.getState().init();
  root.render(
    <StrictMode>
      <ThemeApplier />
      <App />
    </StrictMode>,
  );
}
