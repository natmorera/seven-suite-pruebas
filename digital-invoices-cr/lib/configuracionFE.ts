// Qué le falta a la empresa para emitir comprobantes electrónicos. Lo usan la
// lista «Configura la facturación electrónica», los avisos de Ventas y de la
// factura, y el Dashboard.
import type { Client } from '@libsql/client';
import { leerEmpresa } from '@/lib/empresa';

export interface PasoConfig {
  id: string;
  titulo: string;
  detalle: string;
  listo: boolean;
  obligatorio: boolean;   // sin esto no se puede emitir
  href: string;           // dónde se completa
  manual?: boolean;       // se puede marcar como listo con «Completar»
}
export interface EstadoConfigFE { activa: boolean; pasos: PasoConfig[]; faltanObligatorios: number; completos: number }

export async function estadoConfiguracionFE(db: Client): Promise<EstadoConfigFE> {
  const empresa = await leerEmpresa(db) as { facturacionElectronica?: string; emisorId?: string };
  const activa = empresa.facturacionElectronica === 'si' || (empresa.facturacionElectronica !== 'no' && Boolean(empresa.emisorId));
  const { rows: em } = await db.execute('SELECT * FROM emisores ORDER BY activo DESC LIMIT 1');
  const e = em[0] ?? {};
  let actividades: unknown[] = [];
  try { actividades = e.actividades_json ? JSON.parse(String(e.actividades_json)) : []; } catch { actividades = []; }
  const emisorId = String(e.id ?? '');
  const n = async (sql: string) => Number((await db.execute({ sql, args: [emisorId] })).rows[0]?.n ?? 0);
  const sucursales = emisorId ? await n('SELECT COUNT(*) AS n FROM sucursales WHERE emisor_id = ? AND COALESCE(activa, 1) = 1') : 0;
  const cajas = emisorId ? await n('SELECT COUNT(*) AS n FROM cajas WHERE emisor_id = ? AND COALESCE(activa, 1) = 1') : 0;
  const productos = Number((await db.execute('SELECT COUNT(*) AS n FROM cabys_favoritos WHERE COALESCE(activo, 1) = 1')).rows[0]?.n ?? 0);
  const tiene = (v: unknown) => Boolean(String(v ?? '').trim());
  // Pasos marcados como listos a mano (en este prototipo no hay credenciales reales de Hacienda)
  const { rows: meta } = await db.execute(`SELECT clave FROM app_meta WHERE clave LIKE 'fe_paso_manual_%'`);
  const manual = new Set(meta.map(r => String(r.clave).replace('fe_paso_manual_', '')));

  const pasos: PasoConfig[] = [
    { id: 'empresa', titulo: 'Datos de la empresa', detalle: 'Nombre legal, cédula y teléfono.', obligatorio: true,
      listo: tiene(e.razon_social) && tiene(e.cedula_juridica), href: '/empresa' },
    { id: 'actividad', titulo: 'Actividad económica', detalle: 'La que tienes inscrita en Hacienda; va en cada comprobante.', obligatorio: true,
      listo: actividades.length > 0 || tiene(e.actividad_economica), href: '/empresa?tab=tributaria#actividades' },
    { id: 'ubicacion', titulo: 'Dirección y correo', detalle: 'Provincia, cantón, distrito, otras señas y el correo para comprobantes.', obligatorio: true,
      listo: tiene(e.provincia) && tiene(e.canton) && tiene(e.distrito) && tiene(e.otras_senas) && tiene(e.correo_electronico), href: '/empresa?tab=tributaria#direccion' },
    { id: 'llave', titulo: 'Llave criptográfica', detalle: 'El archivo .p12 y su PIN para firmar los comprobantes.', obligatorio: true,
      listo: Number(e.llave_cargada ?? 0) === 1, href: '/empresa?tab=tributaria#llave' },
    { id: 'credenciales', titulo: 'Usuario y contraseña de Hacienda', detalle: 'Para enviar los comprobantes y consultar su estado.', obligatorio: true,
      listo: (tiene(e.usuario_hacienda) && tiene(e.clave_hacienda)) || manual.has('credenciales'), href: '/empresa?tab=tributaria#credenciales', manual: true },
    { id: 'sucursal', titulo: 'Sucursal', detalle: 'Al menos una sucursal activa.', obligatorio: true,
      listo: sucursales > 0, href: '/facturacion-config?tab=sucursales' },
    { id: 'caja', titulo: 'Caja o terminal', detalle: 'Desde donde se emite y lleva su numeración.', obligatorio: true,
      listo: cajas > 0, href: '/facturacion-config?tab=cajas' },
    { id: 'productos', titulo: 'Productos o servicios', detalle: 'Recomendado: así cada línea trae su CABYS, IVA y precio.', obligatorio: false,
      listo: productos > 0, href: '/facturacion-config?tab=productos' },
  ];
  return { activa, pasos, faltanObligatorios: pasos.filter(p => p.obligatorio && !p.listo).length, completos: pasos.filter(p => p.listo).length };
}
