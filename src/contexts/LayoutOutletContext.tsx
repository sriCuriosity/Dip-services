import React, { createContext, useContext } from 'react';

export type LayoutOutletValue = {
  setIsChatOpen: (open: boolean) => void;
  unreadMessagesCount: number;
  navTick: number;
  /** Same as bottom-nav goTo — works for profile links (history, fees, shops, worker). */
  navigateTo: (path: string) => void;
};

const LayoutOutletContext = createContext<LayoutOutletValue | null>(null);

export const LayoutOutletProvider: React.FC<{
  value: LayoutOutletValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <LayoutOutletContext.Provider value={value}>{children}</LayoutOutletContext.Provider>
);

/** Used by tab pages (Services/Rentals) — works with or without React Router Outlet. */
export function useLayoutOutlet(): LayoutOutletValue {
  const ctx = useContext(LayoutOutletContext);
  if (ctx) return ctx;
  return {
    setIsChatOpen: () => {},
    unreadMessagesCount: 0,
    navTick: 0,
    navigateTo: (path: string) => {
      const target = path.startsWith('/') ? path : `/${path}`;
      window.location.hash = `#${target}`;
    },
  };
}
