'use client';
import { ESTADO_DOC_COLOR, ESTADO_DOC_AYUDA } from '@/data/estadosHacienda';
// Detalle de un comprobante emitido, con los datos reales guardados:
// emisor, receptor, líneas (con descuento e IVA), otros cargos, totales,
// referencia, observaciones, asiento contable, estado ante Hacienda y QR.
import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, StatusBadge, Button, radius } from '@/components/ui/primitives';
import { labelCondicionVenta, labelMedioPago } from '@/data/catalogosHacienda';
import DescargarDocumentosModal from './DescargarDocumentosModal';
import ModalEnviarCorreo from '@/components/ui/ModalEnviarCorreo';
import RefacturarModal from './RefacturarModal';
import RecurrenciaModal, { type Recurrencia } from './RecurrenciaModal';
import VistaImpresa from './VistaImpresa';
import Link from 'next/link';
import GenerarAsientoBoton from './GenerarAsientoBoton';
import AsientoVinculado from './AsientoVinculado';
import ErrorHaciendaModal from './ErrorHaciendaModal';
import { RegistrarAbonoModal, PanelAbonos, useEstadoCredito, money as moneyAbono, fechaCorta, periodoIvaAbono } from './AbonosFactura';
import MasAcciones from '@/components/ui/MasAcciones';
import { accionesDocumento } from './accionesDocumento';
import OrigenModulo from '@/components/ui/OrigenModulo';
import { formatosDe, type FormatoImpresion } from './representacion';
import { DatoNumero, consecutivoCompleto } from '@/components/ui/NumeroClave';
import { useModulos } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';
import { Autoridad, autoridad, esGuatemalaActual, simboloLocal } from '@/lib/paisActual';
import { calcularLinea, esServicio } from '@/lib/calculoFactura';
import { retencionesFacturaEspecial } from '@/lib/retenciones';
import AbonosCambiaria from './AbonosCambiaria';
import { nombreDte, textoFraseDocumento, nombreTipoFrase, type FraseEmisor, type AbonoFcam } from '@/lib/perfilPais';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;
const ESTADO_COLOR = ESTADO_DOC_COLOR;

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

