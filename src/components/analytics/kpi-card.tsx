"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Sparkline } from "./sparkline";
import { TrendingUp, TrendingDown } from "lucide-react";
import { fadeInUp } from "@/lib/animations/stagger-variants";

type KpiCardProps = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: { value: number; label?: string };
  sparklineData?: number[];
  sparklineColor?: string;
  onClick?: () => void;
  accentColor?: string;
  className?: string;
  formatFn?: (value: number) => string;
};

export function KpiCard({
  label, value, prefix, suffix, decimals = 0, trend, sparklineData, sparklineColor,
  onClick, accentColor, className, formatFn,
}: KpiCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        "glass-raised relative cursor-default rounded-xl p-4 transition-shadow",
        onClick && "cursor-pointer hover:shadow-lg",
        className,
      )}
      whileHover={onClick ? { y: -2, transition: { type: "spring", stiffness: 300, damping: 25 } } : undefined}
      onClick={onClick}
    >
      {accentColor && (
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
      )}
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          className="text-2xl font-bold tracking-tight"
          formatFn={formatFn}
        />
        {trend && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium", isPositiveTrend ? "text-emerald-600" : "text-rose-600")}>
            {isPositiveTrend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {trend?.label && <p className="mt-0.5 text-[10px] text-muted-foreground">{trend.label}</p>}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-2">
          <Sparkline data={sparklineData} color={sparklineColor} height={28} />
        </div>
      )}
    </motion.div>
  );
}
