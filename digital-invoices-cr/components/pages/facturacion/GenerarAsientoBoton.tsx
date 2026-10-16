'use client';
// «Generar asiento» para una venta o compra aceptada que quedó sin asiento.
// Normalmente el asiento se genera solo al aceptarse (y las tareas
// automáticas completan los que falten); esto queda por si alguno falló.
// `compacto`: versión para la columna Asiento de las tablas.
import { useState } from 'react';
import { C, FONT } from '@/components/ui/primitives';

export default function GenerarAsientoBoton({ url, onHecho, compacto }: { url: string; onHecho?: (consecutivo: string) => void; compacto?: boolean }) {
  const [estado, setEstado] = useState<'listo' | 'trabajando' | 'hecho'>('listo');
  const [msg, setMsg] = useState<string | null>(null);
  const [consecutivo, setConsecutivo] = useState('');
  async function generar(e: React.MouseEvent) {
    e.stopPropagation();
    setEstado('trabajando'); setMsg(null);
    const r = await fetch(url, { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) { setEstado('listo'); setMsg(d.error ?? 'No se pudo generar el asiento.'); return; }
    setEstado('hecho'); setConsecutivo(String(d.consecutivo ?? '')); setMsg(`Asiento ${d.consecutivo ?? ''} generado.`);
    onHecho?.(String(d.consecutivo ?? ''));
  }
  if (compacto) {
    if (estado === 'hecho') return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{consecutivo}</span>;
    return (
      <span style={{ fontFamily: FONT }}>
        <button onClick={generar} disabled={estado === 'trabajando'} title={msg ?? 'Generar el asiento con las cuentas configuradas'}
          style={{ height: 26, padding: '0 10px', borderRadius: 6, border: `1px solid ${msg ? C.error : C.brand}`, background: '#fff', color: msg ? C.error : C.brand,
            fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap' }}>
          {estado === 'trabajando' ? 'Generando…' : msg ? 'Reintentar' : 'Generar'}
        </button>
      </span>
    );
  }
  return (
    <span style={{ fontFamily: FONT }}>
      {estado !== 'hecho' && (
        <button onClick={generar} disabled={estado === 'trabajando'}
          style={{ background: 'none', border: 'none', padding: 0, color: C.brand, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: FONT }}>
          {estado === 'trabajando' ? 'Generando…' : 'Generar asiento'}
        </button>
      )}
      {msg && <span style={{ display: 'block', fontSize: 11, color: estado === 'hecho' ? C.success : C.error }}>{msg}</span>}
    </span>
  );
}
