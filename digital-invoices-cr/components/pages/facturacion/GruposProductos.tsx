'use client';
// Grupos de productos y servicios. El grupo es la categoría del producto y
// guarda lo que tienen en común: CABYS, IVA, unidad, moneda y cuentas. Al
// crear un producto con un grupo, solo falta el nombre y el precio.
import { useEffect, useState } from 'react';
import { C, FONT, Button, FormField, Input, Select, Modal, DataTable, DataRow, Td, PageHeader } from '@/components/ui/primitives';
import { IcEdit, IcTrash } from '@/components/ui/icons';
import { useCabys } from '@/lib/useCabys';
import { UNIDADES } from './InventarioAvanzado';
import { CuentaCampo, nombreDeCuenta } from './CuentaPicker';
import SelectBuscable from './SelectBuscable';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { Flotante } from './NuevaFacturaPartes';
import { useCentrosCostoConfig } from '@/components/pages/catalogo/centrosCostoConfig';
import { useModulos } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';

export interface GrupoProducto {
  id: string; nombre: string; codigo_cabys: string; descripcion_cabys: string; impuesto: number; unidad: string; categoria: string;
  moneda: string; cuenta_ingreso: string; cuenta_costo: string; centro_costo?: string; inventariable: number; activo: number; articulos?: number;
}

export function useGrupos() {
  const [grupos, setGrupos] = useState<GrupoProducto[]>([]);
  const [v, setV] = useState(0);
  useEffect(() => {
    let vivo = true;
    fetch('/api/grupos-productos').then(r => r.json()).then(d => { if (vivo) setGrupos(d); }).catch(() => { if (vivo) setGrupos([]); });
    return () => { vivo = false; };
  }, [v]);
  return { grupos, recargar: () => setV(x => x + 1) };
}

const VACIO = { nombre: '', codigoCabys: '', descripcionCabys: '', impuesto: 13, unidad: 'Unid', moneda: 'CRC', cuentaIngreso: '600-001-0001', cuentaCosto: '', centroCosto: '', inventariable: false };
type FormGrupo = typeof VACIO & { id?: string };

