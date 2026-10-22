'use client';
// Contexto contable para clasificar compras: cuentas de proveedores (nivel 4),
// cuentas de gasto/costo/inventario, artículos del inventario y lo aprendido
// de compras anteriores. Lo usan Importar, Crear (manual / Excel) y Acuse.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  claveMapeo, cuentasCompra, cuentasTerceros, sugerirCuentaLinea, sugerirCuentaTercero,
  type CuentaOpcion, type SugerenciaTercero, type TerceroFila,
} from '@/lib/cuentasContables';
import { segunPais } from '@/lib/paisActual';

export interface ArticuloInv { id: string; nombre?: string; descripcion: string; codigo: string; codigo_interno?: string; cuenta_inventario?: string; cuenta_costo?: string; inventariable?: number }

export interface ContextoCuentas {
  listo: boolean;
  proveedores: CuentaOpcion[];
  cuentasLinea: CuentaOpcion[];
  articulos: ArticuloInv[];
  sugerirProveedor: (nombre: string, identificacion: string) => SugerenciaTercero & { aprendida?: string };
  sugerirLinea: (identificacion: string, l: { codigo?: string; cabys?: string; detalle: string }, cuentaProveedorDefault?: string) => { cuenta: string; motivo: string; articuloId?: string };
  recargar: () => void;
}

export const MOTIVO_TXT: Record<string, string> = {
  get cedula() { return segunPais('Sugerida por cédula'); }, nombre: 'Sugerida por nombre', aprendida: 'Usada la última vez', palabra: 'Sugerida por la descripción', defecto: 'Cuenta por defecto',
};

export function useCuentasCompra(): ContextoCuentas {
  const [terceros, setTerceros] = useState<TerceroFila[]>([]);
  const [mapeo, setMapeo] = useState<Map<string, { cuenta: string; articulo_id: string | null }>>(new Map());
  const [articulos, setArticulos] = useState<ArticuloInv[]>([]);
  const [listo, setListo] = useState(false);
  const [v, setV] = useState(0);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      fetch('/api/clientes?tipo=proveedor').then(r => r.json()).catch(() => []),
      fetch('/api/compras-mapeo').then(r => r.json()).catch(() => []),
      fetch('/api/cabys-favoritos').then(r => r.json()).catch(() => []),
    ]).then(([t, m, a]) => {
      if (!vivo) return;
      setTerceros(t);
      setMapeo(new Map((m as { clave: string; cuenta: string; articulo_id: string | null }[]).map(x => [x.clave, x])));
      setArticulos(a);
      setListo(true);
    });
    return () => { vivo = false; };
  }, [v]);

  const proveedores = useMemo(() => cuentasTerceros('proveedor', terceros), [terceros]);
  const cuentasLinea = useMemo(() => cuentasCompra(), []);

  const sugerirProveedor = useCallback((nombre: string, identificacion: string) => {
    const aprendida = mapeo.get(claveMapeo(identificacion, '*', nombre))?.cuenta;
    if (aprendida && proveedores.some(p => p.code === aprendida)) {
      return { cuenta: proveedores.find(p => p.code === aprendida)!, motivo: 'cedula' as const, aprendida };
    }
    return sugerirCuentaTercero(nombre, identificacion, proveedores, 'proveedor');
  }, [mapeo, proveedores]);

  const sugerirLinea = useCallback((identificacion: string, l: { codigo?: string; cabys?: string; detalle: string }) => {
    const m = mapeo.get(claveMapeo(identificacion, l.codigo || l.cabys || '', l.detalle));
    const s = sugerirCuentaLinea(l.detalle, m?.cuenta);
    return { cuenta: s.cuenta, motivo: s.motivo, articuloId: m?.articulo_id ?? undefined };
  }, [mapeo]);

  return { listo, proveedores, cuentasLinea, articulos, sugerirProveedor, sugerirLinea, recargar: () => setV(x => x + 1) };
}
