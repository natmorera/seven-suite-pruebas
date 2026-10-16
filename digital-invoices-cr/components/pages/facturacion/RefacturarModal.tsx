'use client';
// Refacturar sin abrir el formulario completo: se ve el resumen del
// documento original, se elige (o se crea al vuelo) el nuevo receptor y se
// emite. La factura nueva lleva las mismas líneas y referencia a la original.
import { useEffect, useState } from 'react';
import { C, FONT, Button, FormField, Input, Select, Modal, radius } from '@/components/ui/primitives';
import { MontoCelda, fmtMonto, simboloMoneda } from '@/components/ui/Monto';
import { TIPOS_IDENTIFICACION } from '@/lib/calculoFactura';
import { ClienteCombobox, RECEPTOR_VACIO, receptorDesdeCliente, type ClienteRow, type Receptor } from './NuevaFacturaPartes';

interface Linea { descripcion: string; cantidad: number; precio_unitario: number; impuesto: number; sintetica?: number }
interface Doc { tipo: string; numero_factura: string; cliente_nombre: string; fecha_emision: string; moneda: string; subtotal: number; iva: number; total: number; lineas: Linea[] }

const correoValido = (s: string) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export default function RefacturarModal({ documentoId, onClose, onEmitido }: {
  documentoId: string;                        // sin «#»
  onClose: () => void;
  onEmitido: (mensaje: string) => void;
}) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [receptor, setReceptor] = useState<Receptor>(RECEPTOR_VACIO);
  const [nuevo, setNuevo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);
  const [resultado, setResultado] = useState<{ id: string; consecutivo: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      fetch(`/api/documentos/${encodeURIComponent(documentoId)}`).then(r => r.json()),
      fetch('/api/clientes?receptores=1').then(r => r.json()).catch(() => []),
    ]).then(([d, cs]) => { if (!vivo) return; setDoc(d); setClientes(cs); });
    return () => { vivo = false; };
  }, [documentoId]);

  const sinLineas = Boolean(doc?.lineas?.some(l => l.sintetica));
  const sym = simboloMoneda(doc?.moneda);
  const setR = (p: Partial<Receptor>) => setReceptor(r => ({ ...r, ...p }));

  async function emitir() {
    setError(null);
    if (!receptor.nombre.trim()) { setError('Elige o crea el receptor.'); return; }
    if (nuevo && !receptor.numeroIdentificacion.trim()) { setError('Escribe la identificación del receptor.'); return; }
    if (!correoValido(receptor.email)) { setError('Revisa el correo del receptor.'); return; }
    setEmitiendo(true);
    const r = await fetch(`/api/documentos/${encodeURIComponent(documentoId)}/refacturar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receptor: { clienteId: receptor.clienteId, nombre: receptor.nombre.trim(), tipoIdentificacion: receptor.tipoIdentificacion, numeroIdentificacion: receptor.numeroIdentificacion.trim(), email: receptor.email.trim() } }),
    });
    const d = await r.json().catch(() => ({}));
    setEmitiendo(false);
    if (!r.ok) { setError(d.error ?? 'No se pudo emitir la factura.'); return; }
    setResultado({ id: String(d.id), consecutivo: String(d.consecutivo) });
  }

  if (resultado) {
    return (
      <Modal open title="Factura emitida" onClose={() => { onEmitido(`Se emitió la factura ${resultado.consecutivo} a nombre de ${receptor.nombre}.`); }}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => { window.location.href = `/facturacion/emitidos/nuevo?tipo=${encodeURIComponent('Nota de crédito')}&referencia=${encodeURIComponent(doc?.numero_factura ?? '')}`; }}>Anular la original con nota de crédito</Button>
          <Button variant="secondary" onClick={() => { window.location.href = `/facturacion/emitidos/${resultado.id.replace('#', '')}`; }}>Ver factura</Button>
          <Button onClick={() => onEmitido(`Se emitió la factura ${resultado.consecutivo} a nombre de ${receptor.nombre}.`)}>Listo</Button>
        </div>}>
        <p style={{ fontSize: 13, margin: 0 }}>Se emitió la factura <b>{resultado.consecutivo}</b> a nombre de <b>{receptor.nombre}</b>, con las mismas líneas de la {doc?.numero_factura}.</p>
        <p style={{ fontSize: 12, color: C.n700, margin: '8px 0 0' }}>La factura original sigue vigente. Si ya no corresponde, anúlala con una nota de crédito.</p>
      </Modal>
    );
  }

  return (
    <Modal open width={720} title={doc ? `Refacturar ${doc.numero_factura}` : 'Refacturar'} onClose={onClose}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={emitir} disabled={!doc || sinLineas || emitiendo}>{emitiendo ? 'Emitiendo…' : receptor.nombre ? `Emitir a ${receptor.nombre}` : 'Emitir factura'}</Button>
      </div>}>
      {!doc ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
          {/* Resumen del documento original */}
          <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: C.n200, fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span><b style={{ fontWeight: 600 }}>{doc.tipo} {doc.numero_factura}</b> · a nombre de {doc.cliente_nombre}</span>
              <span style={{ color: C.n700 }}>{new Date(doc.fecha_emision).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ color: C.n700, fontSize: 11 }}>
                <th style={{ textAlign: 'left', padding: '6px 14px', fontWeight: 500 }}>Detalle</th>
                <th style={{ textAlign: 'right', padding: '6px 14px', fontWeight: 500, width: 70 }}>Cant.</th>
                <th style={{ textAlign: 'right', padding: '6px 14px', fontWeight: 500, width: 150 }}>Total sin IVA</th>
              </tr></thead>
              <tbody>
                {doc.lineas.map((l, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.n200}` }}>
                    <td style={{ padding: '6px 14px' }}>{l.descripcion}</td>
                    <td style={{ padding: '6px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Number(l.cantidad)}</td>
                    <td style={{ padding: '6px 14px' }}><MontoCelda valor={Number(l.cantidad) * Number(l.precio_unitario)} simbolo={sym} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: `1px solid ${C.n500}`, padding: '8px 14px', display: 'flex', justifyContent: 'flex-end', gap: 18, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: C.n700 }}>IVA {sym} {fmtMonto(doc.iva)}</span>
              <b>Total {sym} {fmtMonto(doc.total)}</b>
            </div>
          </div>
          {sinLineas && <div style={{ fontSize: 12, color: C.error }}>Este documento llegó sin detalle de líneas. Refactúralo desde el formulario completo.</div>}

          {/* Nuevo receptor */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Nuevo receptor</div>
            {!nuevo ? (
              <ClienteCombobox clientes={clientes.filter(c => c.tipo !== 'proveedor')} valor={receptor} etiqueta="Cliente"
                onElegir={c => setReceptor(c ? receptorDesdeCliente(c) : RECEPTOR_VACIO)}
                onNuevo={nombre => { setNuevo(true); setReceptor({ ...RECEPTOR_VACIO, nombre }); }} />
            ) : (
              <div style={{ border: `1px solid ${C.brandBd}`, background: C.brandBg, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FormField label="Nombre o razón social" required><Input value={receptor.nombre} onChange={v => setR({ nombre: v })} /></FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Tipo de identificación"><Select value={receptor.tipoIdentificacion} onChange={v => setR({ tipoIdentificacion: v })} options={TIPOS_IDENTIFICACION.map(t => ({ value: t.value, label: t.label }))} /></FormField>
                  <FormField label="Identificación" required><Input value={receptor.numeroIdentificacion} onChange={v => setR({ numeroIdentificacion: v })} placeholder="Ej. 3-101-123456" /></FormField>
                </div>
                <FormField label="Correo (opcional)" hint="Para enviarle la factura."><Input value={receptor.email} onChange={v => setR({ email: v })} type="email" /></FormField>
                <div style={{ fontSize: 11.5, color: C.n700 }}>Se guarda como receptor en Clientes / Proveedores. <button onClick={() => { setNuevo(false); setReceptor(RECEPTOR_VACIO); }} style={{ background: 'none', border: 'none', color: C.brand, cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT, fontSize: 11.5, padding: 0 }}>Buscar un cliente existente</button></div>
              </div>
            )}
          </div>
          {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}
        </div>
      )}
    </Modal>
  );
}
