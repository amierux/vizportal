"use client";

type Props = {
  data: { count: number };
};

export function PendingFormsWidget({ data }: Props) {
  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Pending Forms</p>
      </div>
      <div>
        <div className={`text-2xl font-bold ${data.count > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
          {data.count}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {data.count > 0 ? "Fill forms" : "no pending forms"}
        </div>
      </div>
    </div>
  );
}
