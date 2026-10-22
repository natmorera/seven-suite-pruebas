'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Patrón CRUD de catálogos:
//   Listado · Búsqueda en tiempo real · «+ Agregar nuevo» abre modal ·
//   clic en código / ícono editar carga el formulario · eliminar con
//   «¿Eliminar [nombre]?» · Guardar valida obligatorios · Cancelar avisa si
//   hay cambios sin guardar.
// Cada catálogo solo declara columnas y campos.
// ─────────────────────────────────────────────────────────────────────────────
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { C, FONT, fmtNum } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Radio, Select, StatusBadge, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import {
  Buscador, Campo as CampoUI, Celda, ColorInput, Fila, FilaVacia, IcEdit, IcTrash, IconButton, LinkButton, MultiSelect, MuestraColor,
  OutlineButton, Paginacion, Popover, Tabla, TextArea, norm, uid, useConfirmar, usePaginado, type Opcion,
} from './kit';
import { AccionesEnHeader, AccionesMasivas, CheckFila, CheckTodos, FiltrosEnBarra, useRanuraPrincipal, useSeleccion } from '@/components/layout/Pantalla';
import { BotonExportar, HojaReporte, TablaImpresa, exportarCSV, usePrint } from '@/components/hotel/ui';

export type Registro = { id: string };
const val = (f: unknown, k: string): unknown => (f as Record<string, unknown>)[k];

export interface CampoDef<T> {
  key: keyof T & string;
  label: string;
  tipo?: 'text' | 'number' | 'email' | 'password' | 'date' | 'select' | 'checkbox' | 'switch' | 'siNo' | 'radio' | 'color' | 'textarea' | 'multi';
  opciones?: (string | Opcion)[];
  placeholder?: string;
  requerido?: boolean;
  /** Columnas que ocupa en una grilla de 6 (6 = ancho completo, 3 = mitad, 2 = tercio) */
  span?: 2 | 3 | 4 | 6;
  hint?: string;
  sufijo?: string;
  /** Valor calculado (solo lectura) */
  calcular?: (f: T) => string | number;
  deshabilitar?: (f: T) => boolean;
  onCrear?: (t: string) => string | void;
  crearLabel?: string;
  /** Si es de tipo number y no se permite repetir (códigos) */
  unico?: boolean;
}

export interface ColumnaDef<T> {
  key: string;
  label: ReactNode;
  tipo?: 'text' | 'num' | 'num0' | 'check' | 'color' | 'siNo' | 'estado' | 'lista';
  /** El valor de la columna abre el editor (o el detalle) */
  link?: boolean;
  /** Checkbox editable directamente en la tabla */
  editable?: boolean;
  derecha?: boolean;
  ancho?: number | string;
  render?: (f: T) => ReactNode;
}

interface Props<T extends Registro> {
  /** «habitación», «agente de ventas»… (en minúscula; se usa en títulos y mensajes) */
  entidad: string;
  femenino?: boolean;
  /** Texto del botón de alta (por defecto «Agregar nuevo / nueva»). */
  textoAgregar?: string;
  filas: T[];
  onChange: (filas: T[]) => void;
  columnas: ColumnaDef<T>[];
  campos: CampoDef<T>[];
  nuevo: () => Omit<T, 'id'>;
  nombre: (f: T) => string;
  buscarEn?: (keyof T & string)[];
  placeholderBuscar?: string;
  /** Botones extra junto a «Agregar» (Importa Excel, Imprimir…) */
  acciones?: ReactNode;
  /** Campo booleano que activa el check «Mostrar inactivos» */
  campoActivo?: keyof T & string;
  /** Popover de detalle al hacer clic en la columna link (Tipos de cobro, Monedas) */
  detalle?: { titulo: (f: T) => string; campos: CampoDef<T>[] };
  validar?: (f: T, todas: T[]) => string | undefined;
  modalAncho?: number;
  porPagina?: number;
  /** Mostrar el contador «(n)» en la primera columna como en el diseño */
  contador?: boolean;
  sinBuscador?: boolean;
  /** Filtros extra a la derecha del buscador */
  filtros?: ReactNode;
  filtrar?: (f: T) => boolean;
}

