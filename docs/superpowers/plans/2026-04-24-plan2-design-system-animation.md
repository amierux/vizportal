# Plan 2: Design System & Animation Framework

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared animation system, glassmorphism components, skeleton loaders, and micro-interaction primitives that all subsequent plans depend on.

**Architecture:** Framer Motion spring presets + stagger variants as reusable configs, glassmorphism card component with depth elevations, skeleton loading system with Suspense integration, animated counter component, and shared analytics UI primitives (KPI card, analytics panel, charts, export menu).

**Tech Stack:** Framer Motion 12, React 19, Tailwind CSS 4, Recharts 3, shadcn/ui

---

## File Structure

### New Files
```
src/lib/animations/spring-presets.ts        — Reusable spring configs (snappy, gentle, bouncy)
src/lib/animations/stagger-variants.ts      — Container/child Framer Motion variants
src/components/shared/glass-card.tsx         — Glassmorphism card (surface/raised/floating)
src/components/shared/animated-counter.tsx   — Count-up number animation
src/components/shared/skeleton-widget.tsx    — Widget-type-aware skeleton with shimmer
src/components/shared/empty-state.tsx        — Animated empty state illustration
src/components/shared/page-transition.tsx    — AnimatePresence route wrapper
src/components/shared/export-menu.tsx        — Dropdown: CSV/PDF export
src/components/shared/date-range-picker.tsx  — Shared date range filter
src/components/analytics/analytics-panel.tsx — Collapsible analytics section wrapper
src/components/analytics/kpi-card.tsx        — Glassmorphism KPI with counter + sparkline
src/components/analytics/analytics-grid.tsx  — Responsive grid for KPI cards
src/components/analytics/drill-down-sheet.tsx — Slide-in detail panel
src/components/analytics/trend-chart.tsx     — Reusable line/area chart wrapper
src/components/analytics/distribution-chart.tsx — Reusable donut/pie wrapper
src/components/analytics/comparison-bar.tsx  — Reusable bar chart wrapper
src/components/analytics/sparkline.tsx       — Mini inline chart for KPI cards
```

### Modified Files
```
src/app/globals.css                          — Add glassmorphism utilities, shimmer keyframe, theme transition
src/lib/utils/animations.ts                 — Export new animation class names
src/app/(portal)/layout.tsx                  — Wrap children with page transition
```

---

### Task 1: Animation Spring Presets & Stagger Variants

**Files:**
- Create: `src/lib/animations/spring-presets.ts`
- Create: `src/lib/animations/stagger-variants.ts`

- [ ] **Step 1: Create spring presets**

Create `/Users/m3n6/ClaudeGravity/vizportal/src/lib/animations/spring-presets.ts`:

```typescript
import type { Transition } from "framer-motion";

/** Buttons, toggles, small interactive elements */
export const snappy: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
};

/** Page transitions, panels, large content areas */
export const gentle: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 20,
};

/** Notifications, badges, attention-grabbing elements */
export const bouncy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 15,
};

/** Quick fade with no spring (for simple opacity transitions) */
export const fade: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

/** Standard duration for CSS-based transitions */
export const DURATION = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
} as const;
```

- [ ] **Step 2: Create stagger variants**

Create `/Users/m3n6/ClaudeGravity/vizportal/src/lib/animations/stagger-variants.ts`:

```typescript
import type { Variants } from "framer-motion";

/** Container that staggers children on mount */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

/** Child that fades in and slides up */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 200, damping: 20 },
  },
};

/** Child that fades in with scale */
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 20 },
  },
};

/** Child that slides in from right */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 200, damping: 20 },
  },
};

/** Page entrance/exit variants */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 150, damping: 20 },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/animations/ && git commit -m "feat: add Framer Motion spring presets and stagger variants"
```

---

