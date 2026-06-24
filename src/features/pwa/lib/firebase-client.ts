"use client";

import type { FirebaseApp } from "firebase/app";
import type { Messaging, MessagePayload } from "firebase/messaging";

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

export type FirebaseMessagingStatus = {
  configured: boolean;
  missing: string[];
  vapidConfigured: boolean;
};

let firebaseAppPromise: Promise<FirebaseApp | null> | null = null;
let firebaseMessagingPromise: Promise<Messaging | null> | null = null;

export function getFirebaseClientConfig(): FirebaseClientConfig | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  if (
    !config.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.messagingSenderId ||
    !config.appId
  ) {
    return null;
  }

  return config as FirebaseClientConfig;
}

export function getFirebaseMessagingStatus(): FirebaseMessagingStatus {
  const required = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY],
    [
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    ],
    [
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    ],
    [
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", process.env.NEXT_PUBLIC_FIREBASE_APP_ID],
  ] as const;

  return {
    configured: required.every(([, value]) => Boolean(value)),
    missing: required
      .filter(([, value]) => !value)
      .map(([key]) => key),
    vapidConfigured: Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY),
  };
}

async function getFirebaseApp() {
  if (!firebaseAppPromise) {
    firebaseAppPromise = (async () => {
      const config = getFirebaseClientConfig();

      if (!config) return null;

      const { getApp, getApps, initializeApp } = await import("firebase/app");

      return getApps().length ? getApp() : initializeApp(config);
    })();
  }

  return firebaseAppPromise;
}

export async function getFirebaseMessaging() {
  if (!firebaseMessagingPromise) {
    firebaseMessagingPromise = (async () => {
      if (typeof window === "undefined") return null;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        return null;
      }

      const app = await getFirebaseApp();
      if (!app) return null;

      const { getMessaging, isSupported } = await import("firebase/messaging");

      if (!(await isSupported())) return null;

      return getMessaging(app);
    })();
  }

  return firebaseMessagingPromise;
}

export async function registerFirebaseMessagingToken() {
  const status = getFirebaseMessagingStatus();

  if (!status.configured) {
    throw new Error(`Firebase is missing: ${status.missing.join(", ")}`);
  }

  if (!status.vapidConfigured) {
    throw new Error("Firebase Web Push certificate key is missing.");
  }

  const messaging = await getFirebaseMessaging();

  if (!messaging) {
    throw new Error("Firebase Messaging is not supported in this browser.");
  }

  const registration = await navigator.serviceWorker.ready;
  const { getToken } = await import("firebase/messaging");
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Firebase did not return a messaging token.");
  }

  return token;
}

export async function deleteFirebaseMessagingToken() {
  const messaging = await getFirebaseMessaging();

  if (!messaging) return false;

  const { deleteToken } = await import("firebase/messaging");

  return deleteToken(messaging);
}

export async function listenForFirebaseForegroundMessages(
  callback: (payload: MessagePayload) => void,
) {
  const messaging = await getFirebaseMessaging();

  if (!messaging) return () => undefined;

  const { onMessage } = await import("firebase/messaging");

  return onMessage(messaging, callback);
}
