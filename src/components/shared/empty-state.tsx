"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fadeInScale } from "@/lib/animations/stagger-variants";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeInScale}
      initial="hidden"
      animate="visible"
      className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center", className)}
    >
      {icon && (
        <motion.div
          className="mb-4 text-muted-foreground"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          {icon}
        </motion.div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <Button className="mt-4" onClick={action.onClick}>{action.label}</Button>}
    </motion.div>
  );
}
