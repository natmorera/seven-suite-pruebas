'use client';
// Asistente «Generar auditoría nocturna»: 1) preauditar (opcional) y
// 2) seleccionar reportes / correos, revisar parámetros, aplicar descuentos y
// ejecutar el cierre (con contraseña si ya hubo un cierre hoy).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Radio, Toast } from '@/components/suite/ui';
import { Pantalla } from '@/components/layout/Pantalla';
import { Buscador, IcTrash, Popover, TextArea } from '@/components/configuracion/kit';
import { Alerta, exportarCSV } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, TIPOS, fmtF } from '@/components/hotel/datos';
import { POR_DEFECTO, REPORTES_AUD, ultimaAuditoria, type CorreoAud } from '@/components/hotel/auditoria';
import { CONCEPTOS, fmtMon, r2 } from '@/components/hotel/finanzas';
import { useEmpresa } from '@/components/layout/Shell';
import { Visor } from '@/components/facturacion/comun';
import { CHECKS_PRE, HojaAuditoria, filasExport, preauditoria, type DocAud } from './motor';
import { ConfigCierreModal, Ok, VerReporte } from './piezas';

const TARJETAS = [
  { t: 'Saldos en el pick', d: 'Verificar y corregir discrepancias en montos y asignaciones de habitaciones en registros de Puntos de Venta y cargos manuales.', c: 'PICK' },
  { t: 'Depósito en Garantía', d: 'Asegurar precisión en montos, moneda y vinculación de depósitos a reservas. Corregir discrepancias asociando depósitos o reingresando los mal hechos.', c: 'DEPG' },
  { t: 'Históricos de folio', d: "Asegurar que el tipo de cobro en las facturas sea correcto. Emplear 'Correcciones a folios cerrados' si es necesario corregirlo.", c: 'FACC' },
  { t: 'Listado de operaciones de caja', d: 'En la verificación de caja, si persisten faltantes después de corregir lo del paso 3, no detener el cierre; es un asunto interno que debe resolverse.', c: 'MANO' },
  { t: 'Check-In en proceso', d: 'Verificar si hay check-in pendientes de completar.', c: 'CKINTER' },
];

