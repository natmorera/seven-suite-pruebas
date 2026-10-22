'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/primitives';
import { Button, FormField, Input } from '@/components/ui/formulario';
import { C } from '@/components/ui/tokens';
import { type EnlaceAjuste } from '../datos/ajustes';
import { CUENTAS_DETALLE, F } from './datos';
import { AccountPicker, OperacionesPicker } from './piezas';

// ── Modal: agregar / editar un movimiento de ajuste ── Se edita en un modal para que los
// selectores no queden cortados por el scroll de la tabla.
export function ModalMovimientoAjuste({ enlace, onClose, onGuardar }: {
  enlace: EnlaceAjuste; onClose:()=>void; onGuardar:(e:EnlaceAjuste)=>void;
}) {
  const [form, setForm] = useState<EnlaceAjuste>({ ...enlace });
  const esNuevo = !enlace.tipoMovimiento && enlace.aplicaA.length===0;
  const valido = form.tipoMovimiento.trim().length > 0;

  function patch(partial: Partial<EnlaceAjuste>) {
    setForm(f => {
      const next = { ...f, ...partial };
      if (partial.cuentaCode !== undefined) {
        const cta = CUENTAS_DETALLE.find(c => c.code === partial.cuentaCode);
        next.cuentaNombre = cta?.nombre;
      }
      return next;
    });
  }

  return (
    <Modal open title={esNuevo ? 'Agregar movimiento de ajuste' : 'Editar movimiento de ajuste'} onClose={onClose}
      footer={<div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={()=>valido && onGuardar(form)}>Guardar</Button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <FormField label="Tipo de movimiento" required hint="Nombre libre - lo definís vos, no es una lista fija.">
          <Input value={form.tipoMovimiento} onChange={v=>patch({ tipoMovimiento:v })} placeholder="Ej. Comisión bancaria"/>
        </FormField>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label="Efecto">
            <select value={form.signo} onChange={e=>patch({ signo:(+e.target.value) as 1|-1 })}
              style={{ height:30, width:'100%', padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:4, fontSize:12, fontFamily:F }}>
              <option value={1}>Suma (+)</option>
              <option value={-1}>Resta (-)</option>
            </select>
          </FormField>
          <FormField label="% (opcional)" hint="Siempre es un porcentaje, se calcula sobre el total de la operación.">
            <div style={{ position:'relative' }}>
              <input type="number" min={0} max={100} step={0.01} value={form.porcentaje ?? ''} placeholder="Ej. 2" aria-label="Ej. 2"
                onChange={e=>patch({ porcentaje: e.target.value==='' ? undefined : Math.min(100, Math.max(0, +e.target.value)) })}
                style={{ height:30, width:'100%', padding:'0 24px 0 8px', border:`1px solid ${C.n500}`, borderRadius:4, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:11, color:C.n700 }}>%</span>
            </div>
          </FormField>
        </div>
        <FormField label="Aplica a">
          <OperacionesPicker value={form.aplicaA} onChange={v=>patch({ aplicaA:v })}/>
        </FormField>
        <FormField label="Cuenta (opcional)" hint="Si no se enlaza una cuenta, el monto se sigue eligiendo a mano en la línea de ajuste.">
          <AccountPicker value={form.cuentaCode} options={CUENTAS_DETALLE} onChange={(code,nombre)=>patch({ cuentaCode: code||undefined, cuentaNombre: nombre||undefined })}/>
        </FormField>
      </div>
    </Modal>
  );
}
