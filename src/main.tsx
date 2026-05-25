import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { doc, getDocFromCache } from 'firebase/firestore';
import { db } from './lib/firebase.ts';
import App from './App.tsx';
import './index.css';

// Connection test
async function testConnection() {
  try {
    // Just a ping to ensure the client can talk to the backend
    await doc(db, 'test', 'connection');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

