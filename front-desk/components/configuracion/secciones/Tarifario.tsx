'use client';
// Configuración › Tarifas / Contratos › Tarifario: grilla de 15 días por tipo de habitación y tarifa, con filtro
// (mercado, tipos, tarifas), vista por fila (⚡), detalle de la tarifa, editor y actualización masiva.
import { BarraSeccion } from '@/components/layout/Pantalla';
import { BotonExportar, MenuBoton } from '@/components/hotel/ui';
import { FiltroUno } from '@/components/facturacion/comun';
import { Fragment, useMemo, useState, type CSSProperties } from 'react';
import { C, FONT, PAGE_PAD, fmtNum, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Select, Switch, Toast } from '@/components/suite/ui';
import { IcChevronDown } from '@/components/suite/icons';
import { useDato } from '../store';
import { Campo, Grid, IcBolt, IcEdit, IcFiltro, IcInfo, IcLink, IconButton, ModalBase, PillTabs, Popover, SubCard, uid } from '../kit';
import { useConfirmar } from '../kit';
import { DIAS, MONEDAS_OPC, TERMINOS, VISTAS_TARIFARIO, type Tarifa } from '../datos';
import { BOOL, adicionalesDe, clave, dow, fecha, iso, sumar, valor, vistaPax, type Vista } from '../tarifario';
import { ActualizacionColectiva } from './ActualizacionTarifas';
import { ListaChecks } from './ActualizacionPiezas';
import { DetalleTarifa } from './DetalleTarifa';
import { AccionesMasivas, CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';

// ── Tarifario ───────────────────────────────────────────────────────────────
const DIAS_VISTA = 15;
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
/** Número corto para la grilla: sin decimales si es entero. */
export const corto = (v: number) => (Number.isInteger(v) ? v.toLocaleString('en-US') : fmtNum(v));

interface Filtro { mercado: string; tipos: string[]; tarifas: string[] }
const SIN_FILTRO: Filtro = { mercado: '', tipos: [], tarifas: [] };

export function Tarifario() {
  const [tarifas, setTarifas] = useDato('tarifas');
  const [tipos] = useDato('tiposHab');
  const [contratos] = useDato('contratos');
  const [mercados] = useDato('mercados');
  const [mapa, setMapa] = useDato('tarifario');
  const hoy = iso(new Date());
  const [inicio, setInicio] = useState(hoy);
  const [moneda, setMoneda] = useState(MONEDAS_OPC[0]);
  const [inactivos, setInactivos] = useState(false);
  const [vistaGlobal, setVistaGlobal] = useState<Vista>('Tarifas');
  const [vistas, setVistas] = useState<Record<string, Vista>>({});
  const [filtro, setFiltro] = useState<Filtro>(SIN_FILTRO);
  const [verFiltro, setVerFiltro] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const [masiva, setMasiva] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const s_ = useSeleccion();
  const [editorTarifa, setEditorTarifa] = useState<{ id: string | null } | null>(null);
  const [terminos, setTerminos] = useState(false);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [seleccionMasiva, setSeleccionMasiva] = useState<string[] | null>(null);

  const dias = useMemo(() => Array.from({ length: DIAS_VISTA }, (_, i) => sumar(inicio, i)), [inicio]);
  /** Tarifas usadas por contratos del mercado elegido. */
  const delMercado = (m: string) => new Set(contratos.filter(c => c.mercado === m).map(c => c.tarifa));
  const enMercado = filtro.mercado ? delMercado(filtro.mercado) : null;
  const visibles = tarifas.filter(t => t.moneda === moneda && (inactivos || t.activo)
    && (!enMercado || enMercado.has(t.nombre)) && (!filtro.tarifas.length || filtro.tarifas.includes(t.id)));
  const tiposVisibles = tipos.filter(t => !filtro.tipos.length || filtro.tipos.includes(t.id));
  const nFiltros = (filtro.mercado ? 1 : 0) + (filtro.tipos.length ? 1 : 0) + (filtro.tarifas.length ? 1 : 0);

  const guardarCelda = (k: string, v: number | boolean | null) => {
    setMapa(m => { const n = { ...m }; if (v === null) delete n[k]; else n[k] = v; return n; });
  };
  const confirmarNumero = (k: string) => {
    const n = borrador.trim() === '' ? null : Number(borrador.replace(',', '.'));
    if (n === null || !isNaN(n)) guardarCelda(k, n === null ? null : n);
    setEditando(null);
  };
  const mover = (n: number) => setInicio(sumar(inicio, n));
  const nav = (txt: string, n: number, title: string) => <Button variant="secondary" onClick={() => mover(n)} title={title} style={{ minWidth: 32, padding: '0 8px' }}>{txt}</Button>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BarraSeccion
        filtros={<>
          <Button variant="secondary" icon={<IcFiltro />} onClick={() => setVerFiltro(true)}
            style={nFiltros ? { color: C.brand, borderColor: C.brand, background: C.brandBg } : undefined}>
            Filtrar{nFiltros ? ` · ${nFiltros}` : ''}
          </Button>
          <FiltroUno label="Moneda" value={moneda} onChange={v => setMoneda(v || MONEDAS_OPC[0])} todos={null} opciones={MONEDAS_OPC.map(m => ({ value: m, label: m.split(' - ')[0] }))} />
          <FiltroUno label="Vista" value={vistaGlobal} onChange={v => { setVistaGlobal((v || 'Tarifas') as Vista); setVistas({}); }} todos={null} ancho={200}
            opciones={VISTAS_TARIFARIO.map(v => ({ value: v, label: v }))} />
          <Checkbox checked={inactivos} onChange={setInactivos} label="Mostrar inactivos" />
          <span aria-hidden style={{ width: 1, height: 22, background: C.n500, margin: '0 2px' }} />
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            {nav('‹‹', -DIAS_VISTA, `${DIAS_VISTA} días antes`)}
            {nav('‹', -1, 'Un día antes')}
            <div style={{ width: 140 }}><Input type="date" value={inicio} onChange={v => v && setInicio(v)} aria-label="Primer día de la grilla" /></div>
            {nav('›', 1, 'Un día después')}
            {nav('››', DIAS_VISTA, `${DIAS_VISTA} días después`)}
          </span>
          {inicio !== hoy && <Button variant="ghost" onClick={() => setInicio(hoy)}>Hoy</Button>}
        </>}
        acciones={<>
          <span style={{ position: 'relative' }}>
            <Button variant="secondary" icon={<IcInfo />} onClick={() => setTerminos(t => !t)}>Ayuda</Button>
            <Popover open={terminos} onClose={() => setTerminos(false)} width={360} align="right">
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Vistas del tarifario</p>
                {VISTAS_TARIFARIO.map(v => <p key={v} style={{ fontSize: 12, margin: 0, color: C.n700, lineHeight: 1.45 }}><b style={{ color: C.n900, fontWeight: 500 }}>{v}:</b> {TERMINOS[v]}</p>)}
                <p style={{ fontSize: 12, margin: '4px 0 0', color: C.n700, lineHeight: 1.45 }}>
                  <b style={{ color: C.n900, fontWeight: 500 }}>⚡</b> cambia la vista de una fila · <b style={{ color: C.n900, fontWeight: 500 }}>🔗</b> tarifa derivada de otra · valores en azul: cambiados solo ese día.
                </p>
              </div>
            </Popover>
          </span>
          <BotonExportar onPDF={() => window.print()} titulo="Tarifario" />
          <MenuBoton label="Actualización" variant="primary" ancho={310} opciones={[
            { label: 'Masiva · varias tarifas y tipos por período', onClick: () => setMasiva(true) },
            { label: 'Por tarifa · crear o editar una tarifa', onClick: () => setEditorTarifa({ id: null }) },
          ]} />
        </>}
        derecha={s_.n ? <AccionesMasivas s={s_} etiqueta={s_.n === 1 ? 'fila seleccionada' : 'filas seleccionadas'}>
          <Button onClick={() => setMasiva(true)}>Actualizar seleccionadas</Button>
        </AccionesMasivas> : undefined} />

      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', fontFamily: FONT, fontSize: 12 }}>
        <colgroup><col style={{ width: 34 }} /><col style={{ width: 250 }} /><col style={{ width: 118 }} />{dias.map(d => <col key={d} />)}</colgroup>
        <thead>
          <tr>
            <th style={{ ...cab, textAlign: 'left' }} colSpan={2}>
              <span style={{ fontSize: 11.5, color: C.n700, fontWeight: 400 }}>{visibles.length} {visibles.length === 1 ? 'tarifa' : 'tarifas'} · {tiposVisibles.length} tipos</span>
            </th>
            <th style={{ ...cab, textAlign: 'left', fontSize: 11.5, color: C.n700, fontWeight: 400 }}>Vista</th>
            {dias.map(d => {
              const fin = dow(d) >= 5, esHoy = d === hoy;
              return (
                <th key={d} style={{ ...cab, padding: '4px 0 6px', background: esHoy ? C.brandBg : fin ? C.n200 : C.n000 }}>
                  <div style={{ fontSize: 10.5, color: esHoy ? C.brand : C.n700 }}>{DIAS[dow(d)]}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: esHoy ? C.brand : C.n900, lineHeight: 1.2 }}>{fecha(d).getDate()}</div>
                  <div style={{ fontSize: 10.5, color: C.n700 }}>{MESES[fecha(d).getMonth()]}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {(visibles.length === 0 || tiposVisibles.length === 0) && (
            <tr><td colSpan={3 + DIAS_VISTA} style={{ padding: 28, textAlign: 'center', color: C.n700 }}>
              {nFiltros ? <>Ninguna tarifa cumple el filtro. <button type="button" onClick={() => setFiltro(SIN_FILTRO)} style={enlace}>Quitar filtro</button></>
                : <>No hay tarifas en {moneda}. Crea una con «Actualización › Por tarifa».</>}
            </td></tr>
          )}
          {visibles.length > 0 && tiposVisibles.map(tipo => (
            <Fragment key={tipo.id}>
              <tr>
                <td style={{ ...grupo, paddingLeft: 9 }}><CheckTodos s={s_} ids={visibles.map(t => `${tipo.id}|${t.id}`)} label={`Seleccionar todas las tarifas de ${tipo.nombre}`} /></td>
                <td colSpan={2 + DIAS_VISTA} style={grupo}>
                  <b style={{ fontWeight: 600 }}>{tipo.nombre}</b><span style={{ color: C.n700 }}> · {tipo.codigo}</span>
                  <span style={{ color: C.n700, marginLeft: 10, fontSize: 11.5 }}>{tipo.base ?? 2} pax incluidos · máx. {tipo.max ?? 4}</span>
                </td>
              </tr>
              {visibles.map(t => {
                const fila = `${tipo.id}|${t.id}`;
                const vista = vistas[fila] ?? vistaGlobal;
                const esBool = BOOL.includes(vista);
                const madre = t.derivaDe ? tarifas.find(x => x.id === t.derivaDe) : undefined;
                const sel = s_.tiene(fila);
                return (
                  <tr key={fila} style={{ color: t.activo ? C.n900 : C.n700, background: sel ? C.brandBg : undefined }}>
                    <td style={{ ...celda, paddingLeft: 9 }}><CheckFila s={s_} id={fila} label={`Seleccionar ${t.nombre} · ${tipo.nombre}`} /></td>
                    <td style={{ ...celda, padding: '0 4px 0 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                        <button type="button" onClick={() => setDetalle(t.id)} title="Ver detalle de la tarifa"
                          style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: t.activo ? C.brand : C.n700, cursor: 'pointer', textAlign: 'left',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{t.nombre}</button>
                        {madre && <span title={`Deriva de ${madre.nombre}`} aria-label={`Deriva de ${madre.nombre}`} style={{ color: C.n700, display: 'inline-flex', flexShrink: 0 }}><IcLink size={13} /></span>}
                        {!t.activo && <span style={{ fontSize: 10.5, color: C.n700, flexShrink: 0 }}>inactiva</span>}
                        <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                          <IconButton label={`Editar tarifa ${t.nombre}`} onClick={() => setEditorTarifa({ id: t.id })}><IcEdit size={13} /></IconButton>
                        </span>
                      </div>
                    </td>
                    <td style={{ ...celda, padding: '0 4px' }}>
                      <MenuVista vista={vista} tipo={tipo} label={`Vista de ${t.nombre} · ${tipo.nombre}`} onChange={v => setVistas(x => ({ ...x, [fila]: v }))} />
                    </td>
                    {dias.map(d => {
                      const k = clave(tipo.id, t.id, d, vista);
                      const v = valor(t, tipo.id, d, vista, tarifas, mapa);
                      const excepcion = mapa[k] !== undefined;
                      const fin = dow(d) >= 5;
                      const base: CSSProperties = { ...celda, padding: 0, textAlign: 'center', background: sel ? undefined : d === hoy ? 'rgba(33,60,137,.04)' : fin ? C.n200 : undefined, borderLeft: `1px solid ${C.n200}` };
                      if (esBool) {
                        return (
                          <td key={d} style={base}>
                            <button type="button" onClick={() => guardarCelda(k, !v)} aria-pressed={!!v} aria-label={`${vista} ${d}`} title={v ? 'Clic para abrir' : 'Clic para cerrar'}
                              style={{ width: '100%', height: 30, border: 'none', cursor: 'pointer', fontSize: 10.5, fontFamily: FONT, fontWeight: 600,
                                background: v ? 'rgba(244,67,54,.12)' : 'transparent', color: v ? C.error : C.n500 }}>
                              {v ? (vista === 'Cerrar ventas' ? 'Cerr.' : vista) : '·'}
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={d} style={base}>
                          {editando === k ? (
                            <input autoFocus value={borrador} onChange={e => setBorrador(e.target.value)} onBlur={() => confirmarNumero(k)}
                              onKeyDown={e => { if (e.key === 'Enter') confirmarNumero(k); if (e.key === 'Escape') setEditando(null); }} aria-label={`${vista} ${d}`}
                              style={{ width: '100%', height: 30, border: `1px solid ${C.brand}`, textAlign: 'right', fontSize: 12, fontFamily: FONT, padding: '0 4px', outline: 'none', boxSizing: 'border-box' }} />
                          ) : (
                            <button type="button" onClick={() => { setEditando(k); setBorrador(typeof v === 'number' ? String(v) : ''); }}
                              title={excepcion ? 'Cambiado solo este día · clic para editar' : 'Clic para editar'}
                              style={{ width: '100%', height: 30, border: 'none', background: 'transparent', cursor: 'text', textAlign: 'right', padding: '0 5px', fontSize: 12, fontFamily: FONT,
                                color: excepcion ? C.brand : typeof v === 'number' && v !== 0 ? 'inherit' : C.n500, fontWeight: excepcion ? 600 : 400, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {typeof v === 'number' ? (vista === 'Cupos' && v === 0 ? '·' : corto(v)) : '—'}
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
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 11.5, color: C.n700 }}>
        <span>Clic en una celda para cambiar solo ese día; déjala vacía para volver al valor de la tarifa.</span>
        <span><b style={{ color: C.brand }}>Azul</b>: cambiado solo ese día</span>
        <span><b style={{ color: C.error }}>Rojo</b>: cerrado</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IcLink size={12} /> derivada</span>
      </div>

      {verFiltro && <ModalFiltro filtro={filtro} tipos={tipos} tarifas={tarifas.filter(t => t.moneda === moneda && (inactivos || t.activo))} mercados={mercados.filter(m => m.activo).map(m => m.descripcion)}
        delMercado={delMercado} onClose={() => setVerFiltro(false)} onAplicar={f => { setFiltro(f); setVerFiltro(false); }} />}
      {masiva && <ActualizacionColectiva inicio={inicio} tarifas={visibles} todas={tarifas} tipos={tipos} mapa={mapa} seleccionInicial={seleccionMasiva ?? s_.sel} onClose={() => { setMasiva(false); setSeleccionMasiva(null); }}
        onAplicar={r => { setMapa(m => ({ ...m, ...r.mapa })); setTarifas(r.tarifas); setMasiva(false); setSeleccionMasiva(null); s_.limpiar(); setToast(`${r.mensaje}. Revisa y usa «Guardar cambios».`); }} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {detalle && (() => {
        const t = tarifas.find(x => x.id === detalle);
        if (!t) return null;
        return <DetalleTarifa t={t} tarifas={tarifas} tipos={tipos} mapa={mapa} dia={inicio} contratos={contratos.filter(c => c.tarifa === t.nombre).map(c => c.nombre)} onClose={() => setDetalle(null)}
          onEditar={() => { setDetalle(null); setEditorTarifa({ id: t.id }); }}
          onActualizar={() => { setDetalle(null); setSeleccionMasiva(tipos.map(tp => `${tp.id}|${t.id}`)); setMasiva(true); }} />;
      })()}
      {editorTarifa && <EditorTarifa idInicial={editorTarifa.id} tarifas={tarifas} tipos={tipos} onClose={() => setEditorTarifa(null)}
        onGuardar={t => setTarifas(ts => (ts.some(x => x.id === t.id) ? ts.map(x => (x.id === t.id ? t : x)) : [...ts, t]))}
        onEliminar={id => { setTarifas(ts => ts.filter(x => x.id !== id).map(x => (x.derivaDe === id ? { ...x, derivaDe: null } : x))); setMapa(m => Object.fromEntries(Object.entries(m).filter(([k]) => k.split('|')[1] !== id))); }} />}
    </div>
  );
}

// top negativo: el cuerpo de la pantalla tiene padding y el encabezado debe pegarse al borde del área con scroll.
const cab: CSSProperties = { position: 'sticky', top: -PAGE_PAD, zIndex: 1, background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: '6px 8px', textAlign: 'center', fontWeight: 400 };
const grupo: CSSProperties = { background: C.n200, padding: '7px 8px', fontSize: 12, borderBottom: `1px solid ${C.n500}` };
const celda: CSSProperties = { borderBottom: `1px solid ${C.n500}`, height: 30, verticalAlign: 'middle' };
const enlace: CSSProperties = { border: 'none', background: 'none', padding: 0, font: 'inherit', color: C.brand, cursor: 'pointer', textDecoration: 'underline' };

/** ⚡ Vista de la fila: qué se ve y se edita en los días (precio, cupos, cierres, estancias, pax adicionales). */
function MenuVista({ vista, tipo, label, onChange }: { vista: Vista; tipo: { base?: number; max?: number }; label: string; onChange: (v: Vista) => void }) {
  const [open, setOpen] = useState(false);
  const extra = Array.from({ length: Math.max(0, adicionalesDe(tipo) - 1) }, (_, i) => i + 2).flatMap(n => [vistaPax('adulto', n), vistaPax('nino', n)]);
  const opciones: Vista[] = [...VISTAS_TARIFARIO, ...extra];
  const nombre = (v: Vista) => (v === 'Adulto Extra' || v === 'Niño Extra' ? `${v} · Pax 1` : v);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', maxWidth: '100%' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-label={label} aria-expanded={open} title="Cambiar la vista de esta fila"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%', height: 24, padding: '0 6px', border: `1px solid ${open ? C.brandBd : 'transparent'}`, borderRadius: radius.control,
          background: open ? C.brandBg : 'transparent', color: C.brand, fontSize: 11.5, fontWeight: 600, fontFamily: FONT, cursor: 'pointer' }}>
        <IcBolt size={12} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre(vista)}</span><IcChevronDown size={10} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={260}>
        <div role="menu" style={{ padding: 6, display: 'flex', flexDirection: 'column', maxHeight: 340, overflowY: 'auto' }}>
          {opciones.map(v => (
            <button key={v} role="menuitemradio" aria-checked={v === vista} type="button" onClick={() => { onChange(v); setOpen(false); }} className="suite-fila"
              title={TERMINOS[v as keyof typeof TERMINOS]}
              style={{ textAlign: 'left', padding: '7px 10px', border: 'none', background: v === vista ? C.brandBg : 'none', color: v === vista ? C.brand : C.n900,
                fontWeight: v === vista ? 600 : 400, fontSize: 12, fontFamily: FONT, borderRadius: radius.control, cursor: 'pointer' }}>
              {nombre(v)}
            </button>
          ))}
        </div>
      </Popover>
    </span>
  );
}

/** Filtrar: mercado (tarifas de sus contratos), tipos de habitación y tarifas. */
function ModalFiltro({ filtro, tipos, tarifas, mercados, delMercado, onClose, onAplicar }: {
  filtro: Filtro; tipos: { id: string; nombre: string; codigo: string }[]; tarifas: Tarifa[]; mercados: string[];
  delMercado: (m: string) => Set<string>; onClose: () => void; onAplicar: (f: Filtro) => void;
}) {
  const [f, setF] = useState<Filtro>(filtro);
  const enMercado = f.mercado ? delMercado(f.mercado) : null;
  const tarifasMercado = tarifas.filter(t => !enMercado || enMercado.has(t.nombre));
  const tiposSel = f.tipos.length ? f.tipos : tipos.map(t => t.id);
  const tarifasSel = f.tarifas.length ? f.tarifas.filter(id => tarifasMercado.some(t => t.id === id)) : tarifasMercado.map(t => t.id);
  const aplicar = () => onAplicar({
    mercado: f.mercado,
    tipos: tiposSel.length === tipos.length ? [] : tiposSel,
    tarifas: tarifasSel.length === tarifasMercado.length ? [] : tarifasSel,
  });
  return (
    <ModalBase titulo="Filtrar tarifario" onClose={onClose} ancho={720}
      pie={<>
        <Button variant="ghost" style={{ marginRight: 'auto' }} onClick={() => setF(SIN_FILTRO)}>Quitar filtros</Button>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={aplicar} disabled={!tiposSel.length || !tarifasSel.length}>Aplicar</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ maxWidth: 320 }}>
          <Campo label="Mercado" hint="Muestra solo las tarifas de los contratos de ese mercado.">
            <Select value={f.mercado} onChange={v => setF(x => ({ ...x, mercado: v, tarifas: [] }))} options={[{ value: '', label: 'Todos los mercados' }, ...mercados.map(m => ({ value: m, label: m }))]} />
          </Campo>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <ListaChecks titulo="Tipo de habitación" items={tipos.map(t => ({ id: t.id, label: `${t.codigo} · ${t.nombre}` }))} sel={tiposSel} onChange={ids => setF(x => ({ ...x, tipos: ids }))} alto={260} />
          <ListaChecks titulo="Tarifa" items={tarifasMercado.map(t => ({ id: t.id, label: t.nombre, nota: t.activo ? undefined : 'Inactiva' }))} sel={tarifasSel} onChange={ids => setF(x => ({ ...x, tarifas: ids }))} alto={260} />
        </div>
      </div>
    </ModalBase>
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
  idInicial: string | null; tarifas: Tarifa[]; tipos: { id: string; nombre: string; codigo: string; base?: number; max?: number }[];
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
  /** Escalones posibles: los adicionales que admite el tipo de habitación con más capacidad. */
  const maxEsc = Math.max(1, ...tipos.map(adicionalesDe));
  const nEsc = (t.extras.escalones ?? []).length;

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
                onChange={m => p({ extras: { ...t.extras, modo: m === 'Desglose por escalón' ? 'escalones' : 'base', escalones: t.extras.escalones?.length ? t.extras.escalones : Array.from({ length: Math.min(2, maxEsc) }, () => ({ adulto: t.extras.adulto, nino: t.extras.nino })) } })} />
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
                  {nEsc < maxEsc && <span style={{ gridColumn: '1 / -1' }}><Button variant="ghost" onClick={() => { const u = t.extras.escalones?.at(-1) ?? { adulto: t.extras.adulto, nino: t.extras.nino }; p({ extras: { ...t.extras, escalones: [...(t.extras.escalones ?? []), { ...u }] } }); }}>+ Agregar escalón ({nEsc} de {maxEsc})</Button></span>}
                  <span style={{ gridColumn: '1 / -1', fontSize: 11, color: C.n700, lineHeight: 1.5 }}>
                    El pax adicional 1 es la primera persona por encima de las incluidas en el precio de la habitación. La habitación con más capacidad admite {maxEsc} {maxEsc === 1 ? 'adicional' : 'adicionales'}.
                    {nEsc < maxEsc && ` Las personas adicionales sin escalón propio pagan el precio del pax adicional ${nEsc}.`}
                  </span>
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
