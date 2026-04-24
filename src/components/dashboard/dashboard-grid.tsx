"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { DashboardWidget, RoleName } from "@/types";
import { WidgetCard } from "./widget-card";
import { CustomizePanel } from "./customize-panel";
import { HeroMetrics } from "./hero-metrics";
import { DashboardExport } from "./dashboard-export";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTransition } from "@/components/shared/page-transition";
import { staggerContainer, fadeInUp } from "@/lib/animations/stagger-variants";
import { LayoutGrid } from "lucide-react";

type Props = {
  widgets: DashboardWidget[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widgetData: Record<string, any>;
  roles: RoleName[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  heroData: Record<string, any>;
};

export function DashboardGrid({ widgets, widgetData, roles, heroData }: Props) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  return (
    <PageTransition>
      <div ref={dashboardRef} className="space-y-6">
        <HeroMetrics roles={roles} data={heroData} />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {widgets.length} widget{widgets.length !== 1 ? "s" : ""} active
          </p>
          <div className="flex items-center gap-2">
            <DashboardExport dashboardRef={dashboardRef} widgetData={widgetData} />
            <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)}>
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Customize
            </Button>
          </div>
        </div>

        {widgets.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="h-10 w-10" />}
            title="No widgets yet"
            description="Add widgets to build your personalized dashboard."
            action={{ label: "Customize Dashboard", onClick: () => setCustomizeOpen(true) }}
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {widgets.map((widget) => (
              <motion.div key={widget.id} variants={fadeInUp}>
                <WidgetCard widget={widget} data={widgetData[widget.widget_type]} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <CustomizePanel
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        widgets={widgets}
      />
    </PageTransition>
  );
}