function CabysGrupo({ codigo, descripcion, onElegir }: { codigo: string; descripcion: string; onElegir: (c: { codigo: string; descripcion: string; impuesto: number }) => void }) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null);
  const { lista, buscando } = useCabys(q, 8);
  return (
    <div ref={setAncla}>
      <input value={abierto ? q : codigo ? `${codigo} · ${descripcion}` : ''} placeholder="Buscar por código o descripción"
        onFocus={() => { setQ(''); setAbierto(true); }} onBlur={() => setTimeout(() => setAbierto(false), 150)} onChange={e => { setQ(e.target.value); setAbierto(true); }}
        style={{ height: 32, padding: '0 10px', border: `1px solid ${abierto ? C.brand : C.n500}`, borderRadius: 4, fontSize: 12, fontFamily: FONT, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
      <Flotante anchor={ancla} open={abierto && q.trim().length >= 2}>
        <div>
          {lista.map(c => (
            <div key={c.codigo} onMouseDown={e => e.preventDefault()} onClick={() => { onElegir(c); setAbierto(false); }}
              onMouseEnter={e => (e.currentTarget.style.background = C.n200)} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              style={{ padding: '7px 10px', fontSize: 11.5, cursor: 'pointer', borderBottom: `1px solid ${C.n200}` }}>
              <b style={{ fontWeight: 500 }}>{c.descripcion}</b> <span style={{ color: C.n700 }}>{c.codigo} · IVA {c.impuesto}%</span>
            </div>
          ))}
          {buscando && <div style={{ padding: 10, fontSize: 11.5, color: C.n700 }}>Buscando en el catálogo de Hacienda…</div>}
          {!buscando && lista.length === 0 && <div style={{ padding: 10, fontSize: 11.5, color: C.n700 }}>Sin resultados.</div>}
        </div>
      </Flotante>
    </div>
  );
}

// Formulario de un grupo CABYS en una sola columna: primero lo de Hacienda,
// luego la contabilidad. Se usa en la pestaña y desde el producto.
export function GrupoModal({ inicial, onCerrar, onGuardado }: { inicial: FormGrupo; onCerrar: () => void; onGuardado: (msg: string, id: string) => void }) {
  const [edit, setEdit] = useState<FormGrupo>(inicial);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { centrosCosto } = useCentrosCostoConfig();
  const { contabilidad } = useModulos();
  const set = (p: Partial<FormGrupo>) => setEdit(e => ({ ...e, ...p }));
  async function guardar() {
    if (!edit.nombre.trim() || !/^\d{13}$/.test(edit.codigoCabys)) { setError('Escribe el nombre y elige un código CABYS.'); return; }
    setGuardando(true);
    const r = await fetch(edit.id ? `/api/grupos-productos/${edit.id}` : '/api/grupos-productos', {
      method: edit.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...edit, inventariable: false }),
    });
    const d = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { setError(d.error ?? 'No se pudo guardar.'); return; }
    onGuardado(edit.id ? `Se actualizó el grupo «${edit.nombre}».` : `Se creó el grupo «${edit.nombre}».`, edit.id ?? d.id);
  }
  const subtitulo = (t: string) => <div style={{ fontSize: 12, fontWeight: 600, color: C.n900, borderBottom: `1px solid ${C.n500}`, paddingBottom: 6, marginTop: 4 }}>{t}</div>;
  return (
    <Modal open width={560} title={edit.id ? 'Editar grupo CABYS' : 'Nuevo grupo CABYS'} onClose={onCerrar}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Button variant="secondary" onClick={onCerrar}>Cancelar</Button><Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button></div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Los productos de este grupo toman estos datos. En cada producto se pueden cambiar.</p>
        <FormField label="Nombre del grupo" required><Input value={edit.nombre} onChange={v => set({ nombre: v })} placeholder="Ej. Hospedaje" /></FormField>
        {subtitulo('Hacienda')}
        <FormField label="Código CABYS" required>
          <CabysGrupo codigo={edit.codigoCabys} descripcion={edit.descripcionCabys}
            onElegir={c => set({ codigoCabys: c.codigo, descripcionCabys: c.descripcion, impuesto: c.impuesto, unidad: Number(c.codigo[0]) <= 4 ? 'Unid' : edit.unidad })} />
        </FormField>
        <FormField label="IVA"><Select value={String(edit.impuesto)} onChange={v => set({ impuesto: Number(v) })} options={[13, 4, 2, 1, 0].map(n => ({ value: String(n), label: `${n}%` }))} /></FormField>
        <FormField label="Unidad de medida"><Select value={edit.unidad} onChange={v => set({ unidad: v })} options={UNIDADES} /></FormField>
        <FormField label="Moneda"><Select value={edit.moneda} onChange={v => set({ moneda: v })} options={[{ value: 'CRC', label: '₡ Colones' }, { value: 'USD', label: '$ Dólares' }]} /></FormField>
        {/* Solo con Contabilidad: cuentas y centro de costos */}
        {contabilidad && <>
        {subtitulo('Contabilidad')}
        <FormField label="Cuenta de ingreso" required><CuentaCampo value={edit.cuentaIngreso} onChange={v => set({ cuentaIngreso: v })} titulo="Cuenta de ingreso" grupoInicial="4" /></FormField>
        <FormField label="Cuenta de costo (opcional)"><CuentaCampo value={edit.cuentaCosto} onChange={v => set({ cuentaCosto: v })} titulo="Cuenta de costo" grupoInicial="5" opcional /></FormField>
        <FormField label="Centro de costos (opcional)">
          <SelectBuscable value={edit.centroCosto} onChange={v => set({ centroCosto: v })} vacio="Sin centro de costos" placeholder="Buscar centro de costos"
            opciones={centrosCosto.map(c => ({ value: c.codigo, label: `${c.codigo} · ${c.descripcion}` }))} />
        </FormField>
        </>}
        {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}
      </div>
    </Modal>
  );
}

export const GRUPO_VACIO = VACIO;

