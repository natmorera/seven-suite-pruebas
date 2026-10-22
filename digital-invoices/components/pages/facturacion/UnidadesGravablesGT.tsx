'use client';
// Unidades gravables de Guatemala: los impuestos de FEL que usa la empresa,
// con su valor, su cuenta contable y su estado. La cuenta es la del impuesto,
// así que la comparten todas sus unidades gravables.
import { useEffect, useState } from 'react';
import { C, Button, DataTable, DataRow, Td, Modal, FormField, Input, Select, Switch } from '@/components/ui/primitives';
import { IcEdit, IcTrash } from '@/components/ui/icons';
import { CuentaCampo } from './CuentaPicker';
import InfoTooltip from './InfoTooltip';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { useModulos } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';
import { type UnidadGravableGT } from '@/lib/unidadesGravablesGT';

// Impuestos que define FEL, por código
const IMPUESTOS_FEL: Record<number, string> = {
  1: 'IVA', 2: 'Distribución de petróleo', 3: 'Turismo hospedaje', 4: 'Turismo pasajes', 5: 'Timbre de prensa', 6: 'Bomberos',
  7: 'Tasa municipal', 8: 'Bebidas alcohólicas', 9: 'Tabaco', 10: 'Cemento', 11: 'Bebidas no alcohólicas', 12: 'Tarifa portuaria',
};

