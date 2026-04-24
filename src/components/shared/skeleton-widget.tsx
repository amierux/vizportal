import { cn } from "@/lib/utils";

type SkeletonProps = { className?: string; style?: React.CSSProperties };

function Skeleton({ className, style }: SkeletonProps) {
  return <div className={cn("rounded-md bg-muted animate-shimmer", className)} style={style} />;
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
            {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
              <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
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
