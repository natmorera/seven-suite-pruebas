"use client";

import { useState } from "react";
import { Download, Menu, Loader2, Printer } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import { CONTENT_PADDING } from "@/lib/layout";
import { PrintModal } from "@/components/PrintModal";

export function PageHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { data } = useDashboard();
  const [exporting, setExporting] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas-pro"),
      ]);
      const node = document.getElementById("dashboard-export-root");
      if (!node) return;

      const canvas = await html2canvas(node, { backgroundColor: "#F9F9F9", scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const pdfWidth = 794;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [pdfWidth, pdfHeight] });
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.name.replace(/\s+/g, "-").toLowerCase()}-dashboard.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <header className={`${CONTENT_PADDING} h-[52px] shrink-0 bg-white border-b border-neutral-500 flex items-center`}>
      <div className="flex items-center justify-between gap-3 max-w-[1400px] w-full mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onMenuClick}
            aria-label="Abrir menú"
            className="md:hidden text-neutral-900 shrink-0 cursor-pointer w-8 h-8 flex items-center justify-center rounded border border-neutral-500"
          >
            <Menu size={15} />
          </button>
          <h1 className="text-page-title text-neutral-900 truncate">{data.name}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setPrintOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-neutral-200 border border-neutral-500 transition-colors text-neutral-900 text-body font-medium px-3.5 h-8 rounded cursor-pointer whitespace-nowrap"
          >
            Imprimir
            <Printer size={13} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 transition-colors text-white text-body font-medium px-3.5 h-8 rounded cursor-pointer whitespace-nowrap"
          >
            {exporting ? "Exportando…" : "Exportar"}
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          </button>
        </div>
      </div>
      {printOpen && <PrintModal hotelName={data.name} onClose={() => setPrintOpen(false)} />}
    </header>
  );
}
