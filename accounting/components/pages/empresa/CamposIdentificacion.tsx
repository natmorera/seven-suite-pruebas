'use client';
import { C, radius } from '@/components/ui/tokens';
import { FormField, Input, Select } from '@/components/ui/formulario';
import { IcWarning } from '@/components/ui/icons';
import MultiSelect from '@/components/ui/MultiSelect';
import { PAISES, TIPOS_ID, ZONAS_HORARIAS, MONEDAS_CONTABLES, paisPorCodigo } from './datos/paises';
import { type DatosEmpresa } from './datos/empresa';

type CamposEmpresa = Pick<DatosEmpresa, 'nombreLegal' | 'nombreComercial' | 'tipoId' | 'numeroId' | 'pais' | 'numeroLegalizacion' | 'citasPresentacion' | 'zonaHoraria'>;

// En el onboarding se eligen la moneda primaria y las secundarias en vez de mostrar la del país
interface MonedasEmpresa { primaria: string; secundarias: string[]; cambiar: (primaria: string, secundarias: string[]) => void }

export default function CamposIdentificacion({ config, patch, monedas }: {
  config: CamposEmpresa; patch: (p: Partial<CamposEmpresa>) => void; monedas?: MonedasEmpresa;
}) {
  const pais = paisPorCodigo(config.pais);
  const zonas = ZONAS_HORARIAS.some(z => z.value === config.zonaHoraria) || !config.zonaHoraria
    ? ZONAS_HORARIAS : [{ value: config.zonaHoraria, label: config.zonaHoraria }, ...ZONAS_HORARIAS];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <FormField label="Nombre legal" required>
        <Input value={config.nombreLegal} onChange={v => patch({ nombreLegal: v })} placeholder="Ej. Grand Horizon S.A." />
      </FormField>
      <FormField label="Nombre comercial">
        <Input value={config.nombreComercial} onChange={v => patch({ nombreComercial: v })} placeholder="Ej. Grand Horizon" />
      </FormField>
      <FormField label="Tipo de identificación" required>
        <Select value={config.tipoId} onChange={v => patch({ tipoId: v })} options={TIPOS_ID} />
      </FormField>
      <FormField label="Número de identificación" required>
        <Input value={config.numeroId} onChange={v => patch({ numeroId: v })} placeholder="Ej. 3101123456" />
      </FormField>
      <FormField label="País" required>
        <Select value={config.pais} onChange={v => patch({ pais: v, zonaHoraria: paisPorCodigo(v)?.zona ?? config.zonaHoraria })} options={PAISES} />
      </FormField>
      {monedas ? <>
        <FormField label="Moneda primaria" required>
          <Select value={monedas.primaria} onChange={v => monedas.cambiar(v, monedas.secundarias.filter(m => m !== v))} options={MONEDAS_CONTABLES} />
        </FormField>
        <FormField label="Monedas secundarias">
          <MultiSelect ariaLabel="Monedas secundarias" value={monedas.secundarias} onChange={v => monedas.cambiar(monedas.primaria, v)}
            options={MONEDAS_CONTABLES.filter(m => m.value !== monedas.primaria)} />
        </FormField>
        <div role="note" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: radius.md, background: C.brandBg, border: `1px solid ${C.brandBd}`, color: C.brandDk, fontSize: 12, fontWeight: 500 }}>
          <IcWarning className="w-4 h-4" />
          La moneda primaria no se puede cambiar después de registrar asientos.
        </div>
      </> : (
        <FormField label="Moneda del país">
          <Input value={pais ? `${pais.simbolo} ${pais.monedaNombre}` : '-'} readOnly />
        </FormField>
      )}
      <FormField label="No. de legalización" hint="Número de legalización de los libros contables.">
        <Input value={config.numeroLegalizacion} onChange={v => patch({ numeroLegalizacion: v })} placeholder="Ej. 4065000000158" />
      </FormField>
      <FormField label="Citas de presentación" hint="Tomo y asiento de presentación ante el Registro Nacional.">
        <Input value={config.citasPresentacion} onChange={v => patch({ citasPresentacion: v })} placeholder="Ej. Tomo: 535  Asiento: 7591" />
      </FormField>
      <FormField label="Zona horaria" required>
        <Select value={config.zonaHoraria} onChange={v => patch({ zonaHoraria: v })} options={zonas} />
      </FormField>
    </div>
  );
}
