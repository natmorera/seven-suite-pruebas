// Bitácora de seguridad de ejemplo: eventos de hoy y de los días anteriores para probar filtros y exportación.
import type { EventoBitacora, ModuloId } from '../tipos';

const EVENTOS: [ModuloId, string, string, string][] = [
  ['FDK', 'Reservaciones', 'Crear reserva', 'Reserva 4824 creada'],
  ['FDK', 'Facturación', 'Cerrar turno', 'Turno de caja cerrado con diferencia ₡0'],
  ['FDK', 'Configuración', 'Editar tarifas', 'Actualización colectiva de 12 tarifas'],
  ['ACC_DICR', 'Asientos', 'Aprobar asiento', 'Asiento 202610000030 aprobado'],
  ['ACC_DICR', 'Configuración', 'Editar consecutivo', 'Formato de Cobros cambiado a GC-{N:1}'],
  ['POS', 'Cuentas', 'Anular cuenta', 'Cuenta 1182 anulada con contraseña de supervisor'],
  ['ACC_DICR', 'Emisión', 'Reenviar comprobante', 'Factura 00100001010000004512 reenviada a Hacienda'],
  ['MAN', 'Seguridad', 'Cambiar acceso', 'Acceso a Front Desk otorgado'],
  ['MAN', 'Entidades', 'Probar conexión', 'Conexión a CGA_SevenFront correcta'],
  ['MAN', 'Usuarios', 'Restablecer contraseña', 'Contraseña temporal asignada a jperez'],
  ['FDK', 'Seguridad', 'Inicio de sesión fallido', 'Contraseña incorrecta (2.º intento)'],
];

const fecha = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function bitacoraEjemplo(usuarios: string[]): EventoBitacora[] {
  const out: EventoBitacora[] = [];
  for (let i = 0; i < 64; i++) {
    const [modulo, aplicacion, opcion, detalle] = EVENTOS[(i * 7) % EVENTOS.length];
    const d = new Date(); d.setDate(d.getDate() - Math.floor(i / 9));
    const hora = 7 + ((i * 5) % 12);
    out.push({
      id: 'b' + i, fecha: `${fecha(d)}T${String(hora).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`,
      usuario: usuarios[(i * 3) % usuarios.length], modulo, aplicacion, opcion, base: `CGA_Seven${modulo === 'FDK' ? 'Front' : modulo === 'ACC_DICR' ? 'Acc' : modulo === 'MAN' ? 'Man' : modulo}`,
      detalle, ip: `10.0.0.${4 + (i % 3)}`,
    });
  }
  return out;
}
