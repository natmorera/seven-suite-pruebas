'use client';
import { Section, InfoBox } from '@/components/ui/primitives';
import { C, FONT, radius } from '@/components/ui/tokens';
import { DataTable, DataRow, Td } from '@/components/ui/tabla';
import { impresionAlmacen } from '../datos/impresion';
import { Pagina } from './comun';
import { useAlmacen } from '../datos/almacen';

export default function TabAsignacion() {
  const datos = useAlmacen(impresionAlmacen);
  const habilitadas = datos.impresoras.filter(i => i.habilitada);
  const nombre = (id?: string) => datos.impresoras.find(i => i.id === id)?.nombre;
  function asignar(codigo: string, impresora: string) {
    impresionAlmacen.guardar(d => {
      const asignaciones = { ...d.asignaciones };
      if (impresora) asignaciones[codigo] = impresora; else delete asignaciones[codigo];
      return { ...d, asignaciones };
    });
  }
  return (
    <Pagina>
      <Section title="Configuración de impresoras" hint="Asigne una impresora a cada tipo de documento.">
        <InfoBox>Las impresoras disponibles son las registradas en la pestaña Impresoras para la empresa en el servidor de impresión.</InfoBox>
        <DataTable headers={['Tipo', 'Código', 'Impresora actual', 'Asignar']}>
          {datos.tipos.map(t => {
            const actual = datos.asignaciones[t.codigo];
            return (
              <DataRow key={t.codigo}>
                <Td><span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: C.n200, color: C.n900 }}>{t.nombre}</span></Td>
                <Td muted>{t.codigo}</Td>
                <Td muted={!nombre(actual)}>{nombre(actual) ?? 'Sin asignar'}</Td>
                <Td width="320px">
                  <select value={actual && nombre(actual) ? actual : ''} aria-label={`Impresora para ${t.nombre}`} onChange={e => asignar(t.codigo, e.target.value)}
                    style={{ width: '100%', height: 32, padding: '0 8px', border: `1px solid ${C.n500}`, borderRadius: radius.sm, fontSize: 12, fontFamily: FONT, background: C.n000, color: C.n900 }}>
                    <option value="">- Predeterminada del sistema -</option>
                    {habilitadas.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    {actual && !habilitadas.some(i => i.id === actual) && nombre(actual) && <option value={actual}>{nombre(actual)}</option>}
                  </select>
                </Td>
              </DataRow>
            );
          })}
        </DataTable>
      </Section>
    </Pagina>
  );
}
