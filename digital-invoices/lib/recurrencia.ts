// Frecuencias de las facturas recurrentes y cálculo de la siguiente fecha.
export const FRECUENCIAS = [
  { value: 'semanal', label: 'Cada semana' },
  { value: 'quincenal', label: 'Cada 15 días' },
  { value: 'mensual', label: 'Cada mes' },
  { value: 'bimestral', label: 'Cada 2 meses' },
  { value: 'trimestral', label: 'Cada 3 meses' },
  { value: 'semestral', label: 'Cada 6 meses' },
  { value: 'anual', label: 'Cada año' },
];
export const labelFrecuencia = (f: string) => FRECUENCIAS.find(x => x.value === f)?.label ?? f;

export function siguienteFecha(desde: string, frecuencia: string): string {
  const d = new Date(desde + 'T12:00:00');
  const meses: Record<string, number> = { mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
  if (frecuencia === 'semanal') d.setDate(d.getDate() + 7);
  else if (frecuencia === 'quincenal') d.setDate(d.getDate() + 15);
  else d.setMonth(d.getMonth() + (meses[frecuencia] ?? 1));
  return d.toISOString().slice(0, 10);
}
