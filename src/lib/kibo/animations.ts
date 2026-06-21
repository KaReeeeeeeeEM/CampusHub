import type { KiboAnimation, KiboAssetSource } from "./types";

const PROCESSED_VIDEO_BASE = "/kibo/videos/processed";

export const KIBO_VIDEOS: Record<KiboAnimation, string> = {
  idle: `${PROCESSED_VIDEO_BASE}/idle.webm`,
  wave: `${PROCESSED_VIDEO_BASE}/wave.webm`,
  celebrate: `${PROCESSED_VIDEO_BASE}/celebrate.webm`,
  streak: `${PROCESSED_VIDEO_BASE}/streak.webm`,
  badge: `${PROCESSED_VIDEO_BASE}/badge.webm`,
  announcement: `${PROCESSED_VIDEO_BASE}/announcement.webm`,
  marketplace: `${PROCESSED_VIDEO_BASE}/marketplace.webm`,
  projectStar: `${PROCESSED_VIDEO_BASE}/project-star.webm`,
  warning: `${PROCESSED_VIDEO_BASE}/warning.webm`,
  sleeping: `${PROCESSED_VIDEO_BASE}/sleeping.webm`,
  thinking: `${PROCESSED_VIDEO_BASE}/thinking.webm`,
};

export const KIBO_VIDEO_SOURCES: Record<KiboAnimation, KiboAssetSource> = {
  idle: {
    webm: `${PROCESSED_VIDEO_BASE}/idle.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/idle.mp4`,
  },
  wave: {
    webm: `${PROCESSED_VIDEO_BASE}/wave.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/wave.mp4`,
  },
  celebrate: {
    webm: `${PROCESSED_VIDEO_BASE}/celebrate.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/celebrate.mp4`,
  },
  streak: {
    webm: `${PROCESSED_VIDEO_BASE}/streak.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/streak.mp4`,
  },
  badge: {
    webm: `${PROCESSED_VIDEO_BASE}/badge.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/badge.mp4`,
  },
  announcement: {
    webm: `${PROCESSED_VIDEO_BASE}/announcement.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/announcement.mp4`,
  },
  marketplace: {
    webm: `${PROCESSED_VIDEO_BASE}/marketplace.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/marketplace.mp4`,
  },
  projectStar: {
    webm: `${PROCESSED_VIDEO_BASE}/project-star.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/project-star.mp4`,
  },
  warning: {
    webm: `${PROCESSED_VIDEO_BASE}/warning.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/warning.mp4`,
  },
  sleeping: {
    webm: `${PROCESSED_VIDEO_BASE}/sleeping.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/sleeping.mp4`,
  },
  thinking: {
    webm: `${PROCESSED_VIDEO_BASE}/thinking.webm`,
    mp4: `${PROCESSED_VIDEO_BASE}/thinking.mp4`,
  },
};

export function getKiboVideo(animation: KiboAnimation) {
  return KIBO_VIDEOS[animation];
}

export function getKiboVideoSources(animation: KiboAnimation) {
  return KIBO_VIDEO_SOURCES[animation];
}