### Task 2: Global CSS Enhancements

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/lib/utils/animations.ts`

- [ ] **Step 1: Add glassmorphism utilities and shimmer keyframe to globals.css**

Append after the existing `.row-hover` block (after line 182):

```css
/* Glassmorphism utilities */
.glass-surface {
  background: oklch(1 0 0 / 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid oklch(1 0 0 / 0.2);
}

.dark .glass-surface {
  background: oklch(0.2 0 0 / 0.4);
  border-color: oklch(1 0 0 / 0.1);
}

.glass-raised {
  background: oklch(1 0 0 / 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid oklch(1 0 0 / 0.25);
  box-shadow: 0 4px 16px oklch(0 0 0 / 0.08);
}

.dark .glass-raised {
  background: oklch(0.2 0 0 / 0.5);
  border-color: oklch(1 0 0 / 0.12);
  box-shadow: 0 4px 16px oklch(0 0 0 / 0.3);
}

.glass-floating {
  background: oklch(1 0 0 / 0.8);
  backdrop-filter: blur(24px);
  border: 1px solid oklch(1 0 0 / 0.3);
  box-shadow: 0 8px 32px oklch(0 0 0 / 0.12);
}

.dark .glass-floating {
  background: oklch(0.2 0 0 / 0.6);
  border-color: oklch(1 0 0 / 0.15);
  box-shadow: 0 8px 32px oklch(0 0 0 / 0.4);
}

/* Shimmer animation for skeletons */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.animate-shimmer {
  background: linear-gradient(90deg, transparent 0%, oklch(0.9 0 0 / 0.5) 50%, transparent 100%);
  background-size: 2000px 100%;
  animation: shimmer 2s infinite linear;
}

.dark .animate-shimmer {
  background: linear-gradient(90deg, transparent 0%, oklch(0.3 0 0 / 0.3) 50%, transparent 100%);
  background-size: 2000px 100%;
}

/* Theme transition (smooth color changes) */
.theme-transition,
.theme-transition * {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

/* Pulse glow for threshold alerts */
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 oklch(0.65 0.25 30 / 0.4); }
  50% { box-shadow: 0 0 0 8px oklch(0.65 0.25 30 / 0); }
}

.animate-pulse-glow {
  animation: pulseGlow 2s infinite;
}
```

- [ ] **Step 2: Update animations.ts exports**

Replace `/Users/m3n6/ClaudeGravity/vizportal/src/lib/utils/animations.ts` with:

```typescript
// CSS-based animation classes (globals.css)
export const fadeInUpClass = "animate-fade-in-up";
export const fadeInClass = "animate-fade-in";
export const staggerClass = "animate-stagger";
export const cardHoverClass = "card-hover";
export const rowHoverClass = "row-hover";
export const shimmerClass = "animate-shimmer";
export const pulseGlowClass = "animate-pulse-glow";

// Glassmorphism elevation classes
export const glassSurface = "glass-surface";
export const glassRaised = "glass-raised";
export const glassFloating = "glass-floating";
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/lib/utils/animations.ts && git commit -m "feat: add glassmorphism utilities, shimmer animation, theme transitions to global CSS"
```

---

### Task 3: Glass Card Component

**Files:**
- Create: `src/components/shared/glass-card.tsx`

- [ ] **Step 1: Create the component**

```typescript
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

type GlassCardProps = HTMLMotionProps<"div"> & {
  elevation?: Elevation;
  hoverLift?: boolean;
  accentColor?: string;
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, elevation = "surface", hoverLift = false, accentColor, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl p-4",
          elevationClasses[elevation],
          className,
        )}
        whileHover={
          hoverLift
            ? { y: -2, scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 25 } }
            : undefined
        }
        whileTap={hoverLift ? { scale: 0.98 } : undefined}
        {...props}
      >
        {accentColor && (
          <div
            className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        )}
        {children}
      </motion.div>
    );
  },
);

GlassCard.displayName = "GlassCard";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/glass-card.tsx && git commit -m "feat: add GlassCard component with elevation variants and hover lift"
```

---

### Task 4: Animated Counter Component

**Files:**
- Create: `src/components/shared/animated-counter.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";

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
      onUpdate: (latest) => {
        setDisplayValue(latest);
      },
    });

    return () => controls.stop();
  }, [isInView, value, duration]);

  const formatted = formatFn
    ? formatFn(displayValue)
    : displayValue.toFixed(decimals);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/animated-counter.tsx && git commit -m "feat: add AnimatedCounter component with scroll-triggered count-up"
```

---

### Task 5: Skeleton Widget Component

**Files:**
- Create: `src/components/shared/skeleton-widget.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted animate-shimmer",
        className,
      )}
    />
  );
}

type SkeletonWidgetProps = {
  type?: "card" | "chart" | "table" | "kpi";
  className?: string;
};

