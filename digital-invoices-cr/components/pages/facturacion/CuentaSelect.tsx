'use client';
// Selector de cuenta contable para compras: cuenta nivel 4 del proveedor o
// cliente y cuenta de cada línea. Usa el selector único de la suite
// (SelectorCuenta, el del Analítico de cuentas). Si se le pasa `nueva`,
// ofrece arriba «Crear cuenta auxiliar …» para un tercero sin cuenta.
import SelectorCuenta from '@/components/ui/SelectorCuenta';
import type { CuentaOpcion } from '@/lib/cuentasContables';

export default function CuentaSelect({ value, opciones, nueva, onChange, placeholder = 'Buscar cuenta', compacto, sugerencia, ancho }: {
  value: string;
  opciones: CuentaOpcion[];
  nueva?: CuentaOpcion | null;
  onChange: (code: string, esNueva: boolean) => void;
  placeholder?: string;
  compacto?: boolean;
  sugerencia?: string;       // texto corto debajo: "por cédula", "aprendida"…
  ancho?: number;
}) {
  return <SelectorCuenta value={value} opciones={opciones} nueva={nueva} onChange={onChange} placeholder={placeholder} compacto={compacto} sugerencia={sugerencia} ancho={ancho} />;
}