const opc = (o: string | Opcion): Opcion => (typeof o === 'string' ? { value: o, label: o } : o);
const vacio = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

export function CrudCatalogo<T extends Registro>(p: Props<T>) {
  const { entidad, femenino, textoAgregar, filas, onChange, columnas, campos, nuevo, nombre, buscarEn = [], acciones, campoActivo, detalle, validar, modalAncho = 480, porPagina = 10 } = p;
  const [q, setQ] = useState('');
  const [inactivos, setInactivos] = useState(false);
  const [editando, setEditando] = useState<{ fila: T; original: T; esNuevo: boolean } | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [popover, setPopover] = useState<string | null>(null);
  const { pedir, dialogo } = useConfirmar();
  const principal = useRanuraPrincipal();
  const s = useSeleccion();
  const { imprimir, portal } = usePrint();

  const filtradas = useMemo(() => filas.filter(f =>
    (!campoActivo || inactivos || val(f, campoActivo) !== false) &&
    (!p.filtrar || p.filtrar(f)) &&
    (!q || buscarEn.some(k => norm(val(f, k)).includes(norm(q))))), [filas, q, inactivos, campoActivo, buscarEn, p]);
  const { pagina, total, setPagina, visibles, filas: nFilas, tam } = usePaginado(filtradas, porPagina);

  const articulo = femenino ? 'Nueva' : 'Nuevo';

  const abrirNuevo = () => {
    const f = { id: uid(), ...nuevo() } as T;
    setErrores({}); setErrorGeneral('');
    setEditando({ fila: f, original: f, esNuevo: true });
  };
  const abrirEditar = (f: T) => { setErrores({}); setErrorGeneral(''); setPopover(null); setEditando({ fila: { ...f }, original: f, esNuevo: false }); };
  const sucio = editando && JSON.stringify(editando.fila) !== JSON.stringify(editando.original);

  const cerrar = () => {
    if (sucio) pedir('Cambios sin guardar', `Hay cambios en ${femenino ? 'esta' : 'este'} ${entidad} que no se guardaron. ¿Descartarlos?`, () => setEditando(null), { accion: 'Descartar' });
    else setEditando(null);
  };

  const guardar = () => {
    if (!editando) return;
    const f = editando.fila;
    const errs: Record<string, string> = {};
    for (const c of campos) {
      if (c.requerido && vacio(val(f, c.key))) errs[c.key] = 'Campo obligatorio';
      if (c.unico && !vacio(val(f, c.key)) && filas.some(o => o.id !== f.id && norm(val(o, c.key)) === norm(val(f, c.key)))) errs[c.key] = 'Ya existe un registro con este valor';
      if (c.tipo === 'email' && !vacio(val(f, c.key)) && !/^\S+@\S+\.\S+$/.test(String(val(f, c.key)))) errs[c.key] = 'Correo no válido';
    }
    setErrores(errs);
    const extra = validar?.(f, filas);
    setErrorGeneral(extra ?? '');
    if (Object.keys(errs).length || extra) return;
    onChange(editando.esNuevo ? [...filas, f] : filas.map(o => (o.id === f.id ? f : o)));
    setEditando(null);
  };

  const eliminar = (f: T) => pedir(`Eliminar ${entidad}`, <>¿Eliminar <b>{nombre(f) || `${femenino ? 'esta' : 'este'} ${entidad}`}</b>? Esta acción no se puede deshacer.</>,
    () => onChange(filas.filter(o => o.id !== f.id)));

  const actualizar = (id: string, k: string, v: unknown) => onChange(filas.map(o => (o.id === id ? { ...o, [k]: v } : o)));

  const celda = (f: T, c: ColumnaDef<T>) => {
    if (c.render) return c.render(f);
    const v = val(f, c.key);
    switch (c.tipo) {
      case 'num': return v === null || v === undefined || v === '' ? '-' : fmtNum(Number(v));
      case 'num0': return v === null || v === undefined || v === '' || v === 0 ? '-' : String(v);
      case 'check':
        return <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
          <Checkbox checked={!!v} onChange={b => c.editable && actualizar(f.id, c.key, b)} label={<span className="sr-only">{String(c.label)}</span>} />
        </span>;
      case 'color': return v ? <MuestraColor color={String(v)} /> : null;
      case 'siNo': return v ? 'Sí' : 'No';
      case 'estado': return <StatusBadge label={v ? (femenino ? 'Activa' : 'Activo') : (femenino ? 'Inactiva' : 'Inactivo')} color={v ? 'green' : 'gray'} />;
      case 'lista': return Array.isArray(v) && v.length ? <Linea texto={v.join(', ')} /> : '-';
      default: return v === '' || v === null || v === undefined ? '-' : <Linea texto={String(v)} />;
    }
  };

  const columnasTotales = columnas.length + 2;
  const primera = columnas[0];

  // ── Exportar lo visible (filtros aplicados) y acciones masivas ──
  const texto = (f: T, c: ColumnaDef<T>): string => {
    const v = val(f, c.key);
    if (c.tipo === 'estado') return v ? (femenino ? 'Activa' : 'Activo') : (femenino ? 'Inactiva' : 'Inactivo');
    if (c.tipo === 'check' || c.tipo === 'siNo' || typeof v === 'boolean') return v ? 'Sí' : 'No';
    if (Array.isArray(v)) return v.join(', ');
    return v === null || v === undefined ? '' : String(v);
  };
  const cols = columnas.filter(c => typeof c.label === 'string' || c.key);
  const cab = cols.map(c => (typeof c.label === 'string' ? c.label : c.key));
  const filasExp = (xs: T[]) => xs.map(f => cols.map(c => texto(f, c)));
  const csv = (xs: T[] = filtradas) => exportarCSV(entidad.replace(/\s+/g, '-'), cab, filasExp(xs));
  const pdf = () => imprimir(<HojaReporte titulo={`Catálogo: ${entidad}`} filtros={q ? `Búsqueda: «${q}»` : undefined}><TablaImpresa headers={cab} filas={filasExp(filtradas)} /></HojaReporte>);
  const elegidas = filas.filter(f => s.tiene(f.id));
  const eliminarVarias = () => pedir(`Eliminar ${elegidas.length} registros`, <>¿Eliminar {elegidas.length} {femenino ? 'seleccionadas' : 'seleccionados'}? Esta acción no se puede deshacer.</>,
    () => { onChange(filas.filter(o => !s.tiene(o.id))); s.limpiar(); }, { accion: 'Eliminar' });
  const activar = (on: boolean) => { onChange(filas.map(o => (s.tiene(o.id) ? { ...o, [campoActivo as string]: on } : o))); s.limpiar(); };

  const agregarTexto = textoAgregar ?? `Agregar ${femenino ? 'nueva' : 'nuevo'}`;
  const botonAgregar = <Button icon={<IcPlus size={12} />} onClick={abrirNuevo}>{agregarTexto}</Button>;
  const exportar = <BotonExportar disabled={!filtradas.length} titulo={`Catálogo: ${entidad}`} criterio={q ? `Búsqueda: «${q}»` : undefined} onCSV={() => csv()} onPDF={pdf} />;
  const filtrosUI = <>
    {!p.sinBuscador && buscarEn.length > 0 && <Buscador value={q} onChange={v => { setQ(v); setPagina(1); }} placeholder={p.placeholderBuscar ?? 'Buscar...'} width={220} />}
    {p.filtros}
    {campoActivo && <Checkbox checked={inactivos} onChange={setInactivos} label="Mostrar inactivos" />}
  </>;
  const masivas = s.n > 0 && (
    <AccionesMasivas s={s}>
      {campoActivo && <><Button variant="secondary" onClick={() => activar(true)}>Activar</Button><Button variant="secondary" onClick={() => activar(false)}>Desactivar</Button></>}
      <Button variant="secondary" onClick={() => csv(elegidas)}>Exportar selección</Button>
      <Button variant="secondary" style={{ color: C.error }} onClick={eliminarVarias}>Eliminar</Button>
    </AccionesMasivas>
  );
  const contador = <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{filtradas.length} registros</span>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
      {principal ? <>
        <FiltrosEnBarra>{filtrosUI}{masivas || contador}</FiltrosEnBarra>
        <AccionesEnHeader>{acciones}{exportar}{botonAgregar}{portal}</AccionesEnHeader>
      </> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <OutlineButton icon={<IcPlus size={12} />} onClick={abrirNuevo}>{agregarTexto}</OutlineButton>
          {acciones}
          {exportar}
          {filtrosUI}
          {masivas}
          {portal}
        </div>
      )}

      <Tabla
        headers={[
          <CheckTodos key="sel" s={s} ids={visibles.map(f => f.id)} />,
          ...columnas.map((c, i) => (i === 0 && p.contador !== false && typeof c.label === 'string' && !c.label.includes('(') ? `${c.label} (${filtradas.length})` : c.label)),
          <span key="acc" className="sr-only">Acciones</span>,
        ]}
        alinearDerecha={columnas.flatMap((c, i) => (c.derecha || c.tipo === 'num' ? [i + 1] : []))}
        anchos={Object.fromEntries([[0, 32], ...columnas.flatMap((c, i) => (c.ancho !== undefined ? [[i + 1, c.ancho]] : [])), [columnas.length + 1, 64]]) as Record<number, number | string>}>
        {visibles.length === 0 && <FilaVacia cols={columnasTotales} texto={filas.length === 0 ? `Todavía no hay registros. Usa «${agregarTexto}».` : undefined} />}
        {visibles.map(f => (
          <Fragment key={f.id}>
            <Fila style={val(f, campoActivo ?? '') === false ? { color: C.n700 } : undefined}>
              <Celda><CheckFila s={s} id={f.id} label={`Seleccionar ${nombre(f)}`} /></Celda>
              {columnas.map((c, i) => (
                <Celda key={c.key} derecha={c.derecha || c.tipo === 'num'} muted={campoActivo ? val(f, campoActivo) === false : false}
                  style={{ whiteSpace: 'nowrap' }}>
                  {c.link || (i === 0 && primera.link !== false && !columnas.some(x => x.link)) ? (
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      <LinkButton onClick={() => (detalle ? setPopover(popover === f.id ? null : f.id) : abrirEditar(f))}>{celda(f, c)}</LinkButton>
                      {detalle && (
                        <Popover open={popover === f.id} onClose={() => setPopover(null)} width={310}>
                          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: C.n900 }}>{detalle.titulo(f)}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 10 }}>
                              {detalle.campos.map(cd => (
                                <ControlCampo key={cd.key} c={cd} fila={f} onChange={(k, v) => actualizar(f.id, k, v)} />
                              ))}
                            </div>
                          </div>
                        </Popover>
                      )}
                    </span>
                  ) : celda(f, c)}
                </Celda>
              ))}
              <Celda derecha>
                <span style={{ display: 'inline-flex', gap: 2 }}>
                  <IconButton label={`Editar ${nombre(f)}`} onClick={() => abrirEditar(f)}><IcEdit /></IconButton>
                  <IconButton label={`Eliminar ${nombre(f)}`} tono="peligro" onClick={() => eliminar(f)}><IcTrash /></IconButton>
                </span>
              </Celda>
            </Fila>
          </Fragment>
        ))}
      </Tabla>
      <Paginacion pagina={pagina} total={total} onChange={setPagina} filas={nFilas} porPagina={tam} />

      <Modal open={!!editando} onClose={cerrar} width={modalAncho}
        title={editando?.esNuevo ? `${articulo} ${entidad}` : `Editar ${entidad}`}
        footer={<>
          <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
          <Button onClick={guardar}>Guardar</Button>
        </>}>
        {editando && (
          <form onSubmit={e => { e.preventDefault(); guardar(); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 14 }}>
            {campos.map(c => (
              <ControlCampo key={c.key} c={c} fila={editando.fila} error={errores[c.key]}
                onChange={(k, v) => setEditando(e => (e ? { ...e, fila: { ...e.fila, [k]: v } } : e))} />
            ))}
            {errorGeneral && <p role="alert" style={{ gridColumn: 'span 6', margin: 0, fontSize: 12, color: C.error }}>{errorGeneral}</p>}
            <button type="submit" hidden />
          </form>
        )}
      </Modal>
      {dialogo}
    </div>
  );
}

