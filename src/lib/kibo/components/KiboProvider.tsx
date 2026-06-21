"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { KiboEvent } from "../events";
import { KiboContext } from "../hooks/useKibo";
import { kiboService } from "../service/KiboService";
import type {
  KiboContextValue,
  KiboModalPayload,
  KiboNotificationPayload,
  KiboTriggerPayload,
} from "../types";
import { KiboAssistant } from "./KiboAssistant";
import { KiboModal } from "./KiboModal";
import { KiboNotification } from "./KiboNotification";

export function KiboProvider({ children }: { children: React.ReactNode }) {
  const [modalQueue, setModalQueue] = useState<KiboModalPayload[]>([]);
  const [activeModal, setActiveModal] = useState<KiboModalPayload | null>(null);
  const [notification, setNotification] =
    useState<KiboNotificationPayload | null>(null);

  const showModal = useCallback((payload: KiboModalPayload) => {
    setModalQueue((current) => [...current, payload]);
  }, []);

  const showNotification = useCallback((payload: KiboNotificationPayload) => {
    setNotification(payload);
  }, []);

  const triggerEvent = useCallback(
    (event: KiboEvent, payload?: KiboTriggerPayload) => {
      kiboService.triggerEvent(event, payload);
    },
    [],
  );

  useEffect(() => kiboService.subscribeToModals(showModal), [showModal]);
  useEffect(
    () => kiboService.subscribeToNotifications(showNotification),
    [showNotification],
  );

  useEffect(() => {
    if (activeModal || modalQueue.length === 0) return;

    const [next, ...rest] = modalQueue;
    setActiveModal(next);
    setModalQueue(rest);
  }, [activeModal, modalQueue]);

  const value = useMemo<KiboContextValue>(
    () => ({
      showModal,
      showNotification,
      triggerEvent,
      refreshRewardEvents: async () => undefined,
    }),
    [showModal, showNotification, triggerEvent],
  );

  return (
    <KiboContext.Provider value={value}>
      {children}
      <KiboAssistant />
      <KiboModal
        open={Boolean(activeModal)}
        animation={activeModal?.animation ?? "celebrate"}
        title={activeModal?.title ?? ""}
        description={activeModal?.description}
        primaryActionLabel={activeModal?.primaryActionLabel}
        secondaryActionLabel={activeModal?.secondaryActionLabel}
        onPrimaryAction={activeModal?.onPrimaryAction}
        onSecondaryAction={activeModal?.onSecondaryAction}
        onClose={() => setActiveModal(null)}
      >
        {activeModal?.children}
      </KiboModal>
      {notification ? (
        <div className="fixed right-4 top-20 z-[210] w-[min(24rem,calc(100vw-2rem))]">
          <KiboNotification
            animation={notification.animation}
            title={notification.title}
            description={notification.description}
            onDismiss={() => setNotification(null)}
          />
        </div>
      ) : null}
    </KiboContext.Provider>
  );
}
