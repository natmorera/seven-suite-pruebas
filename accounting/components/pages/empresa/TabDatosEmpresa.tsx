'use client';
import { Section } from '@/components/ui/primitives';
import { FormField, Input } from '@/components/ui/formulario';
import CamposIdentificacion from './CamposIdentificacion';
import { type DatosEmpresa } from './datos/empresa';

export default function TabDatosEmpresa({ config, patch }: { config: DatosEmpresa; patch: (p: Partial<DatosEmpresa>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Identificación" hint="Datos legales y fiscales de la empresa.">
        <CamposIdentificacion config={config} patch={patch} />
      </Section>

      <Section title="Contacto" hint="Información de contacto de la empresa.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormField label="Dirección">
            <Input value={config.direccion} onChange={v => patch({ direccion: v })} placeholder="Dirección física" />
          </FormField>
          <FormField label="Teléfono">
            <Input value={config.telefono} onChange={v => patch({ telefono: v })} placeholder="+506 2222-3333" />
          </FormField>
          <FormField label="Correo electrónico">
            <Input type="email" value={config.email} onChange={v => patch({ email: v })} placeholder="contabilidad@empresa.com" />
          </FormField>
          <FormField label="Sitio web">
            <Input value={config.web} onChange={v => patch({ web: v })} placeholder="www.empresa.com" />
          </FormField>
        </div>
      </Section>

    </div>
  );
}
