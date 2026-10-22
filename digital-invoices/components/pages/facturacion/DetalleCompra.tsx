'use client';
// Detalle de una compra (comprobante recibido). Misma estructura que el
// detalle de un documento de Ventas (DocumentoDetalle): encabezado con volver,
// estado y acciones; tarjetas de emisor y receptor, datos del comprobante,
// líneas con totales, y Hacienda (clave, acuse y XML).
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, StatusBadge, Button, Toast, radius } from '@/components/ui/primitives';
import MasAcciones from '@/components/ui/MasAcciones';
import { useModulos } from '@/lib/modulosCliente';
import GenerarAsientoBoton from './GenerarAsientoBoton';
import AsientoVinculado from './AsientoVinculado';
import EmitirAcuseModal from './EmitirAcuseModal';
import CambiarActividadModal from './CambiarActividadModal';
import { descargarAcuseCompra } from './pdfAcuseCompra';
import { DatoNumero, consecutivoCompleto } from '@/components/ui/NumeroClave';
import { CREDITO_CORTO, ESTILO_ACUSE, lineasDe, sinAcuse, type CompraRow, type EmisorInfo } from './comprasComun';
import { Autoridad, esGuatemalaActual, simboloLocal } from '@/lib/paisActual';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Detalle = CompraRow & { xml?: string | null; ultimo_error?: string | null; empresa?: Record<string, any> | null; perfil_proveedor?: Record<string, any> | null; error?: string };

// Guatemala no emite acuse: la compra se acepta (completa o con diferencia) o se rechaza
const acuseLabel = (gt: boolean): Record<string, string> => (gt ? { total: 'Registrar completa', parcial: 'Registrar con diferencia', rechazo: 'Rechazo' } : { total: 'Aceptación total', parcial: 'Aceptación parcial', rechazo: 'Rechazo' });

function Tarjeta({ titulo, children, accion }: { titulo: string; children: ReactNode; accion?: ReactNode }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.lg, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{titulo}</h2>{accion}
      </div>
      {children}
    </div>
  );
}
function Dato({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ minWidth: 0 }}><div style={{ fontSize: 10.5, color: C.n700 }}>{label}</div><div style={{ fontSize: 12.5, marginTop: 2, wordBreak: 'break-word' }}>{children || <span style={{ color: C.n700 }}>-</span>}</div></div>;
}
const Candado = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" aria-label="Bloqueada" style={{ verticalAlign: '-1px', marginLeft: 6 }}><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
);

