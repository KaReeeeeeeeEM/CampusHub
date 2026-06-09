"use client";

import CountUp from "react-countup";
import { useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

type CountUpStatProps = {
  value: string;
};

function parseStat(value: string) {
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);

  if (!match) {
    return { number: null, suffix: value };
  }

  return {
    number: Number(match[1]),
    suffix: match[2] ?? ""
  };
}

export function CountUpStat({ value }: CountUpStatProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reducedMotion = useReducedMotion();
  const { number, suffix } = parseStat(value);

  if (number === null) {
    return <span>{value}</span>;
  }

  return (
    <span ref={ref}>
      {inView ? (
        <CountUp
          end={number}
          duration={reducedMotion ? 0 : 1.25}
          suffix={suffix}
          preserveValue
        />
      ) : (
        `0${suffix}`
      )}
    </span>
  );
}
