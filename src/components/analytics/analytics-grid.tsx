"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { staggerContainer } from "@/lib/animations/stagger-variants";

type AnalyticsGridProps = {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
};

export function AnalyticsGrid({ children, columns = 4, className }: AnalyticsGridProps) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn("grid gap-4", colClass[columns], className)}
    >
      {children}
    </motion.div>
  );
}
