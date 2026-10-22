'use client';
// Piezas compartidas de Reservaciones: chip de estado, selección de habitación,
// disponibilidad de cupos, pronóstico por tipo, selección de perfil, revisión de
// precios, desglose del total y confirmación imprimible de la reserva.
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius, SIZE } from '@/components/suite/tokens';
import { Button, Checkbox, Modal, Radio, StatusBadge } from '@/components/suite/ui';
import { Buscador, CardTabs, norm } from '@/components/configuracion/kit';
import { FiltroChecks, exportarCSV } from '@/components/hotel/ui';
import { useHotel, totalReserva } from '@/components/hotel/store';
import { HOY, NACIONALIDADES, REGIMENES, TARIFAS_NOMBRES, TIPOS, contratoDeTarifa, diaSemana, fmtF, noches, sumarDias, type EstadoReserva, type Perfil, type Reserva } from '@/components/hotel/datos';
import { ESTADO_UI, habitacionLibre, numeroDe, usoDe } from '@/components/hotel/reservas';
import { fmtMon, fmtN, r2 } from '@/components/hotel/finanzas';
import { FiltroUno, HojaSistema, TablaReporte, Visor, tdR } from '@/components/facturacion/comun';
import { bloqueadaEnEstancia, inventario } from './inventario';
import { MontoCelda } from '@/components/suite/Monto';

export const nombreTipo = (id: string) => TIPOS.find(t => t.id === id)?.nombre ?? id;
export const IVA = 0.13;

export function ChipEstado({ estado }: { estado: EstadoReserva }) {
  return <StatusBadge label={estado} color={ESTADO_UI[estado].color} />;
}

// ── Totales de una reserva (una o varias líneas) ────────────────────────────
export function totales(ls: Reserva[], incluirDeposito = true) {
  const alojamiento = r2(ls.reduce((s, r) => s + r.precio * Math.max(1, noches(r.entrada, r.salida)), 0));
  const total = r2(ls.reduce((s, r) => s + totalReserva(r), 0));
  const descuento = r2(ls.reduce((s, r) => s + r.descuento, 0));
  const cargos = r2(total + descuento - alojamiento);
  const subtotalII = total;
  const impuestos = r2(subtotalII - subtotalII / (1 + IVA));
  const deposito = r2(ls.reduce((s, r) => s + r.depGarantia, 0));
  const aCobrar = r2(Math.max(0, subtotalII - (incluirDeposito ? deposito : 0)));
  const pagado = r2(ls.reduce((s, r) => s + r.pagado, 0));
  return { alojamiento, cargos, subtotal: r2(alojamiento + cargos - impuestos), impuestos, descuento, subtotalII, deposito, aCobrar, pagado, pendiente: r2(Math.max(0, aCobrar - pagado)) };
}

/** Desglose del total (ojo junto a «Total»). */
export function Desglose({ ls, moneda }: { ls: Reserva[]; moneda: string }) {
  const [incluir, setIncluir] = useState(true);
  const t = totales(ls, incluir);
  const fila = (l: string, v: number, extra?: CSSProperties) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, padding: '3px 0', ...extra }}><span>{l}</span><span>{fmtMon(v, moneda)}</span></div>;
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 2, fontFamily: FONT }}>
      <span style={{ alignSelf: 'flex-end', fontSize: 11, color: C.n700 }}>{moneda} {moneda === 'CRC' ? '₡' : '$'}</span>
      {fila('Alojamiento', t.alojamiento)}{fila('Cargos adicionales', t.cargos)}{fila('Subtotal', t.subtotal)}{fila('Impuestos', t.impuestos)}
      {fila('Descuento', -t.descuento)}
      <div style={{ borderTop: `1px solid ${C.n500}`, margin: '4px 0' }} />
      {fila('Subtotal i.i', t.subtotalII, { fontWeight: 600 })}
      {fila('Dep. en Garantía', t.deposito)}
      <div style={{ padding: '4px 0' }}><Checkbox checked={incluir} onChange={setIncluir} label="Incluir depósito en el cierre" /></div>
      {fila('Importe a Cobrar', t.aCobrar, { fontWeight: 600 })}{fila('Pagado', t.pagado)}
      {fila('Pendiente', t.pendiente, { color: t.pendiente > 0 ? C.error : '#2E7D32', fontWeight: 600 })}
    </div>
  );
}