// Pestaña «Grupos CABYS» de Facturación electrónica.
export default function GruposPage({ hideHeader, addSignal }: { hideHeader?: boolean; addSignal?: number } = {}) {
  const { puede } = usePermisos();
  const { contabilidad } = useModulos();
  const { grupos, recargar } = useGrupos();
  const [edit, setEdit] = useState<FormGrupo | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [senal, setSenal] = useState(addSignal);
  if (addSignal !== senal) { setSenal(addSignal); if (addSignal) setEdit({ ...VACIO }); }

  async function eliminar(g: GrupoProducto) {
    if (!window.confirm(`¿Eliminar el grupo «${g.nombre}»? Sus productos quedan sin grupo.`)) return;
    await fetch(`/api/grupos-productos/${g.id}`, { method: 'DELETE' });
    recargar();
  }
  const lista = useListaFiltrable({
    items: grupos, texto: g => `${g.nombre} ${g.codigo_cabys} ${g.descripcion_cabys}`, placeholder: 'Buscar por nombre o CABYS',
    defs: [
      { tipo: 'lista', clave: 'iva', label: 'IVA', opciones: [...new Set(grupos.map(g => String(g.impuesto)))].map(v => ({ value: v, label: `${v}%` })), valor: g => String(g.impuesto) },
      { tipo: 'lista', clave: 'moneda', label: 'Moneda', opciones: [{ value: 'CRC', label: '₡ Colones' }, { value: 'USD', label: '$ Dólares' }], valor: g => g.moneda === 'USD' ? 'USD' : 'CRC' },
      { tipo: 'check', clave: 'conproductos', label: 'Solo con productos', cumple: g => Number(g.articulos ?? 0) > 0 },
    ],
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!hideHeader && <PageHeader title="Grupos CABYS"><Button onClick={() => setEdit({ ...VACIO })}>+ Nuevo grupo CABYS</Button></PageHeader>}
      {lista.barra}
      {lista.chips}
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {aviso && <div style={{ fontSize: 12, color: '#1E6B35', background: '#EAF7EE', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>{aviso}</div>}
        <DataTable headers={['Grupo', 'CABYS', 'IVA', 'Unidad', 'Moneda', ...(contabilidad ? ['Cuenta de ingreso'] : []), 'Productos', '']}>
          {lista.filasPagina.map(g => (
            <DataRow key={g.id} onClick={() => puede('fe.config.grupos.editar') && setEdit({ id: g.id, nombre: g.nombre, codigoCabys: g.codigo_cabys, descripcionCabys: g.descripcion_cabys, impuesto: g.impuesto, unidad: g.unidad, moneda: g.moneda, cuentaIngreso: g.cuenta_ingreso, cuentaCosto: g.cuenta_costo, centroCosto: g.centro_costo ?? '', inventariable: Boolean(g.inventariable) })}>
              <Td><span style={{ fontWeight: 500 }}>{g.nombre}</span></Td>
              <Td><span style={{ fontVariantNumeric: 'tabular-nums' }}>{g.codigo_cabys}</span><div style={{ fontSize: 10.5, color: C.n700, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.descripcion_cabys}</div></Td>
              <Td>{g.impuesto}%</Td>
              <Td muted>{g.unidad}</Td>
              <Td muted>{g.moneda === 'USD' ? '$ Dólares' : '₡ Colones'}</Td>
              {contabilidad && <Td muted><span style={{ fontVariantNumeric: 'tabular-nums' }}>{g.cuenta_ingreso}</span><div style={{ fontSize: 10.5 }}>{nombreDeCuenta(g.cuenta_ingreso)}</div></Td>}
              <Td right>{g.articulos ?? 0}</Td>
              <Td right>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  {puede('fe.config.grupos.editar') && <button title="Editar" onClick={() => setEdit({ id: g.id, nombre: g.nombre, codigoCabys: g.codigo_cabys, descripcionCabys: g.descripcion_cabys, impuesto: g.impuesto, unidad: g.unidad, moneda: g.moneda, cuentaIngreso: g.cuenta_ingreso, cuentaCosto: g.cuenta_costo, centroCosto: g.centro_costo ?? '', inventariable: Boolean(g.inventariable) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, padding: 4, display: 'inline-flex' }}><IcEdit className="w-3.5 h-3.5" /></button>}
                  {puede('fe.config.grupos.eliminar') && <button title="Eliminar" onClick={() => eliminar(g)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, padding: 4, display: 'inline-flex' }}><IcTrash className="w-4 h-4" /></button>}
                </div>
              </Td>
            </DataRow>
          ))}
          {lista.filtrados.length === 0 && <DataRow><Td colSpan={8}>{lista.vacio('Todavía no hay grupos CABYS. Crea uno para ordenar tus productos y llenarlos más rápido.')}</Td></DataRow>}
        </DataTable>
      </div>
      {lista.paginacion}
      {edit && <GrupoModal inicial={edit} onCerrar={() => setEdit(null)} onGuardado={m => { setEdit(null); setAviso(m); recargar(); }} />}
    </div>
  );
}

// Lista de grupos con la opción de crear uno nuevo sin salir del producto.
export function SelectorGrupo({ grupos, value, onChange, onCreado, inicial }: {
  grupos: GrupoProducto[]; value: string; onChange: (id: string) => void;
  onCreado: (g: GrupoProducto) => void;          // el padre recarga y aplica el grupo nuevo
  inicial?: Partial<FormGrupo>;                   // ej. el CABYS ya elegido en el producto
}) {
  const [crear, setCrear] = useState(false);
  return (
    <>
      <Select value={value} onChange={v => { if (v === '__nuevo') setCrear(true); else onChange(v); }}
        options={[{ value: '', label: 'Sin grupo' }, ...grupos.filter(g => Number(g.activo) !== 0).map(g => ({ value: g.id, label: g.nombre })), { value: '__nuevo', label: '+ Crear grupo CABYS' }]} />
      {crear && <GrupoModal inicial={{ ...VACIO, ...inicial }} onCerrar={() => setCrear(false)}
        onGuardado={async (_m, id) => {
          setCrear(false);
          const lista: GrupoProducto[] = await fetch('/api/grupos-productos').then(r => r.json()).catch(() => []);
          const g = lista.find(x => x.id === id);
          if (g) onCreado(g);
        }} />}
    </>
  );
}
