'use client';
// En el detalle de un asiento automático: la venta o compra que lo generó, con
// acceso directo al documento (Accounting + Digital Invoices).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { C, FONT, Button, StatusBadge, radius } from '@/components/ui/primitives';
import VistaPreviaAdjunto from '@/components/ui/VistaPreviaAdjunto';
import { simboloLocal } from '@/lib/paisActual';

interface Origen { clase: 'venta' | 'compra'; id: string; tipo: string; numero: string; tercero: string; fecha: string; total: number; moneda: string; estado: string; url: string }
const SIMBOLO: Record<string, string> = { get CRC() { return simboloLocal(); }, USD: '$', EUR: '€' };
const colorEstado = (e: string) => (/acept/i.test(e) ? 'green' : /rechaz|anul/i.test(e) ? 'red' : 'yellow') as 'green' | 'red' | 'yellow';

export default function DocumentoOrigen({ asientoNum }: { asientoNum: number }) {
  const [doc, setDoc] = useState<Origen | null | undefined>(undefined);
  const [previa, setPrevia] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/asientos/vinculo?asiento=${asientoNum}`).then(r => r.json()).then(d => { if (vivo) setDoc(d.documento ?? null); }).catch(() => { if (vivo) setDoc(null); });
    return () => { vivo = false; };
  }, [asientoNum]);
  if (!doc) return null;
  return (
    <div style={{ padding: '12px 24px', borderBottom: `1px solid ${C.n500}`, flexShrink: 0, fontFamily: FONT }}>
      <p style={{ fontSize: 10, color: '#757575', margin: '0 0 6px' }}>{doc.clase === 'venta' ? 'Venta que generó este asiento' : 'Compra que generó este asiento'}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${C.n500}`, borderRadius: radius.md, background: C.n200 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.n900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.tipo} {doc.numero}</div>
          <div style={{ fontSize: 11.5, color: C.n700, marginTop: 2 }}>
            {doc.tercero} · {doc.fecha.slice(0, 10).split('-').reverse().join('/')} · {SIMBOLO[doc.moneda] ?? ''}{doc.total.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        {doc.estado && <StatusBadge label={doc.estado} color={colorEstado(doc.estado)} />}
        {doc.clase === 'venta' && <Button variant="secondary" onClick={() => setPrevia(true)}>Vista previa</Button>}
        <Link href={doc.url}><Button variant="secondary">Ver {doc.clase === 'venta' ? 'documento' : 'compra'}</Button></Link>
      </div>
      {previa && <VistaPreviaAdjunto titulo={`${doc.tipo} ${doc.numero}`} archivos={[{ nombre: `${doc.tipo} ${doc.numero}`, documentoId: doc.id }]} onClose={() => setPrevia(false)} />}
    </div>
  );
}