export function SkeletonWidget({ type = "card", className }: SkeletonWidgetProps) {
  switch (type) {
    case "kpi":
      return (
        <div className={cn("glass-surface rounded-xl p-4 space-y-3", className)}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-2 w-16" />
        </div>
      );
    case "chart":
      return (
        <div className={cn("glass-surface rounded-xl p-4 space-y-4", className)}>
          <Skeleton className="h-4 w-32" />
          <div className="flex items-end gap-2 h-32">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1"
                style={{ height: `${30 + Math.random() * 70}%` }}
              />
            ))}
          </div>
        </div>
      );
    case "table":
      return (
        <div className={cn("glass-surface rounded-xl p-4 space-y-3", className)}>
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className={cn("glass-surface rounded-xl p-4 space-y-3", className)}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      );
  }
}

export { Skeleton };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/skeleton-widget.tsx && git commit -m "feat: add Skeleton and SkeletonWidget components with shimmer animation"
```

---

### Task 6: Empty State & Page Transition Components

**Files:**
- Create: `src/components/shared/empty-state.tsx`
- Create: `src/components/shared/page-transition.tsx`

- [ ] **Step 1: Create empty state component**

```typescript
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fadeInScale } from "@/lib/animations/stagger-variants";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeInScale}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center",
        className,
      )}
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
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Create page transition component**

```typescript
"use client";

import { motion } from "framer-motion";
import { pageTransition } from "@/lib/animations/stagger-variants";

type PageTransitionProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/empty-state.tsx src/components/shared/page-transition.tsx && git commit -m "feat: add EmptyState and PageTransition components"
```

---

### Task 7: Export Menu & Date Range Picker

**Files:**
- Create: `src/components/shared/export-menu.tsx`
- Create: `src/components/shared/date-range-picker.tsx`

- [ ] **Step 1: Create export menu component**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type ExportMenuProps = {
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  disabled?: boolean;
};