type CuentasImp = Record<string, { ventas?: string; compras?: string }>;
const VACIA: UnidadGravableGT = { id: '', impuesto: 1, codigo: 1, nombre: '', valor: 0, tipoValor: 'porcentaje', descripcion: '', activo: true };
const json = (body: unknown) => ({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function UnidadesGravablesGT({ addSignal }: { addSignal?: number } = {}) {
  const { contabilidad } = useModulos();
  const { puede } = usePermisos();
  const [items, setItems] = useState<UnidadGravableGT[]>([]);
  const [cuentaIva, setCuentaIva] = useState('');
  const [cuentas, setCuentas] = useState<CuentasImp>({});
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<UnidadGravableGT | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      fetch('/api/gt/unidades-gravables').then(r => r.json()),
      fetch('/api/facturacion/cuentas').then(r => r.json()),
      fetch('/api/gt/cuentas-impuestos').then(r => r.json()),
    ]).then(([u, m, o]) => {
      if (!vivo) return;
      setItems(u); setCuentaIva(m.cuentaIvaVentas ?? ''); setCuentas(o ?? {}); setCargando(false);
    }).catch(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  const cuentaDe = (imp: number) => (imp === 1 ? cuentaIva : cuentas[imp]?.ventas ?? '');
  const valorTexto = (u: UnidadGravableGT) => (u.tipoValor === 'monto' ? `Q ${u.valor.toFixed(2)}` : `${u.valor} %`);

  function abrir(u: UnidadGravableGT | null) {
    setEditId(u?.id ?? null); setForm(u ? { ...u } : { ...VACIA }); setCuenta(cuentaDe(u?.impuesto ?? 1)); setError(null);
  }

  // Señal del botón «+» del encabezado
  const [senal, setSenal] = useState(addSignal);
  if (addSignal !== senal) { setSenal(addSignal); if (addSignal) abrir(null); }

  async function persistir(lista: UnidadGravableGT[]) {
    setItems(lista);
    const r = await fetch('/api/gt/unidades-gravables', json(lista));
    if (r.ok) setItems(await r.json());
  }

  async function guardar() {
    if (!form) return;
    if (!form.nombre.trim()) { setError('Escribe el nombre.'); return; }
    const id = `${form.impuesto}-${form.codigo}`;
    if (id !== editId && items.some(u => u.id === id)) { setError('Ya existe esa unidad gravable para este impuesto.'); return; }
    if (contabilidad && !cuenta && form.valor > 0) { setError('Elige la cuenta contable del impuesto.'); return; }
    setGuardando(true);
    const nueva = { ...form, id };
    await persistir(editId ? items.map(u => (u.id === editId ? nueva : u)) : [...items, nueva]);
    if (contabilidad && cuenta !== cuentaDe(form.impuesto)) {
      if (form.impuesto === 1) { await fetch('/api/facturacion/cuentas', json({ cuentaIvaVentas: cuenta })); setCuentaIva(cuenta); }
      else {
        const otras = { ...cuentas, [form.impuesto]: { ...cuentas[form.impuesto], ventas: cuenta } };
        await fetch('/api/gt/cuentas-impuestos', json(otras)); setCuentas(otras);
      }
    }
    setGuardando(false); setForm(null);
  }

  const lista = useListaFiltrable({
    items, texto: u => `${u.nombre} ${IMPUESTOS_FEL[u.impuesto]} ${u.descripcion}`, placeholder: 'Buscar por nombre, impuesto o descripción',
    defs: [
      { tipo: 'lista', clave: 'impuesto', label: 'Impuesto', opciones: [...new Set(items.map(u => u.impuesto))].map(c => ({ value: String(c), label: IMPUESTOS_FEL[c] ?? String(c) })), valor: u => String(u.impuesto) },
      { tipo: 'check', clave: 'activos', label: 'Solo activas', cumple: u => u.activo },
    ],
    derecha: <InfoTooltip text="Cada producto o servicio elige una unidad gravable por impuesto. Solo las activas se pueden elegir al crear artículos y líneas." />,
  });

  const set = (p: Partial<UnidadGravableGT>) => setForm(f => (f ? { ...f, ...p } : f));
  const btn = { background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', padding: 4 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {lista.barra}
      {lista.chips}
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['Nombre', 'Impuesto', 'Código', 'Valor', ...(contabilidad ? ['Cuenta contable'] : []), 'Descripción', 'Activo', '']}>
            {lista.filasPagina.map(u => (
              <DataRow key={u.id}>
                <Td>{u.nombre}</Td>
                <Td muted>{IMPUESTOS_FEL[u.impuesto] ?? u.impuesto}</Td>
                <Td mono>{u.codigo}</Td>
                <Td>{valorTexto(u)}</Td>
                {contabilidad && <Td>{cuentaDe(u.impuesto) || (u.valor > 0 ? <span style={{ color: C.error, fontSize: 11.5 }}>Sin cuenta</span> : <span style={{ color: C.n700 }}>No aplica</span>)}</Td>}
                <Td muted>{u.descripcion}</Td>
                <Td><Switch checked={u.activo} onChange={v => persistir(items.map(x => (x.id === u.id ? { ...x, activo: v } : x)))} /></Td>
                <Td right>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {puede('fe.config.impuestos.editar') && <button title="Editar" onClick={() => abrir(u)} style={{ ...btn, color: C.n700 }}><IcEdit className="w-3.5 h-3.5" /></button>}
                    {puede('fe.config.impuestos.eliminar') && <button title="Eliminar" onClick={() => persistir(items.filter(x => x.id !== u.id))} style={{ ...btn, color: C.error }}><IcTrash className="w-4 h-4" /></button>}
                  </div>
                </Td>
              </DataRow>
            ))}
            {lista.filtrados.length === 0 && (
              <DataRow><Td colSpan={8}>{lista.vacio('Todavía no hay unidades gravables. Usa "+ Nueva unidad gravable" para empezar.')}</Td></DataRow>
            )}
          </DataTable>
        )}
      </div>
      {!cargando && lista.paginacion}

      <Modal open={form !== null} title={editId ? 'Editar unidad gravable' : 'Nueva unidad gravable'} onClose={() => setForm(null)}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>}>
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
            <FormField label="Nombre" required><Input value={form.nombre} onChange={v => set({ nombre: v })} placeholder="Ej. IVA 12 %" /></FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <FormField label="Impuesto de FEL">
                <Select value={String(form.impuesto)} onChange={v => { set({ impuesto: Number(v) }); setCuenta(cuentaDe(Number(v))); }}
                  options={Object.entries(IMPUESTOS_FEL).map(([c, n]) => ({ value: c, label: `${c} · ${n}` }))} />
              </FormField>
              <FormField label="Código de unidad" hint="El de la SAT"><Input value={String(form.codigo)} onChange={v => set({ codigo: Number(v) || 1 })} type="number" /></FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FormField label="Tipo de valor">
                <Select value={form.tipoValor} onChange={v => set({ tipoValor: v as UnidadGravableGT['tipoValor'] })} options={[{ value: 'porcentaje', label: 'Porcentaje' }, { value: 'monto', label: 'Monto fijo' }]} />
              </FormField>
              <FormField label="Valor"><Input value={String(form.valor)} onChange={v => set({ valor: Number(v) || 0 })} type="number" /></FormField>
            </div>
            {contabilidad && <CuentaCampo titulo="Cuenta contable del impuesto" value={cuenta} onChange={setCuenta} grupoInicial="3" />}
            <FormField label="Descripción" hint="Opcional"><Input value={form.descripcion} onChange={v => set({ descripcion: v })} /></FormField>
            <Switch checked={form.activo} onChange={v => set({ activo: v })} label="Activa" />
          </div>
        )}
      </Modal>
    </div>
  );
}
