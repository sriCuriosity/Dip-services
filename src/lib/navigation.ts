/** Bottom tabs for regular users — switched by state, not only React Router. */
export const USER_TAB_PATHS = ['/', '/rentals', '/orders', '/profile'] as const;
export type UserTabPath = (typeof USER_TAB_PATHS)[number];

/** Profile menu & related pages — rendered by state (reliable on Android WebView). */
export const USER_SUB_PATHS = [
  '/user/history',
  '/user/fees',
  '/shops',
  '/members',
  '/profile/shop-setup',
  '/about',
  '/faq',
  '/privacy-security',
  '/terms',
] as const;
export type UserSubPath = (typeof USER_SUB_PATHS)[number];

export function isUserTabPath(path: string): path is UserTabPath {
  return (USER_TAB_PATHS as readonly string[]).includes(path);
}

export function isUserSubPath(path: string): path is UserSubPath {
  return (USER_SUB_PATHS as readonly string[]).includes(path);
}

export function hashToPath(): string {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const path = hash.split('?')[0] || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function setAppHash(path: string): void {
  const target = path.startsWith('/') ? path : `/${path}`;
  const next = `#${target}`;
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}

/** Notify HashRouter after programmatic hash changes (Android WebView). */
export function notifyHashChange(): void {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
