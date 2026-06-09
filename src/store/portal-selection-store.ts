"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PortalKey } from "@/features/portal-selection/lib/portals";

type PortalSelectionState = {
  availablePortals: PortalKey[];
  defaultPortal: PortalKey | null;
  lastUsedPortal: PortalKey | null;
  quickAccess: PortalKey[];
  selectedPortal: PortalKey | null;
  selectedAt: string | null;
  recommendedPortal: PortalKey | null;
  hydrate: (preferences: PortalSelectionSnapshot) => void;
  setDefaultPortal: (portal: PortalKey) => void;
  selectPortal: (portal: PortalKey) => void;
  toggleQuickAccess: (portal: PortalKey) => void;
  resetPortalSelection: () => void;
};

export type PortalSelectionSnapshot = Pick<
  PortalSelectionState,
  | "availablePortals"
  | "defaultPortal"
  | "lastUsedPortal"
  | "quickAccess"
  | "selectedPortal"
  | "selectedAt"
  | "recommendedPortal"
>;

export const usePortalSelectionStore = create<PortalSelectionState>()(
  persist(
    (set) => ({
      availablePortals: [],
      defaultPortal: null,
      lastUsedPortal: null,
      quickAccess: ["student"],
      selectedPortal: null,
      selectedAt: null,
      recommendedPortal: null,
      hydrate: (preferences) =>
        set({
          availablePortals: preferences.availablePortals,
          defaultPortal: preferences.defaultPortal,
          lastUsedPortal: preferences.lastUsedPortal,
          quickAccess: preferences.quickAccess,
          selectedPortal: preferences.selectedPortal,
          selectedAt: preferences.selectedAt,
          recommendedPortal: preferences.recommendedPortal,
        }),
      setDefaultPortal: (portal) =>
        set({
          defaultPortal: portal,
          recommendedPortal: portal,
        }),
      selectPortal: (portal) =>
        set((state) => ({
          selectedPortal: portal,
          lastUsedPortal: portal,
          selectedAt: new Date().toISOString(),
          quickAccess: state.quickAccess.includes(portal)
            ? state.quickAccess
            : [portal, ...state.quickAccess].slice(0, 3),
        })),
      toggleQuickAccess: (portal) =>
        set((state) => ({
          quickAccess: state.quickAccess.includes(portal)
            ? state.quickAccess.filter((item) => item !== portal)
            : [portal, ...state.quickAccess].slice(0, 3),
        })),
      resetPortalSelection: () =>
        set({
          availablePortals: [],
          defaultPortal: null,
          lastUsedPortal: null,
          selectedPortal: null,
          selectedAt: null,
          quickAccess: ["student"],
          recommendedPortal: null,
        }),
    }),
    {
      name: "campushub.portal-selection",
    },
  ),
);
