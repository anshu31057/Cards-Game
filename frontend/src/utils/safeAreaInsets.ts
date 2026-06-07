/**
 * Safe Area Insets Helper
 * Handles CSS env() variables for notches, status bars, etc.
 */

export function getSafeAreaInsets(): {
  top: string;
  bottom: string;
  left: string;
  right: string;
} {
  if (typeof window === 'undefined') {
    return { top: '0', bottom: '0', left: '0', right: '0' };
  }

  return {
    top: 'env(safe-area-inset-top)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
    right: 'env(safe-area-inset-right)',
  };
}

export const safeAreaInsets = getSafeAreaInsets();

/**
 * Generate padding style with safe area support
 */
export function getSafeAreaPaddingStyle(
  vertical: string | number = '0',
  horizontal: string | number = '0'
): React.CSSProperties {
  return {
    paddingTop: `calc(${vertical} + ${safeAreaInsets.top})`,
    paddingBottom: `calc(${vertical} + ${safeAreaInsets.bottom})`,
    paddingLeft: `calc(${horizontal} + ${safeAreaInsets.left})`,
    paddingRight: `calc(${horizontal} + ${safeAreaInsets.right})`,
  };
}

/**
 * Generate margin style with safe area support
 */
export function getSafeAreaMarginStyle(
  vertical: string | number = '0',
  horizontal: string | number = '0'
): React.CSSProperties {
  return {
    marginTop: `calc(${vertical} + ${safeAreaInsets.top})`,
    marginBottom: `calc(${vertical} + ${safeAreaInsets.bottom})`,
    marginLeft: `calc(${horizontal} + ${safeAreaInsets.left})`,
    marginRight: `calc(${horizontal} + ${safeAreaInsets.right})`,
  };
}
