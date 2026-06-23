# Phase 16: PWA & Engagement Foundation

## Scope

Phase 16 adds the installable PWA shell, service worker, offline page, push subscription architecture, notification preference center, Kibo notification hooks, update detection, release notes, and an internal verification page.

This phase intentionally does not deliver SMS or email. Push records and subscriptions are structured so Web Push, Firebase, or OneSignal delivery can be connected later without changing the user-facing preferences.

## Supported Push Events

- Announcements
- Events
- Marketplace orders
- Project stars
- Badge unlocks
- Streak reminders
- Almanac reminders

## Key Files

- `public/sw.js`: service worker, offline fallback, runtime caching, queued API mutations, push notification display, notification click routing.
- `public/manifest.webmanifest`: installable app metadata, icons, shortcuts, standalone display.
- `src/features/pwa/lib/engagement-events.ts`: single registry for push/in-app campaign definitions.
- `src/features/pwa/lib/notification-preferences.ts`: preference schema and default values.
- `src/features/pwa/components/notification-settings-panel.tsx`: reusable preferences and browser push setup UI.
- `src/features/pwa/components/pwa-provider.tsx`: service worker registration, app update detection, Kibo push integration, release notes trigger.
- `src/app/(app)/dashboard/pwa/page.tsx`: internal PWA showcase and verification page.
- `src/app/offline/page.tsx`: offline fallback route.

## Environment Flags

Use these flags to expose and test the foundation:

```env
FEATURE_PWA="true"
FEATURE_PUSH_ARCHITECTURE="true"
FEATURE_NOTIFICATIONS="true"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
```

VAPID values can remain empty until server push delivery is implemented.

## Testing

1. Start the app: `npm run dev`.
2. Open `/dashboard/pwa` in a Chromium browser.
3. Confirm the service worker registers and the offline capability card becomes active.
4. Open DevTools > Application > Manifest and confirm installability metadata is present.
5. Open DevTools > Application > Service Workers and confirm `/sw.js` is active.
6. Use the PWA showcase page to select each engagement campaign and click `Test notification`.
7. Grant notification permission and test local browser notifications.
8. Go offline in DevTools and refresh a previously visited dashboard page. The cached shell should load, or `/offline` should render.
9. Update `public/sw.js` cache version during development, reload, and confirm the update banner appears.
10. Click `Release notes` from the PWA page or update banner and confirm the modal opens.

