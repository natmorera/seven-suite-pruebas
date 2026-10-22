// Notificaciones de la suite que ve el usuario en la campana del menú: se calculan con el estado actual del MAN
// (servicios y enlaces con error, conexiones pendientes, contraseñas por cambiar, tipo de cambio del día).
import { hoy } from '@/components/kit/fechas';
import { MODULOS_INTEGRABLES, nombreModulo, PERFILES_DE } from './catalogo';
import type { Datos } from './inicial';

export interface Aviso { id: string; titulo: string; detalle: string; ruta: string; tono: 'error' | 'aviso' }

export function avisosDe(d: Datos): Aviso[] {
  const out: Aviso[] = [];
  for (const s of d.servicios.filter(x => x.activo && x.estado === 'Con error'))
    out.push({ id: 'sv-' + s.id, titulo: `Servicio con error: ${s.nombre}`, detalle: s.mensaje || `${nombreModulo(s.modulo)} · ${s.base}`, ruta: '/estructura/servicios', tono: 'error' });
  for (const e of d.enlaces.filter(x => x.activo && x.estado === 'Con error'))
    out.push({ id: 'en-' + e.id, titulo: 'Enlace con error', detalle: `${nombreModulo(e.origen)} → ${nombreModulo(e.destino)}`, ruta: '/modulos?tab=enlaces', tono: 'error' });
  for (const c of d.conexiones.filter(x => x.apiKey && x.estado === 'Error'))
    out.push({ id: 'cx-' + c.id, titulo: `No se pudo conectar con ${nombreModulo(c.modulo)}`, detalle: 'Revisa su conexión.', ruta: MODULOS_INTEGRABLES.includes(c.modulo) ? `/modulos?modulo=${c.modulo}` : '/modulos', tono: 'error' });
  for (const m of d.modulos.filter(x => x.contratado && MODULOS_INTEGRABLES.includes(x.codigo) && !d.conexiones.some(c => c.modulo === x.codigo && c.apiKey)))
    out.push({ id: 'sc-' + m.id, titulo: `${nombreModulo(m.codigo)} sin conectar`, detalle: 'Falta integrarlo con el MAN.', ruta: `/modulos?modulo=${m.codigo}`, tono: 'aviso' });
  for (const c of d.conexiones.filter(x => PERFILES_DE[x.modulo] && x.estado === 'Conectada' && !x.ultimaSync))
    out.push({ id: 'ps-' + c.id, titulo: `Perfiles de ${nombreModulo(c.modulo)} sin sincronizar`, detalle: `Trae sus ${PERFILES_DE[c.modulo]?.texto} a Perfiles.`, ruta: `/modulos?modulo=${c.modulo}`, tono: 'aviso' });
  for (const e of d.entidades.filter(x => x.activo)) {
    const n = e.bases.filter(b => b.base && b.estado === 'Error').length;
    if (n) out.push({ id: 'bd-' + e.id, titulo: `Bases de datos con error en ${e.descripcion}`, detalle: `${n} sin conexión.`, ruta: '/modulos/entidades', tono: 'error' });
  }
  const pendientes = d.usuarios.filter(u => u.activo && u.cambiarClave);
  if (pendientes.length) out.push({ id: 'cl', titulo: 'Usuarios que deben cambiar su contraseña', detalle: pendientes.map(u => u.usuario).join(', '), ruta: '/usuarios', tono: 'aviso' });
  const divisas = d.monedas.filter(m => !m.principal && m.activo).map(m => m.codigo);
  const sinTasa = divisas.filter(c => !d.tiposCambio.some(t => t.moneda === c && t.fecha === hoy()));
  if (sinTasa.length) out.push({ id: 'tc-' + hoy(), titulo: 'Tipo de cambio de hoy sin registrar', detalle: sinTasa.join(', '), ruta: '/parametros?tab=tipo-de-cambio', tono: 'aviso' });
  return out;
}
