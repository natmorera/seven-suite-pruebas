'use client';
// Pantalla propia del formulario de producto/servicio (nuevo o edición).
// Viene de Facturación electrónica → Productos/Servicios y vuelve ahí al
// guardar o cancelar. Si se abrió desde una factura (?volver=factura), al
// guardar regresa a la factura con el producto ya puesto en la línea.
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { C, PAGE_PAD } from '@/components/ui/primitives';
import InventarioAvanzado, { type ItemInventario, type FormProducto } from './InventarioAvanzado';
import { urlVolverAFactura } from './facturaEnCurso';

export const CLAVE_BORRADOR = 'producto-borrador';
export const CLAVE_AVISO = 'productos-aviso';

function leerBorrador(): Partial<FormProducto> | undefined {
  try {
    const t = sessionStorage.getItem(CLAVE_BORRADOR);
    sessionStorage.removeItem(CLAVE_BORRADOR);
    return t ? JSON.parse(t) : undefined;
  } catch { return undefined; }
}

export default function ProductoPantalla() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const desdeFactura = params.get('volver') === 'factura';
  const [estado, setEstado] = useState<{ item: ItemInventario | null; borrador?: Partial<FormProducto> } | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (id ? fetch('/api/cabys-favoritos').then(r => r.json()) : Promise.resolve([])).then((items: ItemInventario[]) => {
      if (!vivo) return;
      const item = id ? items.find(x => x.id === id) ?? null : null;
      if (id && !item) { setNoEncontrado(true); return; }
      setEstado({ item, borrador: id ? undefined : leerBorrador() });
    });
    return () => { vivo = false; };
  }, [id]);

  const volver = (aviso?: string, articuloId?: string) => {
    const aFactura = desdeFactura ? urlVolverAFactura(articuloId) : null;
    if (aFactura) { router.push(aFactura); return; }
    try { if (aviso) sessionStorage.setItem(CLAVE_AVISO, aviso); } catch { /* sin aviso */ }
    router.push('/facturacion-config?tab=productos');
  };

  if (noEncontrado) return <p style={{ padding: PAGE_PAD, fontSize: 12, color: C.n700 }}>No se encontró el producto. <a href="/facturacion-config?tab=productos" style={{ color: C.brand }}>Volver a Productos/Servicios</a></p>;
  if (!estado) return <p style={{ padding: PAGE_PAD, fontSize: 12, color: C.n700 }}>Cargando…</p>;
  return <InventarioAvanzado item={estado.item} borrador={estado.borrador} onCancelar={() => volver()} onGuardado={volver} desdeFactura={desdeFactura} />;
}
