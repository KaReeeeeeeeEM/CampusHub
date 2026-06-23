export type ReleaseNote = {
  title: string;
  description: string;
};

export const CAMPUSHUB_RELEASE = {
  version: "16.0.0",
  name: "PWA & Engagement Foundation",
  date: "2026-06-20",
  notes: [
    {
      title: "Installable CampusHub",
      description:
        "Desktop, Android, and iOS-ready manifest and service worker foundations.",
    },
    {
      title: "Offline Support",
      description:
        "Cached shell, offline page, runtime caching, and background sync queue for supported mutations.",
    },
    {
      title: "Notification Preferences",
      description:
        "User controls for announcements, events, marketplace orders, project stars, badge unlocks, streak reminders, and almanac reminders.",
    },
    {
      title: "Kibo Engagement Layer",
      description:
        "Kibo notification mappings for milestone, reward, announcement, event, marketplace, and project engagement events.",
    },
  ] satisfies ReleaseNote[],
};

export const RELEASE_NOTES_STORAGE_KEY = `campushub:release-notes:${CAMPUSHUB_RELEASE.version}`;
export const RELEASE_NOTES_AFTER_UPDATE_KEY =
  "campushub:show-release-notes-after-update";