function Progreso({ titulo, onCancelar, ms, onFin, cronometro }: { titulo: string; onCancelar: () => void; ms: number; onFin: () => void; cronometro?: boolean }) {
  const [p, setP] = useState(0);
  const fin = useRef(onFin);
  useEffect(() => { fin.current = onFin; });
  useEffect(() => {
    const t0 = Date.now();
    const i = setInterval(() => { const x = Math.min(1, (Date.now() - t0) / ms); setP(x); if (x >= 1) { clearInterval(i); fin.current(); } }, 80);
    return () => clearInterval(i);
  }, [ms]);
  const s = Math.floor((p * ms) / 1000);
  return (
    <Modal open title={titulo} onClose={onCancelar} width={420} footer={<Button variant="secondary" onClick={onCancelar}>Cancelar</Button>}>
      <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', padding: '6px 0' }}>
        <span style={{ fontSize: 12, color: C.n700 }}>Este proceso puede tomar unos minutos</span>
        <div style={{ width: '100%', height: 6, background: C.n500, borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${p * 100}%`, height: '100%', background: C.brand, transition: 'width .08s linear' }} /></div>
        {cronometro && <span style={{ fontSize: 12, color: C.n700 }}>Tiempo transcurrido: 00:00:{String(s).padStart(2, '0')}</span>}
      </div>
    </Modal>
  );
}

export function GenerarAuditoria({ onSalir }: { onSalir: (ok: boolean) => void }) {
  const h = useHotel();
  const empresa = useEmpresa();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [preDone, setPreDone] = useState(false);
  const [marcados, setMarcados] = useState<string[]>(CHECKS_PRE.slice(0, 4));
  const [dlg, setDlg] = useState<null | 'progPre' | 'resPre' | 'correo' | 'diag' | 'config' | 'confirmar' | 'progAud' | { rep: string }>(null);
  const [correos, setCorreos] = useState<CorreoAud[]>(h.correosAud.length ? h.correosAud : [{ id: 'c0', email: '', reportes: POR_DEFECTO }]);
  const [pass, setPass] = useState('');
  const [errPass, setErrPass] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [inicio, setInicio] = useState('');
  const ult = ultimaAuditoria(h);
  const hoyAuditado = ult?.fecha === HOY;
  const reportes = [...new Set(correos.flatMap(c => c.reportes))];

  const pre = preauditoria(h, marcados);
  const docPre: DocAud = { titulo: 'Preauditoría Nocturna', subtitulo: `Número de preauditoría: ${String(h.auditorias.filter(a => a.tipo === 'Preauditoría').length).padStart(4, '0')}`, resumen: pre.categorias.map(c => [c.nombre, c.errores ? `${c.errores} errores` : 'Sin errores']), tablas: pre.secciones.filter(s => s.filas.length), registros: pre.secciones.reduce((s, x) => s + x.filas.length, 0), vacio: 'Sin errores por corregir.' };

  const generar = () => {
    if (correos.some(c => c.email && !/^\S+@\S+\.\S+$/.test(c.email))) return setError('Revisa los correos: hay direcciones no válidas.');
    setError(''); setPass(''); setErrPass(''); setDlg('confirmar');
  };
  const confirmar = () => {
    if (hoyAuditado && pass !== h.cfgCierre.password) return setErrPass('Contraseña incorrecta.');
    h.guardarCorreosAud(correos.filter(c => c.email.trim()));
    const d = new Date(); setInicio(`${HOY}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setDlg('progAud');
  };
  const paso1 = (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 240px', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: C.brandBg, color: C.brand, borderRadius: radius.md, padding: '9px 12px', fontSize: 12 }}>ⓘ Antes de realizar la auditoría se recomienda preauditar para verificar que no hayan errores.</div>
        {TARJETAS.map(x => (
          <div key={x.c} style={{ display: 'flex', gap: 16, alignItems: 'center', border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '12px 14px' }}>
            <span style={{ flex: 1 }}><b style={{ fontSize: 12.5, fontWeight: 600, display: 'block' }}>{x.t}</b><span style={{ fontSize: 11.5, color: C.n700 }}>{x.d}</span></span>
            <button type="button" onClick={() => setDlg({ rep: x.c })} style={{ border: 'none', background: 'none', color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12, whiteSpace: 'nowrap' }}>Ver reporte</button>
          </div>
        ))}
      </div>
      <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, alignSelf: 'flex-start' }}>
        <b style={{ fontSize: 12.5, fontWeight: 600 }}>Revisar</b>
        {CHECKS_PRE.map(c => <Checkbox key={c} checked={marcados.includes(c)} onChange={b => setMarcados(b ? [...marcados, c] : marcados.filter(x => x !== c))} label={c} />)}
        {preDone && <span style={{ fontSize: 11.5, color: '#2E7D32' }}>✓ Preauditoría ejecutada · {pre.categorias.reduce((s, c) => s + c.errores, 0)} errores</span>}
      </div>
    </div>
  );
  const detalles = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Bloque titulo="Detalles">
        <Par l="Fecha hotelera:" v={<span style={{ color: C.brand }}>{fmtF(HOY)}</span>} /><Par l="Número Cierre:" v={(ult?.numero ?? 5582) + 1} /><Par l="Última Auditoría:" v={ult ? `${fmtF(ult.fecha)} ${ult.fin.slice(11, 16)}:00` : '—'} />
      </Bloque>
      <Bloque titulo="Parámetros y Configuración" accion={<Button variant="secondary" onClick={() => setDlg('config')}>Configurar</Button>}>
        <Par l="Fecha último cierre:" v={fmtF(ult?.fecha)} /><Par l="Días de lista cierre:" v={h.cfgCierre.diasLista} />
        <Par l="Contabilización diaria de impuestos:" v={<SiNo on={h.cfgCierre.contable.impuestosDiarios} />} /><Par l="Producc. Fact. Agencia 1er Día:" v={<SiNo on={!!h.cfgCierre.params['Producc. fact. agencia 1er día']} />} />
        <Par l="Cobrar Dep. Adel. No Show:" v={<SiNo on={!!h.cfgCierre.params['Cobrar dep. adel. No Show']} />} /><Par l="Cobrar Dep. Adel. Caduco:" v={<SiNo on={!!h.cfgCierre.params['Cobrar dep. adel. Caduco']} />} />
        <Par l="Prórrogas automáticas:" v={<SiNo on={!!h.cfgCierre.params['Realizar prórrogas automáticas']} />} /><Par l="Asiento de Tipo Automático:" v={<SiNo on={h.cfgCierre.contable.asientoAutomatico} />} />
        <Par l="Integración Automática de Asientos:" v={<SiNo on={h.cfgCierre.contable.integracionAutomatica} />} /><Par l="Asientos Detallados:" v={<SiNo on={h.cfgCierre.contable.asientosDetallados} />} /><Par l="Libro Contable de Front:" v={h.cfgCierre.contable.libro} />
      </Bloque>
      <Descuentos onToast={setToast} />
    </div>
  );
  const paso2 = (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 12, color: C.n700 }}>Añade los correos electrónicos a los que deseas enviar los informes. Todos los informes estarán disponibles cuando los necesites.</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 220px 30px', gap: 8, fontSize: 12, color: C.n700 }}><span>Correo electrónico</span><span>Asignar reportes</span><span /></div>
        {correos.map(c => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 220px 30px', gap: 8, alignItems: 'center' }}>
            <Input value={c.email} onChange={v => setCorreos(correos.map(x => (x.id === c.id ? { ...x, email: v } : x)))} placeholder="Ingresa un correo" aria-label="Correo electrónico" />
            <AsignarReportes valor={c.reportes} onChange={r => setCorreos(correos.map(x => (x.id === c.id ? { ...x, reportes: r } : x)))} />
            <button type="button" aria-label="Quitar correo" onClick={() => setCorreos(correos.filter(x => x.id !== c.id))} style={{ border: 'none', background: 'none', color: C.error, cursor: 'pointer' }}><IcTrash /></button>
          </div>
        ))}
        <span><Button variant="secondary" style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setCorreos([...correos, { id: nuevoId('ca'), email: '', reportes: correos[0]?.reportes ?? POR_DEFECTO }])}>+ Crear nuevo correo</Button></span>
        <span style={{ fontSize: 12, color: C.n700 }}>Se generarán {reportes.length || POR_DEFECTO.length} reportes: {(reportes.length ? reportes : POR_DEFECTO).join(', ')}.</span>
        {error && <span role="alert" style={{ fontSize: 12, color: C.error }}>{error}</span>}
        {hoyAuditado && <div role="alert" style={{ marginTop: 'auto', display: 'flex', gap: 8, background: 'rgba(244,67,54,.06)', border: '1px solid rgba(244,67,54,.25)', color: C.error, borderRadius: radius.md, padding: '10px 12px', fontSize: 12 }}>
          ⓘ <span>Se ha detectado que la auditoría nocturna <b>se ejecutó hace menos de 20 horas</b>. Por favor verifique con detenimiento la fecha hotelera actual, localizada en el panel derecho, para determinar si se debe ejecutar otra vez la auditoría.</span></div>}
      </div>
      {detalles}
    </div>
  );
  const circulo = (n: number, on: boolean, done: boolean) => <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, background: done ? '#4CAF50' : on ? C.brand : C.n000, color: done || on ? '#fff' : C.n700, border: done || on ? 'none' : `1px solid ${C.n500}` }}>{done ? '✓' : n}</span>;
  return (
    <Pantalla titulo="Generar auditoría nocturna"
      izquierda={<button type="button" aria-label="Volver" onClick={() => (paso === 2 ? setPaso(1) : onSalir(false))} style={{ order: -1, border: `1px solid ${C.n500}`, background: C.n000, borderRadius: radius.control, width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>‹</button>}
      acciones={<>
        <Button variant="secondary" onClick={() => (paso === 2 ? setPaso(1) : onSalir(false))}>{paso === 2 ? 'Volver' : 'Cancelar'}</Button>
        {paso === 1 ? <><Button variant="secondary" disabled={!marcados.length} onClick={() => setDlg('progPre')}>Ejecutar preauditoría</Button><Button onClick={() => setPaso(2)}>{preDone ? 'Continuar' : 'Omitir'}</Button></>
          : <><Button variant="secondary" onClick={() => setDlg('diag')}>Diagnóstico de enlaces contables</Button><Button onClick={generar}>Generar auditoría</Button></>}
      </>}
      filtros={<span style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 12.5 }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: paso === 1 ? 600 : 400 }}>{circulo(1, paso === 1, paso === 2 || preDone)}Preauditar <span style={{ color: C.n700, fontWeight: 400 }}>(opcional)</span></span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: paso === 2 ? 600 : 400, color: paso === 2 ? C.n900 : C.n700 }}>{circulo(2, paso === 2, false)}Seleccionar reportes</span>
      </span>}>
      <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: 20, fontFamily: FONT }}>{paso === 1 ? paso1 : paso2}</section>

      {dlg && typeof dlg === 'object' && <VerReporte codigo={dlg.rep} fecha={HOY} onClose={() => setDlg(null)} />}
      {dlg === 'progPre' && <Progreso titulo="Generando preauditoría" ms={1600} onCancelar={() => setDlg(null)} onFin={() => { h.registrarPreauditoria(Object.fromEntries(pre.categorias.map(c => [c.nombre, c.errores]))); setPreDone(true); setDlg('resPre'); }} />}
      {dlg === 'resPre' && <Visor titulo="Preauditoría Nocturna" onClose={() => setDlg(null)} ancho={900} extra={<Button onClick={() => setDlg('correo')}>Enviar por correo</Button>}
        onCSV={() => { const x = filasExport(docPre); exportarCSV('preauditoria', x.headers, x.filas); }}>
        <HojaAuditoria d={docPre} fecha={HOY} extra={<p style={{ margin: '0 0 12px', fontSize: 11 }}>Fecha de Preauditoría: <b>{fmtF(HOY)}</b> · Errores por corregir: <b>{docPre.registros}</b></p>} />
      </Visor>}
      {dlg === 'correo' && <CorreoPreaud empresa={empresa} onClose={() => setDlg('resPre')} onListo={() => { setDlg(null); setToast('Preauditoría enviada por correo'); }} />}
      {dlg === 'diag' && <Diagnostico onClose={() => setDlg(null)} />}
      {dlg === 'config' && <ConfigCierreModal onClose={() => setDlg(null)} onListo={() => { setDlg(null); setToast('Configuración de cierre guardada'); }} />}
      {dlg === 'confirmar' && <Alerta open titulo="¿Desea confirmar el inicio de la auditoría nocturna?" onClose={() => setDlg(null)} confirmar="Ejecutar" cancelar="Cancelar" onConfirm={confirmar}>
        Una vez que comience el proceso por favor esperar y no cerrar esta página.
        {hoyAuditado && <div style={{ marginTop: 12, textAlign: 'left' }}><span style={{ fontSize: 12, color: C.n900 }}>Se requiere contraseña para ejecutar</span>
          <Input type="password" value={pass} onChange={v => { setPass(v); setErrPass(''); }} placeholder="Digite contraseña" aria-label="Contraseña" />
          {errPass && <span role="alert" style={{ fontSize: 11.5, color: C.error }}>{errPass}</span>}</div>}
      </Alerta>}
      {dlg === 'progAud' && <Progreso titulo="Generando auditoría" ms={2400} cronometro onCancelar={() => setDlg(null)} onFin={() => { h.ejecutarAuditoria(reportes.length ? reportes : POR_DEFECTO, inicio); onSalir(true); }} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </Pantalla>
  );
}

