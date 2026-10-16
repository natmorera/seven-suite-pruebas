'use client';
import { useState } from 'react';
import { Modal, FormField, Input, Button, C } from '@/components/ui/primitives';

interface EmisorLike {
  nombre_comercial: string; correo_electronico: string | null; direccion_fiscal: string | null;
  registro_bebidas_alcoholicas: string | null;
}
interface Patch {
  nombreComercial?: string; correoElectronico?: string; direccionFiscal?: string; registroBebidasAlcoholicas?: string;
}

export default function ModificarEmisorModal({
  open, emisor, onClose, onModificarPermanente, onUsarSoloAqui,
}: {
  open: boolean;
  emisor: EmisorLike;
  onClose: () => void;
  onModificarPermanente: (patch: Patch) => void;
  onUsarSoloAqui: (patch: Patch) => void;
}) {
  const [nombreComercial, setNombreComercial] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [registroLicores, setRegistroLicores] = useState('');

  // Al abrir (o si cambia el emisor) se toman sus datos como punto de partida.
  const [base, setBase] = useState<{ open: boolean; emisor: EmisorLike | null }>({ open: false, emisor: null });
  if (open && (!base.open || base.emisor !== emisor)) {
    setBase({ open, emisor });
    setNombreComercial(emisor.nombre_comercial ?? '');
    setCorreo(emisor.correo_electronico ?? '');
    setDireccion(emisor.direccion_fiscal ?? '');
    setRegistroLicores(emisor.registro_bebidas_alcoholicas ?? '');
  } else if (!open && base.open) setBase({ open: false, emisor: null });

  function patch(): Patch {
    return { nombreComercial, correoElectronico: correo, direccionFiscal: direccion, registroBebidasAlcoholicas: registroLicores };
  }

  return (
    <Modal open={open} title="Modificar datos del emisor" onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" onClick={() => onUsarSoloAqui(patch())}>Utilizar sólo en este comprobante</Button>
          <Button onClick={() => onModificarPermanente(patch())}>Modificar</Button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <FormField label="Nombre comercial (opcional)"><Input value={nombreComercial} onChange={setNombreComercial} /></FormField>
        <FormField label="Correo electrónico"><Input value={correo} onChange={setCorreo} /></FormField>
        <FormField label="Dirección fiscal"><Input value={direccion} onChange={setDireccion} /></FormField>

        <div>
          <b style={{ fontSize: 14 }}>Datos del emisor para bebidas alcohólicas</b>
          <p style={{ fontSize: 11.5, color: C.n700, margin: '4px 0 8px' }}>
            Para emitir facturas de bebidas alcohólicas es necesario indicar el registro fiscal de bebidas alcohólicas.
          </p>
          <FormField label="Número de Registro Fiscal de bebidas alcohólicas">
            <Input value={registroLicores} onChange={setRegistroLicores} placeholder="Opcional" />
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
