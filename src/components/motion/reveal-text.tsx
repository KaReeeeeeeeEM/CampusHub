"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type RevealTextProps = {
  children: React.ReactNode;
  className?: string;
};

export function RevealText({ children, className }: RevealTextProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      className={cn("inline-block", className)}
      initial={reducedMotion ? false : { opacity: 0, y: 12, filter: "blur(8px)" }}
      whileInView={
        reducedMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      viewport={{ once: true, amount: 0.65 }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.span>
  );
}

