'use client';
// Unidades de medida de Guatemala: las que se eligen en los productos y en
// las líneas. En el DTE de FEL van sus tres primeras letras en mayúscula.
import { useEffect, useState } from 'react';
import { C, Button, DataTable, DataRow, Td, Modal, FormField, Input, Switch } from '@/components/ui/primitives';
import { IcEdit, IcTrash } from '@/components/ui/icons';
import InfoTooltip from './InfoTooltip';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { usePermisos } from '@/lib/permisosCliente';
import { type UnidadMedida } from '@/lib/unidadesMedida';

const codigoFel = (valor: string) => valor.slice(0, 3).toUpperCase();

export default function UnidadesMedidaGT({ addSignal }: { addSignal?: number } = {}) {
  const { puede } = usePermisos();
  const [items, setItems] = useState<UnidadMedida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<UnidadMedida | null>(null);
  const [editValor, setEditValor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/unidades-medida').then(r => r.json()).then(d => { if (vivo) { setItems(d); setCargando(false); } }).catch(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  function abrir(u: UnidadMedida | null) {
    setEditValor(u?.valor ?? null); setForm(u ? { ...u } : { valor: '', nombre: '', activo: true }); setError(null);
  }
  // Señal del botón «+» del encabezado
  const [senal, setSenal] = useState(addSignal);
  if (addSignal !== senal) { setSenal(addSignal); if (addSignal) abrir(null); }

  async function persistir(lista: UnidadMedida[]) {
    setItems(lista);
    const r = await fetch('/api/unidades-medida', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lista) });
    if (r.ok) setItems(await r.json());
  }

  async function guardar() {
    if (!form) return;
    const nombre = form.nombre.trim();
    if (!nombre) { setError('Escribe el nombre.'); return; }
    // Una unidad nueva se guarda en el producto con su nombre; las existentes conservan su valor
    const valor = editValor ?? nombre;
    if (!editValor && items.some(u => u.valor.toLowerCase() === valor.toLowerCase())) { setError('Ya existe una unidad con ese nombre.'); return; }
    const nueva = { ...form, nombre, valor };
    await persistir(editValor ? items.map(u => (u.valor === editValor ? nueva : u)) : [...items, nueva]);
    setForm(null);
  }

  const lista = useListaFiltrable({
    items, texto: u => `${u.nombre} ${u.valor}`, placeholder: 'Buscar por nombre o código',
    defs: [{ tipo: 'check', clave: 'activas', label: 'Solo activas', cumple: u => u.activo }],
    derecha: <InfoTooltip text="Las unidades activas se eligen en los productos y en las líneas de las facturas. En FEL va el código de tres letras." />,
  });
  const btn = { background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', padding: 4 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {lista.barra}
      {lista.chips}
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['Nombre', 'Código en FEL', 'Activo', '']}>
            {lista.filasPagina.map(u => (
              <DataRow key={u.valor}>
                <Td>{u.nombre}</Td>
                <Td mono>{codigoFel(u.valor)}</Td>
                <Td><Switch checked={u.activo} onChange={v => persistir(items.map(x => (x.valor === u.valor ? { ...x, activo: v } : x)))} /></Td>
                <Td right>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {puede('fe.config.unidades.editar') && <button title="Editar" onClick={() => abrir(u)} style={{ ...btn, color: C.n700 }}><IcEdit className="w-3.5 h-3.5" /></button>}
                    {puede('fe.config.unidades.eliminar') && <button title="Eliminar" onClick={() => persistir(items.filter(x => x.valor !== u.valor))} style={{ ...btn, color: C.error }}><IcTrash className="w-4 h-4" /></button>}
                  </div>
                </Td>
              </DataRow>
            ))}
            {lista.filtrados.length === 0 && (
              <DataRow><Td colSpan={4}>{lista.vacio('Todavía no hay unidades de medida. Usa "+ Nueva unidad de medida" para empezar.')}</Td></DataRow>
            )}
          </DataTable>
        )}
      </div>
      {!cargando && lista.paginacion}

      <Modal open={form !== null} title={editValor ? 'Editar unidad de medida' : 'Nueva unidad de medida'} onClose={() => setForm(null)}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>
          <Button onClick={guardar}>Guardar</Button>
        </div>}>
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
            <FormField label="Nombre" required hint={`Código en FEL: ${codigoFel(editValor ?? form.nombre) || '—'}`}>
              <Input value={form.nombre} onChange={v => setForm(f => (f ? { ...f, nombre: v } : f))} placeholder="Ej. Docena" />
            </FormField>
            <Switch checked={form.activo} onChange={v => setForm(f => (f ? { ...f, activo: v } : f))} label="Activa" />
          </div>
        )}
      </Modal>
    </div>
  );
}
