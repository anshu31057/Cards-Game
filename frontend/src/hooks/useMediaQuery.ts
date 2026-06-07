import { useState, useEffect } from 'react';

/**
 * useMediaQuery - Responsive design hook
 * Detects screen size and orientation changes
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useResponsiveContext() {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isSmallPhone = useMediaQuery('(max-width: 400px)');
  const isPhone = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)');

  return {
    isPortrait,
    isLandscape,
    isSmallPhone,
    isPhone,
    isTablet,
    isDesktop,
    isTouchDevice,
    isMobile: isPhone || isSmallPhone,
  };
}
