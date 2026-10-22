import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerDatosArticuloGT } from '@/lib/perfilPais';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await getDb();
  const campos: Record<string, string> = {
    precioUnitario: 'precio_unitario', unidadMedida: 'unidad_medida', nombre: 'nombre',
    actividadEconomica: 'actividad_economica', codigoInterno: 'codigo_interno', tipoCodigo: 'tipo_codigo',
    partidaArancelaria: 'partida_arancelaria', notas: 'notas', impuesto: 'impuesto', categoria: 'categoria', moneda: 'moneda',
    descripcionLarga: 'descripcion_larga', inventariable: 'inventariable', cantidadInicial: 'cantidad_inicial',
    cantidadMinima: 'cantidad_minima', costoUnitario: 'costo_unitario', bodega: 'bodega', cuentaIngreso: 'cuenta_ingreso',
    cuentaCosto: 'cuenta_costo', cuentaInventario: 'cuenta_inventario', imagen: 'imagen', activo: 'activo', grupoId: 'grupo_id', centroCosto: 'centro_costo', datosPais: 'datos_pais', codigoArticulo: 'codigo',
  };
  // Guatemala: el código del artículo es B (bien) o S (servicio)
  if (body.pais === 'GT' && body.datosPais !== undefined) body.codigoArticulo = leerDatosArticuloGT(String(body.datosPais)).bienServicio;
  if (body.grupoId) {
    const { rows } = await db.execute({ sql: 'SELECT nombre FROM grupos_productos WHERE id = ?', args: [String(body.grupoId)] });
    if (rows[0]) body.categoria = String(rows[0].nombre);
  }
  const numericos = ['precioUnitario', 'impuesto', 'cantidadInicial', 'cantidadMinima', 'costoUnitario'];
  const sets: string[] = [];
  const args: (string | number)[] = [];
  for (const [key, columna] of Object.entries(campos)) {
    if (key in body) {
      sets.push(`${columna} = ?`);
      args.push(numericos.includes(key) ? Number(body[key]) || 0 : key === 'inventariable' || key === 'activo' ? (body[key] ? 1 : 0) : String(body[key] ?? ''));
    }
  }
  if (sets.length > 0) {
    args.push(id);
    await db.execute({ sql: `UPDATE cabys_favoritos SET ${sets.join(', ')} WHERE id = ?`, args });
  }
  return NextResponse.json({ ok: true });
}

async function manejarDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM cabys_favoritos WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const PATCH = conPaisDeSolicitud(manejarPATCH);
export const DELETE = conPaisDeSolicitud(manejarDELETE);
