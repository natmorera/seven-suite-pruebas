'use client';
// Datos de la empresa para los documentos (encabezado y comprobantes)
import { useEffect, useState } from 'react';

export interface EmpresaDoc { nombre: string; identificacion: string; direccion: string }
let cache: EmpresaDoc | null = null;

export function useEmpresaDoc(): EmpresaDoc {
  const [e, setE] = useState<EmpresaDoc>(cache ?? { nombre: '', identificacion: '', direccion: '' });
  useEffect(() => {
    if (cache) return;
    let vivo = true;
    fetch('/api/empresa').then(r => r.json()).then(d => {
      cache = { nombre: d?.datos?.nombreLegal || d?.datos?.nombreComercial || '', identificacion: d?.datos?.numeroId ?? '', direccion: d?.datos?.direccion ?? '' };
      if (vivo) setE(cache);
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  return e;
}
