'use client';
// Emitir acuse (mensaje receptor) para una o varias compras a la vez.
// Hacienda admite tres respuestas: aceptación total, aceptación parcial y
// rechazo; las dos últimas requieren un detalle del motivo.
import { useEffect, useMemo, useState } from 'react';
import { ACTIVIDADES_ECONOMICAS } from '@/data/actividadesEconomicas';
import { actividadesDeEmpresa } from './CambiarActividadModal';
import { C, FONT, Button, radius, shadow } from '@/components/ui/primitives';
import { useModulos } from '@/lib/modulosCliente';
import { CompraRow, EmisorInfo, monto, fecha, sinAcuse } from './comprasComun';
import { useCuentasCompra } from './useCuentasCompra';
import { siguienteAuxiliar, DETALLE_PROVEEDORES, soloDigitos, type CuentaOpcion } from '@/lib/cuentasContables';
import { esGuatemalaActual } from '@/lib/paisActual';

type TipoAcuse = 'total' | 'parcial' | 'rechazo';
const MAX_DETALLE = 160;

export default function EmitirAcuseModal({ compras, emisores, onClose, onHecho }: {
  compras: CompraRow[];                     // vacío = cerrado
  emisores: EmisorInfo[];
  onClose: () => void;
  onHecho: (r: { ok: number; fallidas: number; tipo: TipoAcuse; asientos?: string[] }) => void;
}) {
  const [tipo, setTipo] = useState<TipoAcuse>('total');
  const [detalle, setDetalle] = useState('');
  // Actividad de la empresa por compra: se confirma al emitir el acuse. Viene la
  // de la compra (la del proveedor al importarla) o la principal; se puede cambiar.
  const misActividades = useMemo(() => actividadesDeEmpresa(emisores), [emisores]);
  // Se agrupan por proveedor: una actividad por proveedor, la de su perfil (o la
  // de la compra, o la principal), que se puede cambiar.
  const claveProv = (c: CompraRow) => soloDigitos(c.proveedor_identificacion) || c.proveedor.toLowerCase();
  const grupos = useMemo(() => {
    const m = new Map<string, CompraRow[]>();
    for (const c of compras) m.set(claveProv(c), [...(m.get(claveProv(c)) ?? []), c]);
    return [...m.entries()];
  }, [compras]);
  const [perfiles, setPerfiles] = useState<Map<string, { actividades: string[]; actividadEmpresa: string }>>(new Map());
  const [actPorProv, setActPorProv] = useState<Record<string, string>>({});
  const [recordar, setRecordar] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let vivo = true;
    fetch('/api/clientes').then(r => r.json()).then((l: { numero_identificacion?: string; actividades_json?: string | null; actividad_economica?: string | null; actividad_empresa?: string | null }[]) => {
      if (!vivo || !Array.isArray(l)) return;
      const m = new Map<string, { actividades: string[]; actividadEmpresa: string }>();
      for (const t of l) {
        const ced = soloDigitos(t.numero_identificacion ?? ''); if (!ced) continue;
        let acts: string[] = [];
        try { acts = t.actividades_json ? JSON.parse(t.actividades_json) : (t.actividad_economica ? [t.actividad_economica] : []); } catch { acts = []; }
        m.set(ced, { actividades: acts, actividadEmpresa: t.actividad_empresa ?? '' });
      }
      setPerfiles(m);
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  // Mi actividad (hotel) se elige UNA vez, al importar la compra; aquí solo se
  // muestra. Solo si una compra vieja no la tiene se pide aquí.
  const fija = (cs: CompraRow[]) => cs.every(c => Boolean(c.actividad_economica));
  // Guatemala no emite acuse: la compra se acepta o se rechaza, sin actividad económica
  const gt = esGuatemalaActual();
  const yaAcusada = (cs: CompraRow[]) => cs.some(c => !sinAcuse(c));
  const actividadDe = (k: string, cs: CompraRow[]) => (fija(cs) ? cs[0].actividad_economica! : '') || actPorProv[k] || perfiles.get(k)?.actividadEmpresa || cs[0].actividad_economica || misActividades[0] || '';
  // La actividad con que facturó el proveedor: ¿ya la tiene registrada?
  const nombreAct = (cod: string) => { const a = ACTIVIDADES_ECONOMICAS.find(x => x.codigo === cod); return a ? `${cod} - ${a.nombre}` : cod; };
  const actProveedor = (k: string, c: CompraRow) => {
    const cod = String(c.actividad_proveedor ?? '').split(' - ')[0];
    if (!cod) return null;
    const p = perfiles.get(k);
    const registrada = p?.actividades.find(a => a.split(' - ')[0] === cod);
    return { texto: registrada ?? nombreAct(cod), nueva: !registrada, completa: registrada ?? nombreAct(cod) };
  };
  const setActividad = (a: string) => { if (a) setActPorProv(Object.fromEntries(grupos.filter(([, cs]) => !fija(cs)).map(([k]) => [k, a]))); };
  const [enviando, setEnviando] = useState(false);
  // Generar el asiento de cada compra (con Contabilidad); marcado por defecto
  const [generarAsiento, setGenerarAsiento] = useState<boolean>(true);
  const cx = useCuentasCompra();
  // Sin Contabilidad (solo facturación) no hay asiento que generar
  const { contabilidad } = useModulos();
  // Cuenta del proveedor por compra (las que no la traen se sugieren aquí)
  const [cuentas, setCuentas] = useState<Record<string, { code: string; nueva: CuentaOpcion | null; motivo: string }>>({});
  const [cuentasListas, setCuentasListas] = useState(false);
  // Se sugiere una sola vez, cuando llegan las cuentas (durante el render).
  if (cx.listo && !cuentasListas) {
    setCuentasListas(true);
    const usadas: CuentaOpcion[] = [...cx.proveedores];
    const nuevas = new Map<string, CuentaOpcion>();
    const out: Record<string, { code: string; nueva: CuentaOpcion | null; motivo: string }> = {};
    for (const c of compras) {
      if (c.cuenta_proveedor) { out[c.id] = { code: c.cuenta_proveedor, nueva: null, motivo: 'guardada' }; continue; }
      const sug = cx.sugerirProveedor(c.proveedor, c.proveedor_identificacion ?? '');
      if (sug.cuenta) { out[c.id] = { code: sug.cuenta.code, nueva: null, motivo: sug.aprendida ? 'aprendida' : sug.motivo }; continue; }
      const k = soloDigitos(c.proveedor_identificacion) || c.proveedor.toLowerCase();
      const n = nuevas.get(k) ?? { ...sug.nueva!, code: siguienteAuxiliar(DETALLE_PROVEEDORES.code, usadas), nombre: c.proveedor };
      if (!nuevas.has(k)) { nuevas.set(k, n); usadas.push(n); }
      out[c.id] = { code: n.code, nueva: n, motivo: 'nueva' };
    }
    setCuentas(out);
  }
  // El padre monta este modal solo cuando hay compras (así arranca limpio cada vez).
  if (compras.length === 0) return null;

  const requiereDetalle = tipo !== 'total';
  const preguntaAsiento = tipo !== 'rechazo' && contabilidad;
  const valido = (!requiereDetalle || detalle.trim().length >= 5)
    && (!preguntaAsiento || !generarAsiento || compras.every(c => cuentas[c.id]?.code));



  async function emitir() {
    if (!valido) return;
    setEnviando(true);
    let ok = 0, fallidas = 0;
    const asientos: string[] = [];
    for (const c of compras) {
      const r = await fetch(`/api/recepcion/${c.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: tipo === 'rechazo' ? 'Rechazado' : 'Aceptado', tipoAcuse: tipo, generarAsiento: preguntaAsiento && generarAsiento,
          ...(tipo !== 'rechazo' && cuentas[c.id]?.code && cuentas[c.id].code !== c.cuenta_proveedor ? {
            cuentaProveedor: cuentas[c.id].code,
            cuentaProveedorNombre: (cx.proveedores.find(p => p.code === cuentas[c.id].code) ?? cuentas[c.id].nueva)?.nombre ?? c.proveedor,
            crearProveedor: Boolean(cuentas[c.id].nueva && cuentas[c.id].nueva!.code === cuentas[c.id].code),
          } : {}),
          mensaje: requiereDetalle ? detalle.trim() : null,
          // Solo compras viejas sin actividad la reciben aquí; las demás ya la traen de la importación
          ...(tipo !== 'rechazo' && sinAcuse(c) && !c.actividad_economica ? { actividadEconomica: actividadDe(claveProv(c), [c]), recordarActividad: Boolean(recordar[claveProv(c)]) } : {}),
        }),
      }).catch(() => null);
      if (r?.ok) {
        ok++;
        const d = await r.json().catch(() => null);
        if (d?.asiento?.consecutivo) asientos.push(d.asiento.consecutivo);
      } else fallidas++;
    }
    setEnviando(false);
    onHecho({ ok, fallidas, tipo, asientos });
  }

  const sel = { height: 32, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: 4, fontSize: 12, fontFamily: FONT, background: '#fff', width: '100%' } as const;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT }}
      onClick={() => !enviando && onClose()}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: radius.lg, width: 'min(840px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: shadow.modal }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{gt ? 'Aceptar o rechazar compra' : 'Emitir acuse'} {compras.length > 1 ? `(${compras.length} compras)` : ''}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: C.n700 }}>{gt ? 'Las compras aceptadas entran al libro de compras.' : 'Se envía a Hacienda el acuse de cada comprobante.'}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.n700 }}>×</button>
        </div>

        <div style={{ padding: '16px 24px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Tipo de acuse: control segmentado de una línea */}
          <div>
            <div role="radiogroup" aria-label="Tipo de acuse" style={{ display: 'inline-flex', border: `1px solid ${C.n500}`, borderRadius: 8, overflow: 'hidden' }}>
              {((gt ? [['total', 'Aceptar completa'], ['parcial', 'Aceptar con diferencia'], ['rechazo', 'Rechazar']] : [['total', 'Aceptación total'], ['parcial', 'Aceptación parcial'], ['rechazo', 'Rechazo']]) as [TipoAcuse, string][]).map(([v, l], i) => (
                <button key={v} role="radio" aria-checked={tipo === v} onClick={() => setTipo(v)}
                  style={{ padding: '8px 16px', fontSize: 12.5, fontFamily: FONT, cursor: 'pointer', border: 'none', borderLeft: i ? `1px solid ${C.n500}` : 'none',
                    background: tipo === v ? (v === 'rechazo' ? C.errorBg ?? '#FDECEA' : C.brandBg) : '#fff', color: tipo === v ? (v === 'rechazo' ? C.error : C.brand) : C.n900, fontWeight: tipo === v ? 600 : 400 }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: C.n700, marginTop: 6 }}>
              {tipo === 'total' ? (gt ? 'Todo el DTE es correcto.' : 'Todo el comprobante es correcto.') : tipo === 'parcial' ? 'Se acepta con alguna diferencia: indica cuál.' : gt ? 'El DTE no corresponde a una compra de la empresa: indica el motivo.' : 'El comprobante no corresponde o está mal: indica el motivo.'}
            </div>
          </div>

          {requiereDetalle && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: C.n700 }}>
              {tipo === 'rechazo' ? 'Motivo del rechazo' : 'Diferencia encontrada'}
              <textarea value={detalle} onChange={e => setDetalle(e.target.value.slice(0, MAX_DETALLE))} rows={2}
                style={{ border: `1px solid ${C.n500}`, borderRadius: 6, padding: '8px 10px', fontSize: 12.5, fontFamily: FONT, resize: 'vertical' }} />
              <span style={{ alignSelf: 'flex-end' }}>{detalle.length}/{MAX_DETALLE}</span>
            </label>
          )}

          {/* 2. Confirmar la actividad de mi empresa, por proveedor */}
          <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', background: C.n200, borderBottom: `1px solid ${C.n500}`, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 200 }}>
                {tipo !== 'rechazo' && !gt ? 'Compras y actividades' : 'Compras'}
                {tipo !== 'rechazo' && !gt && <span style={{ display: 'block', fontSize: 11.5, fontWeight: 400, color: C.n700, marginTop: 2 }}>Tu actividad (hotel) se eligió al importar cada compra y va en el acuse tal cual.</span>}
              </span>
              {tipo !== 'rechazo' && !gt && grupos.length > 1 && grupos.some(([, cs]) => !fija(cs)) && (
                <select value="" onChange={e => setActividad(e.target.value)} aria-label="Misma actividad para todos" style={{ ...sel, width: 'auto', minWidth: 220 }}>
                  <option value="">Misma para todos…</option>
                  {misActividades.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              )}
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {grupos.map(([k, cs], gi) => {
                // Actividades con que facturó (distintas entre sus facturas), registradas o nuevas
                const aps = Array.from(new Map(cs.map(c => actProveedor(k, c)).filter((x): x is NonNullable<typeof x> => Boolean(x)).map(x => [x.completa.split(' - ')[0], x])).values());
                const total = cs.reduce((t, c) => t + Number(c.total_factura || 0), 0);
                return (
                  <div key={k} style={{ borderTop: gi ? `1px solid ${C.n500}` : 'none', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{cs[0].proveedor}</div>
                        <div style={{ fontSize: 11.5, color: C.n700, marginTop: 2 }}>
                          {cs.length} factura{cs.length === 1 ? '' : 's'} · {monto(total, cs[0].moneda)}
                          {aps.length > 0 && <> · Actividad del proveedor: {aps.map((x, i) => <span key={x.completa}>{i ? ' y ' : ''}{x.texto}</span>)}</>}
                        </div>
                      </div>
                      {tipo !== 'rechazo' && !gt && fija(cs) && (
                        <div style={{ width: 300, flexShrink: 0 }}>
                          <div style={{ ...sel, display: 'flex', alignItems: 'center', gap: 6, background: C.n200, color: C.n900, overflow: 'hidden' }} title={actividadDe(k, cs)}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actividadDe(k, cs)}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.n700, marginTop: 4 }}>{yaAcusada(cs) ? 'Ya se declaró en el acuse anterior: no se puede cambiar.' : 'Mi actividad (hotel), elegida al importar. Para cambiarla usa «Cambiar actividad» en la compra.'}</div>
                        </div>
                      )}
                      {tipo !== 'rechazo' && !gt && !fija(cs) && (
                        <div style={{ width: 300, flexShrink: 0 }}>
                          <select value={actividadDe(k, cs)} onChange={e => { const v = e.target.value; setActPorProv(x => ({ ...x, [k]: v })); setRecordar(x => ({ ...x, [k]: true })); }}
                            style={{ ...sel, width: '100%' }} aria-label={`Actividad de mi empresa para ${cs[0].proveedor}`}>
                            {Array.from(new Set([...misActividades, actividadDe(k, cs)].filter(Boolean))).map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                          {recordar[k] !== undefined && (
                            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 11, color: C.n700, marginTop: 4, cursor: 'pointer' }}>
                              <input type="checkbox" checked={Boolean(recordar[k])} onChange={e => setRecordar(x => ({ ...x, [k]: e.target.checked }))} />
                              Usarla en sus próximas compras
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                    {cs.length > 1 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {cs.map(c => (
                          <span key={c.id} style={{ fontSize: 11, color: C.n700, background: C.n200, borderRadius: 999, padding: '3px 9px', fontVariantNumeric: 'tabular-nums' }}>
                            {c.numero_factura} · {fecha(c.fecha_emision)} · {monto(c.total_factura, c.moneda)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Asiento: una sola casilla */}
          {preguntaAsiento && (
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={generarAsiento} onChange={e => setGenerarAsiento(e.target.checked)} style={{ marginTop: 2 }} />
              <span>Generar el asiento contable {compras.length > 1 ? 'de cada compra' : 'de la compra'}
                <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2 }}>Lleva el número de factura del proveedor y la compra queda con el número de asiento.</span>
              </span>
            </label>
          )}
        </div>

        <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button variant={tipo === 'rechazo' ? 'danger' : 'primary'} onClick={emitir} disabled={!valido || enviando}>
            {enviando ? 'Enviando…' : tipo === 'rechazo' ? `Rechazar (${compras.length})` : `${gt ? 'Aceptar' : 'Emitir acuse'} (${compras.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
