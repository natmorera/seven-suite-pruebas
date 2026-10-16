"use client";

import { X, Printer } from "lucide-react";

// Modal de confirmación antes de imprimir, adaptado del patrón de modales de
// exportación del resto de la suite. El navegador es quien realmente ofrece
// la selección de impresora (vía window.print()). Este modal solo confirma
// la acción y evita imprimir por accidente.
export function PrintModal({
  hotelName,
  onClose,
}: {
  hotelName: string;
  onClose: () => void;
}) {
  function handlePrint() {
    onClose();
    // Pequeño delay para que el modal se desmonte del DOM antes de imprimir
    // (si no, el propio modal aparecería en la vista de impresión).
    setTimeout(() => window.print(), 50);
  }

  return (
    <div
      className="fixed inset-0 bg-black/35 z-[1000] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[10px] w-full max-w-[420px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-500">
          <span className="text-section-title text-neutral-900">Imprimir dashboard</span>
          <button onClick={onClose} className="text-neutral-700 hover:text-neutral-900 cursor-pointer p-1">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5">
          <p className="text-body text-neutral-700 leading-relaxed">
            Se va a imprimir el dashboard actual de <strong className="text-neutral-900">{hotelName}</strong>.
            En la siguiente pantalla podrás elegir la impresora y ajustar el formato de papel.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-neutral-500 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 h-8 rounded border border-neutral-500 text-body font-medium text-neutral-900 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 h-8 rounded bg-primary hover:bg-primary-hover transition-colors text-white text-body font-medium cursor-pointer"
          >
            Imprimir
            <Printer size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
