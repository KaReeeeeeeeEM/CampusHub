"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { FiEye } from "react-icons/fi";

import {
  BadgeUnlockAnimation,
  type AchievementRarity,
} from "@/components/achievements/badge-unlock-animation";
import { XPProgressAnimation } from "@/components/achievements/xp-progress-animation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AchievementModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badgeName: string;
  badgeRarity: AchievementRarity;
  badgeDescription: string;
  congratulationsMessage?: string;
  xpEarned: number;
  currentLevel: number;
  currentXp: number;
  nextLevelXp: number;
  badgeIcon?: ReactNode;
  badgeColor?: string;
  onViewBadge?: () => void;
  onContinue?: () => void;
};

const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 17) % 84)}%`,
  delay: (index % 8) * 0.05,
  distance: 120 + (index % 6) * 22,
  rotate: index % 2 === 0 ? 80 : -80,
}));

export function AchievementModal({
  open,
  onOpenChange,
  badgeName,
  badgeRarity,
  badgeDescription,
  congratulationsMessage = "Congratulations, you unlocked a new achievement.",
  xpEarned,
  currentLevel,
  currentXp,
  nextLevelXp,
  badgeIcon,
  badgeColor = "var(--primary)",
  onViewBadge,
  onContinue,
}: AchievementModalProps) {
  const reducedMotion = useReducedMotion();

  function continueFlow() {
    onContinue?.();
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {open ? (
            <>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <motion.div
                  className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-[2rem] border border-border bg-background text-foreground shadow-2xl focus:outline-none"
                  initial={
                    reducedMotion
                      ? false
                      : {
                          opacity: 0,
                          scale: 0.94,
                          x: "-50%",
                          y: "calc(-50% + 18px)",
                        }
                  }
                  animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                  exit={
                    reducedMotion
                      ? undefined
                      : {
                          opacity: 0,
                          scale: 0.98,
                          x: "-50%",
                          y: "calc(-50% + 12px)",
                        }
                  }
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  {!reducedMotion ? (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {confettiPieces.map((piece) => (
                        <motion.span
                          key={piece.id}
                          className="absolute top-10 h-2.5 w-1.5 rounded-full"
                          style={{
                            left: piece.left,
                            backgroundColor:
                              piece.id % 3 === 0
                                ? "var(--primary)"
                                : piece.id % 3 === 1
                                  ? "color-mix(in srgb, var(--primary) 72%, white)"
                                  : "color-mix(in srgb, var(--primary) 72%, black)",
                          }}
                          initial={{ opacity: 0, y: -20, rotate: 0 }}
                          animate={{
                            opacity: [0, 1, 1, 0],
                            y: piece.distance,
                            rotate: piece.rotate,
                          }}
                          transition={{
                            delay: piece.delay,
                            duration: 1.6,
                            ease: "easeOut",
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="relative p-7 text-center sm:p-10">
                    <div className="mx-auto max-w-md">
                      <BadgeUnlockAnimation
                        name={badgeName}
                        rarity={badgeRarity}
                        icon={badgeIcon}
                        color={badgeColor}
                      />
                      <Dialog.Title className="campushub-achievement-display mt-8 text-3xl font-bold tracking-normal sm:text-4xl">
                        Hey, you dropped this
                      </Dialog.Title>
                      <Dialog.Description className="mt-5 text-base leading-7 text-muted-foreground">
                        {congratulationsMessage} You earned the{" "}
                        <span className="font-semibold text-foreground">{badgeName}</span>{" "}
                        badge.
                      </Dialog.Description>
                      <p className="mt-5 rounded-2xl bg-secondary-background px-5 py-4 text-sm leading-6 text-muted-foreground">
                        {badgeDescription}
                      </p>
                    </div>
                    <div className="mx-auto mt-6 max-w-md rounded-2xl bg-secondary-background p-4 text-left">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Level {currentLevel}</p>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-bold text-primary-foreground"
                          style={{ backgroundColor: badgeColor }}
                        >
                          +{xpEarned.toLocaleString()} XP
                        </span>
                      </div>
                      <XPProgressAnimation
                        currentXp={currentXp}
                        nextLevelXp={nextLevelXp}
                        xpEarned={xpEarned}
                        color={badgeColor}
                        compact
                      />
                    </div>
                    <div className="mx-auto mt-7 flex max-w-md flex-col gap-3">
                      <Button type="button" className="h-12 w-full text-base" onClick={continueFlow}>
                        Let&apos;s gooooooo!
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={onViewBadge}
                        className={cn("text-muted-foreground", !onViewBadge && "hidden")}
                      >
                        <FiEye className="h-4 w-4" aria-hidden="true" />
                        View Badge
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </>
          ) : null}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
