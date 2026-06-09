'use client';

import { useEffect, useState } from 'react';

import { LogoSplash } from './logo-splash';

const SPLASH_DURATION_MS = 1200;

export function AppBootShell({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (showSplash) {
    return <LogoSplash />;
  }

  return <>{children}</>;
}
