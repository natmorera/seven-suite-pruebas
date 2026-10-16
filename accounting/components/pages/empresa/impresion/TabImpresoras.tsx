'use client';
// Empresa › Impresoras: las impresoras registradas en el servidor de impresión
import { useState } from 'react';
import { Section, Modal, RowAction } from '@/components/ui/primitives';
import { C } from '@/components/ui/tokens';
import { Button, FormField, Input, Switch } from '@/components/ui/formulario';
import { DataTable, DataRow, Td } from '@/components/ui/tabla';
import { IcEdit, IcTrash } from '@/components/ui/icons';
import { impresionAlmacen, validarImpresion, type DatosImpresion, type Impresora } from '../datos/impresion';
import { Pagina } from './comun';
import { useAlmacen } from '../datos/almacen';

export default function TabImpresoras({ nueva, onCerrarNueva }: { nueva: boolean; onCerrarNueva: () => void }) {
  const datos = useAlmacen(impresionAlmacen);
  const [editando, setEditando] = useState<Impresora | null>(null);
  const [eliminando, setEliminando] = useState<Impresora | null>(null);
  const cerrar = () => { setEditando(null); onCerrarNueva(); };

  // Devuelve el error de validación, o null si se guardó
  function guardar(nombre: string, habilitada: boolean): string | null {
    const impresoras = editando
      ? datos.impresoras.map(x => x.id === editando.id ? { ...x, nombre, habilitada } : x)
      : [...datos.impresoras, { id: `imp-${Math.max(0, ...datos.impresoras.map(x => Number(x.id.replace('imp-', '')) || 0)) + 1}`, nombre, habilitada: true }];
    const nuevo: DatosImpresion = { ...datos, impresoras };
    const error = validarImpresion(nuevo);
    if (error) return error;
    impresionAlmacen.guardar(nuevo);
    cerrar();
    return null;
  }
  // Los documentos asignados a la impresora eliminada pasan a la predeterminada del sistema
  function eliminar(i: Impresora) {
    impresionAlmacen.guardar(d => ({
      ...d, impresoras: d.impresoras.filter(x => x.id !== i.id),
      asignaciones: Object.fromEntries(Object.entries(d.asignaciones).filter(([, id]) => id !== i.id)),
    }));
    setEliminando(null);
  }

  return (
    <Pagina>
      <Section title="Impresoras" hint="Las impresoras que esta empresa tiene registradas.">
        <DataTable headers={['Nombre', 'Impresión', 'Acciones']}>
          {datos.impresoras.length === 0 && <DataRow><Td muted>No hay impresoras registradas.</Td><Td>{''}</Td><Td>{''}</Td></DataRow>}
          {datos.impresoras.map(i => (
            <DataRow key={i.id}>
              <Td>{i.nombre}</Td>
              <Td width="180px"><span style={{ color: i.habilitada ? C.success : C.n700 }}>{i.habilitada ? 'Habilitada' : 'Deshabilitada'}</span></Td>
              <Td width="110px">
                <div style={{ display: 'flex', gap: 4 }}>
                  <RowAction title="Editar" onClick={() => setEditando(i)}><IcEdit className="w-3.5 h-3.5" /></RowAction>
                  <RowAction title="Eliminar" danger onClick={() => setEliminando(i)}><IcTrash className="w-3.5 h-3.5" /></RowAction>
                </div>
              </Td>
            </DataRow>
          ))}
        </DataTable>
      </Section>
      {(nueva || editando) && <ModalImpresora impresora={editando} onClose={cerrar} onGuardar={guardar} />}
      {eliminando && (
        <Modal open title="Eliminar impresora" onClose={() => setEliminando(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => eliminar(eliminando)}>Eliminar</Button>
          </div>}>
          <p style={{ margin: 0, fontSize: 12, color: C.n900, lineHeight: 1.5 }}>
            ¿Eliminar la impresora «{eliminando.nombre}»? Los documentos asignados a ella pasan a la predeterminada del sistema.
          </p>
        </Modal>
      )}
    </Pagina>
  );
}

function ModalImpresora({ impresora, onClose, onGuardar }: { impresora: Impresora | null; onClose: () => void; onGuardar: (nombre: string, habilitada: boolean) => string | null }) {
  const [nombre, setNombre] = useState(impresora?.nombre ?? '');
  const [habilitada, setHabilitada] = useState(impresora?.habilitada ?? true);
  const [error, setError] = useState<string | null>(null);
  const cambiado = !impresora || nombre.trim() !== impresora.nombre || habilitada !== impresora.habilitada;
  return (
    <Modal open title={impresora ? 'Editar impresora' : 'Registrar impresora'} onClose={onClose}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => setError(onGuardar(nombre.trim(), habilitada))} disabled={!nombre.trim() || !cambiado}>{impresora ? 'Guardar' : 'Registrar'}</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Nombre" required error={error ?? undefined} hint={impresora ? undefined : 'Cómo se conoce la impresora en el servidor de impresión.'}>
          <Input value={nombre} onChange={v => { setNombre(v); setError(null); }} />
        </FormField>
        {impresora && <Switch checked={habilitada} onChange={setHabilitada} label="Habilitada para imprimir" />}
      </div>
    </Modal>
  );
}
