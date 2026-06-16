"use client";

import CountUp from "react-countup";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type XPProgressAnimationProps = {
  currentXp: number;
  nextLevelXp: number;
  xpEarned: number;
  className?: string;
  color?: string;
  compact?: boolean;
};

export function XPProgressAnimation({
  currentXp,
  nextLevelXp,
  xpEarned,
  className,
  color = "var(--primary)",
  compact = false,
}: XPProgressAnimationProps) {
  const reducedMotion = useReducedMotion();
  const previousXp = Math.max(0, currentXp - xpEarned);
  const previousProgress = Math.min((previousXp / nextLevelXp) * 100, 100);
  const currentProgress = Math.min((currentXp / nextLevelXp) * 100, 100);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            XP Progress
          </p>
          <p className={cn("mt-1 font-semibold text-foreground", compact ? "text-xl" : "text-2xl")}>
            <CountUp
              start={reducedMotion ? currentXp : previousXp}
              end={currentXp}
              duration={reducedMotion ? 0 : 1.4}
              separator=","
            />{" "}
            XP
          </p>
        </div>
        {!compact ? (
          <p className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: color }}>
            +{xpEarned.toLocaleString()} XP
          </p>
        ) : null}
      </div>
      <div className={cn("overflow-hidden rounded-full bg-surface-muted", compact ? "h-2" : "h-3")}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={reducedMotion ? false : { width: `${previousProgress}%` }}
          animate={{ width: `${currentProgress}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{currentXp.toLocaleString()} XP earned</span>
        <span>{nextLevelXp.toLocaleString()} XP next level</span>
      </div>
    </div>
  );
}
