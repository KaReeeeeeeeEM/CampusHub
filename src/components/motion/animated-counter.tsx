"use client";

import { CountUpStat } from "@/components/motion/count-up-stat";

type AnimatedCounterProps = {
  value: string;
};

export function AnimatedCounter(props: AnimatedCounterProps) {
  return <CountUpStat {...props} />;
}
