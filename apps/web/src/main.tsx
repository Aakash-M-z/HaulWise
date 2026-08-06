import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@haulwise/api-client-react';

import App from './App';

import './index.css';

// In production (Vercel), point the API client to the Render backend.
// In local dev, VITE_API_URL is empty and Vite's proxy handles /api -> localhost:5000.
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById('root')!).render(<App />);
