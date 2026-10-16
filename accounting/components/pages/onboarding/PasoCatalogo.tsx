'use client';
// Paso «Plan de cuentas» del onboarding: usar el plan base, importarlo desde
// la plantilla o crearlo aquí mismo.
import { useRef } from 'react';
import { C } from '@/components/ui/tokens';
import { Button } from '@/components/ui/formulario';
import { type Cuenta } from '@/components/pages/catalogo/catalogoData';
import { armarPlan, posteablesConMoneda, type Nomenclatura } from './datos/plan';
import { descargarCsv, leerCsv, celda } from './datos/csv';
import EditorPlan, { type FilaEditor } from './EditorPlan';
import { Aviso, Errores, Opcion, TablaPlan } from './piezas';

export type ModoCatalogo = 'base' | 'importar' | 'crear';
export interface PlanSubido { archivo: string; cuentas: Cuenta[]; errores: string[]; total: number }

export default function PasoCatalogo({ modo, onModo, moneda, monedas, nom, base, subido, onSubido, filas, onFilas, plan, onError, cero }: {
  modo: ModoCatalogo; onModo: (m: ModoCatalogo) => void; moneda: string; monedas: string[]; nom: Nomenclatura;
  base: { cuentas: Cuenta[]; error: string | null }; subido: PlanSubido | null; onSubido: (s: PlanSubido) => void;
  filas: FilaEditor[]; onFilas: (f: FilaEditor[]) => void; plan: { cuentas: Cuenta[]; errores: string[] };
  onError: (e: string | null) => void; cero: (moneda?: string) => string;
}) {
  const archivoRef = useRef<HTMLInputElement>(null);
  const l = nom.longitudes;
  const codigo = (...s: string[]) => s.join(nom.separador);

  // Cuentas de ejemplo para empezar un plan propio, con la nomenclatura elegida
  function filasEjemplo(): FilaEditor[] {
    return [
      { id: 'e1', nivel: 'mayor', padre: '', segmento: '1'.padEnd(l.mayor, '0'), nombre: 'Efectivo y equivalentes', naturaleza: 'Deudora', posteable: false, moneda },
      { id: 'e2', nivel: 'submajor', padre: 'e1', segmento: '1'.padStart(l.submajor, '0'), nombre: 'Caja', naturaleza: 'Deudora', posteable: false, moneda },
      { id: 'e3', nivel: 'detalle', padre: 'e2', segmento: '1'.padStart(l.detalle, '0'), nombre: 'Caja general', naturaleza: 'Deudora', posteable: true, moneda },
      { id: 'e4', nivel: 'detalle', padre: 'e2', segmento: '2'.padStart(l.detalle, '0'), nombre: 'Caja chica', naturaleza: 'Deudora', posteable: true, moneda },
    ];
  }

  function bajarPlantilla() {
    const m = '1'.padEnd(l.mayor, '0'), s = '1'.padStart(l.submajor, '0');
    descargarCsv('plantilla-plan-de-cuentas.csv', [
      ['Código*', 'Nombre*', 'Naturaleza', 'Posteable', 'Moneda'],
      [codigo(m), 'Efectivo y equivalentes', 'Deudora', 'No', ''],
      [codigo(m, s), 'Caja', 'Deudora', 'No', ''],
      [codigo(m, s, '1'.padStart(l.detalle, '0')), 'Caja general', 'Deudora', 'Sí', moneda],
      [codigo(m, s, '2'.padStart(l.detalle, '0')), 'Caja chica', 'Deudora', 'Sí', moneda],
    ]);
  }

  async function subir(f: File) {
    onError(null);
    try {
      const filasCsv = await leerCsv(f);
      const r = armarPlan(filasCsv.map(x => ({
        codigo: celda(x, 'Código', 'Codigo'), nombre: celda(x, 'Nombre'), naturaleza: celda(x, 'Naturaleza'),
        posteable: celda(x, 'Posteable'), moneda: celda(x, 'Moneda'),
      })), nom, moneda);
      onSubido({ archivo: f.name, ...r });
    } catch { onError('No se pudo leer el archivo. Usa la plantilla en formato CSV.'); }
  }

  const vista = modo === 'base' ? (base.error ? [] : base.cuentas) : modo === 'importar' ? subido?.cuentas ?? [] : [];
  return (
    <>
      <div className="onb-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Opcion activo={modo === 'base'} onClick={() => onModo('base')} titulo="Usar el plan base" texto={`El plan del sistema, en ${moneda} y en cero.`} />
        <Opcion activo={modo === 'importar'} onClick={() => onModo('importar')} titulo="Importar mi plan" texto="Desde la plantilla (CSV, se abre en Excel)." />
        <Opcion activo={modo === 'crear'} onClick={() => { onModo('crear'); if (!filas.length) onFilas(filasEjemplo()); }} titulo="Crear mi plan" texto="Agrega tus cuentas aquí mismo." />
      </div>

      {modo === 'base' && base.error && <Aviso>{base.error}</Aviso>}

      {modo === 'importar' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={bajarPlantilla}>Descargar plantilla</Button>
          <input ref={archivoRef} type="file" accept=".csv,text/csv" aria-label="Archivo del plan de cuentas" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ''; }} />
          <Button onClick={() => archivoRef.current?.click()}>{subido ? 'Subir otro archivo' : 'Subir archivo'}</Button>
          {subido && <span style={{ fontSize: 12, color: C.n700 }}>{subido.archivo} · {subido.total} cuentas · {posteablesConMoneda(subido.cuentas)} posteables</span>}
        </div>
      )}
      {modo === 'importar' && subido && subido.errores.length > 0 && <Errores lista={subido.errores} />}

      {modo === 'crear' && (
        <EditorPlan filas={filas} onChange={onFilas} nom={nom} monedas={monedas} errores={plan.errores} posteables={posteablesConMoneda(plan.cuentas)} />
      )}

      {vista.length > 0 && <TablaPlan cuentas={vista} cero={cero} />}
    </>
  );
}
