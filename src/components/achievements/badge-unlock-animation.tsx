"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { FaCrown } from "react-icons/fa6";

import { cn } from "@/lib/utils";

export type AchievementRarity = "Common" | "Rare" | "Epic" | "Legendary";

const rarityGlow: Record<AchievementRarity, string> = {
  Common: "0 0 36px color-mix(in srgb, var(--primary) 34%, transparent)",
  Rare: "0 0 44px color-mix(in srgb, var(--primary) 42%, transparent)",
  Epic: "0 0 52px color-mix(in srgb, var(--primary) 48%, transparent)",
  Legendary: "0 0 64px color-mix(in srgb, var(--primary) 56%, transparent)",
};

type BadgeUnlockAnimationProps = {
  name: string;
  rarity: AchievementRarity;
  icon?: ReactNode;
  color?: string;
  className?: string;
};

export function BadgeUnlockAnimation({
  name,
  rarity,
  icon,
  color = "var(--primary)",
  className,
}: BadgeUnlockAnimationProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 m-auto h-32 w-32 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: color }}
        initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.28 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-white via-white to-surface shadow-xl"
        style={{ boxShadow: rarityGlow[rarity] }}
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.72, rotate: -6 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <span
          aria-hidden="true"
          className="absolute bottom-4 h-10 w-20 rounded-full opacity-20 blur-sm"
          style={{ backgroundColor: color }}
        />
        <motion.div
          className="relative z-10 -mt-3 text-5xl"
          style={{ color }}
          initial={reducedMotion ? false : { scale: 0.82 }}
          animate={reducedMotion ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {icon ?? <FaCrown className="h-12 w-12 drop-shadow-sm" aria-hidden="true" />}
        </motion.div>
        <span
          className="absolute -bottom-3 rounded-full px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg"
          style={{ backgroundColor: color }}
        >
          Yeayy!
        </span>
      </motion.div>
      <motion.p
        className="campushub-badge-display mt-8 text-center text-xs font-bold uppercase tracking-normal"
        style={{ color }}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
      >
        {rarity} Badge
      </motion.p>
      <span className="sr-only">{name} unlocked</span>
    </div>
  );
}
