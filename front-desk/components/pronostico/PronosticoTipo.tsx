'use client';
// Pronóstico por tipo de habitación: tabla fechas × tipos con las habitaciones
// libres (Disponibilidad) u ocupadas (Ocupación). Clic en una celda muestra el
// detalle y enlaza al «Detalle del tipo de habitación».
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Radio } from '@/components/suite/ui';
import { Buscador, Popover, norm } from '@/components/configuracion/kit';
import { IcChevronDown } from '@/components/suite/icons';
import { FiltroChecks } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { HOY, TARIFAS_NOMBRES, TIPOS, contratoDeTarifa, diaSemana, fmtF, sumarDias } from '@/components/hotel/datos';
import { GRUPOS_DISP } from '@/components/hotel/reservas';
import { HojaSistema, PaginaFact, TablaReporte, Tarjeta, tdR } from '@/components/facturacion/comun';
import { ExportarReporte, Limpiar, TablaP, tdP } from './comun';
import { pronostico, type CeldaPron, type OpcPron } from './estadisticas';

const TABS = ['Disponibilidad', 'Ocupación'] as const;
const ESTADOS = ['Solicitada', 'Confirmada', 'Lista de espera'];
export const codigoTipo = (id: string) => `${String(TIPOS.findIndex(t => t.id === id) + 1).padStart(2, '0')}_${id}`;
interface Mas { desde: string; hasta: string; fuente: 'Hotel' | 'Tarifa'; titulo: string; modo: 'Real' | 'Proyectado'; cupos: boolean; release: boolean }
const masInicial = (): Mas => ({ desde: HOY, hasta: sumarDias(HOY, 20), fuente: 'Hotel', titulo: '', modo: 'Proyectado', cupos: false, release: false });

