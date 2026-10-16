'use client';
// Gestión de auditorías: historial de auditorías y preauditorías con sus
// reportes, configuración del cierre diario y de la auditoría automática, y el
// asistente «Generar auditoría nocturna».
import { useMemo, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Toast } from '@/components/suite/ui';
import { Buscador } from '@/components/configuracion/kit';
import { CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF, sumarDias } from '@/components/hotel/datos';
import { reporteAud, ultimaAuditoria, type Auditoria } from '@/components/hotel/auditoria';
import { minutosEntre } from '@/components/hotel/finanzas';
import { Exportar, FiltroUno, PaginaFact, Tarjeta, Visor } from '@/components/facturacion/comun';
import { exportarCSV } from '@/components/hotel/ui';
import { TablaP, Vacio, tdP } from '@/components/pronostico/comun';
import { HojaAuditoria, filasExport, generarReporte } from './motor';
import { GenerarAuditoria } from './Generar';
import { ConfigCierreModal, Ok, VerReporte } from './piezas';

const TABS = ['Auditorías', 'Preauditorías'] as const;
const dur = (a: Auditoria) => { const m = Math.max(0, minutosEntre(a.inicio, a.fin)); return `00:${String(m).padStart(2, '0')}:${String((a.numero * 7) % 60).padStart(2, '0')} (min)`; };

