"use client";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { CalendarOff, UserX } from "lucide-react";

type OnLeave = {
  name: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  startHalf: "am" | "pm" | null;
  endHalf: "am" | "pm" | null;
};
type Holiday = { name: string; date: string };

type Props = {
  data: { onLeave: OnLeave[]; holidays: Holiday[] };
};

export function OutOfOfficeWidget({ data }: Props) {
  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">
          Out of Office
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <UserX className="h-3.5 w-3.5" />
            On Leave Today
          </div>
          {data.onLeave.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everyone is in today.</p>
          ) : (
            <div className="space-y-1.5">
              {data.onLeave.map((l, i) => {
                const sameDay = l.startDate === l.endDate;
                const todayHalf = sameDay
                  ? l.startHalf ?? l.endHalf
                  : null;
                const halfLabel = todayHalf
                  ? todayHalf.toUpperCase()
                  : l.startHalf === "pm"
                  ? "from PM"
                  : l.endHalf === "am"
                  ? "until AM"
                  : null;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        {l.name}
                        {halfLabel && (
                          <Badge variant="outline" className="text-[10px]">
                            {halfLabel}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {l.leaveType}
                        {!sameDay && ` — until ${formatDate(l.endDate)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <CalendarOff className="h-3.5 w-3.5" />
            Upcoming Holidays
          </div>
          {data.holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holidays in the next 60 days.</p>
          ) : (
            <div className="space-y-1">
              {data.holidays.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5 text-sm"
                >
                  <span className="font-medium">{h.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(h.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
