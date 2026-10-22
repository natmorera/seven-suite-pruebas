'use client';
// Pestaña Sucursales de Configuración › Facturación electrónica.
import { useEffect, useState } from 'react';
import { C } from '@/components/ui/primitives';
import SucursalesSeccion, { type ConfigPlan } from './SucursalesSeccion';

export default function SucursalesPage({ addSignal }: { addSignal?: number } = {}) {
  const [emisorId, setEmisorId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ConfigPlan>({ limiteSucursales: 1, implementacion: false, permitirPruebas: false });
  useEffect(() => {
    let vivo = true;
    fetch('/api/emisores').then(r => r.json()).then((l: { id: string; activo: number }[]) => {
      if (vivo) setEmisorId((l.find(e => Number(e.activo) === 1) ?? l[0])?.id ?? '');
    }).catch(() => { if (vivo) setEmisorId(''); });
    fetch('/api/empresa/plan').then(r => r.json()).then((p: ConfigPlan) => { if (vivo) setPlan(p); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
      {emisorId === null ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p>
        : emisorId ? <SucursalesSeccion emisorId={emisorId} plan={plan} addSignal={addSignal} />
        : <p style={{ fontSize: 12, color: C.n700 }}>Completa primero los datos de la empresa.</p>}
    </div>
  );
}
