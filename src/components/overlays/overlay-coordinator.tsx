"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type OverlayId =
  | "dashboard-intro"
  | "security-setup"
  | "streak-celebration"
  | "release-notes";

type OverlayCoordinatorValue = {
  activeOverlay: OverlayId | null;
  claimOverlay: (id: OverlayId) => boolean;
  releaseOverlay: (id: OverlayId) => void;
};

const OverlayCoordinatorContext =
  createContext<OverlayCoordinatorValue | null>(null);

let activeOverlayLock: OverlayId | null = null;
const listeners = new Set<(overlay: OverlayId | null) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener(activeOverlayLock));
}

function claimOverlayLock(id: OverlayId) {
  if (activeOverlayLock && activeOverlayLock !== id) return false;

  activeOverlayLock = id;
  notifyListeners();
  return true;
}

function releaseOverlayLock(id: OverlayId) {
  if (activeOverlayLock !== id) return;

  activeOverlayLock = null;
  notifyListeners();
}

export function OverlayCoordinatorProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeOverlay, setActiveOverlay] =
    useState<OverlayId | null>(activeOverlayLock);

  useEffect(() => {
    listeners.add(setActiveOverlay);

    return () => {
      listeners.delete(setActiveOverlay);
    };
  }, []);

  const claimOverlay = useCallback((id: OverlayId) => claimOverlayLock(id), []);
  const releaseOverlay = useCallback((id: OverlayId) => {
    releaseOverlayLock(id);
  }, []);
  const value = useMemo(
    () => ({
      activeOverlay,
      claimOverlay,
      releaseOverlay,
    }),
    [activeOverlay, claimOverlay, releaseOverlay],
  );

  return (
    <OverlayCoordinatorContext.Provider value={value}>
      {children}
    </OverlayCoordinatorContext.Provider>
  );
}

export function useOverlayCoordinator() {
  const context = useContext(OverlayCoordinatorContext);

  if (!context) {
    return {
      activeOverlay: null,
      claimOverlay: claimOverlayLock,
      releaseOverlay: releaseOverlayLock,
    };
  }

  return context;
}
