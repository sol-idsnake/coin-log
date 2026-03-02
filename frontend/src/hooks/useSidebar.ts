/** Sidebar open/close state, persisted to localStorage. */
import { useEffect, useState } from "react";

export function useSidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem("sidebarOpen");
    return stored !== null ? stored === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebarOpen", String(isSidebarOpen));
  }, [isSidebarOpen]);

  return { isSidebarOpen, toggle: () => setIsSidebarOpen((isOpen) => !isOpen) };
}
