"use client";

import { useCallback } from "react";
import { ExportMenu } from "@/components/shared/export-menu";
import { downloadElementAsPdf } from "@/lib/utils/export-pdf";
import { generateCsv, downloadCsv } from "@/lib/utils/export-csv";

type DashboardExportProps = {
  dashboardRef: React.RefObject<HTMLDivElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widgetData: Record<string, any>;
};

export function DashboardExport({ dashboardRef, widgetData }: DashboardExportProps) {
  const handlePdf = useCallback(async () => {
    if (!dashboardRef.current) return;
    await downloadElementAsPdf(dashboardRef.current, "dashboard-report", {
      title: "VizPortal Dashboard Report",
      orientation: "landscape",
    });
  }, [dashboardRef]);

  const handleCsv = useCallback(() => {
    const allData: Record<string, unknown>[] = [];
    for (const [type, data] of Object.entries(widgetData)) {
      if (!data) continue;
      if (Array.isArray(data)) {
        data.forEach((item) => allData.push({ widget: type, ...item }));
      } else if (typeof data === "object") {
        allData.push({ widget: type, ...data });
      }
    }
    if (allData.length === 0) return;
    const csv = generateCsv(allData);
    downloadCsv(csv, "dashboard-data");
  }, [widgetData]);

  return <ExportMenu onExportPdf={handlePdf} onExportCsv={handleCsv} />;
}