const Bloque = ({ titulo, accion, children }: { titulo: string; accion?: ReactNode; children: ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 14, borderBottom: `1px solid ${C.n500}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontSize: 13, fontWeight: 600 }}>{titulo}</b>{accion}</div>{children}
  </div>
);
const Par = ({ l, v }: { l: string; v: ReactNode }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, fontSize: 12 }}><span style={{ color: C.n700 }}>{l}</span><span>{v}</span></div>;
const SiNo = ({ on }: { on: boolean }) => <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Ok on={on} />{on ? 'Sí' : 'No'}</span>;

function AsignarReportes({ valor, onChange }: { valor: string[]; onChange: (r: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(valor);
  const [q, setQ] = useState('');
  const vis = REPORTES_AUD.filter(r => !q || r.descripcion.toLowerCase().includes(q.toLowerCase()));
  const todos = vis.every(r => sel.includes(r.codigo));
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => { setSel(valor); setOpen(o => !o); }} className="suite-campo" style={{ width: '100%', height: 32, border: `1px solid ${open ? C.brand : C.n500}`, borderRadius: radius.control, background: C.n000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>
        {valor.length ? `${valor.length} reportes seleccionados` : 'Seleccionar reportes'}<span aria-hidden>▾</span>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={440}>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Buscador value={q} onChange={setQ} placeholder="Busca por nombre de reporte" />
          <button type="button" onClick={() => setSel(todos ? sel.filter(c => !vis.some(r => r.codigo === c)) : [...new Set([...sel, ...vis.map(r => r.codigo)])])} style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12, padding: 0 }}>{todos ? 'Deseleccionar todos' : 'Seleccionar todos'}</button>
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vis.map(r => <Checkbox key={r.codigo} checked={sel.includes(r.codigo)} onChange={b => setSel(b ? [...sel, r.codigo] : sel.filter(x => x !== r.codigo))} label={r.descripcion} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${C.n500}`, paddingTop: 10 }}><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => { onChange(sel); setOpen(false); }}>Asignar reportes</Button></div>
        </div>
      </Popover>
    </span>
  );
}

