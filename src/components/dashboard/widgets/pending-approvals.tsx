"use client";

type Props = {
  data: { count: number };
};

export function PendingApprovalsWidget({ data }: Props) {
  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
      </div>
      <div>
        <div className={`text-2xl font-bold ${data.count > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
          {data.count}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {data.count > 0 ? "awaiting your review" : "no pending approvals"}
        </div>
      </div>
    </div>
  );
}
