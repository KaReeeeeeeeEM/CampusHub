import { getKiboEventDefinition, type KiboEvent } from "../events";
import type {
  KiboModalPayload,
  KiboNotificationPayload,
  KiboTriggerPayload,
} from "../types";

const KIBO_MODAL_EVENT = "campushub:kibo:modal";
const KIBO_NOTIFICATION_EVENT = "campushub:kibo:notification";
const KIBO_TRIGGER_EVENT = "campushub:kibo:trigger";

export class KiboService {
  showModal(payload: KiboModalPayload) {
    this.dispatch(KIBO_MODAL_EVENT, payload);
  }

  showNotification(payload: KiboNotificationPayload) {
    this.dispatch(KIBO_NOTIFICATION_EVENT, payload);
  }

  triggerEvent(event: KiboEvent, payload: KiboTriggerPayload = {}) {
    const definition = getKiboEventDefinition(event);

    this.dispatch(KIBO_TRIGGER_EVENT, {
      event,
      definition,
      payload,
    });

    this.showModal({
      animation: definition.animation,
      title: payload.title ?? definition.title,
      description: payload.description ?? definition.description,
      metadata: payload.metadata,
    });
  }

  subscribe<T>(eventName: string, callback: (payload: T) => void) {
    if (typeof window === "undefined") return () => undefined;

    const listener = (event: Event) => {
      callback((event as CustomEvent<T>).detail);
    };

    window.addEventListener(eventName, listener);

    return () => window.removeEventListener(eventName, listener);
  }

  subscribeToModals(callback: (payload: KiboModalPayload) => void) {
    return this.subscribe<KiboModalPayload>(KIBO_MODAL_EVENT, callback);
  }

  subscribeToNotifications(
    callback: (payload: KiboNotificationPayload) => void,
  ) {
    return this.subscribe<KiboNotificationPayload>(
      KIBO_NOTIFICATION_EVENT,
      callback,
    );
  }

  private dispatch<T>(eventName: string, payload: T) {
    if (typeof window === "undefined") return;

    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  }
}

export const kiboService = new KiboService();