export default function PronosticoTipo() {
  const h = useHotel();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Disponibilidad');
  const [grupos, setGrupos] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>(['Solicitada', 'Confirmada']);
  const [tarifa, setTarifa] = useState('');
  const [mas, setMas] = useState<Mas>(masInicial);
  const [verMas, setVerMas] = useState(false);
  const [verContratos, setVerContratos] = useState(false);
  const [qc, setQc] = useState('');
  const [info, setInfo] = useState<{ fecha: string; c: CeldaPron } | null>(null);
  const tipos = grupos.length && !grupos.includes('TOTAL') ? TIPOS.filter(t => GRUPOS_DISP.some(g => grupos.includes(g.id) && g.tipos.includes(t.id))) : TIPOS;
  const opc: OpcPron = { estados, tarifa: tarifa || undefined, titulo: mas.titulo || undefined, modo: mas.modo, fuente: mas.fuente, respetarCupos: mas.cupos, respetarRelease: mas.release };
  const dias = pronostico(h, mas.desde, mas.hasta, opc);
  const valor = (c: CeldaPron) => (tab === 'Disponibilidad' ? c.libres : c.ocupadas + c.reservadas);
  const visibles = (d: (typeof dias)[number]) => d.celdas.filter(c => tipos.some(t => t.id === c.tipo));
  const tot = (d: (typeof dias)[number]) => { const cs = visibles(d); const total = cs.reduce((s, c) => s + c.total, 0); const oc = cs.reduce((s, c) => s + c.ocupadas + c.reservadas, 0); return { libres: cs.reduce((s, c) => s + c.libres, 0), oc, pct: total ? Math.round((oc / total) * 1000) / 10 : 0 }; };
  const limpiar = () => { setGrupos([]); setEstados(['Solicitada', 'Confirmada']); setTarifa(''); setMas(masInicial()); };
  const criterio = `${fmtF(mas.desde)} – ${fmtF(mas.hasta)} · Estados: ${estados.join(', ') || 'ninguno'} · Contrato: ${tarifa ? contratoDeTarifa(tarifa) : 'Todos'} · ${mas.modo} · Fuente: ${mas.fuente}${mas.cupos ? ' · Respeta cupos' : ''}${mas.release ? ' · Respeta release' : ''}`;
  const headers = ['Fecha', tab === 'Disponibilidad' ? 'Libres' : 'Ocupadas', '%', ...tipos.map(t => codigoTipo(t.id))];
  const filas = dias.map(d => { const t = tot(d); return [fmtF(d.fecha), tab === 'Disponibilidad' ? t.libres : t.oc, t.pct, ...visibles(d).map(valor)]; });
  const color = (n: number) => (tab === 'Disponibilidad' && n < 0 ? C.error : C.n900);
  return (
    <PaginaFact titulo="Pronóstico por tipo de habitación"
      acciones={<>
            <ExportarReporte disabled={!dias.length} datos={() => ({ nombre: `pronostico-${tab.toLowerCase()}`, titulo: `Pronóstico por tipo de habitación · ${tab}`, criterio, headers, filas })}
              pdf={<HojaSistema titulo="Pronóstico por tipo de habitación" subtitulo={tab} criterio={criterio}><TablaReporte headers={headers} derecha={headers.map((_, i) => i).slice(1)}>{filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j} style={tdR(j > 0)}>{c}</td>)}</tr>)}</TablaReporte></HojaSistema>} />
      </>}
      tabs={{ items: TABS, activo: tab, onChange: setTab }}
      filtros={<>
          <FiltroChecks label="Grupo de disponibilidad" value={grupos} onChange={setGrupos} ancho={260} opciones={[{ value: 'TOTAL', label: 'Total de habitaciones' }, ...GRUPOS_DISP.map(g => ({ value: g.id, label: g.nombre }))]} />
          <FiltroChecks label="Estado" value={estados} onChange={setEstados} opciones={ESTADOS.map(e => ({ value: e, label: e }))} />
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Button variant="secondary" onClick={() => setVerContratos(v => !v)} style={tarifa ? { color: C.brand, borderColor: C.brand, background: C.brandBg } : undefined}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{tarifa ? `Contrato: ${contratoDeTarifa(tarifa)}` : 'Contratos'}<IcChevronDown size={12} /></span></Button>
            <Popover open={verContratos} onClose={() => setVerContratos(false)} width={260}>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Buscador value={qc} onChange={setQc} placeholder="Buscar" />
                {[{ v: '', l: 'Todos los contratos' }, ...TARIFAS_NOMBRES.map(t => ({ v: t, l: `${contratoDeTarifa(t)} (${t})` }))].filter(x => !qc || norm(x.l).includes(norm(qc))).map(x => (
                  <button key={x.v} type="button" onClick={() => { setTarifa(x.v); setVerContratos(false); }} className="suite-fila" style={{ textAlign: 'left', border: 'none', background: tarifa === x.v ? C.brandBg : 'none', color: tarifa === x.v ? C.brand : C.n900, padding: '8px', fontSize: 12, fontFamily: FONT, borderRadius: radius.control, cursor: 'pointer' }}>{x.l}</button>
                ))}
              </div>
            </Popover>
          </span>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Button variant="secondary" onClick={() => setVerMas(v => !v)}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Más filtros<IcChevronDown size={12} /></span></Button>
            {verMas && <MasFiltros inicial={mas} onClose={() => setVerMas(false)} onAplicar={m => { setMas(m); setVerMas(false); }} />}
          </span>
          <Limpiar onClick={limpiar} />
      </>}>
      <Tarjeta>
        <span style={{ alignSelf: 'flex-start', fontSize: 11.5, color: C.n700, background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '5px 10px' }}>Haz clic en cualquier casilla para ver más información</span>
        <TablaP headers={headers} derecha={headers.map((_, i) => i).slice(1)}>
          {dias.map(d => {
            const t = tot(d);
            return (
              <tr key={d.fecha} className="suite-fila">
                <td style={tdP(false, { color: d.fecha === HOY ? C.brand : C.n900, fontWeight: d.fecha === HOY ? 600 : 400 })}>{diaSemana(d.fecha)} {fmtF(d.fecha)}</td>
                <td style={tdP(true, { color: color(t.libres) })}>{tab === 'Disponibilidad' ? t.libres : t.oc}</td><td style={tdP(true)}>{t.pct}%</td>
                {visibles(d).map(c => (
                  <td key={c.tipo} style={tdP(true, { padding: 0 })}>
                    <button type="button" onClick={() => setInfo({ fecha: d.fecha, c })} aria-label={`${codigoTipo(c.tipo)} el ${fmtF(d.fecha)}: ${valor(c)}`}
                      style={{ width: '100%', padding: 8, border: 'none', background: info?.fecha === d.fecha && info.c.tipo === c.tipo ? C.brandBg : 'transparent', textAlign: 'right', fontSize: 12, fontFamily: FONT, cursor: 'pointer', color: color(valor(c)), position: 'relative' }}>
                      {valor(c)}
                      {info?.fecha === d.fecha && info.c.tipo === c.tipo && <InfoCelda fecha={d.fecha} c={c} onClose={() => setInfo(null)} onDetalle={() => router.push(`/pronostico-estadisticas/detalle-del-tipo-de-habitacion?tipo=${c.tipo}&fecha=${d.fecha}&desde=pronostico`)} />}
                    </button>
                  </td>
                ))}
              </tr>
            );
          })}
        </TablaP>
      </Tarjeta>
    </PaginaFact>
  );
}

