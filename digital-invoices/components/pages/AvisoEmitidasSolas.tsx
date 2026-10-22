'use client';
// Aviso del Dashboard: facturas recurrentes que se emitieron solas desde la
// última vez que se vio. Las que no se pudieron enviar (receptor sin correo
// o error de envío) se pueden enviar desde aquí mismo.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { C, FONT, Button, Toast, fmtDate, fmtMoney } from '../ui/primitives';
import ModalEnviarCorreo from '../ui/ModalEnviarCorreo';
import { useTareasHechas } from '@/lib/tareasCliente';
import { simboloLocal } from '@/lib/paisActual';

interface EmitidaSola {
  id: string; tipo: string; numero_factura: string; cliente_nombre: string; receptor_email: string | null;
  fecha_emision: string; total: number; moneda: string | null; envio_correo: string;
}

const idRuta = (id: string) => id.replace('#', '');
const simbolo = (m: string | null) => String(m ?? 'CRC').toUpperCase() === 'USD' ? '$' : simboloLocal();
const sinEnviar = (d: EmitidaSola) => d.envio_correo === 'sin_correo' || d.envio_correo === 'error';

export default function AvisoEmitidasSolas() {
  const [docs, setDocs] = useState<EmitidaSola[]>([]);
  const [correo, setCorreo] = useState<EmitidaSola | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const cargar = useCallback(() => {
    fetch('/api/recurrentes/automaticas').then(r => r.json()).then(d => setDocs(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useTareasHechas(r => { if (r.recurrentes?.emitidas?.length) cargar(); });

  async function marcarVistas() {
    setDocs([]);
    await fetch('/api/recurrentes/automaticas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
  }
  async function enviar(datos: { para: string[]; mensaje: string; adjuntos: string[] }) {
    if (!correo) return;
    setEnviando(true);
    const r = await fetch(`/api/documentos/${idRuta(correo.id)}/reenviar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
    const data = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) { setToast({ message: data.error ?? 'No se pudo enviar el correo.', type: 'error' }); return; }
    setCorreo(null);
    setToast({ message: `Se envió a ${datos.para.join(', ')}.`, type: 'success' });
    cargar();
  }

  if (!docs.length) return toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null;
  const pendientes = docs.filter(sinEnviar).length;
  const visibles = [...docs].sort((a, b) => Number(sinEnviar(b)) - Number(sinEnviar(a))).slice(0, 5);

  return (
    <div className="dash-card" style={{ background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: 10, padding: '14px 18px', fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" />
        </svg>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.n900 }}>
            Se emitieron solas {docs.length} factura{docs.length === 1 ? '' : 's'} recurrente{docs.length === 1 ? '' : 's'}
          </div>
          <div style={{ fontSize: 12, color: pendientes ? C.error : C.n700, marginTop: 2 }}>
            {pendientes
              ? `${pendientes} no se envi${pendientes === 1 ? 'ó' : 'aron'} al cliente. Envíala${pendientes === 1 ? '' : 's'} desde aquí.`
              : 'Todas se enviaron al correo del cliente.'}
          </div>
        </div>
        <Link href="/facturacion/emitidos" style={{ fontSize: 12, color: C.brand, textDecoration: 'underline' }}>Ver en Ventas</Link>
        <Button variant="secondary" onClick={marcarVistas}>Entendido</Button>
      </div>
      <div style={{ marginTop: 10, background: '#fff', borderRadius: 8, border: `1px solid ${C.brandBd}` }}>
        {visibles.map((d, i) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 12px', borderTop: i ? '1px solid #F3F3F3' : 'none', fontSize: 12 }}>
            <Link href={`/facturacion/emitidos/${idRuta(d.id)}`} style={{ color: C.brand, textDecoration: 'underline', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{d.numero_factura || d.id}</Link>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.cliente_nombre}
              {d.envio_correo === 'sin_correo' && <span style={{ color: C.error }}> · el receptor no tiene correo</span>}
              {d.envio_correo === 'error' && <span style={{ color: C.error }}> · no se pudo enviar</span>}
            </span>
            <span style={{ color: C.n700, whiteSpace: 'nowrap' }}>{fmtDate(d.fecha_emision)}</span>
            <span style={{ width: 110, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtMoney(Number(d.total ?? 0), simbolo(d.moneda))}</span>
            <span style={{ width: 130, textAlign: 'right' }}>
              {sinEnviar(d) ? <Button onClick={() => setCorreo(d)} style={{ height: 28 }}>Enviar por correo</Button> : <span style={{ color: C.success, fontSize: 11.5 }}>Enviada</span>}
            </span>
          </div>
        ))}
        {docs.length > visibles.length && <div style={{ padding: '8px 12px', fontSize: 11.5, color: C.n700, borderTop: '1px solid #F3F3F3' }}>Y {docs.length - visibles.length} más en Ventas.</div>}
      </div>
      {correo && (
        <ModalEnviarCorreo titulo="Enviar por correo" subtitulo={`${correo.tipo} ${correo.numero_factura} · ${correo.cliente_nombre}`} para={correo.receptor_email ?? ''} enviando={enviando}
          adjuntos={[{ id: 'xml', label: 'Comprobante electrónico (XML)', marcado: true }]} onEnviar={enviar} onClose={() => setCorreo(null)} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