export function ExportMenu({ onExportCsv, onExportPdf, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border bg-popover p-1 shadow-md">
          {onExportCsv && (
            <button
              className="flex w-full items-center rounded-md px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => { onExportCsv(); setOpen(false); }}
            >
              CSV
            </button>
          )}
          {onExportPdf && (
            <button
              className="flex w-full items-center rounded-md px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => { onExportPdf(); setOpen(false); }}
            >
              PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create date range picker**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  presets?: { label: string; start: string; end: string }[];
};

function getPresets(): { label: string; getDates: () => { start: string; end: string } }[] {
  return [
    {
      label: "This month",
      getDates: () => {
        const now = new Date();
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
          end: now.toISOString().split("T")[0],
        };
      },
    },
    {
      label: "Last 30 days",
      getDates: () => {
        const now = new Date();
        const d = new Date();
        d.setDate(d.getDate() - 29);
        return {
          start: d.toISOString().split("T")[0],
          end: now.toISOString().split("T")[0],
        };
      },
    },
    {
      label: "This year",
      getDates: () => {
        const now = new Date();
        return {
          start: `${now.getFullYear()}-01-01`,
          end: now.toISOString().split("T")[0],
        };
      },
    },
  ];
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const presets = getPresets();

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Calendar className="mr-1.5 h-3.5 w-3.5" />
        {startDate} — {endDate}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 rounded-lg border bg-popover p-3 shadow-md">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onChange(e.target.value, endDate)}
                className="rounded border px-2 py-1 text-sm"
              />
              <span className="text-sm text-muted-foreground self-center">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onChange(startDate, e.target.value)}
                className="rounded border px-2 py-1 text-sm"
              />
            </div>
            <div className="flex gap-1 border-t pt-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  className="rounded px-2 py-1 text-xs hover:bg-accent"
                  onClick={() => {
                    const { start, end } = preset.getDates();
                    onChange(start, end);
                    setOpen(false);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/export-menu.tsx src/components/shared/date-range-picker.tsx && git commit -m "feat: add ExportMenu and DateRangePicker shared components"
```

---

### Task 8: Analytics Components — Sparkline, KPI Card, Analytics Grid

**Files:**
- Create: `src/components/analytics/sparkline.tsx`
- Create: `src/components/analytics/kpi-card.tsx`
- Create: `src/components/analytics/analytics-grid.tsx`

- [ ] **Step 1: Create sparkline**

```typescript
"use client";

import { ResponsiveContainer, LineChart, Line } from "recharts";

type SparklineProps = {
  data: number[];
  color?: string;
  height?: number;
};

export function Sparkline({ data, color = "var(--color-primary)", height = 32 }: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={true}
          animationDuration={1200}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create KPI card**

```typescript
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
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  trend,
  sparklineData,
  sparklineColor,
  onClick,
  accentColor,
  className,
  formatFn,
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
        <div
          className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
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
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              isPositiveTrend ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {isPositiveTrend ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {trend?.label && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{trend.label}</p>
      )}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-2">
          <Sparkline data={sparklineData} color={sparklineColor} height={28} />
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 3: Create analytics grid**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/analytics/ && git commit -m "feat: add Sparkline, KpiCard, and AnalyticsGrid components"
```

---

### Task 9: Analytics Components — Charts & Panel

**Files:**
- Create: `src/components/analytics/trend-chart.tsx`
- Create: `src/components/analytics/distribution-chart.tsx`
- Create: `src/components/analytics/comparison-bar.tsx`
- Create: `src/components/analytics/analytics-panel.tsx`
- Create: `src/components/analytics/drill-down-sheet.tsx`

- [ ] **Step 1: Create trend chart**

```typescript
"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";

type TrendChartProps = {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xAxisKey?: string;
  title?: string;
  color?: string;
  height?: number;
  type?: "line" | "area";
  className?: string;
};

export function TrendChart({
  data,
  dataKey,
  xAxisKey = "date",
  title,
  color = "var(--color-chart-1)",
  height = 200,
  type = "line",
  className,
}: TrendChartProps) {
  const Chart = type === "area" ? AreaChart : LineChart;

  return (
    <div className={cn("glass-surface rounded-xl p-4", className)}>
      {title && <h4 className="mb-3 text-sm font-semibold">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              border: "1px solid var(--color-border)",
              backdropFilter: "blur(12px)",
              backgroundColor: "var(--color-popover)",
            }}
          />
          {type === "area" ? (
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.1}
              strokeWidth={2}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          ) : (
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 5 }}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Create distribution chart**

```typescript
"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { cn } from "@/lib/utils";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

type DistributionChartProps = {
  data: Array<{ name: string; value: number }>;
  title?: string;
  height?: number;
  className?: string;
};

export function DistributionChart({ data, title, height = 200, className }: DistributionChartProps) {
  return (
    <div className={cn("glass-surface rounded-xl p-4", className)}>
      {title && <h4 className="mb-3 text-sm font-semibold">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-popover)",
            }}
          />
          <Legend iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create comparison bar chart**

```typescript
"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

type ComparisonBarProps = {
  data: Array<Record<string, unknown>>;
  bars: Array<{ dataKey: string; color: string; label?: string }>;
  xAxisKey?: string;
  title?: string;
  height?: number;
  layout?: "horizontal" | "vertical";
  className?: string;
};

export function ComparisonBar({
  data,
  bars,
  xAxisKey = "name",
  title,
  height = 200,
  layout = "vertical",
  className,
}: ComparisonBarProps) {
  return (
    <div className={cn("glass-surface rounded-xl p-4", className)}>
      {title && <h4 className="mb-3 text-sm font-semibold">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={layout === "horizontal" ? "vertical" : "horizontal"}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
          {layout === "horizontal" ? (
            <>
              <YAxis dataKey={xAxisKey} type="category" tick={{ fontSize: 11 }} width={80} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            </>
          )}
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-popover)",
            }}
          />
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.color}
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create analytics panel**

```typescript
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AnalyticsPanelProps = {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AnalyticsPanel({
  title,
  storageKey,
  defaultOpen = true,
  headerActions,
  children,
  className,
}: AnalyticsPanelProps) {
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
        <button
          onClick={toggle}
          className="flex items-center gap-2 text-sm font-semibold hover:text-foreground/80 transition-colors"
        >
          <motion.span
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
          {title}
        </button>
        {isOpen && headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
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
```

- [ ] **Step 5: Create drill-down sheet**

```typescript
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type DrillDownSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function DrillDownSheet({ open, onClose, title, children, className }: DrillDownSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "fixed right-0 top-0 z-50 h-full w-full max-w-lg border-l bg-background shadow-xl",
              className,
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">{title}</h3>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto p-6" style={{ height: "calc(100% - 65px)" }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/ && git commit -m "feat: add TrendChart, DistributionChart, ComparisonBar, AnalyticsPanel, DrillDownSheet"
```

---

### Task 10: Build Verification

- [ ] **Step 1: TypeScript check**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npx tsc --noEmit 2>&1
```

Fix any errors.

- [ ] **Step 2: Lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run lint 2>&1
```

- [ ] **Step 3: Tests**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm test 2>&1
```

- [ ] **Step 4: Commit fixes if needed**

```bash
git add -A && git commit -m "fix: resolve build issues from design system components"
```