export default function DocumentoDetalle({ id }: { id: string }) {
  const router = useRouter();
  const { puede } = usePermisos();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [verXml, setVerXml] = useState(false);
  const [descargar, setDescargar] = useState(false);
  const [correo, setCorreo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recModal, setRecModal] = useState(false);
  const [refacturar, setRefacturar] = useState(false);
  const [rec, setRec] = useState<Recurrencia | null>(null);
  const [version, setVersion] = useState(0);
  const [vista, setVista] = useState<'detalle' | FormatoImpresion>('detalle');
  const [verError, setVerError] = useState(false);
  const [pago, setPago] = useState(false);
  const [pagoFactura, setPagoFactura] = useState<string | null>(null);
  // Saldo y abonos (solo aplica a facturas con recibo de pago)
  const credito = useEstadoCredito('#' + id, version);
  const [reenviando, setReenviando] = useState(false);
  const { contabilidad } = useModulos();

  useEffect(() => {
    let vivo = true;
    fetch(`/api/documentos/${id}`).then(r => r.json()).then(d => { if (vivo) setDoc(d); });
    fetch('/api/recurrentes').then(r => r.json()).then((l: Recurrencia[]) => { if (vivo) setRec(l.find(x => x.documento_id === '#' + id) ?? null); }).catch(() => {});
    return () => { vivo = false; };
  }, [id, version]);

  async function enviar(d: { para: string[]; mensaje: string; adjuntos: string[] }) {
    setEnviando(true);
    const r = await fetch(`/api/documentos/${id}/reenviar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    const res = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) { setAviso(res.error ?? 'No se pudo enviar el correo.'); return; }
    setCorreo(false);
    setAviso(`Se envió a ${d.para.join(', ')}.`);
  }

  if (!doc) return <div style={{ padding: 24, fontSize: 12, color: C.n700, fontFamily: FONT }}>Cargando…</div>;
  if (doc.error) return <div style={{ padding: 24, fontSize: 12, color: C.error, fontFamily: FONT }}>No se encontró el documento.</div>;

  const sym = doc.moneda === 'USD' ? '$' : simboloLocal();
  const m = (n: number) => `${sym}\u00a0${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lineas: Doc[] = doc.lineas ?? [];
  let cargos: Doc[] = [];
  try { cargos = doc.otros_cargos_json ? JSON.parse(doc.otros_cargos_json) : []; } catch { cargos = []; }
  let medios: string[] = [];
  try { medios = JSON.parse(doc.medios_pago ?? '[]'); } catch { medios = []; }
  const emisor = doc.emisor ?? {};
  const receptor = doc.receptor ?? {};
  const descuentos = Number(doc.total_descuentos ?? 0);
  const otros = Number(doc.total_otros_cargos ?? 0);
  const th = { padding: '8px 10px', fontSize: 11, fontWeight: 500, color: C.n700, textAlign: 'left' as const, background: C.n200 };
  const td = { padding: '10px', fontSize: 12, borderTop: `1px solid ${C.n500}`, verticalAlign: 'top' as const };
  const tdR = { ...td, textAlign: 'right' as const, whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' as const };
  const conRecibo = doc.tipo === 'Factura electrónica' && doc.estado === 'Aceptado' && ['08', '10'].includes(String(doc.condicion_venta));
  const abonado = Number(credito?.abonado ?? 0);
  const saldoCredito = credito ? credito.saldo : Number(doc.total ?? 0);
  const corregir = () => router.push(`/facturacion/emitidos/nuevo?tipo=${encodeURIComponent(doc.tipo)}&corregir=${id}`);
  async function reenviarHacienda() {
    setReenviando(true);
    const r = await fetch(`/api/documentos/${id}/reenviar-hacienda`, { method: 'POST' });
    const res = await r.json().catch(() => ({}));
    setReenviando(false); setVerError(false);
    setAviso(!r.ok || res.error ? (res.error ?? 'No se pudo reenviar.') : `Se reenvió a ${autoridad()}. El estado se actualiza en unos minutos.`);
    await fetch(`/api/documentos/${id}/estado`, { method: 'POST' }).catch(() => {});
    setVersion(v => v + 1);
  }
  const irNota = (t: string) => router.push(`/facturacion/emitidos/nuevo?tipo=${encodeURIComponent(t)}&referencia=${encodeURIComponent(doc.numero_factura)}`);

  const esFec = doc.tipo === 'Factura electrónica de compra';
  const gt = esGuatemalaActual();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT, background: C.n200 }}>
      {/* Encabezado: volver + título a la izquierda; acciones a la derecha */}
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: `1px solid ${C.n500}`, padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button onClick={() => router.push(doc.tipo === 'Factura electrónica de compra' ? '/facturacion/recepcion?tab=fec' : '/facturacion/emitidos')} aria-label="Volver" title="Volver"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, color: C.n900 }}>←</button>
          <h1 style={{ fontSize: 17, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{gt && doc.tipo_dte ? nombreDte(String(doc.tipo_dte)) : doc.tipo} {consecutivoCompleto(doc.numero_factura, doc.clave)}</h1>
          <StatusBadge label={doc.estado} color={ESTADO_COLOR[doc.estado] ?? 'yellow'} title={ESTADO_DOC_AYUDA[doc.estado]} />
        </div>
        {(() => {
          // Mismas reglas por estado que la tabla de Ventas (accionesDocumento.ts)
          const borrar = async () => {
            if (!window.confirm('¿Eliminar este borrador?')) return;
            await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
            router.push('/facturacion/emitidos');
          };
          const { principal, grupos } = accionesDocumento({ tipo: String(doc.tipo), estado: String(doc.estado), condicion_venta: doc.condicion_venta, reemplazado_por: doc.reemplazado_por, envio_correo: doc.envio_correo }, {
            enDetalle: true, tieneRecurrencia: Boolean(rec),
            recurrenteVence: Boolean(rec && Number(rec.activa) === 1 && rec.proxima <= new Date().toISOString().slice(0, 10)),
            saldoCredito: conRecibo ? saldoCredito : null, tieneAbonos: conRecibo && abonado > 0,
          }, {
            ver: () => {}, descargar: () => setDescargar(true), correo: () => setCorreo(true),
            consultar: async () => { await fetch(`/api/documentos/${id}/estado`, { method: 'POST' }).catch(() => {}); setVersion(v => v + 1); },
            verError: () => setVerError(true), corregir, refacturar: () => setRefacturar(true), nota: t => irNota(t),
            recurrencia: () => setRecModal(true),
            emitirRecurrente: async () => {
              if (!rec) return;
              const r = await fetch(`/api/recurrentes/${rec.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'emitir' }) });
              const j = await r.json().catch(() => ({}));
              setAviso(r.ok ? `Se emitió la siguiente factura (${j.consecutivo}).` : (j.error ?? 'No se pudo emitir.'));
              setVersion(v => v + 1);
            },
            abono: () => setPago(true), verAbonos: () => document.getElementById('panel-abonos')?.scrollIntoView({ behavior: 'smooth' }),
            eliminarBorrador: borrar,
          });
          const alerta = principal && (principal.id === 'reenviar' || principal.id === 'corregir');
          return (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <MasAcciones grupos={grupos.map(g => g.map(a => ({ label: a.label, onClick: a.onClick, peligro: a.peligro })))} />
              {principal && <Button onClick={principal.onClick} style={alerta ? { background: C.error, borderColor: C.error } : undefined}>{principal.label}</Button>}
            </div>
          );
        })()}
      </div>
      {aviso && (
        <div style={{ flexShrink: 0, padding: '8px 24px', background: C.brandBg, borderBottom: `1px solid ${C.n500}`, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          {aviso}<button onClick={() => setAviso(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700 }}>×</button>
        </div>
      )}
      {correo && <ModalEnviarCorreo subtitulo={`${doc.tipo} ${doc.numero_factura} · ${doc.cliente_nombre}`} para={[doc.receptor_email, doc.receptor?.correos_copia].filter(Boolean).join(', ')} enviando={enviando}
        adjuntos={[{ id: 'xml', label: 'Comprobante electrónico (XML)', marcado: true }]} onEnviar={enviar} onClose={() => setCorreo(false)} />}
      {refacturar && <RefacturarModal documentoId={id} onClose={() => setRefacturar(false)} onEmitido={m => { setRefacturar(false); setAviso(m); }} />}
      {recModal && <RecurrenciaModal documento={{ id: '#' + id, numero_factura: doc.numero_factura, cliente_nombre: doc.cliente_nombre, fecha_emision: doc.fecha_emision }} actual={rec}
        onClose={() => setRecModal(false)} onGuardado={m => { setRecModal(false); setAviso(m); setVersion(v => v + 1); }} />}

      {pagoFactura && <RegistrarAbonoModal facturaId={pagoFactura} onClose={() => setPagoFactura(null)} onHecho={(m, reciboId) => { setPagoFactura(null); if (reciboId) router.push(`/facturacion/emitidos/${reciboId.replace('#', '')}`); else { setAviso(m); setVersion(v => v + 1); } }} />}
      {pago && <RegistrarAbonoModal facturaId={'#' + id} onClose={() => setPago(false)} onHecho={m => { setPago(false); setAviso(m); setVersion(v => v + 1); }} />}
      {verError && <ErrorHaciendaModal doc={doc as never} onClose={() => setVerError(false)} reenviando={reenviando}
        onRefacturar={doc.reemplazado_por ? undefined : corregir} onReenviar={reenviarHacienda} />}

      {doc.estado !== 'Borrador' && (
        <div style={{ flexShrink: 0, background: '#fff', borderBottom: `1px solid ${C.n500}`, padding: '0 24px', display: 'flex', gap: 4, height: 40 }}>
          {[{ value: 'detalle' as const, label: 'Detalle' }, ...formatosDe(doc)].map(v => (
            <button key={v.value} onClick={() => setVista(v.value)}
              style={{ background: 'none', border: 'none', borderBottom: `2px solid ${vista === v.value ? C.brand : 'transparent'}`, padding: '0 12px', fontSize: 12.5,
                color: vista === v.value ? C.brand : C.n700, fontWeight: vista === v.value ? 600 : 400, cursor: 'pointer', fontFamily: FONT }}>{v.label}</button>
          ))}
        </div>
      )}

      {vista !== 'detalle' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}><VistaImpresa doc={doc} formato={vista} /></div>
      ) : (
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {conRecibo && <div id="panel-abonos"><PanelAbonos facturaId={'#' + id} version={version} onSimular={async () => { await fetch(`/api/documentos/${id}/simular-dia-90`, { method: 'POST' }); setAviso('Listo: la factura quedó con fecha de hace 91 días. El IVA pendiente se declaró al día 90.'); setVersion(v => v + 1); }} /></div>}
          {doc.tipo === 'Recibo Electrónico de Pago' && doc.recibo_de && (
            <>
              <AbonoDelRecibo doc={doc} version={version} />
              <PanelAbonos facturaId={String(doc.recibo_de)} version={version} resaltar={doc.id} titulo="Todos los abonos de la factura"
                onRegistrar={() => setPagoFactura(String(doc.recibo_de))} />
            </>
          )}
          {doc.tipo === 'Factura electrónica de compra' && (
            <div style={{ fontSize: 12.5, background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.md, padding: '10px 14px' }}>
              Factura electrónica de compra a nombre de <b style={{ fontWeight: 600 }}>{doc.cliente_nombre}</b>.{' '}
              {doc.compra_id
                ? <>Quedó registrada en <Link href="/facturacion/recepcion?tab=aceptada" style={{ color: C.brand }}>Compras</Link>{contabilidad ? ' con su asiento' : ''}.</>
                : doc.estado === 'Aceptado' ? (contabilidad ? `${Autoridad()} la aceptó; usa «Generar asiento» para registrarla en Compras.` : `${Autoridad()} la aceptó; queda registrada en Compras.`) : `Cuando ${autoridad()} la acepte, se registra sola en Compras${contabilidad ? ' con su asiento' : ''}.`}
            </div>
          )}
          {(doc.reemplazado_por || doc.reemplaza_a || Number(doc.anulado_en_origen) === 1) && (
            <div style={{ fontSize: 12.5, background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.md, padding: '10px 14px' }}>
              {doc.reemplazado_por && <div>Este documento se refacturó en <a href={`/facturacion/emitidos/${String(doc.reemplazado_por).replace('#', '')}`} style={{ color: C.brand }}>{doc.reemplazado_por}</a>.</div>}
              {doc.reemplaza_a && <div>Reemplaza al documento rechazado <a href={`/facturacion/emitidos/${String(doc.reemplaza_a).replace('#', '')}`} style={{ color: C.brand }}>{doc.reemplaza_a}</a>.</div>}
              {Number(doc.anulado_en_origen) === 1 && <div>Se avisó a {doc.origen} para anularlo también allá.</div>}
            </div>
          )}
          {/* Guatemala (FEL) y Costa Rica muestran el documento con sus propios datos */}
          {gt ? <>
          {/* En la factura especial (FEL) el emisor es la empresa, que compra, y el receptor es el vendedor.
              Como en todas las compras, el proveedor va a la izquierda y mi empresa a la derecha. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <div style={{ order: esFec ? 2 : 1, display: 'flex', flexDirection: 'column' }}>
            <Tarjeta titulo={esFec ? 'Mi empresa (comprador)' : 'Emisor'}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <Dato label="Nombre"><b style={{ fontWeight: 600 }}>{emisor.nombre_comercial || emisor.razon_social}</b></Dato>
                <Dato label="NIT">{emisor.cedula_juridica}</Dato>
                <div style={{ gridColumn: '1 / -1' }}><Dato label="Dirección fiscal">{emisor.direccion_fiscal}</Dato></div>
                <Dato label="Correo">{emisor.correo_electronico}</Dato>
              </div>
            </Tarjeta>
            </div>
            <div style={{ order: esFec ? 1 : 2, display: 'flex', flexDirection: 'column' }}>
            <Tarjeta titulo={esFec ? 'Proveedor (vendedor)' : 'Receptor'}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <Dato label="Nombre"><b style={{ fontWeight: 600 }}>{doc.cliente_nombre}</b></Dato>
                <Dato label="Identificación">{doc.receptor_identificacion || receptor.numero_identificacion}</Dato>
                <div style={{ gridColumn: '1 / -1' }}><Dato label="Dirección fiscal">{receptor.direccion_fiscal}</Dato></div>
                <Dato label="Correo">{doc.receptor_email || receptor.email}</Dato>
              </div>
            </Tarjeta>
            </div>
          </div>

          <Tarjeta titulo="Datos del comprobante">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(360px, 2fr)', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.n500}` }}>
              {/* FEL: serie y número los asigna el certificador a partir del número de autorización */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Dato label="Serie">{String(doc.numero_factura ?? '').split('-')[0] || 'Pendiente'}</Dato>
                <Dato label="Número">{String(doc.numero_factura ?? '').split('-')[1] || 'Pendiente'}</Dato>
              </div>
              <Dato label="Número de autorización"><span style={{ fontVariantNumeric: 'tabular-nums' }}>{doc.clave || 'Pendiente'}</span></Dato>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Dato label="Tipo de DTE">{doc.tipo_dte ? `${doc.tipo_dte} · ${nombreDte(doc.tipo_dte)}` : doc.tipo}</Dato>
              <Dato label="Fecha de emisión">{new Date(doc.fecha_emision).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}</Dato>
              <Dato label="Condición de venta">{labelCondicionVenta(doc.condicion_venta)}</Dato>
              {doc.tipo_dte !== 'FCAM' && <Dato label="Métodos de pago">{medios.map(labelMedioPago).join(', ')}</Dato>}
              <Dato label="Moneda">{doc.moneda === 'USD' ? `USD (TC ${doc.tipo_cambio})` : 'GTQ'}</Dato>
              <Dato label="Origen"><OrigenModulo origen={doc.origen} conNombre />{doc.origen_referencia ? <span style={{ marginLeft: 6, color: C.n700 }}>{doc.origen_referencia}</span> : null}</Dato>
              {contabilidad && <Dato label="Asiento contable">{doc.asiento_consecutivo ? <AsientoVinculado documentoId={String(doc.id)} consecutivo={doc.asiento_consecutivo} /> : doc.estado === 'Aceptado' ? <GenerarAsientoBoton url={`/api/documentos/${id}/asiento`} onHecho={() => setVersion(v => v + 1)} /> : 'Sin asiento todavía'}</Dato>}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Líneas">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Descripción</th><th style={th}>B/S</th><th style={{ ...th, textAlign: 'right' }}>Cant.</th>
                  <th style={{ ...th, textAlign: 'right' }}>Precio con IVA</th><th style={{ ...th, textAlign: 'right' }}>Descuento</th>
                  <th style={{ ...th, textAlign: 'right' }}>Impuestos</th><th style={{ ...th, textAlign: 'right' }}>Total</th>
                </tr></thead>
                <tbody>
                  {lineas.map((l, i) => {
                    // Mismo cálculo que al emitir: precio con IVA, ITH sobre el monto gravable
                    const leer = (t: unknown) => { try { return t ? JSON.parse(String(t)) : null; } catch { return null; } };
                    const c = calcularLinea({ codigoCabys: String(l.codigo_cabys ?? ''), cantidad: Number(l.cantidad), precioUnitario: Number(l.precio_unitario),
                      codigoTarifa: String(l.codigo_tarifa ?? '08'), descuento: leer(l.descuento_json), otroImpuesto: leer(l.otro_impuesto_json) });
                    return (
                      <tr key={i}>
                        <td style={td}>{l.descripcion}{l.sintetica ? <div style={{ fontSize: 10.5, color: C.n700 }}>Desde los totales del documento de origen</div> : null}</td>
                        <td style={td}>{esServicio(String(l.codigo_cabys ?? '')) ? 'Servicio' : 'Bien'}</td>
                        <td style={tdR}>{l.cantidad}</td><td style={tdR}>{m(l.precio_unitario)}</td>
                        <td style={tdR}>{c.descuentoConIva ? `− ${m(c.descuentoConIva)}` : '-'}</td>
                        <td style={tdR}>IVA {c.tarifa}% · {m(c.impuesto)}{c.otroImpuesto > 0 ? <div style={{ fontSize: 11, color: C.n700 }}>ITH {m(c.otroImpuesto)}</div> : null}</td>
                        <td style={{ ...tdR, fontWeight: 600 }}>{m(c.totalLinea)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {cargos.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12 }}>
                {cargos.map((o, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: C.n700 }}>{o.detalle}{o.terceroNombre ? ` (${o.terceroNombre})` : ''}</span><span>{m(o.montoCalculado ?? o.monto)}</span></div>)}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <div style={{ width: 'min(360px, 100%)', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                {descuentos > 0 && <><span style={{ color: C.n700 }}>Descuentos</span><span style={{ textAlign: 'right' }}>− {m(descuentos)}</span></>}
                <span style={{ color: C.n700 }}>Monto gravable</span><span style={{ textAlign: 'right' }}>{m(doc.subtotal)}</span>
                <span style={{ color: C.n700 }}>IVA e impuesto de turismo</span><span style={{ textAlign: 'right' }}>{m(doc.iva)}</span>
                {otros > 0 && <><span style={{ color: C.n700 }}>Otros cargos</span><span style={{ textAlign: 'right' }}>{m(otros)}</span></>}
                <span style={{ fontWeight: 600, fontSize: 15, borderTop: `1px solid ${C.n500}`, paddingTop: 6 }}>Total</span>
                <span style={{ fontWeight: 600, fontSize: 15, borderTop: `1px solid ${C.n500}`, paddingTop: 6, textAlign: 'right' }}>{m(doc.total)}</span>
                {esFec && (() => {
                  const r = retencionesFacturaEspecial(Number(doc.subtotal), Number(doc.iva), Number(doc.total));
                  return <>
                    <span style={{ color: C.n700 }}>Retención de ISR</span><span style={{ textAlign: 'right' }}>− {m(r.isr)}</span>
                    <span style={{ color: C.n700 }}>Retención de IVA</span><span style={{ textAlign: 'right' }}>− {m(r.iva)}</span>
                    <span style={{ fontWeight: 600 }}>A pagar al vendedor</span><span style={{ textAlign: 'right', fontWeight: 600 }}>{m(r.totalMenosRetenciones)}</span>
                  </>;
                })()}
              </div>
            </div>
          </Tarjeta>

          {(() => {
            const leer = <T,>(t: unknown): T[] => { try { return t ? JSON.parse(String(t)) : []; } catch { return []; } };
            const frases = leer<FraseEmisor>(doc.frases_json);
            const abonos = leer<AbonoFcam>(doc.abonos_json);
            return <>
              {frases.length > 0 && (
                <Tarjeta titulo="Frases">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                    {frases.map(f => <div key={`${f.tipo}-${f.escenario}`}><span style={{ color: C.n700 }}>Tipo {f.tipo} · {nombreTipoFrase(f.tipo)}, escenario {f.escenario}:</span> {textoFraseDocumento(f)}</div>)}
                  </div>
                </Tarjeta>
              )}
              {abonos.length > 0 && (
                <Tarjeta titulo="Abonos de la factura cambiaria">
                  <AbonosCambiaria documentoId={id} inicial={abonos} moneda={m} puedeConfirmar={puede('fe.ventas.emitir')} />
                </Tarjeta>
              )}
            </>;
          })()}
          </> : <>
          {/* En la factura electrónica de compra el emisor es el proveedor (vendedor) y el receptor es la empresa */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <div style={{ order: esFec ? 2 : 1, display: 'flex', flexDirection: 'column' }}>
            <Tarjeta titulo={esFec ? 'Receptor (mi empresa)' : 'Emisor'}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <Dato label="Nombre"><b style={{ fontWeight: 600 }}>{emisor.nombre_comercial || emisor.razon_social}</b></Dato>
                <Dato label="Cédula">{emisor.cedula_juridica}</Dato>
                <div style={{ gridColumn: '1 / -1' }}><Dato label="Dirección fiscal">{emisor.direccion_fiscal}</Dato></div>
                <Dato label="Actividad">{emisor.actividad_economica}</Dato>
                <Dato label="Correo">{emisor.correo_electronico}</Dato>
              </div>
            </Tarjeta>
            </div>
            <div style={{ order: esFec ? 1 : 2, display: 'flex', flexDirection: 'column' }}>
            <Tarjeta titulo={esFec ? 'Emisor (proveedor)' : 'Receptor'}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <Dato label="Nombre"><b style={{ fontWeight: 600 }}>{doc.cliente_nombre}</b></Dato>
                <Dato label="Identificación">{doc.receptor_identificacion || receptor.numero_identificacion}</Dato>
                <div style={{ gridColumn: '1 / -1' }}><Dato label="Dirección fiscal">{receptor.direccion_fiscal}</Dato></div>
                <Dato label="Correo">{doc.receptor_email || receptor.email}</Dato>
                <Dato label={esFec ? 'Actividad del proveedor' : 'Actividad del receptor'}>{doc.actividad_receptor}</Dato>
              </div>
            </Tarjeta>
            </div>
          </div>

          <Tarjeta titulo="Datos del comprobante">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(360px, 2fr)', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.n500}` }}>
              <DatoNumero tipo="consecutivo" numero={doc.numero_factura} clave={doc.clave} />
              <DatoNumero tipo="clave" clave={doc.clave} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Dato label="Fecha de emisión">{new Date(doc.fecha_emision).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}</Dato>
              <Dato label="Condición de venta">{labelCondicionVenta(doc.condicion_venta)}</Dato>
              <Dato label="Métodos de pago">{medios.map(labelMedioPago).join(', ')}</Dato>
              <Dato label="Moneda">{doc.moneda}{doc.moneda === 'USD' ? ` (TC ${doc.tipo_cambio})` : ''}</Dato>
              <Dato label="Origen"><OrigenModulo origen={doc.origen} conNombre />{doc.origen_referencia ? <span style={{ marginLeft: 6, color: C.n700 }}>{doc.origen_referencia}</span> : null}</Dato>
              {contabilidad && <Dato label="Asiento contable">{doc.asiento_consecutivo ? <AsientoVinculado documentoId={String(doc.id)} consecutivo={doc.asiento_consecutivo} /> : doc.estado === 'Aceptado' ? <GenerarAsientoBoton url={`/api/documentos/${id}/asiento`} onHecho={() => setVersion(v => v + 1)} /> : 'Sin asiento todavía'}</Dato>}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Líneas">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Bien o servicio</th><th style={th}>CABYS</th><th style={{ ...th, textAlign: 'right' }}>Cant.</th>
                  <th style={{ ...th, textAlign: 'right' }}>Precio</th><th style={{ ...th, textAlign: 'right' }}>Descuento</th>
                  <th style={{ ...th, textAlign: 'right' }}>IVA</th><th style={{ ...th, textAlign: 'right' }}>Total</th>
                </tr></thead>
                <tbody>
                  {lineas.map((l, i) => {
                    const bruto = Number(l.cantidad) * Number(l.precio_unitario);
                    const desc = Number(l.descuento ?? 0);
                    const iva = (bruto - desc) * Number(l.impuesto ?? 0) / 100;
                    return (
                      <tr key={i}>
                        <td style={td}>{l.descripcion}{l.sintetica ? <div style={{ fontSize: 10.5, color: C.n700 }}>Desde los totales del documento de origen</div> : null}</td>
                        <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{l.codigo_cabys}</td>
                        <td style={tdR}>{l.cantidad}</td><td style={tdR}>{m(l.precio_unitario)}</td>
                        <td style={tdR}>{desc ? `− ${m(desc)}` : '-'}</td>
                        <td style={tdR}>{l.impuesto}% · {m(iva)}</td><td style={{ ...tdR, fontWeight: 600 }}>{m(bruto - desc + iva)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {cargos.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12 }}>
                {cargos.map((o, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: C.n700 }}>{o.detalle}{o.terceroNombre ? ` (${o.terceroNombre})` : ''}</span><span>{m(o.montoCalculado ?? o.monto)}</span></div>)}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <div style={{ width: 'min(360px, 100%)', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                {descuentos > 0 && <><span style={{ color: C.n700 }}>Descuentos</span><span style={{ textAlign: 'right' }}>− {m(descuentos)}</span></>}
                <span style={{ color: C.n700 }}>Subtotal (venta neta)</span><span style={{ textAlign: 'right' }}>{m(doc.subtotal)}</span>
                <span style={{ color: C.n700 }}>Impuestos</span><span style={{ textAlign: 'right' }}>{m(doc.iva)}</span>
                {otros > 0 && <><span style={{ color: C.n700 }}>Otros cargos</span><span style={{ textAlign: 'right' }}>{m(otros)}</span></>}
                <span style={{ fontWeight: 600, fontSize: 15, borderTop: `1px solid ${C.n500}`, paddingTop: 6 }}>Total</span>
                <span style={{ fontWeight: 600, fontSize: 15, borderTop: `1px solid ${C.n500}`, paddingTop: 6, textAlign: 'right' }}>{m(doc.total)}</span>
              </div>
            </div>
          </Tarjeta>
          </>}

          {(doc.referencia_documento || doc.observaciones) && (
            <Tarjeta titulo="Referencia y observaciones">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {doc.referencia_documento && (String(doc.referencia_documento).length === 50
                  ? <DatoNumero tipo="clave" clave={doc.referencia_documento} />
                  : <DatoNumero tipo="consecutivo" numero={doc.referencia_documento} />)}
                {doc.referencia_motivo && <Dato label="Razón">{doc.referencia_motivo}</Dato>}
                {doc.observaciones && <Dato label="Observaciones">{doc.observaciones}</Dato>}
              </div>
            </Tarjeta>
          )}

          {/* Guatemala: FEL no tiene QR de consulta ni respuesta de la SAT que mostrar */}
          <div style={{ display: 'grid', gridTemplateColumns: gt ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 260px', gap: 16 }}>
            <Tarjeta titulo={gt ? 'SAT' : 'Hacienda'} accion={
              <button onClick={() => setVerXml(v => !v)} style={{ background: 'none', border: 'none', color: C.brand, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: FONT }}>
                {verXml ? 'Ocultar XML' : 'Ver XML'}
              </button>}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                Envío: {doc.estado_envio === 'error' ? <StatusBadge label="Error al enviar" color="red" /> : <StatusBadge label="Enviado" color="green" />}
              </div>
              {doc.ultimo_error && <p style={{ fontSize: 12, color: C.error }}>{doc.ultimo_error}</p>}
              {verXml && <pre style={{ fontSize: 10.5, background: C.n900, color: '#B8E6B8', padding: 14, borderRadius: 8, overflowX: 'auto', marginTop: 12 }}>{doc.xml || 'Este documento no tiene XML guardado; se genera al descargarlo.'}</pre>}
            </Tarjeta>
            {!gt && <Tarjeta titulo="QR de consulta">
              {doc.qr ? <img src={doc.qr} alt="QR de consulta pública" width={200} height={200} style={{ display: 'block', margin: '0 auto' }} /> : <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Disponible cuando el documento tiene clave.</p>}
            </Tarjeta>}
          </div>
        </div>
      </div>

      )}

      <DescargarDocumentosModal open={descargar} doc={doc as never} onClose={() => setDescargar(false)} />
    </div>
  );
}

// Recibo electrónico de pago: el abono que respalda (factura, cobro, IVA y saldo)
function AbonoDelRecibo({ doc, version }: { doc: Doc; version: number }) {
  const e = useEstadoCredito(String(doc.recibo_de), version);
  if (!e) return null;
  const i = e.abonos.findIndex(a => a.id === doc.id);
  const a = e.abonos[i];
  if (!a) return null;
  const validos = (x: { estado: string }) => !['Rechazado', 'Borrador', 'Error'].includes(x.estado);
  const antes = e.abonos.slice(0, i).filter(validos).reduce((s, x) => s + x.total, 0);
  const saldoAntes = Math.max(0, Math.round((e.total - antes) * 100) / 100);
  const saldoDespues = Math.max(0, Math.round((saldoAntes - (validos(a) ? a.total : 0)) * 100) / 100);
  const m = (n: number) => moneyAbono(n, e.moneda);
  const celda = (label: string, valor: ReactNode, sub?: ReactNode) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.n700 }}>{label}</div>
      <div style={{ fontSize: 13, marginTop: 2, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: C.n700, marginTop: 2 }}>{sub}</div>}
    </div>
  );
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.lg, padding: 20, fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Abono {i + 1} de {e.abonos.length}</div>
        <div style={{ fontSize: 12.5 }}>
          Factura{' '}
          <a href={`/facturacion/emitidos/${String(doc.recibo_de).replace('#', '')}`} style={{ color: C.brand, fontWeight: 500 }}>{e.numero}</a>
          <span style={{ color: C.n700 }}> · {e.cliente} · emitida el {fechaCorta(e.fechaFactura)}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
        {celda('Fecha del cobro', fechaCorta(a.fechaPago))}
        {celda('Medio de pago', labelMedioPago(a.medio), a.comprobante ? `Comprobante ${a.comprobante}` : undefined)}
        {celda('Monto del abono', m(a.total), a.descripcion)}
        {celda('IVA del abono', m(a.iva), a.despuesDel90 ? 'No se vuelve a declarar' : undefined)}
        {celda('IVA se declara en', periodoIvaAbono(a, e.fechaLimite), a.despuesDel90 ? 'Se cobró después del día 90: este recibo es solo de respaldo' : 'Mes en que se cobró')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, background: C.n200, borderRadius: 8, padding: '12px 14px' }}>
        {celda('Total de la factura', m(e.total))}
        {celda('Saldo antes de este abono', m(saldoAntes))}
        {celda('Saldo después de este abono', m(saldoDespues), saldoDespues <= 0 ? 'Factura cobrada por completo' : undefined)}
        {celda('Plazo de 90 días', fechaCorta(e.fechaLimite), e.vencido ? 'Ya se cumplió' : `Faltan ${e.diasRestantes} días`)}
      </div>
    </div>
  );
}
