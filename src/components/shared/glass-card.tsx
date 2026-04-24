"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Elevation = "surface" | "raised" | "floating";

const elevationClasses: Record<Elevation, string> = {
  surface: "glass-surface",
  raised: "glass-raised",
  floating: "glass-floating",
};

type GlassCardProps = Omit<HTMLMotionProps<"div">, "children"> & {
  elevation?: Elevation;
  hoverLift?: boolean;
  accentColor?: string;
  children?: React.ReactNode;
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, elevation = "surface", hoverLift = false, accentColor, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn("relative rounded-xl p-4", elevationClasses[elevation], className)}
        whileHover={hoverLift ? { y: -2, scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 25 } } : undefined}
        whileTap={hoverLift ? { scale: 0.98 } : undefined}
        {...props}
      >
        {accentColor && (
          <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
        )}
        {children}
      </motion.div>
    );
  },
);

GlassCard.displayName = "GlassCard";
