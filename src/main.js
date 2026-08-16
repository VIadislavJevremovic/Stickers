import App from './App.svelte';
import './app.css';

const app = new App({ target: document.getElementById('app') });

// Register the service worker for offline use (only in production build).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js')
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

export default app;
