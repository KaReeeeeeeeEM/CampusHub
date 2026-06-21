import type { KiboAssetSource, KiboMood } from "./types";

export const KIBO_IMAGES: Record<KiboMood, string> = {
  happy: "/kibo/images/processed/happy.png",
  thinking: "/kibo/images/processed/thinking.png",
  proud: "/kibo/images/processed/proud.png",
  sleepy: "/kibo/images/processed/sleepy.png",
  curious: "/kibo/images/processed/curious.png",
  celebrate: "/kibo/images/processed/celebrate.png",
};

export const KIBO_IMAGE_SOURCES: Record<KiboMood, KiboAssetSource> =
  Object.fromEntries(
    Object.entries(KIBO_IMAGES).map(([mood, png]) => [mood, { png }]),
  ) as Record<KiboMood, KiboAssetSource>;

export function getKiboImage(mood: KiboMood) {
  return KIBO_IMAGES[mood];
}
