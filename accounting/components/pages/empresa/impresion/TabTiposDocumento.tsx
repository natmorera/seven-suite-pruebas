'use client';
// Empresa › Tipos de documento: catálogo global de clases de documento para
// efectos de impresión (lo que se asigna a cada impresora)
import { useState } from 'react';
import { Modal } from '@/components/ui/primitives';
import { C } from '@/components/ui/tokens';
import { Button, FormField, Input } from '@/components/ui/formulario';
import { DataTable, DataRow, Td } from '@/components/ui/tabla';
import { impresionAlmacen, validarImpresion } from '../datos/impresion';
import { Pagina } from './comun';
import { useAlmacen } from '../datos/almacen';

export default function TabTiposDocumento({ nuevo, onCerrarNuevo }: { nuevo: boolean; onCerrarNuevo: () => void }) {
  const datos = useAlmacen(impresionAlmacen);
  return (
    <Pagina>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.n900, margin: 0 }}>Tipos de documento</p>
        <p style={{ fontSize: 11, color: C.n700, margin: '2px 0 0' }}>Clases de documento para efectos de impresión: es lo que se asigna a cada impresora. Catálogo global.</p>
      </div>
      <DataTable headers={['Código', 'Nombre', 'Estado']}>
        {datos.tipos.map(t => (
          <DataRow key={t.codigo}>
            <Td width="260px"><span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{t.codigo}</span></Td>
            <Td>{t.nombre}</Td>
            <Td width="120px"><span style={{ color: C.success }}>En uso</span></Td>
          </DataRow>
        ))}
      </DataTable>
      {nuevo && <ModalNuevoTipo onClose={onCerrarNuevo} />}
    </Pagina>
  );
}

function ModalNuevoTipo({ onClose }: { onClose: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  function crear() {
    const datos = impresionAlmacen.leer();
    const nuevo = { ...datos, tipos: [...datos.tipos, { codigo: codigo.trim(), nombre: nombre.trim() }] };
    const e = validarImpresion(nuevo);
    if (e) { setError(e); return; }
    impresionAlmacen.guardar(nuevo);
    onClose();
  }
  return (
    <Modal open title="Nuevo tipo de documento" onClose={onClose}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!codigo.trim() || !nombre.trim()} onClick={crear}>Crear</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Código" required error={error ?? undefined} hint="Identificador natural del tipo; no cambia después.">
          <Input value={codigo} onChange={v => { setCodigo(v); setError(null); }} />
        </FormField>
        <FormField label="Nombre" required>
          <Input value={nombre} onChange={setNombre} />
        </FormField>
      </div>
    </Modal>
  );
}
