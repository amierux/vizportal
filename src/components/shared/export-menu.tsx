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
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(!open)}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border bg-popover p-1 shadow-md">
          {onExportCsv && (
            <button className="flex w-full items-center rounded-md px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { onExportCsv(); setOpen(false); }}>
              CSV
            </button>
          )}
          {onExportPdf && (
            <button className="flex w-full items-center rounded-md px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { onExportPdf(); setOpen(false); }}>
              PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
