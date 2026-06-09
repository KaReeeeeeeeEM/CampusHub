"use client";

import { create } from "zustand";

type NavigationState = {
  sidebarOpen: boolean;
  commandOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  sidebarOpen: false,
  commandOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
}));
