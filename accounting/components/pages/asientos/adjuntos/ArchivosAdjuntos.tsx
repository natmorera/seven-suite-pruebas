'use client';
// Lista de archivos adjuntos de un asiento: cada archivo se abre en vista previa
import { useState } from 'react';
import { C, FONT, radius } from '@/components/ui/tokens';
import { useAlmacen } from '@/components/pages/empresa/datos/almacen';
import { empresaAlmacen } from '@/components/pages/empresa/datos/empresa';
import VistaPreviaDocumento from './VistaPreviaDocumento';
import { type ContextoDocumento } from './documentoEjemplo';

const IcClip = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12.5 7.5l-5.5 5.5a4 4 0 01-5.66-5.66l6-6a2.67 2.67 0 013.77 3.77L5 11.23a1.33 1.33 0 01-1.89-1.89l5.5-5.5"/></svg>;

// Las fechas YYYY-MM-DD se muestran como DD/MM/AAAA
const fechaLegible = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f) ? f.split('-').reverse().join('/') : f;

export default function ArchivosAdjuntos({ archivos, asiento }: { archivos: string[]; asiento: Omit<ContextoDocumento, 'empresa' | 'identificacion'> }) {
  const empresa = useAlmacen(empresaAlmacen);
  const [abierto, setAbierto] = useState<string | null>(null);
  return (
    <>
      {archivos.map(f => (
        <button key={f} type="button" onClick={() => setAbierto(f)} title="Ver documento"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '3px 10px', border: `1px solid ${C.n500}`, borderRadius: radius.pill, marginRight: 6, marginBottom: 4, background: C.n000, color: C.n900, cursor: 'pointer', fontFamily: FONT }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.n500; }}>
          <IcClip /> {f}
        </button>
      ))}
      {abierto && (
        <VistaPreviaDocumento nombre={abierto} onClose={() => setAbierto(null)}
          contexto={{ ...asiento, fecha: fechaLegible(asiento.fecha), empresa: empresa.nombreLegal, identificacion: empresa.numeroId }} />
      )}
    </>
  );
}
