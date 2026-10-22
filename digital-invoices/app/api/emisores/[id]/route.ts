import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { configPlan } from '@/lib/plan';
import type { InValue } from '@libsql/client';
import { PROVINCIAS } from '@/data/divisionTerritorial';
import { esUbicacionGT, nombreDepartamento } from '@/lib/perfilPais';
import { emisorPublico } from '@/lib/emisorPublico';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT * FROM emisores WHERE id = ?', args: [id] });
  if (!rows[0]) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(emisorPublico(rows[0] as unknown as Record<string, unknown>));
}

const CAMPOS: Record<string, string> = {
  razonSocial: 'razon_social', nombreComercial: 'nombre_comercial', tipoIdentificacion: 'tipo_identificacion',
  cedulaJuridica: 'cedula_juridica', regimen: 'regimen', correoElectronico: 'correo_electronico', telefono: 'telefono',
  registroBebidasAlcoholicas: 'registro_bebidas_alcoholicas', provincia: 'provincia', canton: 'canton', distrito: 'distrito',
  barrio: 'barrio', otrasSenas: 'otras_senas', correosAdicionales: 'correos_adicionales', alias: 'alias',
  registroBebidas: 'registro_bebidas', registroBebidasVence: 'registro_bebidas_vence',
  usuarioHacienda: 'usuario_hacienda', ambiente: 'ambiente', direccionFiscal: 'direccion_fiscal',
};

async function manejarPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (body.ambiente === 'pruebas' && !configPlan().permitirPruebas) {
    return NextResponse.json({ error: 'El ambiente de pruebas no está disponible en producción.' }, { status: 400 });
  }
  const db = await getDb();
  const campos: string[] = [];
  const args: InValue[] = [];
  const set = (col: string, v: InValue) => { campos.push(`${col} = ?`); args.push(v); };
  for (const [k, col] of Object.entries(CAMPOS)) if (k in body) set(col, body[k] ?? null);
  if (body.claveHacienda) set('clave_hacienda', String(body.claveHacienda));

  // Actividades: lista completa; la principal además queda en la columna
  // que ya usan la factura, el XML y los reportes.
  if (Array.isArray(body.actividades)) {
    const acts = body.actividades as { codigo: string; nombre: string; principal?: boolean }[];
    set('actividades_json', JSON.stringify(acts));
    const principal = acts.find(a => a.principal) ?? acts[0];
    if (principal) set('actividad_economica', `${principal.codigo} - ${principal.nombre}`);
  }
  // Dirección legible para el PDF y los listados, armada desde los códigos.
  if ('provincia' in body && !('direccionFiscal' in body) && esUbicacionGT(body.provincia)) {
    set('direccion_fiscal', [body.otrasSenas, body.canton, nombreDepartamento(String(body.provincia)), body.distrito].filter(Boolean).join(', '));
  } else if ('provincia' in body && !('direccionFiscal' in body)) {
    const p = PROVINCIAS[body.provincia];
    const c = p?.cantones[body.canton];
    const d = c?.distritos[body.distrito];
    set('direccion_fiscal', [p?.nombre, c?.nombre, d, body.barrio, body.otrasSenas].filter(Boolean).join(', '));
  }
  if (!campos.length) return NextResponse.json({ ok: true });
  args.push(id);
  await db.execute({ sql: `UPDATE emisores SET ${campos.join(', ')} WHERE id = ?`, args });
  // MVP: una sola sucursal (001), que usa la dirección y el contacto del emisor.
  const { rows } = await db.execute({ sql: 'SELECT provincia, canton, distrito, otras_senas, telefono, correo_electronico FROM emisores WHERE id = ?', args: [id] });
  const e = rows[0];
  if (e) {
    await db.execute({
      sql: `UPDATE sucursales SET provincia = ?, canton = ?, distrito = ?, otras_senas = ?, telefono = ?, correo = ? WHERE emisor_id = ? AND codigo = '001'`,
      args: [e.provincia ?? '', e.canton ?? '', e.distrito ?? '', e.otras_senas ?? '', e.telefono ?? '', e.correo_electronico ?? '', id],
    });
  }
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PATCH = conPaisDeSolicitud(manejarPATCH);