export default function DetalleCompra({ id }: { id: string }) {
  const router = useRouter();
  const { contabilidad } = useModulos();
  const [c, setC] = useState<Detalle | null>(null);
  const [emisores, setEmisores] = useState<EmisorInfo[]>([]);
  const [version, setVersion] = useState(0);
  const [verXml, setVerXml] = useState(false);
  const [acusar, setAcusar] = useState(false);
  const [cambiarAct, setCambiarAct] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/recepcion/${encodeURIComponent(id)}`).then(r => r.json()).then(d => { if (vivo) setC(d); }).catch(() => { if (vivo) setC({ error: 'x' } as Detalle); });
    fetch('/api/emisores').then(r => r.json()).then(e => { if (vivo && Array.isArray(e)) setEmisores(e); }).catch(() => {});
    return () => { vivo = false; };
  }, [id, version]);

  if (!c) return <div style={{ padding: 24, fontSize: 12, color: C.n700, fontFamily: FONT }}>Cargando…</div>;
  if (c.error) return <div style={{ padding: 24, fontSize: 12, color: C.error, fontFamily: FONT }}>No se encontró la compra.</div>;

  const sym = String(c.moneda ?? 'CRC').toUpperCase() === 'USD' ? '$' : simboloLocal();
  const m = (n: number | null | undefined) => `${sym} ${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lineas = lineasDe(c);
  const pendiente = sinAcuse(c);
  const gt = esGuatemalaActual();
  const ACUSE_LABEL = acuseLabel(gt);
  const estadoLabel = pendiente ? 'Sin emitir' : c.tipo_acuse === 'parcial' ? 'Aceptado parcial' : c.estado;
  const estadoColor = pendiente ? 'yellow' : c.estado === 'Rechazado' ? 'red' : 'green';
  const empresa = c.empresa ?? {};
  const prov = c.perfil_proveedor ?? {};
  const descuentos = Number(c.total_descuentos ?? 0);
  const otros = Number(c.total_otros_cargos ?? 0);
  const th = { padding: '8px 10px', fontSize: 11, fontWeight: 500, color: C.n700, textAlign: 'left' as const, background: C.n200 };
  const td = { padding: '10px', fontSize: 12, borderTop: `1px solid ${C.n500}`, verticalAlign: 'top' as const };
  const tdR = { ...td, textAlign: 'right' as const, whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' as const };
  const descargarAcuse = () => descargarAcuseCompra({
    id: c.id, proveedor: c.proveedor, numeroFactura: c.numero_factura, fechaEmision: c.fecha_emision,
    fechaAceptacion: c.fecha_aceptacion, estado: c.tipo_acuse === 'parcial' ? 'Aceptado parcialmente' : c.estado, totalFactura: c.total_factura,
  });
  const descargarXml = () => { window.location.href = `/api/recepcion/exportar?ids=${encodeURIComponent(c.id)}`; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT, background: C.n200 }}>
      {/* Encabezado: igual que el detalle de Ventas */}
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: `1px solid ${C.n500}`, padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button onClick={() => router.push('/facturacion/recepcion')} aria-label="Volver" title="Volver"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, color: C.n900 }}>←</button>
          <h1 style={{ fontSize: 17, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{c.tipo ?? 'Factura electrónica'} {consecutivoCompleto(c.numero_factura, c.clave)}</h1>
          <StatusBadge label={estadoLabel} color={estadoColor} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <MasAcciones grupos={[
            [{ label: 'Descargar XML', onClick: descargarXml }, ...(!pendiente ? [{ label: gt ? 'Descargar constancia' : 'Descargar acuse', onClick: descargarAcuse }] : [])],
            pendiente ? [{ label: 'Cambiar actividad', onClick: () => setCambiarAct(true) }] : [{ label: gt ? 'Cambiar registro' : 'Cambiar acuse', onClick: () => setAcusar(true) }],
          ]} />
          {pendiente
            ? <Button onClick={() => setAcusar(true)} style={ESTILO_ACUSE}>{gt ? 'Aceptar o rechazar' : 'Emitir acuse'}</Button>
            : <Button variant="secondary" onClick={descargarAcuse}>{gt ? 'Descargar constancia' : 'Descargar acuse'}</Button>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {c.origen === 'auto' && pendiente && (
            <div style={{ fontSize: 12.5, background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.md, padding: '10px 14px' }}>
              Se importó sola desde el buzón con las cuentas de la vez anterior. Solo falta emitir el acuse.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <Tarjeta titulo="Proveedor (emisor)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <Dato label="Nombre"><b style={{ fontWeight: 600 }}>{c.proveedor}</b></Dato>
                <Dato label={gt ? 'NIT' : 'Cédula'}>{c.proveedor_identificacion}</Dato>
                <div style={{ gridColumn: '1 / -1' }}><Dato label="Dirección fiscal">{prov.direccion_fiscal}</Dato></div>
                {!gt && <Dato label="Actividad del proveedor">{c.actividad_proveedor}</Dato>}
                <Dato label="Correo">{c.proveedor_correo || prov.email}</Dato>
              </div>
            </Tarjeta>
            <Tarjeta titulo="Receptor (mi empresa)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <Dato label="Nombre"><b style={{ fontWeight: 600 }}>{empresa.nombre_comercial || empresa.razon_social}</b></Dato>
                <Dato label={gt ? 'NIT' : 'Cédula'}>{c.receptor_identificacion || empresa.cedula_juridica}</Dato>
                <div style={{ gridColumn: '1 / -1' }}><Dato label="Dirección fiscal">{empresa.direccion_fiscal}</Dato></div>
                {!gt && <Dato label="Actividad de mi empresa">
                  {c.actividad_economica}
                  {!pendiente && c.actividad_economica && <span title="Se declaró en el acuse enviado a Hacienda: ya no se puede cambiar."><Candado /></span>}
                  {pendiente && <button onClick={() => setCambiarAct(true)} style={{ marginLeft: 8, background: 'none', border: 'none', padding: 0, color: C.brand, fontFamily: FONT, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Cambiar</button>}
                </Dato>}
                <Dato label="Correo">{empresa.correo_electronico}</Dato>
              </div>
            </Tarjeta>
          </div>

          <Tarjeta titulo="Datos del comprobante">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(360px, 2fr)', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.n500}` }}>
              <DatoNumero tipo="consecutivo" numero={c.numero_factura} clave={c.clave} />
              <DatoNumero tipo="clave" clave={c.clave} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Dato label="Fecha de emisión">{c.fecha_emision ? new Date(c.fecha_emision.length <= 10 ? c.fecha_emision + 'T12:00:00' : c.fecha_emision).toLocaleDateString('es-CR', { dateStyle: 'short' }) : null}</Dato>
              <Dato label="Moneda">{c.moneda ?? 'CRC'}{String(c.moneda).toUpperCase() === 'USD' ? ` (TC ${c.tipo_cambio})` : ''}</Dato>
              <Dato label="Condición del IVA">{CREDITO_CORTO[c.tipo_credito_fiscal] ?? c.tipo_credito_fiscal}</Dato>
              <Dato label="Origen">{({ xml: 'XML', correo: 'Correo', manual: 'Manual', auto: 'Correo automático' } as Record<string, string>)[c.origen] ?? c.origen}</Dato>
              {contabilidad && <Dato label="Cuenta del proveedor">{c.cuenta_proveedor ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>{c.cuenta_proveedor}{c.cuenta_proveedor_nombre ? ` · ${c.cuenta_proveedor_nombre}` : ''}</span> : null}</Dato>}
              {contabilidad && <Dato label="Asiento contable">{c.asiento_consecutivo ? <AsientoVinculado documentoId={String(c.id)} consecutivo={c.asiento_consecutivo} /> : c.estado === 'Aceptado' ? <GenerarAsientoBoton url={`/api/recepcion/${c.id}/asiento`} onHecho={() => setVersion(v => v + 1)} /> : 'Se genera al emitir el acuse'}</Dato>}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Líneas">
            {lineas.length === 0 ? (
              <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Esta compra se registró sin el detalle de líneas.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={th}>Bien o servicio</th><th style={th}>CABYS</th>{contabilidad && <th style={th}>Cuenta</th>}
                    <th style={{ ...th, textAlign: 'right' }}>Cant.</th><th style={{ ...th, textAlign: 'right' }}>Precio</th>
                    <th style={{ ...th, textAlign: 'right' }}>Descuento</th><th style={{ ...th, textAlign: 'right' }}>IVA</th><th style={{ ...th, textAlign: 'right' }}>Total</th>
                  </tr></thead>
                  <tbody>
                    {lineas.map(l => (
                      <tr key={l.numero}>
                        <td style={td}>{l.detalle}{l.codigo ? <div style={{ fontSize: 10.5, color: C.n700 }}>Cód. {l.codigo}</div> : null}</td>
                        <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{l.cabys}</td>
                        {contabilidad && <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{l.cuenta || <span style={{ color: C.n700 }}>-</span>}</td>}
                        <td style={tdR}>{l.cantidad}</td><td style={tdR}>{m(l.precioUnitario)}</td>
                        <td style={tdR}>{Number(l.descuento) ? `− ${m(l.descuento)}` : '-'}</td>
                        <td style={tdR}>{l.tarifa}% · {m(l.impuesto)}</td><td style={{ ...tdR, fontWeight: 600 }}>{m(l.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <div style={{ width: 'min(360px, 100%)', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                {descuentos > 0 && <><span style={{ color: C.n700 }}>Descuentos</span><span style={{ textAlign: 'right' }}>− {m(descuentos)}</span></>}
                <span style={{ color: C.n700 }}>Subtotal (compra neta)</span><span style={{ textAlign: 'right' }}>{m(c.subtotal)}</span>
                <span style={{ color: C.n700 }}>Impuestos</span><span style={{ textAlign: 'right' }}>{m(c.iva)}</span>
                {otros > 0 && <><span style={{ color: C.n700 }}>Otros cargos</span><span style={{ textAlign: 'right' }}>{m(otros)}</span></>}
                <span style={{ fontWeight: 600, fontSize: 15, borderTop: `1px solid ${C.n500}`, paddingTop: 6 }}>Total</span>
                <span style={{ fontWeight: 600, fontSize: 15, borderTop: `1px solid ${C.n500}`, paddingTop: 6, textAlign: 'right' }}>{m(c.total_factura)}</span>
              </div>
            </div>
          </Tarjeta>

          <Tarjeta titulo={Autoridad()} accion={
            <button onClick={() => setVerXml(v => !v)} style={{ background: 'none', border: 'none', color: C.brand, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: FONT }}>
              {verXml ? 'Ocultar XML' : 'Ver XML'}
            </button>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <Dato label={gt ? 'Registro' : 'Acuse'}>
                {pendiente ? <span style={{ color: C.n700 }}>Pendiente de emitir</span>
                  : <><b style={{ fontWeight: 600 }}>{ACUSE_LABEL[c.tipo_acuse ?? ''] ?? (c.estado === 'Rechazado' ? 'Rechazo' : 'Aceptación')}</b>{c.fecha_aceptacion ? ` · ${new Date(c.fecha_aceptacion).toLocaleDateString('es-CR', { dateStyle: 'short' })}` : ''}</>}
              </Dato>
              {c.mensaje_acuse && <Dato label={gt ? 'Detalle del registro' : 'Detalle del acuse'}>{c.mensaje_acuse}</Dato>}
            </div>
            {c.ultimo_error && <p style={{ fontSize: 12, color: C.error }}>{c.ultimo_error}</p>}
            {verXml && <pre style={{ fontSize: 10.5, background: C.n900, color: '#B8E6B8', padding: 14, borderRadius: 8, overflowX: 'auto', marginTop: 12 }}>{c.xml || 'Esta compra no tiene XML guardado (se registró a mano).'}</pre>}
          </Tarjeta>
        </div>
      </div>

      {acusar && <EmitirAcuseModal compras={[c]} emisores={emisores} onClose={() => setAcusar(false)}
        onHecho={r => { setAcusar(false); setToast({ message: r.fallidas ? (gt ? 'No se pudo guardar la respuesta.' : 'No se pudo emitir el acuse.') : `${gt ? (r.tipo === 'rechazo' ? 'Compra rechazada' : 'Compra aceptada') : `${r.tipo === 'rechazo' ? 'Rechazo' : 'Acuse'} emitido`}${r.asientos?.length ? ` · asiento ${r.asientos.join(', ')}` : ''}.`, type: r.fallidas ? 'error' : 'success' }); setVersion(v => v + 1); }} />}
      {cambiarAct && <CambiarActividadModal ids={[c.id]} actual={c.actividad_economica} emisores={emisores} onClose={() => setCambiarAct(false)}
        onHecho={msg => { setCambiarAct(false); setToast({ message: msg, type: 'success' }); setVersion(v => v + 1); }} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
