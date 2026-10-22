'use client';
// Bloque "Facturación electrónica" al final del Dashboard, con datos reales.
// Los indicadores usan la misma capa de datos que los reportes
// (reportes/comun/datos.ts), así que "Total de ingresos facturados" cuadra
// con Actividad económica / Importe de impuesto: solo aceptados, sin IVA,
// notas de crédito restando, dólares convertidos a colones.
import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import Link from 'next/link';
import { C, FONT, fmtDate, fmtMoney, fmtNum, StatusBadge, Button, Toast } from '../ui/primitives';
import { ESTADO_COLOR, useComprobantes, Comprobante } from './reportes/comun/datos';
import EmitirAcuseModal from './facturacion/EmitirAcuseModal';
import ModalEnviarCorreo from '../ui/ModalEnviarCorreo';
import { ESTILO_ACUSE, type CompraRow, type EmisorInfo } from './facturacion/comprasComun';
import { simboloLocal } from '@/lib/paisActual';

const F = FONT;

interface DocSinCorreo {
  id: string; tipo: string; numero_factura: string; cliente_nombre: string; receptor_email: string | null;
  fecha_emision: string; total: number; moneda: string | null;
}

const idRuta = (id: string) => id.replace('#', '');
const simboloDe = (moneda: string | null | undefined) => String(moneda ?? 'CRC').toUpperCase() === 'USD' ? '$' : simboloLocal();
const enColones = (c: Comprobante, n: number) => c.moneda === 'USD' ? n * c.tipoCambio : n;

// ── Piezas visuales (mismo lenguaje que las tarjetas del Dashboard) ──────────

function Tarjeta({ titulo, sub, verTodo, children }: { titulo: string; sub?: string; verTodo?: string; children: ReactNode }) {
  return (
    <div className="dash-card" style={{ background: '#fff', border: '1px solid #ECECEC', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: C.n900, fontFamily: F }}>{titulo}</span>
        {verTodo && <Link href={verTodo} style={{ fontSize: 12, color: C.brand, fontFamily: F, textDecoration: 'underline' }}>Ver todo</Link>}
      </div>
      {sub && <span style={{ fontSize: 11, color: C.n700, fontFamily: F, marginTop: -6 }}>{sub}</span>}
      {children}
    </div>
  );
}

