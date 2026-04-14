"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DashboardWidget } from "@/types";
import { WidgetCard } from "./widget-card";
import { CustomizePanel } from "./customize-panel";

type Props = {
  widgets: DashboardWidget[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widgetData: Record<string, any>;
};

export function DashboardGrid({ widgets, widgetData }: Props) {
  const [customizeOpen, setCustomizeOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{widgets.length} widget{widgets.length !== 1 ? "s" : ""} active</p>
        <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)}>
          Customize
        </Button>
      </div>

      {widgets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No widgets yet. Click <strong>Customize</strong> to add some.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              data={widgetData[widget.widget_type]}
            />
          ))}
        </div>
      )}

      <CustomizePanel
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        widgets={widgets}
      />
    </div>
  );
}
