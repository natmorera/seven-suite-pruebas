'use client';
import { useRef, useState } from 'react';
import { C, radius } from '@/components/suite/tokens';
import { Button, StatusBadge } from '@/components/suite/ui';
import { Aviso, ConfigCard, Grid, descargarCSV, leerCSV } from '../kit';

const TIPOS = [
  { id: 'tipos-hab', titulo: 'Tipos de habitación', sub: 'Tipos y características', cols: ['Código', 'Descripción', 'Características (separadas por |)'] },
  { id: 'habitaciones', titulo: 'Habitaciones', sub: 'Código, grupo y características', cols: ['Código', 'Tipo', 'Grupo de disponibilidad', 'Características (separadas por |)', 'Adultos', 'Niños'] },
  { id: 'servicios', titulo: 'Servicios de facturación', sub: 'Códigos y conceptos de producción', cols: ['Código', 'Nombre', 'Concepto de producción', 'Moneda', 'Precio', 'Impuestos (separados por |)'] },
  { id: 'servicios-agencia', titulo: 'Servicios de agencia', sub: 'Por tipo de habitación y agencia', cols: ['Código', 'Nombre', 'Habitación', 'Régimen', 'Tipo'] },
  { id: 'perfiles', titulo: 'Perfiles', sub: 'Clientes, empresas y agencias', cols: ['Tipo (Cliente/Empresa/Agencia)', 'Nombre', 'Identificación', 'Correo', 'Teléfono', 'País'] },
  { id: 'contratos', titulo: 'Contratos', sub: 'Tarifas por agencia o mercado', cols: ['Nombre', 'Agencia', 'Mercado', 'Desde (AAAA-MM-DD)', 'Hasta (AAAA-MM-DD)', 'Tipo de habitación', 'Tarifa'] },
  { id: 'reservas', titulo: 'Reservas', sub: 'Migración desde sistema anterior', cols: ['Número', 'Huésped', 'Llegada (AAAA-MM-DD)', 'Salida (AAAA-MM-DD)', 'Tipo de habitación', 'Adultos', 'Niños', 'Tarifa', 'Agencia'] },
];

type Resultado = { archivo: string; filas: number; errores: string[] };

export default function ImportarDocumentos() {
  const [res, setRes] = useState<Record<string, Resultado>>({});
  const [activo, setActivo] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const procesar = async (id: string, f: File) => {
    const tipo = TIPOS.find(t => t.id === id)!;
    if (!/\.(csv)$/i.test(f.name)) {
      setRes(r => ({ ...r, [id]: { archivo: f.name, filas: 0, errores: ['Guardá la plantilla como CSV (Excel → Guardar como → CSV UTF-8) e importala de nuevo.'] } }));
      return;
    }
    const [cab, ...filas] = await leerCSV(f);
    const errores: string[] = [];
    if (!cab || cab.length < tipo.cols.length || cab[0].trim().toLowerCase() !== tipo.cols[0].toLowerCase()) errores.push('Las columnas no coinciden con la plantilla.');
    filas.forEach((r, i) => { if (!r[0]?.trim()) errores.push(`Fila ${i + 2}: falta «${tipo.cols[0]}».`); });
    setRes(r => ({ ...r, [id]: { archivo: f.name, filas: errores.length ? 0 : filas.length, errores: errores.slice(0, 4) } }));
  };

  return (
    <ConfigCard title="Importar documentos" subtitle="Carga masiva desde Excel para catálogos maestros del PMS">
      <Aviso>Descargá la plantilla, completá los datos y cargá el archivo. Los registros existentes no se sobrescriben automáticamente.</Aviso>
      <Grid cols={3}>
        {TIPOS.map(t => {
          const r = res[t.id];
          return (
            <div key={t.id} style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{t.titulo}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: C.n700 }}>{t.sub}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={() => descargarCSV(`plantilla-${t.id}.csv`, [t.cols])}>Plantilla</Button>
                <Button onClick={() => { setActivo(t.id); input.current?.click(); }}>Importar</Button>
              </div>
              {r && (
                <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.archivo}</span>
                  {r.errores.length === 0
                    ? <StatusBadge color="green" label={`${r.filas} registros listos para importar`} />
                    : r.errores.map(e => <span key={e} style={{ fontSize: 11, color: C.error }}>{e}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </Grid>
      <input ref={input} type="file" accept=".csv,.xlsx,.xls" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f && activo) procesar(activo, f); e.target.value = ''; }} />
    </ConfigCard>
  );
}
