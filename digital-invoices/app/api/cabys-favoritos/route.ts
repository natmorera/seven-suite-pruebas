import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buscarCabys, CABYS } from '@/data/cabysData';
import { consultarCabysHacienda } from '@/lib/cabysHacienda';
import { leerDatosArticuloGT } from '@/lib/perfilPais';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  const db = await getDb();
  const { rows } = await db.execute(`SELECT * FROM cabys_favoritos ORDER BY COALESCE(NULLIF(categoria, ''), 'zzz'), COALESCE(NULLIF(nombre, ''), descripcion)`);
  return NextResponse.json(rows);
}

// Campos que se pueden guardar desde el formulario (rápido o avanzado).
const CAMPOS_ITEM: Record<string, string> = {
  precioUnitario: 'precio_unitario', unidadMedida: 'unidad_medida', nombre: 'nombre',
  actividadEconomica: 'actividad_economica', codigoInterno: 'codigo_interno', tipoCodigo: 'tipo_codigo',
  partidaArancelaria: 'partida_arancelaria', notas: 'notas', impuesto: 'impuesto', categoria: 'categoria', moneda: 'moneda',
  descripcionLarga: 'descripcion_larga', inventariable: 'inventariable', cantidadInicial: 'cantidad_inicial',
  cantidadMinima: 'cantidad_minima', costoUnitario: 'costo_unitario', bodega: 'bodega', cuentaIngreso: 'cuenta_ingreso',
  cuentaCosto: 'cuenta_costo', cuentaInventario: 'cuenta_inventario', imagen: 'imagen', activo: 'activo', grupoId: 'grupo_id', centroCosto: 'centro_costo', datosPais: 'datos_pais',
};
function valor(k: string, v: unknown): string | number {
  if (['precioUnitario', 'impuesto', 'cantidadInicial', 'cantidadMinima', 'costoUnitario'].includes(k)) return Number(v) || 0;
  if (k === 'inventariable' || k === 'activo') return v ? 1 : 0;
  return String(v ?? '');
}

// Alta de un ítem. Dos formas:
//  - `codigo` de 13 dígitos (formulario avanzado / Excel): se usa tal cual; la
//    descripción oficial sale del catálogo si está, o de `descripcionCabys`.
//  - `busqueda` (formulario rápido): se busca en el catálogo CABYS.
async function manejarPOST(req: NextRequest) {
  const body = await req.json();
  let codigo = '', descripcion = '', impuesto = 13;
  const cod = String(body.codigo ?? '').replace(/\D/g, '');
  if (body.pais === 'GT') {
    // Guatemala no usa CABYS: el artículo se clasifica como bien (B) o servicio (S)
    const gt = leerDatosArticuloGT(typeof body.datosPais === 'string' ? body.datosPais : JSON.stringify(body.datosPais ?? {}));
    codigo = gt.bienServicio; descripcion = String(body.nombre || 'Bien o servicio'); impuesto = gt.unidadIva === 1 ? 12 : 0;
  } else if (cod.length === 13) {
    let cat: { descripcion: string; impuesto: number } | undefined = CABYS.find(c => c.codigo === cod);
    // Código fuera del catálogo local y sin descripción: se pide a Hacienda.
    if (!cat && !body.descripcionCabys) cat = (await consultarCabysHacienda({ codigo: cod }).catch(() => []))[0];
    codigo = cod; descripcion = cat?.descripcion ?? String(body.descripcionCabys || body.nombre || 'Bien o servicio');
    impuesto = cat?.impuesto ?? 13;
  } else {
    const encontrado = buscarCabys(body.busqueda ?? '')[0];
    if (!encontrado) return NextResponse.json({ error: 'No se encontró ningún bien o servicio con ese código o descripción.' }, { status: 400 });
    ({ codigo, descripcion, impuesto } = encontrado);
  }
  if (body.impuesto !== undefined && body.impuesto !== null && body.impuesto !== '') impuesto = Number(body.impuesto);

  const db = await getDb();
  // Con grupo, la categoría es el nombre del grupo.
  if (body.grupoId) {
    const { rows } = await db.execute({ sql: 'SELECT nombre FROM grupos_productos WHERE id = ?', args: [String(body.grupoId)] });
    if (rows[0]) body.categoria = String(rows[0].nombre);
  }
  const id = 'fav-' + Math.random().toString(36).slice(2);
  const cols = ['id', 'codigo', 'descripcion', 'impuesto'];
  const args: (string | number)[] = [id, codigo, descripcion, impuesto];
  for (const [k, col] of Object.entries(CAMPOS_ITEM)) {
    if (k === 'impuesto' || !(k in body)) continue;
    cols.push(col); args.push(valor(k, body[k]));
  }
  await db.execute({ sql: `INSERT INTO cabys_favoritos (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, args });
  return NextResponse.json({ id, codigo, descripcion });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
