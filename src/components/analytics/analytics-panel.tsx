"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AnalyticsPanelProps = {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AnalyticsPanel({ title, storageKey, defaultOpen = true, headerActions, children, className }: AnalyticsPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const stored = localStorage.getItem(`analytics-panel-${storageKey}`);
    if (stored !== null) setIsOpen(stored === "true");
  }, [storageKey]);

  function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(`analytics-panel-${storageKey}`, String(next));
  }

  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={toggle} className="flex items-center gap-2 text-sm font-semibold hover:text-foreground/80 transition-colors">
          <motion.span animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4" />
          </motion.span>
          {title}
        </button>
        {isOpen && headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