export default function Gestion() {
  const h = useHotel();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Auditorías');
  const [q, setQ] = useState('');
  const auditorias = useMemo(() => h.auditorias.filter(a => a.tipo === 'Auditoría').sort((a, b) => b.inicio.localeCompare(a.inicio)), [h.auditorias]);
  const [audSel, setAudSel] = useState('');
  const [fechaPre, setFechaPre] = useState('');
  const [ver, setVer] = useState<{ codigo: string; fecha: string } | null>(null);
  const [todo, setTodo] = useState<{ a: Auditoria; codigos?: string[] } | null>(null);
  const s = useSeleccion();
  const [generar, setGenerar] = useState(false);
  const [cfg, setCfg] = useState<null | 'cierre' | 'auto'>(null);
  const [verResultado, setVerResultado] = useState(false);
  const resultado = verResultado ? ultimaAuditoria(h) : null;
  const [toast, setToast] = useState<string | null>(null);
  const aud = auditorias.find(a => a.id === audSel) ?? auditorias[0];
  const preaud = h.auditorias.filter(a => a.tipo === 'Preauditoría' && (!fechaPre || a.fecha === fechaPre)).sort((a, b) => b.inicio.localeCompare(a.inicio));
  const reportes = (aud?.reportes ?? []).map(c => reporteAud(c)!).filter(r => r && (!q || `${r.codigo} ${r.descripcion}`.toLowerCase().includes(q.toLowerCase())));

  const esAud = tab === 'Auditorías';
  const csv = (cods?: string[]) => esAud
    ? exportarCSV(`auditoria-${aud?.numero ?? ''}-reportes`, ['Código', 'Descripción', 'Hora', 'Orden', 'Sistema'], reportes.filter(r => !cods || cods.includes(r.codigo)).map(r => [r.codigo, r.descripcion, aud?.fin.slice(11, 16) ?? '', String(r.orden).padStart(3, '0'), r.sis ? 'Sí' : 'No']))
    : exportarCSV('preauditorias', ['Código', 'Descripción', 'Responsable', 'Fecha', 'Hora', 'Número'], preaud.map(a => ['PRE', 'Preauditoría Nocturna', a.usuario, fmtF(a.fecha), a.inicio.slice(11, 16), a.numero]));
  if (generar) return <GenerarAuditoria onSalir={ok => { setGenerar(false); if (ok) { setToast('Auditoría nocturna completada exitosamente.'); setTab('Auditorías'); setAudSel(''); setVerResultado(true); } }} />;

  return (
    <PaginaFact titulo="Gestión de auditorías" acciones={<>
      <Button variant="secondary" onClick={() => setCfg('cierre')}>Configuración de cierre</Button>
      <Button variant="secondary" onClick={() => setCfg('auto')}>Auditoría automática</Button>
      {esAud && aud && <Button variant="secondary" onClick={() => setTodo({ a: aud })}>Descargar todo</Button>}
      <Exportar onCSV={() => csv()} disabled={esAud ? !reportes.length : !preaud.length} titulo={esAud ? `Auditoría ${aud ? fmtF(aud.fecha) : ''}` : 'Preauditorías'} />
      <Button onClick={() => setGenerar(true)}>Generar auditoría</Button></>}
      tabs={{ items: TABS, activo: tab, onChange: t => { setTab(t); s.limpiar(); } }}
      seleccion={esAud && aud ? { n: s.n, onLimpiar: s.limpiar, acciones: <>
        <Button variant="secondary" onClick={() => setTodo({ a: aud, codigos: aud.reportes.filter(c => s.tiene(c)) })}>Ver / descargar seleccionados</Button>
        <Button variant="secondary" onClick={() => csv(s.sel)}>Exportar selección</Button>
      </> } : undefined}
      filtros={<>
          <div style={{ width: 260 }}><Buscador value={q} onChange={setQ} placeholder="Buscar por código o descripción" /></div>
          {tab === 'Auditorías'
            ? <FiltroUno label="Fecha de auditoría" value={aud?.id ?? ''} onChange={v => { setAudSel(v); s.limpiar(); }} todos={null} ancho={280} opciones={auditorias.map(a => ({ value: a.id, label: `${fmtF(a.fecha)} · Cierre ${a.numero}` }))} />
            : <FiltroUno label="Fecha de preauditoría" value={fechaPre} onChange={setFechaPre} todos="Todas" opciones={[...new Set(h.auditorias.filter(a => a.tipo === 'Preauditoría').map(a => a.fecha))].sort().reverse().map(f => ({ value: f, label: fmtF(f) }))} />}
      </>}>
      <Tarjeta>
        {tab === 'Auditorías' && aud && <>
          <div style={{ background: C.n200, borderRadius: radius.md, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '6px 30px', fontSize: 12 }}>
            <span><span style={{ color: C.n700, display: 'inline-block', width: 110 }}>Usuario</span>{aud.usuario}</span><span><span style={{ color: C.n700, display: 'inline-block', width: 110 }}>Número Cierre:</span>{aud.numero}</span>
            <span><span style={{ color: C.n700, display: 'inline-block', width: 110 }}>Inicio:</span>{fmtF(aud.inicio.slice(0, 10))} - {aud.inicio.slice(11, 16)}:00</span><span><span style={{ color: C.n700, display: 'inline-block', width: 110 }}>Duración</span>{dur(aud)}</span>
            {aud.efectos && <span style={{ gridColumn: '1 / -1', color: C.n700 }}>Resultado: {aud.efectos.join(' · ')}</span>}
          </div>
          <TablaP headers={[<CheckTodos key="t" s={s} ids={reportes.map(r => r.codigo)} />, 'Código', 'Descripción', 'Act.', 'Hora', 'Orden', 'Sis', 'Rep', 'Reportes']} alto="calc(100vh - 380px)">
            {!reportes.length && <Vacio cols={9} texto="No hay reportes que coincidan." />}
            {reportes.map(r => (
              <tr key={r.codigo} className="suite-fila">
                <td style={tdP(false, { width: 28 })}><CheckFila s={s} id={r.codigo} label={`Seleccionar ${r.codigo}`} /></td>
                <td style={tdP()}>{r.codigo}</td><td style={tdP()}>{r.descripcion}</td><td style={tdP()}><Ok on={r.sis || r.orden % 2 === 0} /></td>
                <td style={tdP()}>{aud.fin.slice(11, 16)}</td><td style={tdP()}>{String(r.orden).padStart(3, '0')}</td><td style={tdP()}><Ok on={r.sis} /></td><td style={tdP()}><Ok on /></td>
                <td style={tdP()}><button type="button" onClick={() => setVer({ codigo: r.codigo, fecha: aud.fecha })} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>Ver reporte</button></td>
              </tr>
            ))}
          </TablaP>
        </>}
        {tab === 'Preauditorías' && (
          <TablaP headers={['Código', 'Descripción', 'Responsable', 'Fecha', 'Act.', 'Hora', 'Orden', 'Sis', 'Rep', 'Reportes']} alto="calc(100vh - 320px)">
            {!preaud.length && <Vacio cols={10} texto="No hay preauditorías para la fecha seleccionada." />}
            {preaud.filter(() => !q || 'pre preauditoría nocturna'.includes(q.toLowerCase())).map((a, i) => (
              <tr key={a.id} className="suite-fila">
                <td style={tdP()}>PRE</td><td style={tdP()}>Preauditoría Nocturna</td><td style={tdP()}>{a.usuario}</td><td style={tdP()}>{fmtF(a.fecha)}</td><td style={tdP()}><Ok on={i % 3 !== 2} /></td>
                <td style={tdP()}>{a.inicio.slice(11, 16)}</td><td style={tdP()}>{String(a.numero).padStart(3, '0')}</td><td style={tdP()}><Ok on={i % 3 !== 2} /></td><td style={tdP()}><Ok on={i % 3 !== 2} /></td>
                <td style={tdP()}><button type="button" onClick={() => setVer({ codigo: 'PRE', fecha: a.fecha })} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>Ver reporte</button></td>
              </tr>
            ))}
          </TablaP>
        )}
      </Tarjeta>
      {ver && <VerReporte codigo={ver.codigo} fecha={ver.fecha} onClose={() => setVer(null)} />}
      {todo && <TodosReportes a={todo.a} codigos={todo.codigos} onClose={() => setTodo(null)} />}
      {cfg === 'cierre' && <ConfigCierreModal onClose={() => setCfg(null)} onListo={() => { setCfg(null); setToast('Configuración de cierre guardada'); }} />}
      {cfg === 'auto' && <AutoAuditoria onClose={() => setCfg(null)} onListo={t => { setCfg(null); setToast(t); }} />}
      {resultado && <Modal open title={`Auditoría nocturna · Cierre ${resultado.numero}`} onClose={() => setVerResultado(false)} width={560} footer={<Button onClick={() => setVerResultado(false)}>Aceptar</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
          <span style={{ color: '#2E7D32', fontWeight: 600 }}>✓ Auditoría nocturna completada exitosamente.</span>
          <span style={{ color: C.n700 }}>Fecha hotelera {fmtF(resultado.fecha)} · {resultado.reportes.length} reportes generados.</span>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{(resultado.efectos ?? []).map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      </Modal>}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </PaginaFact>
  );
}

function TodosReportes({ a, codigos, onClose }: { a: Auditoria; codigos?: string[]; onClose: () => void }) {
  const h = useHotel();
  const docs = (codigos ?? a.reportes).map(c => generarReporte(h, c, a.fecha));
  return (
    <Visor titulo="Reportes generados" sub={`${fmtF(a.fecha)} · Cierre ${a.numero}`} onClose={onClose} ancho={1000}
      onCSV={() => exportarCSV(`auditoria-${a.numero}`, ['Reporte'], docs.flatMap(d => { const x = filasExport(d); return [[d.titulo], ...x.filas]; }))}>
      {docs.map((d, i) => <div key={i} style={{ borderTop: i ? `2px dashed ${C.n500}` : 'none', breakBefore: i ? 'page' : undefined }}><HojaAuditoria d={d} fecha={a.fecha} /></div>)}
    </Visor>
  );
}

const DIAS = ['D', 'L', 'K', 'M', 'J', 'V', 'S'];
function AutoAuditoria({ onClose, onListo }: { onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const a0 = h.cfgCierre.auto;
  const [editar, setEditar] = useState(!a0);
  const [a, setA] = useState(a0 ?? { activa: true, dias: [false, true, true, true, true, true, false], desde: HOY, hasta: sumarDias(HOY, 30), sinPeriodo: false, hora: '20:00' });
  const hora12 = (x: string) => { const [hh, mm] = x.split(':').map(Number); return `${String(hh % 12 || 12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`; };
  const chips = (on: boolean) => <span style={{ display: 'flex', gap: 6 }}>{DIAS.map((d, i) => (
    <button key={i} type="button" disabled={!on} aria-pressed={a.dias[i]} aria-label={`Día ${d}`} onClick={() => setA({ ...a, dias: a.dias.map((x, j) => (j === i ? !x : x)) })}
      style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${a.dias[i] ? C.brand : C.n500}`, background: a.dias[i] ? C.brand : C.n000, color: a.dias[i] ? '#fff' : C.n900, fontSize: 12, fontFamily: FONT, cursor: on ? 'pointer' : 'default' }}>{d}</button>))}</span>;
  const fila = (l: string, v: React.ReactNode) => <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: 10, fontSize: 12 }}><span style={{ color: C.n700 }}>{l}</span>{v}</div>;
  return (
    <Modal open title="Configuración de auditoría automática" onClose={onClose} width={560}
      footer={editar ? <><Button variant="secondary" onClick={() => (a0 ? setEditar(false) : onClose())}>Cancelar</Button><Button disabled={!a.dias.some(Boolean)} onClick={() => { h.guardarCfgCierre({ ...h.cfgCierre, auto: a }); onListo('Auditoría automática configurada'); }}>Guardar configuración</Button></>
        : <><Button variant="secondary" style={{ color: C.error, marginRight: 'auto' }} onClick={() => { h.guardarCfgCierre({ ...h.cfgCierre, auto: null }); onListo('Auditoría automática eliminada'); }}>Eliminar</Button><Button onClick={() => setEditar(true)}>Editar configuración</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {editar && <div style={{ background: C.brandBg, color: C.brand, borderRadius: radius.md, padding: '8px 12px', fontSize: 12 }}>Al hacer la auditoría de manera automática no se realizará la preauditoría.</div>}
        <span style={{ fontSize: 12, color: C.n700 }}>{editar ? 'Selecciona los días y período en que se generará la auditoría automática.' : 'Días y período en que se generará la auditoría automática.'}</span>
        {fila('Días activos:', chips(editar))}
        {fila('Período de activación:', editar ? <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input type="date" value={a.desde} disabled={a.sinPeriodo} onChange={v => setA({ ...a, desde: v })} /><Input type="date" value={a.hasta} disabled={a.sinPeriodo} min={a.desde} onChange={v => setA({ ...a, hasta: v })} />
          <Checkbox checked={a.sinPeriodo} onChange={b => setA({ ...a, sinPeriodo: b })} label="Sin período" /></span> : <b>{a.sinPeriodo ? 'Sin período' : `${fmtF(a.desde)} - ${fmtF(a.hasta)}`}</b>)}
        {fila('Hora de realización:', editar ? <span style={{ width: 140 }}><Input type="time" value={a.hora} onChange={v => setA({ ...a, hora: v })} /></span> : <b>{hora12(a.hora)}</b>)}
      </div>
    </Modal>
  );
}
