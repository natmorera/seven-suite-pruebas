'use client';
// Guatemala: qué unidades gravables están activas (Configuración › Unidades
// gravables). Las inactivas no se ofrecen al crear artículos ni líneas; la que
// ya tiene un artículo o una línea se sigue mostrando.
import { useEffect, useState } from 'react';
import { usePaisEmpresa } from '@/lib/paisCliente';
import { type UnidadGravableGT } from '@/lib/unidadesGravablesGT';

export function useUnidadesGravablesActivas() {
  const { gt } = usePaisEmpresa();
  const [lista, setLista] = useState<UnidadGravableGT[] | null>(null);
  useEffect(() => {
    if (!gt) return;
    let vivo = true;
    fetch('/api/gt/unidades-gravables').then(r => r.json()).then(d => { if (vivo && Array.isArray(d)) setLista(d); }).catch(() => {});
    return () => { vivo = false; };
  }, [gt]);
  // Mientras carga (o si la unidad no está en el catálogo) se considera activa
  return (impuesto: number, codigo: number) => !lista || lista.find(u => u.impuesto === impuesto && u.codigo === codigo)?.activo !== false;
}
