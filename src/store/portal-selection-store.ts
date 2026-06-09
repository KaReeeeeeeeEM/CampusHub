"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PortalKey } from "@/features/portal-selection/lib/portals";

type PortalSelectionState = {
  lastUsedPortal: PortalKey | null;
  quickAccess: PortalKey[];
  selectedPortal: PortalKey | null;
  selectedAt: string | null;
  selectPortal: (portal: PortalKey) => void;
  toggleQuickAccess: (portal: PortalKey) => void;
  resetPortalSelection: () => void;
};

export const usePortalSelectionStore = create<PortalSelectionState>()(
  persist(
    (set) => ({
      lastUsedPortal: null,
      quickAccess: ["student"],
      selectedPortal: null,
      selectedAt: null,
      selectPortal: (portal) =>
        set((state) => ({
          selectedPortal: portal,
          lastUsedPortal: portal,
          selectedAt: new Date().toISOString(),
          quickAccess: state.quickAccess.includes(portal)
            ? state.quickAccess
            : [portal, ...state.quickAccess].slice(0, 3)
        })),
      toggleQuickAccess: (portal) =>
        set((state) => ({
          quickAccess: state.quickAccess.includes(portal)
            ? state.quickAccess.filter((item) => item !== portal)
            : [portal, ...state.quickAccess].slice(0, 3)
        })),
      resetPortalSelection: () =>
        set({
          lastUsedPortal: null,
          selectedPortal: null,
          selectedAt: null,
          quickAccess: ["student"]
        })
    }),
    {
      name: "campushub.portal-selection"
    }
  )
);
