"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

type AnimatedCounterProps = {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (value: number) => string;
};

export function AnimatedCounter({
  value,
  duration = 0.8,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  formatFn,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(latest),
    });
    return () => controls.stop();
  }, [isInView, value, duration]);

  const formatted = formatFn ? formatFn(displayValue) : displayValue.toFixed(decimals);

  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
