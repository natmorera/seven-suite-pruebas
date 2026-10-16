'use client';
import { useState } from 'react';
import { Modal } from '../../../ui/primitives';
import { Button, FormField, Input } from '../../../ui/formulario';
import { type Ejercicio } from './datos';

// ── Editar datos generales del ejercicio ─────────────────────────────────────
export function ModalEditarEjercicio({ ejercicio, onClose, onGuardar }: {
  ejercicio: Ejercicio; onClose:()=>void; onGuardar:(patch:Partial<Ejercicio>)=>void;
}) {
  const [empresa, setEmpresa] = useState(ejercicio.empresa);
  const [codigo, setCodigo] = useState(ejercicio.codigo);
  const [nPagCheque, setNPagCheque] = useState(String(ejercicio.nPagCheque));
  return (
    <Modal open title={`Editar ejercicio ${ejercicio.anio}`} onClose={onClose}
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={()=>onGuardar({ empresa, codigo, nPagCheque:parseInt(nPagCheque,10)||0 })}>Guardar</Button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <FormField label="Empresa"><Input value={empresa} onChange={setEmpresa} /></FormField>
        <FormField label="Código"><Input value={codigo} onChange={setCodigo} /></FormField>
        <FormField label="N.° pág. cheque"><Input value={nPagCheque} onChange={setNPagCheque} /></FormField>
      </div>
    </Modal>
  );
}
