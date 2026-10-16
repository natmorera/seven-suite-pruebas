'use client';
// Configuración › Tarifas / Contratos › Tarifario: grilla por tarifa, tipo y día, editor de tarifa y acceso a la actualización colectiva.
import { BarraSeccion } from '@/components/layout/Pantalla';
import { BotonExportar } from '@/components/hotel/ui';
import { FiltroUno } from '@/components/facturacion/comun';
import { Fragment, useMemo, useState } from 'react';
import { C, FONT, fmtNum } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Select, Switch, Toast } from '@/components/suite/ui';
import { useDato } from '../store';
import { Campo, Grid, IcBolt, IcInfo, IconButton, PillTabs, Popover, SubCard, uid, useConfirmar } from '../kit';
import { DIAS, MONEDAS_OPC, TERMINOS, VISTAS_TARIFARIO, type Tarifa } from '../datos';
import { BOOL, adicionalesDe, clave, dow, fecha, iso, sumar, valor, vistaPax, type Vista } from '../tarifario';
import { ActualizacionColectiva } from './ActualizacionTarifas';
import { AccionesMasivas, CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';

// ── Tarifario ───────────────────────────────────────────────────────────────
const DIAS_VISTA = 10;
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function Tarifario() {
  const [tarifas, setTarifas] = useDato('tarifas');
  const [tipos] = useDato('tiposHab');
  const [mapa, setMapa] = useDato('tarifario');
  const [inicio, setInicio] = useState(() => iso(new Date()));
  const [moneda, setMoneda] = useState(MONEDAS_OPC[0]);
  const [inactivos, setInactivos] = useState(false);
  const [vistas, setVistas] = useState<Record<string, Vista>>({});
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const [masiva, setMasiva] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const s_ = useSeleccion();
  const [editorTarifa, setEditorTarifa] = useState<{ id: string | null } | null>(null);
  const [terminos, setTerminos] = useState(false);

  const dias = useMemo(() => Array.from({ length: DIAS_VISTA }, (_, i) => sumar(inicio, i)), [inicio]);
  const visibles = tarifas.filter(t => t.moneda === moneda && (inactivos || t.activo));

  const guardarCelda = (k: string, v: number | boolean | null) => {
    setMapa(m => { const n = { ...m }; if (v === null) delete n[k]; else n[k] = v; return n; });
  };
  const confirmarNumero = (k: string) => {
    const n = borrador.trim() === '' ? null : Number(borrador.replace(',', '.'));
    if (n === null || !isNaN(n)) guardarCelda(k, n === null ? null : n);
    setEditando(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BarraSeccion
        filtros={<>
          <FiltroUno label="Moneda" value={moneda} onChange={v => setMoneda(v || MONEDAS_OPC[0])} todos={null} opciones={MONEDAS_OPC.map(m => ({ value: m, label: m }))} />
          <Checkbox checked={inactivos} onChange={setInactivos} label="Mostrar inactivos" />
          <span aria-hidden style={{ width: 1, height: 22, background: C.n500, margin: '0 4px' }} />
        <Button variant="secondary" onClick={() => setInicio(sumar(inicio, -DIAS_VISTA))} title="Días anteriores">‹</Button>
        <div style={{ width: 160 }}><Input type="date" value={inicio} onChange={v => v && setInicio(v)} aria-label="Fecha de inicio" /></div>
        <Button variant="secondary" onClick={() => setInicio(sumar(inicio, DIAS_VISTA))} title="Días siguientes">›</Button>
        <Button variant="ghost" onClick={() => setInicio(iso(new Date()))}>Hoy</Button>
        <span style={{ position: 'relative' }}>
          <Button variant="ghost" icon={<IcInfo />} onClick={() => setTerminos(t => !t)}>Explicación de términos</Button>
          <Popover open={terminos} onClose={() => setTerminos(false)} width={330} align="right">
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Referencia de vistas</p>
              {VISTAS_TARIFARIO.map(v => <p key={v} style={{ fontSize: 12, margin: 0, color: C.n700 }}><b style={{ color: C.n900, fontWeight: 500 }}>{v}:</b> {TERMINOS[v]}</p>)}
            </div>
          </Popover>
        </span>
        </>}
        acciones={<>
          <BotonExportar onPDF={() => window.print()} titulo="Tarifario" />
          <Button variant="secondary" onClick={() => setEditorTarifa({ id: null })}>Crear / Editar tarifa</Button>
          <Button onClick={() => setMasiva(true)}>Actualización colectiva</Button>
        </>}
        derecha={s_.n ? <AccionesMasivas s={s_} etiqueta={s_.n === 1 ? 'tarifa seleccionada' : 'tarifas seleccionadas'}>
          <Button onClick={() => setMasiva(true)}>Actualizar seleccionadas</Button>
        </AccionesMasivas> : <span style={{ fontSize: 12, color: C.n700 }}>Marca filas para actualizarlas juntas</span>} />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 12, minWidth: 980 }}>
          <thead>
            <tr>
              <th style={{ width: 30 }} /><th style={{ width: 230 }} /><th style={{ width: 34 }} /><th style={{ width: 130 }} />
              {dias.map(d => {
                const fin = dow(d) >= 5;
                return (
                  <th key={d} style={{ padding: '4px 2px 6px', textAlign: 'center', fontWeight: 400, background: fin ? '#FFF8EC' : undefined, borderBottom: `1px solid ${C.n500}` }}>
                    <div style={{ fontSize: 11, color: C.n700 }}>{DIAS[dow(d)]}</div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: C.n900 }}>{fecha(d).getDate()}</div>
                    <div style={{ fontSize: 11, color: C.n700 }}>{MESES[fecha(d).getMonth()]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && <tr><td colSpan={4 + DIAS_VISTA} style={{ padding: 28, textAlign: 'center', color: C.n700 }}>No hay tarifas en {moneda}. Crea una con «Crear / Editar tarifa».</td></tr>}
            {visibles.length > 0 && tipos.map(tipo => (
              <Fragment key={tipo.id}>
                <tr>
                  <td style={{ background: C.n200, padding: '7px 8px' }}><CheckTodos s={s_} ids={visibles.map(t => `${tipo.id}|${t.id}`)} label={`Seleccionar todas las tarifas de ${tipo.nombre}`} /></td>
                  <td colSpan={3 + DIAS_VISTA} style={{ background: C.n200, padding: '7px 8px', fontWeight: 600, fontSize: 12 }}>{tipo.nombre.toUpperCase()} - {tipo.codigo}<span style={{ fontWeight: 400, color: C.n700, marginLeft: 8 }}>{tipo.base ?? 2} pax incluidos · máx. {tipo.max ?? 4}</span></td>
                </tr>
                {visibles.map(t => {
                  const fila = `${tipo.id}|${t.id}`;
                  const vista = vistas[fila] ?? 'Tarifas';
                  const esBool = BOOL.includes(vista);
                  return (
                    <tr key={fila} style={{ borderBottom: `1px solid ${C.n500}`, color: t.activo ? C.n900 : C.n700, background: s_.tiene(fila) ? C.brandBg : undefined }}>
                      <td style={{ padding: '6px 8px' }}><CheckFila s={s_} id={fila} label={`Seleccionar ${t.nombre} · ${tipo.nombre}`} /></td>
                      <td style={{ padding: '6px 8px' }}>
                        {t.nombre}
                        {t.derivaDe && <span style={{ fontSize: 11, color: C.n700, marginLeft: 6 }}>(derivada)</span>}
                        {!t.activo && <span style={{ fontSize: 11, color: C.n700, marginLeft: 6 }}>(inactiva)</span>}
                      </td>
                      <td><IconButton label={`Editar tarifa ${t.nombre}`} tono="marca" onClick={() => setEditorTarifa({ id: t.id })}><IcBolt /></IconButton></td>
                      <td style={{ padding: '2px 4px' }}>
                        <select value={vista} onChange={e => setVistas(v => ({ ...v, [fila]: e.target.value as Vista }))} aria-label={`Vista de ${t.nombre}`}
                          style={{ border: 'none', background: 'transparent', color: C.brand, fontWeight: 600, fontSize: 12, fontFamily: FONT, cursor: 'pointer', outline: 'none', maxWidth: 125 }}>
                          {VISTAS_TARIFARIO.map(v => <option key={v} value={v}>{v === 'Adulto Extra' || v === 'Niño Extra' ? `${v} · Pax 1` : v}</option>)}
                          {Array.from({ length: Math.max(0, adicionalesDe(tipo) - 1) }, (_, i) => i + 2).flatMap(n => [vistaPax('adulto', n), vistaPax('nino', n)]).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                      {dias.map(d => {
                        const k = clave(tipo.id, t.id, d, vista);
                        const v = valor(t, tipo.id, d, vista, tarifas, mapa);
                        const excepcion = mapa[k] !== undefined;
                        const fin = dow(d) >= 5;
                        const base = { padding: 0, textAlign: 'center' as const, background: fin ? C.n200 : undefined, borderLeft: `1px solid ${C.n000}` };
                        if (esBool) {
                          return (
                            <td key={d} style={base}>
                              <button type="button" onClick={() => guardarCelda(k, !v)} aria-pressed={!!v} aria-label={`${vista} ${d}`}
                                style={{ width: '100%', height: 30, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: FONT, fontWeight: 500,
                                  background: v ? 'rgba(244,67,54,.12)' : 'transparent', color: v ? '#C62828' : C.n500 }}>
                                {v ? (vista === 'Cerrar ventas' ? 'Cerrado' : vista) : '·'}
                              </button>
                            </td>
                          );
                        }
                        return (
                          <td key={d} style={base}>
                            {editando === k ? (
                              <input autoFocus value={borrador} onChange={e => setBorrador(e.target.value)} onBlur={() => confirmarNumero(k)}
                                onKeyDown={e => { if (e.key === 'Enter') confirmarNumero(k); if (e.key === 'Escape') setEditando(null); }} aria-label={`${vista} ${d}`}
                                style={{ width: '100%', height: 30, border: `1px solid ${C.brand}`, textAlign: 'right', fontSize: 12, fontFamily: FONT, padding: '0 6px', outline: 'none', boxSizing: 'border-box' }} />
                            ) : (
                              <button type="button" onClick={() => { setEditando(k); setBorrador(typeof v === 'number' ? String(v) : ''); }}
                                title={excepcion ? 'Valor modificado manualmente en este día' : 'Clic para editar'}
                                style={{ width: '100%', height: 30, border: 'none', background: 'transparent', cursor: 'text', textAlign: 'right', padding: '0 6px', fontSize: 12, fontFamily: FONT,
                                  color: excepcion ? C.brand : 'inherit', fontWeight: excepcion ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>
                                {typeof v === 'number' ? (vista.startsWith('Estancia') ? v : fmtNum(v)) : '---'}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: C.n700, margin: 0 }}>Clic en una celda para cambiar el valor de ese día. Los valores en azul son excepciones; deja la celda vacía para volver al valor de la tarifa.</p>

      {masiva && <ActualizacionColectiva inicio={inicio} tarifas={visibles} todas={tarifas} tipos={tipos} mapa={mapa} seleccionInicial={s_.sel} onClose={() => setMasiva(false)}
        onAplicar={r => { setMapa(m => ({ ...m, ...r.mapa })); setTarifas(r.tarifas); setMasiva(false); s_.limpiar(); setToast(`${r.mensaje}. Revisa y usa «Guardar cambios».`); }} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {editorTarifa && <EditorTarifa idInicial={editorTarifa.id} tarifas={tarifas} tipos={tipos} onClose={() => setEditorTarifa(null)}
        onGuardar={t => setTarifas(ts => (ts.some(x => x.id === t.id) ? ts.map(x => (x.id === t.id ? t : x)) : [...ts, t]))}
        onEliminar={id => { setTarifas(ts => ts.filter(x => x.id !== id).map(x => (x.derivaDe === id ? { ...x, derivaDe: null } : x))); setMapa(m => Object.fromEntries(Object.entries(m).filter(([k]) => k.split('|')[1] !== id))); }} />}
    </div>
  );
}

function Stepper({ value, onChange, paso = 1, label }: { value: number; onChange: (v: number) => void; paso?: number; label: string }) {
  const b = { width: 32, height: 32, border: `1px solid ${C.n500}`, background: C.n000, cursor: 'pointer', fontSize: 14, color: C.n900 } as const;
  return (
    <div style={{ display: 'flex' }} role="group" aria-label={label}>
      <button type="button" aria-label="Restar" onClick={() => onChange(+(value - paso).toFixed(2))} style={{ ...b, borderRadius: '4px 0 0 4px' }}>−</button>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value) || 0)} aria-label={label}
        style={{ width: '100%', minWidth: 0, height: 32, border: `1px solid ${C.n500}`, borderLeft: 'none', borderRight: 'none', textAlign: 'center', fontSize: 12, fontFamily: FONT, outline: 'none' }} />
      <button type="button" aria-label="Sumar" onClick={() => onChange(+(value + paso).toFixed(2))} style={{ ...b, borderRadius: '0 4px 4px 0' }}>+</button>
    </div>
  );
}

function EditorTarifa({ idInicial, tarifas, tipos, onClose, onGuardar, onEliminar }: {
  idInicial: string | null; tarifas: Tarifa[]; tipos: { id: string; nombre: string; codigo: string }[];
  onClose: () => void; onGuardar: (t: Tarifa) => void; onEliminar: (id: string) => void;
}) {
  const vacia = (): Tarifa => ({ id: uid(), nombre: '', activo: true, moneda: MONEDAS_OPC[0], base: Object.fromEntries(tipos.map(t => [t.id, null])), derivaDe: null,
    metodo: 'Porcentaje', ajusteImporte: 0, ajustePct: 0, extras: { derivar: false, tipo: 'Importe', importe: 0, pct: 0, adulto: 0, nino: 0 }, restricciones: { estMin: 1, estMax: 30 } });
  const cargar = (id: string | null) => { const t = tarifas.find(x => x.id === id); return t ? structuredClone(t) : vacia(); };
  const [t, setT] = useState<Tarifa>(() => cargar(idInicial));
  const [modo, setModo] = useState<'Nueva Tarifa' | 'Derivar de otra tarifa'>(t.derivaDe ? 'Derivar de otra tarifa' : 'Nueva Tarifa');
  const [error, setError] = useState('');
  const { pedir, dialogo } = useConfirmar();
  const existe = tarifas.some(x => x.id === t.id);
  const p = (x: Partial<Tarifa>) => setT(v => ({ ...v, ...x }));
  const madres = tarifas.filter(x => x.id !== t.id && x.derivaDe !== t.id);

  const cambiarTarifa = (id: string) => { const n = cargar(id || null); setT(n); setModo(n.derivaDe ? 'Derivar de otra tarifa' : 'Nueva Tarifa'); setError(''); };
  const guardar = () => {
    if (!t.nombre.trim()) return setError('La descripción es obligatoria.');
    if (tarifas.some(x => x.id !== t.id && x.nombre.trim().toLowerCase() === t.nombre.trim().toLowerCase())) return setError('Ya existe una tarifa con esa descripción.');
    if (modo === 'Derivar de otra tarifa' && !t.derivaDe) return setError('Elige de qué tarifa deriva.');
    onGuardar({ ...t, nombre: t.nombre.trim(), derivaDe: modo === 'Derivar de otra tarifa' ? t.derivaDe : null });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={existe ? 'Editar tarifa' : 'Crear tarifa'} width={620}
      footer={<>
        {existe && <Button variant="danger" style={{ marginRight: 'auto' }}
          onClick={() => pedir('Eliminar tarifa', `¿Eliminar «${t.nombre}»? Las tarifas derivadas de ella quedarán como tarifas independientes.`, () => { onEliminar(t.id); onClose(); })}>Eliminar</Button>}
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar}>{existe ? 'Guardar cambios' : 'Guardar'}</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SubCard title="Información básica" actions={existe ? <Switch checked={t.activo} onChange={b => p({ activo: b })} label="Activo" /> : undefined}>
          <Campo label="Tarifa">
            <Select value={existe ? t.id : ''} onChange={cambiarTarifa} options={[{ value: '', label: '+ Nueva tarifa' }, ...tarifas.map(x => ({ value: x.id, label: x.nombre }))]} />
          </Campo>
          <PillTabs tabs={['Nueva Tarifa', 'Derivar de otra tarifa'] as const} active={modo} onChange={setModo} />
          <Grid cols={2}>
            <Campo label="Descripción" required><Input value={t.nombre} onChange={v => p({ nombre: v })} placeholder="Ej: Agencias 15%" /></Campo>
            <Campo label="Moneda"><Select value={t.moneda} onChange={v => p({ moneda: v })} options={MONEDAS_OPC.map(m => ({ value: m, label: m }))} /></Campo>
            <Campo label="Estancia mínima"><Input type="number" value={t.restricciones.estMin} onChange={v => p({ restricciones: { ...t.restricciones, estMin: Number(v) || 0 } })} /></Campo>
            <Campo label="Estancia máxima"><Input type="number" value={t.restricciones.estMax} onChange={v => p({ restricciones: { ...t.restricciones, estMax: Number(v) || 0 } })} /></Campo>
          </Grid>
        </SubCard>

        {modo === 'Nueva Tarifa' ? (
          <SubCard title="Precio por noche" hint="Precio base por tipo de habitación. Déjalo vacío si la tarifa no aplica a ese tipo.">
            <Grid cols={2}>
              {tipos.map(tp => (
                <Campo key={tp.id} label={`${tp.nombre} - ${tp.codigo}`}>
                  <Input type="number" value={t.base[tp.id] ?? ''} placeholder="---" onChange={v => p({ base: { ...t.base, [tp.id]: v === '' ? null : Number(v) } })} />
                </Campo>
              ))}
            </Grid>
          </SubCard>
        ) : (
          <SubCard title="Ajuste de tarifas" hint="Precio = tarifa de origen ajustada por el porcentaje y luego por el importe.">
            <Grid cols={2}>
              <Campo label="Derivar de"><Select value={t.derivaDe ?? ''} onChange={v => p({ derivaDe: v || null })} options={[{ value: '', label: 'Seleccione' }, ...madres.map(x => ({ value: x.id, label: x.nombre }))]} /></Campo>
              <Campo label="Método de ajuste"><Select value={t.metodo} onChange={v => p({ metodo: v as Tarifa['metodo'] })} options={[{ value: 'Porcentaje', label: 'Porcentaje' }, { value: 'Importe', label: 'Importe' }]} /></Campo>
              <Campo label="Ajuste del importe"><Stepper label="Ajuste del importe" value={t.ajusteImporte} onChange={v => p({ ajusteImporte: v })} /></Campo>
              <Campo label="Ajuste porcentaje"><Stepper label="Ajuste porcentaje" value={t.ajustePct} onChange={v => p({ ajustePct: v })} /></Campo>
            </Grid>
          </SubCard>
        )}

        <SubCard title="Ajuste de extras">
          {modo === 'Derivar de otra tarifa' && <Checkbox checked={t.extras.derivar} onChange={b => p({ extras: { ...t.extras, derivar: b } })} label="Derivar extras de la tarifa de origen" />}
          {t.extras.derivar && modo === 'Derivar de otra tarifa' ? (
            <Grid cols={2}>
              <Campo label="Tipo de ajuste"><Select value={t.extras.tipo} onChange={v => p({ extras: { ...t.extras, tipo: v as 'Importe' | 'Porcentaje' } })} options={[{ value: 'Importe', label: 'Importe' }, { value: 'Porcentaje', label: 'Porcentaje' }]} /></Campo>
              {t.extras.tipo === 'Importe'
                ? <Campo label="Ajuste del importe"><Stepper label="Ajuste del importe de extras" value={t.extras.importe} onChange={v => p({ extras: { ...t.extras, importe: v } })} /></Campo>
                : <Campo label="Ajuste porcentaje"><Stepper label="Ajuste porcentaje de extras" value={t.extras.pct} onChange={v => p({ extras: { ...t.extras, pct: v } })} /></Campo>}
            </Grid>
          ) : (
            <>
              <PillTabs tabs={['Precio base por adicional', 'Desglose por escalón'] as const} active={t.extras.modo === 'escalones' ? 'Desglose por escalón' : 'Precio base por adicional'}
                onChange={m => p({ extras: { ...t.extras, modo: m === 'Desglose por escalón' ? 'escalones' : 'base', escalones: t.extras.escalones?.length ? t.extras.escalones : [{ adulto: t.extras.adulto, nino: t.extras.nino }, { adulto: t.extras.adulto, nino: t.extras.nino }] } })} />
              {t.extras.modo !== 'escalones' ? (
                <Grid cols={2}>
                  <Campo label="Adulto extra (por noche)"><Input type="number" value={t.extras.adulto} onChange={v => p({ extras: { ...t.extras, adulto: Number(v) || 0 } })} /></Campo>
                  <Campo label="Niño extra (por noche)"><Input type="number" value={t.extras.nino} onChange={v => p({ extras: { ...t.extras, nino: Number(v) || 0 } })} /></Campo>
                </Grid>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 32px', gap: 8, alignItems: 'center', fontSize: 12 }}>
                  <span /><span style={{ fontSize: 11, color: C.n700 }}>Adulto</span><span style={{ fontSize: 11, color: C.n700 }}>Niño</span><span />
                  {(t.extras.escalones ?? []).map((e, i) => (
                    <Fragment key={i}>
                      <span>Pax adicional {i + 1}</span>
                      <Input type="number" value={e.adulto} aria-label={`Adulto adicional ${i + 1}`} onChange={v => p({ extras: { ...t.extras, escalones: t.extras.escalones!.map((x, j) => (j === i ? { ...x, adulto: Number(v) || 0 } : x)) } })} />
                      <Input type="number" value={e.nino} aria-label={`Niño adicional ${i + 1}`} onChange={v => p({ extras: { ...t.extras, escalones: t.extras.escalones!.map((x, j) => (j === i ? { ...x, nino: Number(v) || 0 } : x)) } })} />
                      <IconButton label={`Quitar escalón ${i + 1}`} tono="peligro" disabled={(t.extras.escalones ?? []).length === 1} onClick={() => p({ extras: { ...t.extras, escalones: t.extras.escalones!.filter((_, j) => j !== i) } })}>×</IconButton>
                    </Fragment>
                  ))}
                  <span style={{ gridColumn: '1 / -1' }}><Button variant="ghost" onClick={() => { const u = t.extras.escalones?.at(-1) ?? { adulto: t.extras.adulto, nino: t.extras.nino }; p({ extras: { ...t.extras, escalones: [...(t.extras.escalones ?? []), { ...u }] } }); }}>+ Agregar escalón</Button></span>
                  <span style={{ gridColumn: '1 / -1', fontSize: 11, color: C.n700 }}>Adicional 1 = la primera persona sobre las incluidas en el precio. Si una habitación admite más adicionales que escalones, se usa el último.</span>
                </div>
              )}
            </>
          )}
        </SubCard>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
      {dialogo}
    </Modal>
  );
}