function InfoCelda({ fecha, c, onClose, onDetalle }: { fecha: string; c: CeldaPron; onClose: () => void; onDetalle: () => void }) {
  const fila = (l: string, v: number, b?: boolean) => <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: b ? 'none' : `1px solid ${C.n500}`, fontWeight: b ? 600 : 400 }}><span>{l}:</span><span>{v}</span></div>;
  return (
    <Popover open onClose={onClose} width={230}>
      <div role="dialog" aria-label="Información" onClick={e => e.stopPropagation()} style={{ fontSize: 12, textAlign: 'left', cursor: 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${C.n500}` }}><b style={{ fontWeight: 600 }}>Información</b><span role="button" tabIndex={0} aria-label="Cerrar" onClick={onClose} onKeyDown={e => e.key === 'Enter' && onClose()} style={{ cursor: 'pointer' }}>✕</span></div>
        <div style={{ padding: '10px 14px' }}>
          <div style={{ background: C.n200, borderRadius: radius.md, padding: '8px 10px', marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fecha:</span><span>{fmtF(fecha)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tipo de habitación:</span><span>{codigoTipo(c.tipo)}</span></div>
          </div>
          {fila('Fuera de orden', c.fueraOrden)}{fila('Ocupadas', c.ocupadas)}{fila('Libres', c.libres)}{fila('Reservadas', c.reservadas)}{fila('Salidas', c.salidas)}{fila('Total', c.total, true)}
        </div>
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'flex-end' }}><span role="button" tabIndex={0} onClick={onDetalle} onKeyDown={e => e.key === 'Enter' && onDetalle()}
          style={{ border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '6px 12px', cursor: 'pointer', color: C.n900 }}>Ver detalle de habitación</span></div>
      </div>
    </Popover>
  );
}

function MasFiltros({ inicial, onClose, onAplicar }: { inicial: Mas; onClose: () => void; onAplicar: (m: Mas) => void }) {
  const [m, setM] = useState(inicial);
  const lbl = { fontSize: 12, fontWeight: 600, color: C.n900 } as const;
  return (
    <Popover open onClose={onClose} width={320}>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>Desde<Input type="date" value={m.desde} onChange={v => v && setM({ ...m, desde: v, hasta: v > m.hasta ? v : m.hasta })} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>Hasta<Input type="date" value={m.hasta} onChange={v => v && v >= m.desde && setM({ ...m, hasta: v })} /></label>
        </div>
        <span style={lbl}>Fuente de datos</span>
        <span style={{ display: 'flex', gap: 16 }}><Radio name="fuente" checked={m.fuente === 'Hotel'} onChange={() => setM({ ...m, fuente: 'Hotel' })} label="Hotel" /><Radio name="fuente" checked={m.fuente === 'Tarifa'} onChange={() => setM({ ...m, fuente: 'Tarifa' })} label="Tarifa (cupos del contrato)" /></span>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={lbl}>Título del grupo</span><Input value={m.titulo} onChange={v => setM({ ...m, titulo: v })} placeholder="Nombre del grupo o empresa" /></label>
        <span style={{ display: 'flex', gap: 16 }}><Radio name="modo" checked={m.modo === 'Proyectado'} onChange={() => setM({ ...m, modo: 'Proyectado' })} label="Proyectado" /><Radio name="modo" checked={m.modo === 'Real'} onChange={() => setM({ ...m, modo: 'Real' })} label="Real" /></span>
        <span style={lbl}>Restricciones aplicadas</span>
        <span style={{ display: 'flex', gap: 16 }}><Checkbox checked={m.cupos} onChange={b => setM({ ...m, cupos: b })} label="Respetar cupos" /><Checkbox checked={m.release} onChange={b => setM({ ...m, release: b })} label="Respetar release" /></span>
        <span style={{ fontSize: 11, color: C.n700 }}>Cupos y release aplican cuando hay un contrato seleccionado.</span>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onAplicar(m)}>Aplicar filtros</Button></div>
      </div>
    </Popover>
  );
}
