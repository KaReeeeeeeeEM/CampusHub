"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

import {
  getKiboAnimationAsset,
  getKiboExpressionAsset,
  type KiboAnimation,
  type KiboExpression,
} from "../kibo-assets";

type KiboCharacterProps = {
  expression?: KiboExpression;
  animation?: KiboAnimation;
  size?: number;
  alt?: string;
  className?: string;
  imageClassName?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
};

export function KiboCharacter({
  expression = "idle",
  animation,
  size = 144,
  alt,
  className,
  imageClassName,
  dismissible = false,
  onDismiss,
}: KiboCharacterProps) {
  const source = animation
    ? getKiboAnimationAsset(animation).fallback
    : getKiboExpressionAsset(expression);
  const label =
    alt ??
    (animation
      ? `Kibo ${animation.replaceAll("_", " ")} animation`
      : `Kibo ${expression} expression`);

  return (
    <figure
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={source}
        alt={label}
        width={size}
        height={size}
        priority={false}
        className={cn("h-full w-full object-contain", imageClassName)}
      />
      {dismissible ? (
        <button
          type="button"
          aria-label="Dismiss Kibo"
          onClick={onDismiss}
          className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/85 text-sm font-semibold text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground"
        >
          ×
        </button>
      ) : null}
    </figure>
  );
}