// ── Selección de habitación ─────────────────────────────────────────────────
export function SeleccionHabitacion({ tipo, entrada, salida, ignorar = [], actual, onElegir, onClose, titulo = 'Selección de habitación' }: {
  tipo?: string; entrada: string; salida: string; ignorar?: string[]; actual?: string; onElegir: (num: string, tipo: string) => void; onClose: () => void; titulo?: string;
}) {
  const h = useHotel();
  const [t, setT] = useState(tipo || TIPOS[0].id);
  const [sel, setSel] = useState(actual ?? '');
  const [limpias, setLimpias] = useState(false);
  const [pisos, setPisos] = useState<string[]>([]);
  const libre = (num: string) => habitacionLibre(h.reservas, num, entrada, salida, ignorar) && !bloqueadaEnEstancia(h, num, entrada, salida);
  const conteo = (id: string) => h.habitaciones.filter(x => x.tipo === id && libre(x.numero)).length;
  const habs = h.habitaciones.filter(x => x.tipo === t && libre(x.numero) && (!limpias || !x.sucia) && (!pisos.length || pisos.includes(String(x.piso))));
  return (
    <Modal open title={titulo} onClose={onClose} width={720}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!sel} onClick={() => onElegir(sel, h.habitaciones.find(x => x.numero === sel)?.tipo ?? t)}>Seleccionar habitación</Button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 320, margin: -20 }}>
        <div style={{ borderRight: `1px solid ${C.n500}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: C.n700, marginBottom: 6 }}>Tipo de habitaciones</span>
          {TIPOS.map(x => (
            <button key={x.id} type="button" onClick={() => { setT(x.id); setSel(''); }} aria-pressed={t === x.id}
              style={{ textAlign: 'left', padding: '9px 10px', borderRadius: radius.md, border: `1px solid ${t === x.id ? C.brandBd : 'transparent'}`, background: t === x.id ? C.brandBg : 'none', color: t === x.id ? C.brand : C.n900, fontSize: 12, fontFamily: FONT, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              <span>{x.nombre.toUpperCase()}</span><span style={{ color: C.n700, fontSize: 11 }}>{conteo(x.id)}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 12, color: C.n700 }}>Selecciona la habitación que quieres asignar · {fmtF(entrada)} → {fmtF(salida)}</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <Checkbox checked={limpias} onChange={setLimpias} label="Mostrar solo habitaciones limpias" />
            <FiltroChecks label="Filtros" value={pisos} onChange={setPisos} opciones={[1, 2, 3, 4].map(p => ({ value: String(p), label: `Piso ${p}` }))} ancho={180} />
          </div>
          <div role="radiogroup" aria-label="Habitaciones disponibles" style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 300 }}>
            {habs.map(x => (
              <span key={x.numero} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Radio name="sel-hab" checked={sel === x.numero} onChange={() => setSel(x.numero)} label={<span style={{ fontSize: 13 }}>{x.numero}</span>} />
                <StatusBadge label={x.sucia ? 'Sucia' : 'Limpia'} color={x.sucia ? 'red' : 'green'} />
                <span style={{ fontSize: 11, color: C.n700 }}>Piso {x.piso}</span>
              </span>
            ))}
            {!habs.length && <span style={{ fontSize: 12, color: C.n700 }}>No hay habitaciones de este tipo disponibles en esas fechas.</span>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Disponibilidad de cupos / Pronóstico por tipo ───────────────────────────
const ESTADOS_INV = [{ value: 'con', label: 'Incluir solicitadas' }, { value: 'sin', label: 'Solo confirmadas' }];
function FiltrosInventario({ desde, hasta, setRango, tarifa, setTarifa, estado, setEstado, extra }: {
  desde: string; hasta: string; setRango: (d: string, h: string) => void; tarifa: string; setTarifa: (v: string) => void; estado: string; setEstado: (v: string) => void; extra?: ReactNode;
}) {
  const inp: CSSProperties = { height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT };
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.n700 }}>Desde<input type="date" value={desde} onChange={e => e.target.value && setRango(e.target.value, e.target.value > hasta ? e.target.value : hasta)} className="suite-campo" style={inp} /></label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.n700 }}>Hasta<input type="date" value={hasta} min={desde} onChange={e => e.target.value && setRango(desde, e.target.value)} className="suite-campo" style={inp} /></label>
      <FiltroUno label="Estado" value={estado} onChange={setEstado} todos={null} opciones={ESTADOS_INV} prefijo={false} />
      <FiltroUno label="Tarifa" value={tarifa} onChange={setTarifa} todos="Todas" opciones={TARIFAS_NOMBRES.map(t => ({ value: t, label: `${t} · ${contratoDeTarifa(t)}` }))} />
      {extra}
    </div>
  );
}
const num = (n: number, extra?: CSSProperties): CSSProperties => ({ ...tdR(true), color: n < 0 ? C.error : C.n900, ...extra });

export function DisponibilidadCupos({ onClose, desde: d0 = HOY, hasta: h0 }: { onClose: () => void; desde?: string; hasta?: string }) {
  const h = useHotel();
  const [rango, setRangoS] = useState({ d: d0, h: h0 ?? sumarDias(d0, 13) });
  const [tarifa, setTarifa] = useState('');
  const [estado, setEstado] = useState('con');
  const dias = useMemo(() => inventario(h, rango.d, rango.h, { tarifa: tarifa || undefined, incluirSolicitadas: estado === 'con' }), [h, rango, tarifa, estado]);
  const tabla = (
    <TablaReporte headers={['Día', ...TIPOS.map(t => t.codigo), 'Total']} derecha={TIPOS.map((_, i) => i + 1).concat(TIPOS.length + 1)}>
      {dias.map(d => (
        <tr key={d.fecha}><td style={tdR()}>{diaSemana(d.fecha)} {fmtF(d.fecha)}</td>
          {d.porTipo.map(x => <td key={x.tipo} style={num(x.libres)}>{x.libres}</td>)}
          <td style={num(d.total.libres, { fontWeight: 600 })}>{d.total.libres}</td></tr>
      ))}
    </TablaReporte>
  );
  return (
    <Visor titulo="Disponibilidad sobre cupos contratados" onClose={onClose} ancho={980}
      onCSV={() => exportarCSV('disponibilidad-cupos', ['Día', ...TIPOS.map(t => t.codigo), 'Total'], dias.map(d => [fmtF(d.fecha), ...d.porTipo.map(x => x.libres), d.total.libres]))}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="no-print"><FiltrosInventario desde={rango.d} hasta={rango.h} setRango={(d, x) => setRangoS({ d, h: x })} tarifa={tarifa} setTarifa={setTarifa} estado={estado} setEstado={setEstado} /></div>
        <HojaSistema titulo="Disponibilidad de cupos" subtitulo="Habitaciones libres por tipo y día" criterio={`Desde ${fmtF(rango.d)} hasta ${fmtF(rango.h)} · Tarifa: ${tarifa || 'Todas'} · ${ESTADOS_INV.find(e => e.value === estado)!.label}`}>{tabla}</HojaSistema>
      </div>
    </Visor>
  );
}

export function PronosticoTipoModal({ onClose, desde: d0 = HOY, hasta: h0 }: { onClose: () => void; desde?: string; hasta?: string }) {
  const h = useHotel();
  const [rango, setRangoS] = useState({ d: d0, h: h0 ?? sumarDias(d0, 13) });
  const [tarifa, setTarifa] = useState('');
  const [estado, setEstado] = useState('con');
  const [ver, setVer] = useState<'libres' | 'ocupadas'>('libres');
  const dias = useMemo(() => inventario(h, rango.d, rango.h, { tarifa: tarifa || undefined, incluirSolicitadas: estado === 'con' }), [h, rango, tarifa, estado]);
  const v = (x: { libres: number; ocupadas: number; solicitadas: number }) => (ver === 'libres' ? x.libres : x.ocupadas + x.solicitadas);
  return (
    <Visor titulo="Pronóstico por Tipo de Habitación" onClose={onClose} ancho={980}
      onCSV={() => exportarCSV('pronostico-tipo-habitacion', ['Fecha', 'Libres', '%', ...TIPOS.map(t => t.codigo)], dias.map(d => [fmtF(d.fecha), d.total.libres, d.total.pct, ...d.porTipo.map(v)]))}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="no-print"><FiltrosInventario desde={rango.d} hasta={rango.h} setRango={(d, x) => setRangoS({ d, h: x })} tarifa={tarifa} setTarifa={setTarifa} estado={estado} setEstado={setEstado}
          extra={<span style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12, color: C.n700 }}>Ver:<Radio name="ver-pron" checked={ver === 'libres'} onChange={() => setVer('libres')} label="Disponibilidad" /><Radio name="ver-pron" checked={ver === 'ocupadas'} onChange={() => setVer('ocupadas')} label="Ocupación" /></span>} /></div>
        <HojaSistema titulo="Pronóstico por tipo de habitación" subtitulo={ver === 'libres' ? 'Habitaciones libres por tipo' : 'Habitaciones ocupadas por tipo'} criterio={`Desde ${fmtF(rango.d)} hasta ${fmtF(rango.h)} · Tarifa: ${tarifa || 'Todas'}`}>
          <TablaReporte headers={['Fecha', 'Libres', '%', ...TIPOS.map(t => t.codigo)]} derecha={[1, 2, ...TIPOS.map((_, i) => i + 3)]}>
            {dias.map(d => (
              <tr key={d.fecha}><td style={tdR()}>{diaSemana(d.fecha)} {fmtF(d.fecha)}</td><td style={num(d.total.libres)}>{d.total.libres}</td><td style={tdR(true)}>{fmtN(d.total.pct)}</td>
                {d.porTipo.map(x => <td key={x.tipo} style={num(v(x))}>{v(x)}</td>)}</tr>
            ))}
          </TablaReporte>
        </HojaSistema>
      </div>
    </Visor>
  );
}

// ── Revisión de precios y restricciones ─────────────────────────────────────
export function RevisionPrecios({ onClose, tarifa: t0 = 'DIR', tipo: tp0 = TIPOS[0].id, entrada: e0 = HOY, salida: s0 }: { onClose: () => void; tarifa?: string; tipo?: string; entrada?: string; salida?: string }) {
  const [f, setF] = useState({ tarifa: t0 || 'DIR', tipo: tp0 || TIPOS[0].id, entrada: e0, salida: s0 && s0 > e0 ? s0 : sumarDias(e0, 3) });
  const precio = Math.round((TIPOS.find(x => x.id === f.tipo)?.tarifa ?? 0) * (f.tarifa === 'DIR' ? 1 : f.tarifa === 'CORP' ? 0.85 : 0.92));
  const dias = Array.from({ length: Math.max(1, noches(f.entrada, f.salida)) }, (_, i) => sumarDias(f.entrada, i));
  const inp: CSSProperties = { height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT, width: '100%', boxSizing: 'border-box' };
  const sel = (v: string, on: (v: string) => void, ops: { value: string; label: string }[], l: string) => <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: C.n700, flex: 1 }}>{l}<select value={v} onChange={e => on(e.target.value)} className="suite-campo" style={inp}>{ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
  return (
    <Visor titulo="Revisión de Precios y Restricciones" onClose={onClose} ancho={900}
      onCSV={() => exportarCSV('revision-precios', ['Fecha', 'Contrato', 'Uso', 'Precio i.i', 'Impuestos', 'Precio sin impuestos'], dias.map(d => [fmtF(d), contratoDeTarifa(f.tarifa), f.tipo, precio, r2(precio - precio / (1 + IVA)), r2(precio / (1 + IVA))]))}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          {sel(f.tarifa, v => setF({ ...f, tarifa: v }), TARIFAS_NOMBRES.map(t => ({ value: t, label: `${t} · ${contratoDeTarifa(t)}` })), 'Contrato')}
          {sel(f.tipo, v => setF({ ...f, tipo: v }), TIPOS.map(t => ({ value: t.id, label: `${t.codigo} - ${t.nombre}` })), 'Uso de habitación')}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: C.n700 }}>Entrada<input type="date" value={f.entrada} onChange={e => e.target.value && setF({ ...f, entrada: e.target.value, salida: f.salida > e.target.value ? f.salida : sumarDias(e.target.value, 1) })} className="suite-campo" style={inp} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: C.n700 }}>Salida<input type="date" value={f.salida} min={sumarDias(f.entrada, 1)} onChange={e => e.target.value && setF({ ...f, salida: e.target.value })} className="suite-campo" style={inp} /></label>
        </div>
        <HojaSistema titulo="Resumen de tarifas por contrato" subtitulo={`${contratoDeTarifa(f.tarifa)} / ${f.tipo} - ${nombreTipo(f.tipo)}`} criterio={`Desde ${fmtF(f.entrada)} hasta ${fmtF(f.salida)} · Estancia mínima: 1 noche · Sin restricciones de llegada`}>
          <TablaReporte headers={['Fecha', 'Contrato', 'Uso de habitación', 'Precio i.i', 'I.V.A. 13%', 'Precio sin impuestos']} derecha={[3, 4, 5]}>
            {dias.map(d => <tr key={d}><td style={tdR()}>{diaSemana(d)} {fmtF(d)}</td><td style={tdR()}>{f.tarifa}</td><td style={tdR()}>{nombreTipo(f.tipo)} ({f.tipo})</td><td style={tdR(true)}><MontoCelda texto={fmtMon(precio)} /></td><td style={tdR(true)}><MontoCelda texto={fmtMon(r2(precio - precio / (1 + IVA)))} /></td><td style={tdR(true)}><MontoCelda texto={fmtMon(r2(precio / (1 + IVA)))} /></td></tr>)}
            <tr><td colSpan={3} style={tdR(false, { fontWeight: 600 })}>Total estancia ({dias.length} noches)</td><td style={tdR(true, { fontWeight: 600 })}><MontoCelda texto={fmtMon(precio * dias.length)} /></td><td style={tdR(true)}><MontoCelda texto={fmtMon(r2((precio - precio / (1 + IVA)) * dias.length))} /></td><td style={tdR(true)}><MontoCelda texto={fmtMon(r2(precio / (1 + IVA) * dias.length))} /></td></tr>
          </TablaReporte>
        </HojaSistema>
      </div>
    </Visor>
  );
}

// ── Selección de perfil (Cliente / Empresa) ─────────────────────────────────
export function SeleccionarPerfil({ onClose, onElegir, onNuevo, soloCliente }: { onClose: () => void; onElegir: (p: Perfil) => void; onNuevo?: () => void; soloCliente?: boolean }) {
  const h = useHotel();
  const [tab, setTab] = useState<'Cliente' | 'Empresa'>('Cliente');
  const [q, setQ] = useState('');
  const [nac, setNac] = useState<string[]>([]);
  const [vip, setVip] = useState(false);
  const [sel, setSel] = useState('');
  const lista = h.perfiles.filter(p => p.tipo === (tab === 'Cliente' ? 'cliente' : 'empresa') && (!q || norm(`${p.nombre} ${p.nombreComercial} ${p.numeroId} ${p.email}`).includes(norm(q)))
    && (!nac.length || nac.includes(p.nacionalidad)) && (!vip || p.extra.vip)).slice(0, 80);
  const elegido = h.perfiles.find(p => p.id === sel);
  return (
    <Modal open title={soloCliente ? 'Seleccionar perfil de cliente' : 'Seleccionar perfil'} onClose={onClose} width={680}
      footer={<>{onNuevo && <Button variant="secondary" onClick={onNuevo} style={{ marginRight: 'auto' }}>+ Agregar perfil</Button>}<Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!elegido} onClick={() => elegido && onElegir(elegido)}>Seleccionar perfil</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!soloCliente && <CardTabs tabs={['Cliente', 'Empresa'] as const} active={tab} onChange={t => { setTab(t); setSel(''); }} />}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200 }}><Buscador value={q} onChange={setQ} placeholder="Buscar por nombre o clave" /></div>
          {tab === 'Cliente' && <FiltroChecks label="Nacionalidad" value={nac} onChange={setNac} opciones={Object.values(NACIONALIDADES).map(n => ({ value: n, label: n }))} />}
          {tab === 'Cliente' && <Checkbox checked={vip} onChange={setVip} label="VIP" />}
        </div>
        <span style={{ fontSize: 12, color: C.n700 }}>Selecciona un perfil</span>
        <div role="radiogroup" aria-label="Perfiles" style={{ display: 'flex', flexDirection: 'column', maxHeight: 340, overflowY: 'auto', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
          {lista.map(p => (
            <label key={p.id} className="suite-fila" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: `1px solid ${C.n500}`, cursor: 'pointer', background: sel === p.id ? C.brandBg : undefined }}>
              <input type="radio" name="sel-perfil" checked={sel === p.id} onChange={() => setSel(p.id)} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, color: C.n900 }}>{p.nombre}</span> <span style={{ fontSize: 11, color: C.n700 }}>{p.numeroId}</span>{p.extra.vip && <> <StatusBadge label="VIP" color="brand" /></>}
                <br /><span style={{ fontSize: 11, color: C.n700 }}>{p.tipo === 'empresa' ? (p.nombreComercial || p.email) : `${p.nacionalidad || '—'} · ${p.email || 'sin correo'}`}</span>
              </span>
            </label>
          ))}
          {!lista.length && <span style={{ padding: 16, fontSize: 12, color: C.n700, textAlign: 'center' }}>No hay perfiles que coincidan.</span>}
        </div>
      </div>
    </Modal>
  );
}

// ── Confirmación de reserva (PDF) ───────────────────────────────────────────
export function ConfirmacionReserva({ ls, perfil }: { ls: Reserva[]; perfil?: Perfil }) {
  const p = ls[0];
  const t = totales(ls);
  return (
    <HojaSistema titulo="Confirmación de reserva" subtitulo={`Reserva N° ${numeroDe(p)}${p.idExterno ? ` · ID ${p.idExterno}` : ''} · ${p.estado}`}
      criterio={`Titular: ${perfil?.nombre ?? p.nombre} · Tarifa: ${p.tarifa} (${contratoDeTarifa(p.tarifa)}) · ${fmtF(p.entrada)} → ${fmtF(p.salida)} · ${ls.length} habitación(es)`}>
      <TablaReporte headers={['#', 'Hab.', 'Tipo', 'Uso', 'Entrada', 'Salida', 'Noches', 'Pax', 'Régimen', 'Precio i.i', 'Total']} derecha={[6, 7, 9, 10]}>
        {ls.map((r, i) => <tr key={r.id}><td style={tdR()}>{i + 1}</td><td style={tdR()}>{r.habitacion || '—'}</td><td style={tdR()}>{nombreTipo(r.tipo)}</td><td style={tdR()}>{usoDe(r)}</td><td style={tdR()}>{fmtF(r.entrada)}</td><td style={tdR()}>{fmtF(r.salida)}</td>
          <td style={tdR(true)}>{noches(r.entrada, r.salida)}</td><td style={tdR(true)}>{r.adultos}+{r.ninos}</td><td style={tdR()}>{REGIMENES[r.regimen] ?? r.regimen}</td><td style={tdR(true)}><MontoCelda texto={fmtMon(r.precio, r.moneda)} /></td><td style={tdR(true)}><MontoCelda texto={fmtMon(totalReserva(r), r.moneda)} /></td></tr>)}
      </TablaReporte>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <div style={{ width: 280, fontSize: 11.5 }}>
          {[['Alojamiento', t.alojamiento], ['Cargos adicionales', t.cargos], ['Descuento', -t.descuento], ['Impuestos incluidos', t.impuestos], ['Total i.i', t.subtotalII], ['Depósito en garantía', t.deposito], ['Pagado', t.pagado], ['Pendiente', t.pendiente]].map(([l, v]) =>
            <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: l === 'Total i.i' || l === 'Pendiente' ? 700 : 400 }}><span>{l}</span><span>{fmtMon(v as number, p.moneda)}</span></div>)}
        </div>
      </div>
      {(p.observaciones || p.condiciones.length > 0) && <p style={{ marginTop: 14, fontSize: 11 }}><b>Observaciones:</b> {[p.observaciones, ...p.condiciones].filter(Boolean).join(' · ')}</p>}
      <p style={{ marginTop: 14, fontSize: 10.5, color: C.n700 }}>Check-in a partir de las 15:00 · Check-out hasta las 12:00. Las cancelaciones con menos de 48 horas de anticipación pueden tener cargo de una noche.</p>
    </HojaSistema>
  );
}
