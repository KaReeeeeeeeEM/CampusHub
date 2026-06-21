"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

import { getKiboImage } from "../images";
import type { KiboMood } from "../types";

const sizeClasses = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-28 w-28",
  xl: "h-40 w-40",
} as const;

type KiboAvatarProps = {
  mood?: KiboMood;
  size?: keyof typeof sizeClasses;
  className?: string;
  priority?: boolean;
};

export function KiboAvatar({
  mood = "happy",
  size = "md",
  className,
  priority = false,
}: KiboAvatarProps) {
  return (
    <Image
      src={getKiboImage(mood)}
      alt={`Kibo ${mood}`}
      width={256}
      height={256}
      priority={priority}
      className={cn("object-contain", sizeClasses[size], className)}
    />
  );
}
