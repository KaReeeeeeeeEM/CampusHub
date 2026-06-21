export const KIBO_MEDIA_BASE_PATH = "/kibo" as const;

export const kiboVideos = {
  idle: `${KIBO_MEDIA_BASE_PATH}/videos/processed/idle.webm`,
  wave: `${KIBO_MEDIA_BASE_PATH}/videos/processed/wave.webm`,
  celebrate: `${KIBO_MEDIA_BASE_PATH}/videos/processed/celebrate.webm`,
  streak: `${KIBO_MEDIA_BASE_PATH}/videos/processed/streak.webm`,
  badge: `${KIBO_MEDIA_BASE_PATH}/videos/processed/badge.webm`,
  announcement: `${KIBO_MEDIA_BASE_PATH}/videos/processed/announcement.webm`,
  marketplace: `${KIBO_MEDIA_BASE_PATH}/videos/processed/marketplace.webm`,
  "project-star": `${KIBO_MEDIA_BASE_PATH}/videos/processed/project-star.webm`,
  warning: `${KIBO_MEDIA_BASE_PATH}/videos/processed/warning.webm`,
  sleeping: `${KIBO_MEDIA_BASE_PATH}/videos/processed/sleeping.webm`,
  thinking: `${KIBO_MEDIA_BASE_PATH}/videos/processed/thinking.webm`,
} as const;

export const kiboImages = {
  happy: `${KIBO_MEDIA_BASE_PATH}/images/processed/happy.png`,
  thinking: `${KIBO_MEDIA_BASE_PATH}/images/processed/thinking.png`,
  proud: `${KIBO_MEDIA_BASE_PATH}/images/processed/proud.png`,
  sleepy: `${KIBO_MEDIA_BASE_PATH}/images/processed/sleepy.png`,
  curious: `${KIBO_MEDIA_BASE_PATH}/images/processed/curious.png`,
  celebrate: `${KIBO_MEDIA_BASE_PATH}/images/processed/celebrate.png`,
} as const;

export type KiboVideo = keyof typeof kiboVideos;
export type KiboImage = keyof typeof kiboImages;

export function getKiboVideoAsset(video: KiboVideo) {
  return kiboVideos[video];
}

export function getKiboImageAsset(image: KiboImage) {
  return kiboImages[image];
}