function Indicador({ label, valor, nota, href }: { label: string; valor: string; nota?: string; href?: string }) {
  const contenido = (
    <>
      <div style={{ fontSize: 12, color: C.n700, fontFamily: F, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: C.n900, fontFamily: F, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>{valor}</div>
      {nota && <div style={{ fontSize: 11, color: C.n700, fontFamily: F, marginTop: 6 }}>{nota}</div>}
    </>
  );
  const estilo = { background: '#fff', border: '1px solid #ECECEC', borderRadius: 10, padding: '18px 20px', display: 'block', textDecoration: 'none', color: 'inherit' } as const;
  return href
    ? <Link href={href} className="dash-card" style={estilo}>{contenido}</Link>
    : <div className="dash-card" style={estilo}>{contenido}</div>;
}

function Vacio({ texto }: { texto: string }) {
  return <div style={{ padding: '18px 0', fontSize: 12, color: C.n700, fontFamily: F }}>{texto}</div>;
}

const fila = { display: 'flex', alignItems: 'center', gap: 16, minHeight: 40, borderTop: '1px solid #F3F3F3', fontSize: 12, fontFamily: F } as const;
const num = { fontVariantNumeric: 'tabular-nums' as const, whiteSpace: 'nowrap' as const };

// ── Bloque principal ─────────────────────────────────────────────────────────

// parte «kpis»: solo el acumulado del mes (va primero en el Dashboard); «resto»: lo demás
export default function DashboardFacturacion({ ver = () => true, parte = 'todo' }: { ver?: (id: string) => boolean; parte?: 'todo' | 'kpis' | 'resto' } = {}) {
  const { comprobantes, cargando, recargar } = useComprobantes();
  const [sinCorreo, setSinCorreo] = useState<DocSinCorreo[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const cargarSinCorreo = useCallback(() => {
    fetch('/api/dashboard/facturacion').then(r => r.json()).then(d => setSinCorreo(d.sinCorreo ?? [])).catch(() => setSinCorreo([]));
  }, []);
  useEffect(() => { cargarSinCorreo(); }, [cargarSinCorreo]);

  const datos = useMemo(() => {
    const ventas = comprobantes.filter(c => c.lado === 'venta' && !c.incompleto);
    const aceptadas = ventas.filter(c => c.estado === 'Aceptado');
    const ingresos = aceptadas.reduce((a, c) => a + enColones(c, c.gravado + c.exento - c.descuentos), 0);
    const clientes = new Set(aceptadas.map(c => c.contraparte)).size;
    const ultimos = [...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3);
    const comprasPendientes = comprobantes
      .filter(c => c.lado === 'compra' && c.estado !== 'Aceptado' && c.estado !== 'Rechazado')
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    // Acumulado del mes al día de hoy (aceptados): ventas, compras y su IVA.
    // Crédito fiscal como en el Reporte de IVA: pleno al 100 %, parcial al 50 % de referencia.
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
    const hoyIso = hoy.toISOString().slice(0, 10);
    const delMes = (c: Comprobante) => c.estado === 'Aceptado' && !c.incompleto && c.fecha.slice(0, 10) >= inicioMes && c.fecha.slice(0, 10) <= hoyIso;
    const ventasMes = comprobantes.filter(c => c.lado === 'venta' && delMes(c));
    const comprasMes = comprobantes.filter(c => c.lado === 'compra' && delMes(c));
    const base = (c: Comprobante) => enColones(c, c.gravado + c.exento - c.descuentos);
    const mes = {
      ventas: ventasMes.reduce((a, c) => a + base(c), 0), nVentas: ventasMes.length,
      compras: comprasMes.reduce((a, c) => a + base(c), 0), nCompras: comprasMes.length,
      debito: ventasMes.reduce((a, c) => a + enColones(c, c.iva), 0),
      credito: comprasMes.reduce((a, c) => a + enColones(c, c.iva) * (c.credito === 'pleno' ? 1 : c.credito === 'parcial' ? 0.5 : 0), 0),
    };
    return {
      mes,
      nAceptados: aceptadas.length,
      nRechazados: ventas.filter(c => c.estado === 'Rechazado').length,
      ingresos, promedio: clientes > 0 ? ingresos / clientes : 0, clientes,
      ultimos, comprasPendientes,
    };
  }, [comprobantes]);

  // "Emitir acuse" abre el mismo modal que Facturación > Compras: tipo de
  // aceptación y la pregunta de si se genera el asiento contable.
  const [acuse, setAcuse] = useState<{ compras: CompraRow[]; emisores: EmisorInfo[] } | null>(null);
  async function emitirAcuse(c: Comprobante) {
    setOcupado('compra-' + c.id);
    try {
      const [compras, emisores]: [CompraRow[], EmisorInfo[]] = await Promise.all([
        fetch('/api/recepcion').then(r => r.json()), fetch('/api/emisores').then(r => r.json()).catch(() => []),
      ]);
      const row = compras.find(x => x.id === c.id);
      if (!row) throw new Error();
      setAcuse({ compras: [row], emisores });
    } catch {
      setToast({ message: 'No se pudo abrir la compra. Intenta desde Facturación > Compras.', type: 'error' });
    } finally { setOcupado(null); }
  }

  // Reenviar por correo: el mismo modal de Ventas (destinatarios, mensaje y adjuntos).
  const [correo, setCorreo] = useState<{ id: string; titulo: string; para: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function abrirCorreo(id: string, numero: string, cliente: string) {
    setOcupado('correo-' + id);
    // Correo y copias guardadas del receptor
    const d = await fetch(`/api/documentos/${idRuta(id)}`).then(r => r.json()).catch(() => ({}));
    setOcupado(null);
    setCorreo({ id, titulo: `${d.tipo ?? 'Documento'} ${numero} · ${cliente}`, para: [d.receptor_email, d.receptor?.correos_copia].filter(Boolean).join(', ') });
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
    cargarSinCorreo();
  }

  const sinCorreoVisibles = [...sinCorreo].sort((a, b) => String(a.fecha_emision).localeCompare(String(b.fecha_emision))).slice(0, 3);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>

      {cargando ? (
        <div style={{ background: '#fff', border: '1px solid #ECECEC', borderRadius: 10, padding: 24, fontSize: 12, color: C.n700, fontFamily: F }}>Cargando…</div>
      ) : <>
        {parte !== 'resto' && ver('fe_indicadores') && (() => {
          const nombreMes = new Date().toLocaleDateString('es-CR', { month: 'long' });
          const porPagar = datos.mes.debito - datos.mes.credito;
          return (
            <div style={{ background: '#fff', border: '1px solid #ECECEC', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: C.n900, fontFamily: F }}>Acumulado de {nombreMes} al día de hoy</span>
                <Link href="/reportes/iva" style={{ fontSize: 12, color: C.brand, fontFamily: F, textDecoration: 'underline' }}>Ver Reporte de IVA</Link>
              </div>
              <div className="dash-row-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                {[
                  { l: 'Ventas', v: datos.mes.ventas, n: `${datos.mes.nVentas} comprobante${datos.mes.nVentas === 1 ? '' : 's'} · sin IVA` },
                  { l: 'Compras', v: datos.mes.compras, n: `${datos.mes.nCompras} comprobante${datos.mes.nCompras === 1 ? '' : 's'} · sin IVA` },
                  { l: 'Débito fiscal', v: datos.mes.debito, n: 'IVA de las ventas' },
                  { l: 'Crédito fiscal', v: datos.mes.credito, n: 'IVA acreditable de las compras' },
                  { l: porPagar >= 0 ? 'IVA por pagar' : 'Saldo a favor', v: Math.abs(porPagar), n: 'Débito menos crédito', destacado: true },
                ].map(k => (
                  <div key={k.l} style={{ background: k.destacado ? C.brandBg : '#FAFAFA', border: `1px solid ${k.destacado ? C.brandBd : '#F0F0F0'}`, borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 12, color: C.n700, fontFamily: F, marginBottom: 6 }}>{k.l}</div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: C.n900, fontFamily: F, ...num }}>{fmtMoney(k.v)}</div>
                    <div style={{ fontSize: 11, color: C.n700, fontFamily: F, marginTop: 4 }}>{k.n}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {parte !== 'kpis' && <>
        {ver('fe_indicadores') && <div className="dash-row-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Indicador label="Documentos aceptados" valor={fmtNum(datos.nAceptados, 0)} href="/reportes/general" />
          <Indicador label="Documentos rechazados" valor={fmtNum(datos.nRechazados, 0)} href="/reportes/rechazados" />
          <Indicador label="Ingresos facturados" valor={fmtMoney(datos.ingresos)} nota="Aceptados, sin IVA" href="/reportes/actividad-economica" />
          <Indicador label="Promedio de venta por cliente" valor={fmtMoney(datos.promedio)}
            nota={`${datos.clientes} cliente${datos.clientes === 1 ? '' : 's'} con ventas aceptadas`} />
        </div>}

        {(ver('fe_ultimos') || ver('fe_compras')) && <div className="dash-row-grid" style={{ display: 'grid', gridTemplateColumns: ver('fe_ultimos') && ver('fe_compras') ? '1fr 1fr' : '1fr', gap: 12 }}>
          {ver('fe_ultimos') && <Tarjeta titulo="Últimos documentos" verTodo="/facturacion/emitidos">
            {datos.ultimos.length === 0 ? <Vacio texto="Todavía no hay documentos emitidos." /> : <>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.n700, fontFamily: F }}>
                <span style={{ flex: 1 }}>Consecutivo</span><span style={{ width: 110 }}>Estado</span><span style={{ width: 120, textAlign: 'right' }}>Total</span><span style={{ width: 32 }} />
              </div>
              {datos.ultimos.map(c => (
                <div key={c.id} style={fila}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/facturacion/emitidos/${idRuta(c.id)}`} style={{ color: C.brand, textDecoration: 'underline', ...num }}>{c.consecutivo}</Link>
                    <span style={{ display: 'block', fontSize: 11, color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contraparte}</span>
                  </span>
                  <span style={{ width: 110 }}><StatusBadge label={c.estado} color={ESTADO_COLOR[c.estado] ?? 'gray'} /></span>
                  <span style={{ width: 120, textAlign: 'right', ...num }}>{fmtMoney(c.total, simboloDe(c.moneda))}</span>
                  <button title="Reenviar por correo" aria-label="Reenviar por correo" onClick={() => abrirCorreo(c.id, c.consecutivo, c.contraparte)} disabled={ocupado === 'correo-' + c.id}
                    style={{ width: 32, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.n500}`, borderRadius: 4, background: '#fff', cursor: 'pointer', color: C.n700 }}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1.5" y="3" width="13" height="10" rx="1.5" /><path d="M2 4l6 5 6-5" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              ))}
            </>}
          </Tarjeta>}

          {ver('fe_compras') && <Tarjeta titulo="Compras sin acuse" verTodo="/facturacion/recepcion"
            sub={datos.comprasPendientes.length === 0 ? 'Todas tienen acuse' : `${datos.comprasPendientes.length} sin emisión de acuse`}>
            {datos.comprasPendientes.length === 0 ? <Vacio texto="No hay facturas de proveedores pendientes de acuse." /> :
              datos.comprasPendientes.slice(0, 3).map(c => (
                <div key={c.id} style={fila}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={num}>{c.consecutivo || 'Sin consecutivo'}</span>
                    <span style={{ display: 'block', fontSize: 11, color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contraparte}</span>
                  </span>
                  <span style={{ color: C.n700, ...num }}>{fmtDate(c.fecha)}</span>
                  <span style={{ width: 110, textAlign: 'right', ...num }}>{fmtMoney(c.total, simboloDe(c.moneda))}</span>
                  <Button onClick={() => emitirAcuse(c)} disabled={ocupado === 'compra-' + c.id} style={ESTILO_ACUSE}>Emitir acuse</Button>
                </div>
              ))}
          </Tarjeta>}
        </div>}

        {ver('fe_no_enviados') && <Tarjeta titulo="Documentos no enviados por correo" verTodo="/facturacion/emitidos"
          sub={sinCorreo.length === 0 ? undefined : `${sinCorreo.length} documento${sinCorreo.length === 1 ? '' : 's'} aceptado${sinCorreo.length === 1 ? '' : 's'} sin enviar al cliente`}>
          {sinCorreoVisibles.length === 0 ? <Vacio texto="Todos los documentos aceptados ya se enviaron por correo." /> :
            sinCorreoVisibles.map(d => (
              <div key={d.id} style={fila}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16, alignItems: 'baseline' }}>
                  <Link href={`/facturacion/emitidos/${idRuta(d.id)}`} style={{ color: C.n900, ...num }}>{d.numero_factura}</Link>
                  <span style={{ color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.cliente_nombre}{d.receptor_email ? '' : ' · sin correo registrado'}
                  </span>
                </span>
                <span style={{ color: C.n700, ...num }}>{fmtDate(d.fecha_emision)}</span>
                <span style={{ width: 110, textAlign: 'right', ...num }}>{fmtMoney(Number(d.total ?? 0), simboloDe(d.moneda))}</span>
                <Button onClick={() => abrirCorreo(d.id, d.numero_factura, d.cliente_nombre)} disabled={ocupado === 'correo-' + d.id}>Enviar por correo</Button>
              </div>
            ))}
        </Tarjeta>}
        </>}
      </>}

      {acuse && <EmitirAcuseModal compras={acuse.compras} emisores={acuse.emisores} onClose={() => setAcuse(null)}
        onHecho={r => {
          setAcuse(null);
          setToast({ message: r.fallidas ? 'No se pudo emitir el acuse.' : `Acuse emitido${r.asientos?.length ? ` · asiento ${r.asientos.join(', ')}` : ''}.`, type: r.fallidas ? 'error' : 'success' });
          recargar();
        }} />}
      {correo && <ModalEnviarCorreo titulo="Reenviar por correo" subtitulo={correo.titulo} para={correo.para} enviando={enviando}
        adjuntos={[{ id: 'xml', label: 'Comprobante electrónico (XML)', marcado: true }]} onEnviar={enviar} onClose={() => setCorreo(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </section>
  );
}
