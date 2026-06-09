"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer } from "@/components/motion/stagger-container";

type ScrollRevealProps = React.HTMLAttributes<HTMLDivElement> & {
  delay?: number;
  stagger?: boolean;
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  stagger = false,
}: ScrollRevealProps) {
  if (stagger) {
    return <StaggerContainer className={className}>{children}</StaggerContainer>;
  }

  return (
    <FadeIn className={className} delay={delay / 1000}>
      {children}
    </FadeIn>
  );
}
