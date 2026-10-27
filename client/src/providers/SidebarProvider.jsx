import { createContext, useCallback, useContext, useState } from 'react';

const STORAGE_KEY = 'campushub-sidebar';
const SidebarContext = createContext(null);

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsedState] = useState(readCollapsed);
  const setCollapsed = useCallback((value) => {
    setCollapsedState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'expanded');
      } catch {
        // Blocked storage: the choice still holds for this session.
      }
      return next;
    });
  }, []);
  const toggle = useCallback(() => setCollapsed((c) => !c), [setCollapsed]);
  return <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle }}>{children}</SidebarContext.Provider>;
}

export const useSidebar = () => useContext(SidebarContext);
