import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { APP_DATA_CACHE_VERSION, APP_DATA_CACHE_VERSION_KEY } from './utils/appCacheVersion';
import { clearAllAppDataCaches } from './utils/cacheManager';

try {
  const stored = localStorage.getItem(APP_DATA_CACHE_VERSION_KEY);
  if (stored !== APP_DATA_CACHE_VERSION) {
    clearAllAppDataCaches();
    localStorage.setItem(APP_DATA_CACHE_VERSION_KEY, APP_DATA_CACHE_VERSION);
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')).render(<StrictMode>
    <App />
  </StrictMode>);