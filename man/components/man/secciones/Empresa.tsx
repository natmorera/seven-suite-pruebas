'use client';
// Empresa: identificación y contacto de cada empresa del usuario (se elige en el header o en el menú). Es la fuente
// única que usan todos los módulos en facturas, reportes y correos.
import { Input, Select } from '@/components/suite/ui';
import { Campo, ConfigCard, Grid } from '@/components/kit';
import { JuntoAlTitulo } from '@/components/layout/Pantalla';
import { useElegirEmpresa, useEmpresa } from '@/components/layout/Shell';
import { useDato } from '../store';
import type { Empresa as TEmpresa } from '../tipos';

export const TIPOS_ID = ['Cédula física', 'Cédula jurídica', 'DIMEX', 'NITE', 'Pasaporte'];

/** País, moneda del país y zona horaria predeterminada. */
const PAISES: [string, string, string][] = [
  ['Costa Rica', '₡ Colón costarricense', 'America/Costa_Rica'], ['Panamá', 'B/. Balboa panameño', 'America/Panama'],
  ['Nicaragua', 'C$ Córdoba nicaragüense', 'America/Managua'], ['Guatemala', 'Q Quetzal guatemalteco', 'America/Guatemala'],
  ['Honduras', 'L Lempira hondureño', 'America/Tegucigalpa'], ['El Salvador', '$ Dólar estadounidense', 'America/El_Salvador'],
  ['México', '$ Peso mexicano', 'America/Mexico_City'], ['Colombia', '$ Peso colombiano', 'America/Bogota'],
  ['República Dominicana', 'RD$ Peso dominicano', 'America/Santo_Domingo'], ['Venezuela', 'Bs. Bolívar venezolano', 'America/Caracas'],
  ['Estados Unidos', '$ Dólar estadounidense', 'America/New_York'],
];
const ZONAS = [...new Set([...PAISES.map(p => p[2]), 'America/Chicago', 'America/Denver', 'America/Los_Angeles'])].sort();
const opciones = (xs: string[]) => [{ value: '', label: 'Seleccione' }, ...xs.map(x => ({ value: x, label: x }))];
const OBLIGATORIOS: (keyof TEmpresa)[] = ['nombreLegal', 'tipoId', 'numeroId', 'pais', 'zonaHoraria'];

export default function Empresa() {
  const empresa = useEmpresa();
  const elegir = useElegirEmpresa();
  const [todas, set] = useDato('empresas');
  const e = todas[empresa] ?? Object.values(todas)[0];
  const patch = (p: Partial<TEmpresa>) => set(prev => ({ ...prev, [empresa]: { ...prev[empresa], ...p } }));
  const error = (k: keyof TEmpresa) => (OBLIGATORIOS.includes(k) && !e[k].trim() ? 'Campo obligatorio' : undefined);
  const texto = (k: keyof TEmpresa, label: string, tipo = 'text', placeholder?: string) => (
    <Campo label={label} required={OBLIGATORIOS.includes(k)} error={error(k)}>
      <Input value={e[k]} type={tipo} placeholder={placeholder} error={error(k)} onChange={v => patch({ [k]: v } as Partial<TEmpresa>)} />
    </Campo>
  );
  const moneda = PAISES.find(p => p[0] === e.pais)?.[1] ?? '';
  const cambiarPais = (pais: string) => patch({ pais, zonaHoraria: PAISES.find(p => p[0] === pais)?.[2] ?? e.zonaHoraria });

  return (
    <>
      <JuntoAlTitulo>
        <label style={{ width: 200, display: 'block' }}>
          <span className="sr-only">Empresa</span>
          <Select value={empresa} onChange={elegir} options={Object.keys(todas).map(x => ({ value: x, label: x }))} />
        </label>
      </JuntoAlTitulo>
      <ConfigCard title="Identificación">
        <Grid cols={2} gap={16}>
          {texto('nombreLegal', 'Nombre legal')}
          {texto('nombreComercial', 'Nombre comercial')}
          <Campo label="Tipo de identificación" required error={error('tipoId')}>
            <Select value={e.tipoId} onChange={v => patch({ tipoId: v })} options={opciones(TIPOS_ID)} error={error('tipoId')} />
          </Campo>
          {texto('numeroId', 'Número de identificación')}
          <Campo label="País" required error={error('pais')}>
            <Select value={e.pais} onChange={cambiarPais} options={opciones(PAISES.map(p => p[0]))} error={error('pais')} />
          </Campo>
          <Campo label="Moneda del país"><Input value={moneda} disabled /></Campo>
          <Campo label="Zona horaria" required error={error('zonaHoraria')}>
            <Select value={e.zonaHoraria} onChange={v => patch({ zonaHoraria: v })} options={opciones(ZONAS)} error={error('zonaHoraria')} />
          </Campo>
        </Grid>
      </ConfigCard>
      <ConfigCard title="Contacto">
        <Grid cols={2} gap={16}>
          {texto('direccion', 'Dirección')}
          {texto('telefono', 'Teléfono', 'tel')}
          {texto('correo', 'Correo electrónico', 'email')}
          {texto('web', 'Sitio web', 'text', 'www.empresa.com')}
        </Grid>
      </ConfigCard>
    </>
  );
}
