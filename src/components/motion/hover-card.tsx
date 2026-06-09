"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

export function HoverCard({ children, className, ...props }: HTMLMotionProps<"div">) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("premium-card", className)}
      whileHover={reducedMotion ? undefined : { y: -5, scale: 1.01 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