function Descuentos({ onToast }: { onToast: (t: string) => void }) {
  const h = useHotel();
  const directos = h.reservas.filter(r => r.estado === 'In-House' && r.cliente !== 'Agencia de Viajes');
  const [sel, setSel] = useState<string[]>([]);
  const [auto, setAuto] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [modo, setModo] = useState<'pct' | 'imp'>('imp');
  const [valor, setValor] = useState('0');
  const caja = r2(h.movsCaja.filter(m => m.fecha === HOY).reduce((s, m) => s + (m.tipo === 'Egreso' ? -m.usd : m.usd), 0));
  const aplicar = () => {
    const v = Number(valor) || 0;
    if (!sel.length || v <= 0 || !concepto) return onToast('Selecciona habitaciones, concepto de abono y un valor.');
    h.editarReserva(sel.map(id => { const r = h.reservas.find(x => x.id === id)!; const d = modo === 'pct' ? r2(r.precio * v / 100) : v; return { id, p: { descuento: r2(r.descuento + d), cuentas: r.cuentas.map((c, i) => (i === 0 ? { ...c, saldo: r2(Math.max(0, c.saldo - d)) } : c)) } }; }),
      'Descuento aplicado por auditoría', '-', `${concepto} · ${modo === 'pct' ? `${v} %` : fmtMon(v)}`);
    onToast(`Descuento aplicado a ${sel.length} habitaciones`); setSel([]);
  };
  return (
    <Bloque titulo="Descuentos">
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderRight: `1px solid ${C.n500}`, paddingRight: 8 }}>
          <span style={{ fontSize: 11.5, color: C.n700 }}>Habitaciones de Directos</span>
          {directos.map(r => <Checkbox key={r.id} checked={sel.includes(r.id)} onChange={b => setSel(b ? [...sel, r.id] : sel.filter(x => x !== r.id))} label={<span title={`${r.nombre} · ${TIPOS.find(t => t.id === r.tipo)?.nombre}`}>{r.habitacion}</span>} />)}
          {!directos.length && <span style={{ fontSize: 11.5, color: C.n700 }}>Sin directos en casa</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Checkbox checked={auto} onChange={b => { setAuto(b); if (b) setSel(directos.map(r => r.id)); }} label="Aplicar descuentos automáticos" />
          <span style={{ fontSize: 12 }}>Concepto de abono</span>
          <select value={concepto} onChange={e => setConcepto(e.target.value)} aria-label="Concepto de abono" className="suite-campo" style={{ height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, padding: '0 6px' }}>
            <option value="">Seleccionar una opción</option>{CONCEPTOS.filter(c => ['DESC', 'HOSP', 'BB'].includes(c.codigo)).map(c => <option key={c.codigo} value={c.descripcion}>{c.codigo} - {c.descripcion}</option>)}
          </select>
          <span style={{ display: 'flex', gap: 14 }}><Radio name="modo-desc" checked={modo === 'pct'} onChange={() => setModo('pct')} label="Porcentaje" /><Radio name="modo-desc" checked={modo === 'imp'} onChange={() => setModo('imp')} label="Importe" /></span>
          <Input value={valor} onChange={v => setValor(v.replace(/[^\d.]/g, ''))} style={{ textAlign: 'right' }} aria-label="Valor del descuento" />
          <div style={{ display: 'flex', justifyContent: 'space-between', border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '9px 12px', fontSize: 12 }}><span style={{ color: C.n700 }}>Total en caja</span><b style={{ color: C.brand }}>Total {fmtMon(caja)}</b></div>
          <Button onClick={aplicar}>Aplicar</Button>
        </div>
      </div>
    </Bloque>
  );
}

