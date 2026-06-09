"use client";

import { RevealText } from "@/components/motion/reveal-text";

type TextRevealProps = {
  children: React.ReactNode;
  className?: string;
};

export function TextReveal(props: TextRevealProps) {
  return <RevealText {...props} />;
}
