// Permisos de la categoría Parámetros: pantallas de Configuración General
import { type PermCategory } from './tipos';

export const CATEGORIA_PARAMETROS: PermCategory = {
  key: 'parametros', label: 'PARÁMETROS',
  modules: [
    {
      key: 'empresa', label: 'Empresa',
      leaves: [
        { key: 'empresa.editar', label: 'Editar información de la empresa' },
        { key: 'empresa.consecutivos', label: 'Editar prefijo y número de inicio', desc: 'Aplica a asientos manuales y facturas.' },
        { key: 'empresa.impresoras', label: 'Editar configuración de impresoras' },
      ],
    },
    {
      key: 'paramgen', label: 'Parámetros generales',
      groups: [
        { key: 'monedas', label: 'Monedas', leaves: [
          { key: 'monedas.crear', label: 'Agregar moneda' },
          { key: 'monedas.view', label: 'Ver monedas' },
        ]},
        { key: 'tipocambio', label: 'Tipo de cambio', leaves: [
          { key: 'tipocambio.editar', label: 'Agregar / editar tipo de cambio' },
          { key: 'tipocambio.view', label: 'Ver tipo de cambio' },
        ]},
        { key: 'ejerciciofiscal', label: 'Ejercicio fiscal', leaves: [
          { key: 'ejerciciofiscal.abrir', label: 'Abrir ejercicio fiscal' },
          { key: 'ejerciciofiscal.estado', label: 'Bloquear / reabrir periodo' },
          { key: 'ejerciciofiscal.config', label: 'Editar ejercicio fiscal y fecha de apertura' },
          { key: 'ejerciciofiscal.cerrar', label: 'Cerrar ejercicio fiscal' },
          { key: 'ejerciciofiscal.view', label: 'Ver ejercicios fiscales' },
        ]},
        { key: 'nomenclatura', label: 'Nomenclatura contable', leaves: [
          { key: 'nomenclatura.editar', label: 'Editar longitud, separador y formato numérico de cuentas' },
        ]},
        { key: 'conceptos', label: 'Conceptos', leaves: [
          { key: 'conceptos.crear', label: 'Agregar concepto' },
          { key: 'conceptos.editar', label: 'Editar / eliminar concepto' },
          { key: 'conceptos.view', label: 'Ver conceptos' },
        ]},
        { key: 'libros', label: 'Libros', leaves: [
          { key: 'libros.crear', label: 'Crear libro' },
          { key: 'libros.editar', label: 'Editar / eliminar libro' },
          { key: 'libros.view', label: 'Ver libros' },
        ]},
      ],
    },
    {
      key: 'catalogo', label: 'Catálogo de cuentas',
      groups: [
        { key: 'plancuentas', label: 'Plan de cuentas', info: 'Cómo funciona la jerarquía mayor + submayor + detalle: mayor otorga permiso también sobre submayor y detalle; submayor otorga permiso sobre submayor y detalle, pero no sobre mayor; detalle solo otorga permiso sobre detalle.', leaves: [
          { key: 'plancuentas.crear', label: 'Crear cuenta contable', desc: 'Elegí en qué nivel puede crear cuentas.',
            subOptions: ['Mayor','Sub mayor','Detalle','Auxiliar'] },
          { key: 'plancuentas.editar', label: 'Editar cuenta contable', desc: 'Elegí en qué nivel puede editar cuentas.',
            subOptions: ['Mayor','Sub mayor','Detalle','Auxiliar'] },
          { key: 'plancuentas.eliminar', label: 'Desactivar / eliminar cuenta contable' },
          { key: 'plancuentas.trasladosaldos', label: 'Trasladar saldos entre cuentas' },
          { key: 'plancuentas.exportimport', label: 'Exportar / importar catálogo de cuentas' },
          { key: 'plancuentas.view', label: 'Ver plan de cuentas' },
        ]},
        { key: 'centroscosto', label: 'Centros de costo', leaves: [
          { key: 'centroscosto.editar', label: 'Crear / editar / eliminar centro de costo' },
          { key: 'centroscosto.view', label: 'Ver centros de costo' },
        ]},
        { key: 'cuentasespeciales', label: 'Cuentas especiales', leaves: [
          { key: 'cuentasespeciales.asignar', label: 'Asignar / quitar tipo de cuenta especial' },
          { key: 'cuentasespeciales.view', label: 'Ver cuentas especiales' },
        ]},
        { key: 'grupopatrimonio', label: 'Grupo de patrimonio', leaves: [
          { key: 'grupopatrimonio.editar', label: 'Crear / editar / eliminar / activar grupo de patrimonio' },
          { key: 'grupopatrimonio.view', label: 'Ver grupo de patrimonio' },
        ]},
        { key: 'chequeras', label: 'Chequeras', info: 'La cuenta bancaria / chequera en sí. No confundir con "Cheques bancarios" en Bancos, que es la operación diaria.', leaves: [
          { key: 'chequeras.crear', label: 'Agregar chequera' },
          { key: 'chequeras.eliminar', label: 'Eliminar chequera' },
        ]},
      ],
    },
    {
      key: 'clientesprov', label: 'Clientes / Proveedores',
      groups: [
        { key: 'clientes', label: 'Clientes', leaves: [
          { key: 'clientes.editar', label: 'Crear / editar / desactivar cliente' },
          { key: 'clientes.view', label: 'Ver clientes' },
        ]},
        { key: 'proveedores', label: 'Proveedores', leaves: [
          { key: 'proveedores.editar', label: 'Crear / editar proveedor' },
          { key: 'proveedores.view', label: 'Ver proveedores' },
        ]},
      ],
    },
    {
      key: 'actividadbancaria', label: 'Actividad bancaria',
      groups: [
        { key: 'formulariostrf', label: 'Formularios de transferencia', info: 'Configuración de cómo se procesan las transferencias - no confundir con la operación diaria en Bancos.', leaves: [
          { key: 'formulariostrf.crear', label: 'Crear formulario' },
          { key: 'formulariostrf.editar', label: 'Editar formulario' },
          { key: 'formulariostrf.duplicar', label: 'Duplicar formulario' },
          { key: 'formulariostrf.eliminar', label: 'Eliminar formulario' },
          { key: 'formulariostrf.view', label: 'Ver formularios de transferencia' },
        ]},
        { key: 'afiliados', label: 'Afiliados', info: 'Afiliaciones de datáfono/POS: comisión, retención y cuenta de tránsito.', leaves: [
          { key: 'afiliados.crear', label: 'Crear afiliado' },
          { key: 'afiliados.editar', label: 'Editar afiliado' },
          { key: 'afiliados.eliminar', label: 'Eliminar afiliado' },
          { key: 'afiliados.view', label: 'Ver afiliados' },
        ]},
      ],
    },
    {
      key: 'usuariospermisos', label: 'Usuarios y Permisos',
      groups: [
        { key: 'usuarios', label: 'Usuarios', leaves: [
          { key: 'usuarios.crear', label: 'Crear usuario' },
          { key: 'usuarios.editar', label: 'Editar usuario' },
          { key: 'usuarios.restablecerclave', label: 'Restablecer contraseña de un usuario' },
          { key: 'usuarios.limpiarpermisos', label: 'Limpiar permisos de un usuario' },
          { key: 'usuarios.eliminar', label: 'Eliminar usuario' },
          { key: 'usuarios.view', label: 'Ver usuarios' },
          { key: 'usuarios.exportarpermisos', label: 'Exportar permisos', desc: 'Permite descargar el detalle de permisos por usuario y el listado de usuarios/roles.' },
        ]},
        { key: 'roles', label: 'Roles', leaves: [
          { key: 'roles.crear', label: 'Crear rol' },
          { key: 'roles.editar', label: 'Editar permisos de un rol' },
          { key: 'roles.duplicar', label: 'Duplicar rol' },
          { key: 'roles.eliminar', label: 'Eliminar rol' },
          { key: 'roles.view', label: 'Ver roles' },
        ]},
      ],
    },
  ],
};
