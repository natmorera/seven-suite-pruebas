'use client';
// Campo de cuenta contable para formularios (configuración, factura de
// compra, productos…). Usa el selector único de la suite (SelectorCuenta),
// el mismo del Analítico de cuentas. Solo se pueden elegir cuentas que
// aceptan asientos (detalle o auxiliar).
import { useMemo } from 'react';
import { useModulos } from '@/lib/modulosCliente';
import SelectorCuenta from '@/components/ui/SelectorCuenta';
import { arbolCuentas } from '@/lib/cuentasContables';
import { useCatalogo, catalogoActual } from '@/components/pages/catalogo/catalogoStore';
import { GRUPOS_NIIF } from '@/components/pages/catalogo/catalogoData';

// El árbol sale del catálogo guardado (se actualiza si alguien lo cambia)
let arbolCache: { de: unknown; arbol: ReturnType<typeof arbolCuentas> } | null = null;
function arbolDe(catalogo: ReturnType<typeof catalogoActual>) {
  if (!arbolCache || arbolCache.de !== catalogo) arbolCache = { de: catalogo, arbol: arbolCuentas(catalogo) };
  return arbolCache.arbol;
}

export function nombreDeCuenta(code: string) {
  return arbolDe(catalogoActual()).find(c => c.code === code)?.nombre ?? '';
}

export function CuentaCampo({ value, onChange, titulo, grupoInicial, opcional, error }: {
  value: string; onChange: (code: string) => void; titulo: string; grupoInicial?: string; opcional?: boolean; error?: string;
}) {
  // Solo facturación (sin Contabilidad): no se piden cuentas
  const { contabilidad } = useModulos();
  const arbol = arbolDe(useCatalogo());
  const opciones = useMemo(() => arbol.filter(c => c.posteable).map(c => ({ code: c.code, nombre: c.nombre, nivel: c.nivel, grupo: c.grupo, ruta: c.ruta })), [arbol]);
  // Solo el grupo sugerido (p. ej. 6 · Gastos) y «Todos los grupos», como un chip más
  const grupos = useMemo(() => GRUPOS_NIIF.filter(g => g.value === grupoInicial).map(g => ({ value: g.value, label: g.label })), [grupoInicial]);
  if (!contabilidad) return null;
  return (
    <SelectorCuenta titulo={titulo} value={value} onChange={code => onChange(code)} opciones={opciones}
      grupos={grupoInicial ? grupos : undefined} grupoInicial={grupoInicial} opcional={opcional} error={error} />
  );
}