/** Control de un campo según su tipo. Exportado para formularios propios. */
export function ControlCampo<T extends Registro>({ c, fila, onChange, error }: {
  c: CampoDef<T>; fila: T; onChange: (k: string, v: unknown) => void; error?: string;
}) {
  const v = c.calcular ? c.calcular(fila) : val(fila, c.key);
  const disabled = !!c.calcular || c.deshabilitar?.(fila);
  const set = (x: unknown) => onChange(c.key, x);
  const ops = (c.opciones ?? []).map(opc);
  let control: ReactNode;
  switch (c.tipo) {
    case 'select':
      control = <Select value={String(v ?? '')} onChange={set} disabled={disabled} error={error}
        options={[{ value: '', label: c.placeholder ?? 'Seleccione' }, ...ops]} />;
      break;
    case 'checkbox':
      return <div style={{ gridColumn: `span ${c.span ?? 6}`, alignSelf: 'end', paddingBottom: 7 }}><Checkbox checked={!!v} onChange={set} label={c.label} /></div>;
    case 'switch':
      return <div style={{ gridColumn: `span ${c.span ?? 6}`, alignSelf: 'end', paddingBottom: 6 }}><Switch checked={!!v} onChange={set} label={c.label} /></div>;
    case 'siNo':
      control = <div style={{ display: 'flex', gap: 20, height: 32, alignItems: 'center' }}>
        <Radio name={c.key} checked={!!v} onChange={() => set(true)} label="Sí" />
        <Radio name={c.key} checked={!v} onChange={() => set(false)} label="No" />
      </div>;
      break;
    case 'radio':
      control = <div style={{ display: 'flex', gap: 20, height: 32, alignItems: 'center', flexWrap: 'wrap' }}>
        {ops.map(o => <Radio key={o.value} name={c.key} checked={v === o.value} onChange={() => set(o.value)} label={o.label} />)}
      </div>;
      break;
    case 'color':
      control = <ColorInput value={String(v ?? '#FFFFFF')} onChange={set} />;
      break;
    case 'textarea':
      control = <TextArea value={String(v ?? '')} onChange={set} placeholder={c.placeholder} rows={4} />;
      break;
    case 'multi':
      control = <MultiSelect value={(v as string[]) ?? []} onChange={set} opciones={ops} placeholder={c.placeholder} onCrear={c.onCrear} crearLabel={c.crearLabel} />;
      break;
    case 'number':
      control = <Input type="number" value={v === null || v === undefined ? '' : String(v)} disabled={disabled} error={error} placeholder={c.placeholder}
        onChange={x => set(x === '' ? 0 : Number(x))} />;
      break;
    default:
      control = <Input type={c.tipo ?? 'text'} value={String(v ?? '')} onChange={set} disabled={disabled} error={error} placeholder={c.placeholder}
        autoComplete={c.tipo === 'password' ? 'new-password' : undefined} />;
  }
  return (
    <CampoUI label={c.label} required={c.requerido} error={error} hint={c.hint} style={{ gridColumn: `span ${c.span ?? 6}` }}>
      {c.sufijo ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{control}<span style={{ fontSize: 12, color: C.n700, whiteSpace: 'nowrap' }}>{c.sufijo}</span></div> : control}
    </CampoUI>
  );
}

/** Texto de celda en una sola línea (los textos largos se cortan con «…» y se leen completos al pasar el mouse). */
function Linea({ texto }: { texto: string }) {
  return <span title={texto} style={{ display: 'inline-block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{texto}</span>;
}
