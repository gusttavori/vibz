'use client';

import { useEffect } from 'react';

export default function PWACleaner() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.update();
        }
      });
    }
  }, []);

  return null; // Componente invisível
}