function CorreoPreaud({ empresa, onClose, onListo }: { empresa: string; onClose: () => void; onListo: () => void }) {
  const h = useHotel();
  const [para, setPara] = useState(h.correosAud.map(c => c.email).join(', '));
  const [copia, setCopia] = useState('');
  const [asunto, setAsunto] = useState(`Preauditoría nocturna ${fmtF(HOY)}`);
  const [cuerpo, setCuerpo] = useState('');
  const [error, setError] = useState('');
  const enviar = () => {
    const ds = para.split(/[,;\s]+/).filter(Boolean);
    if (!ds.length || ds.some(d => !/^\S+@\S+\.\S+$/.test(d))) return setError('Indica al menos un destinatario válido.');
    if (!asunto.trim()) return setError('El asunto es obligatorio.');
    onListo();
  };
  const fila = (l: string, c: ReactNode) => <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.n500}`, padding: '6px 0', fontSize: 12 }}><span style={{ color: C.n700 }}>{l}</span>{c}</div>;
  return (
    <Modal open title="Enviar preauditoría por correo electrónico" onClose={onClose} width={620} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={enviar}>Enviar correo</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {fila('Remitente:', `info@${empresa.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.com`)}
        {fila('Para:', <Input value={para} onChange={setPara} placeholder="correo@ejemplo.com, otro@ejemplo.com" />)}
        {fila('Copiar a:', <Input value={copia} onChange={setCopia} placeholder="Opcional" />)}
        {fila('Asunto:', <Input value={asunto} onChange={setAsunto} placeholder="Ingresa el asunto del correo" />)}
        <div style={{ marginTop: 8 }}><TextArea value={cuerpo} onChange={setCuerpo} rows={5} placeholder="Ingresa el cuerpo del correo..." /></div>
        <span style={{ alignSelf: 'flex-start', marginTop: 8, fontSize: 12, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '6px 10px' }}>📄 Preauditoría.pdf</span>
        {error && <span role="alert" style={{ fontSize: 12, color: C.error }}>{error}</span>}
      </div>
    </Modal>
  );
}

function Diagnostico({ onClose }: { onClose: () => void }) {
  const h = useHotel();
  const perfiles = h.perfiles.filter(p => p.tipo === 'empresa' && !p.extra.cuenta);
  const conceptos = CONCEPTOS.filter(c => c.grupo.startsWith('REST') || c.grupo === 'BAR Y BEBIDAS');
  const d: DocAud = {
    titulo: 'Diagnóstico de enlaces contables', subtitulo: 'Perfiles y conceptos de producción sin cuenta contable asignada', registros: perfiles.length + conceptos.length,
    tablas: [
      { titulo: `HOTECARD (Perfiles) · Perfiles`, headers: ['ID', 'Código', 'Descripción', 'Cuenta', 'Cuenta activa', 'Eliminado'], filas: perfiles.map((p, i) => [8090 + i, p.numeroId, p.nombre, '—', '—', '—']) },
      { titulo: 'HOTECON1 (Conceptos de producción) · Conceptos de producción', headers: ['ID', 'Código', 'Descripción', 'Cuenta', 'Cuenta activa', 'Eliminado'], filas: conceptos.map((c, i) => [50 + i, c.codigo, c.descripcion, '—', '—', '—']) },
    ],
  };
  return <Visor titulo="Diagnóstico de enlaces contables" onClose={onClose} ancho={900} onCSV={() => { const x = filasExport(d); exportarCSV('diagnostico-enlaces', x.headers, x.filas); }}><HojaAuditoria d={d} fecha={HOY} /></Visor>;
}
