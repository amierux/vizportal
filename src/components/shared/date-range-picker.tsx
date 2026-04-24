"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
};

function getPresets() {
  return [
    {
      label: "This month",
      getDates: () => {
        const now = new Date();
        return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], end: now.toISOString().split("T")[0] };
      },
    },
    {
      label: "Last 30 days",
      getDates: () => {
        const now = new Date();
        const d = new Date(); d.setDate(d.getDate() - 29);
        return { start: d.toISOString().split("T")[0], end: now.toISOString().split("T")[0] };
      },
    },
    {
      label: "This year",
      getDates: () => {
        const now = new Date();
        return { start: `${now.getFullYear()}-01-01`, end: now.toISOString().split("T")[0] };
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
              <input type="date" value={startDate} onChange={(e) => onChange(e.target.value, endDate)} className="rounded border px-2 py-1 text-sm" />
              <span className="text-sm text-muted-foreground self-center">to</span>
              <input type="date" value={endDate} onChange={(e) => onChange(startDate, e.target.value)} className="rounded border px-2 py-1 text-sm" />
            </div>
            <div className="flex gap-1 border-t pt-2">
              {presets.map((preset) => (
                <button key={preset.label} className="rounded px-2 py-1 text-xs hover:bg-accent"
                  onClick={() => { const { start, end } = preset.getDates(); onChange(start, end); setOpen(false); }}>
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
