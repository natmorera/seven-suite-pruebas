'use client';
// Campos de una sucursal: los mismos en Configuración › Sucursales y en el
// asistente inicial.
import { FormField, Input } from '@/components/ui/primitives';
import UbicacionCR, { type Ubicacion } from '@/components/ui/UbicacionCR';
import { usePaisEmpresa } from '@/lib/paisCliente';

export interface FormSucursal { codigo: string; nombre: string; ubicacion: Ubicacion; otrasSenas: string; telefono: string; correo: string }

export default function CamposSucursal({ form, patch, codigoEditable, hintCodigo, requerirDireccion }: {
  form: FormSucursal; patch: (p: Partial<FormSucursal>) => void; codigoEditable: boolean; hintCodigo?: string; requerirDireccion?: boolean;
}) {
  const { gt } = usePaisEmpresa();
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
      <FormField label="Código" required hint={hintCodigo}>
        <Input value={form.codigo} onChange={v => patch({ codigo: v.replace(/\D/g, '').slice(0, 3) })} readOnly={!codigoEditable} />
      </FormField>
      <FormField label="Nombre" required><Input value={form.nombre} onChange={v => patch({ nombre: v })} placeholder={gt ? 'Ej. Hotel Petén' : 'Ej. Hotel Arenal'} /></FormField>
    </div>
    <UbicacionCR value={form.ubicacion} onChange={u => patch({ ubicacion: u })} required={requerirDireccion} />
    <FormField label={gt ? 'Dirección' : 'Dirección exacta (otras señas)'} required={requerirDireccion}><Input value={form.otrasSenas} onChange={v => patch({ otrasSenas: v })} /></FormField>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <FormField label="Teléfono"><Input value={form.telefono} onChange={v => patch({ telefono: v })} /></FormField>
      <FormField label="Correo"><Input value={form.correo} onChange={v => patch({ correo: v })} type="email" /></FormField>
    </div>
  </>;
}
