'use client';

import { useEffect } from 'react';

export function LightModeEnforcer() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  return null;
}
