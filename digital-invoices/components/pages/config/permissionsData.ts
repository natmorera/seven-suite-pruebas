// ── Modelo de datos de Usuarios y Permisos ──────────────────────────────────
import { segunPais } from '@/lib/paisActual';

// subOptions: cuando una acción se otorga "por tipo" (p.ej. registrar asientos
// solo de cierto origen, o crear cuentas solo de cierto nivel), en vez de
// tener un permiso plano por cada combinación, el permiso vive UNA vez con
// una lista de sub-opciones seleccionables. Se guarda en el Set como
// "clave:subopcion" (p.ej. "bandeja.registrar:Manual"). El checkbox del
// permiso queda marcado si tiene AL MENOS una sub-opción elegida.
export interface PermLeaf { key: string; label: string; desc?: string; subOptions?: string[] }
export interface PermGroup { key: string; label: string; info?: string; leaves: PermLeaf[]; flat?: boolean }
export interface PermModule { key: string; label: string; leaves?: PermLeaf[]; groups?: PermGroup[] }
export interface PermCategory { key: string; label: string; modules: PermModule[] }

export const PERMISSIONS_TREE: PermCategory[] = [
  {
    key: 'operativo', label: 'OPERATIVO',
    modules: [
      {
        key: 'dashboard', label: 'Dashboard',
        leaves: [
          { key: 'dashboard.export', label: 'Exportar datos' },
          // Una casilla por tarjeta del Dashboard (pestaña Contabilidad)
          { key: 'dashboard.card_asientos', label: 'Tarjeta: Asientos pendientes y situación actual' },
          { key: 'dashboard.card_usuarios', label: 'Tarjeta: Usuarios activos' },
          { key: 'dashboard.card_cxc', label: 'Tarjeta: Cartera de clientes vencida' },
          { key: 'dashboard.card_cxp', label: 'Tarjeta: Cartera de proveedores vencida' },
          { key: 'dashboard.card_icg', label: 'Tarjeta: Ingresos, costos y gastos' },
          { key: 'dashboard.card_conciliaciones', label: 'Tarjeta: Estado de conciliaciones' },
          { key: 'dashboard.card_iva', label: 'Tarjeta: Impuestos de ventas (IVA)' },
        ],
      },
      {
        key: 'bandeja', label: 'Bandeja de asientos',
        groups: [
          {
            key: 'registrar', label: 'Registrar y gestionar asientos', flat: true,
            leaves: [
              { key: 'bandeja.view', label: 'Ver bandeja de asientos' },
              { key: 'bandeja.registrar', label: 'Registrar asiento', desc: 'Elegí de qué origen puede registrar asientos.',
                subOptions: ['Automático','Manual','Importado','Duplicado','Plantilla'] },
              { key: 'bandeja.editar', label: 'Editar asiento', desc: 'Elegí de qué tipo de asiento puede editar.',
                subOptions: ['Automático','Manual','Importado','Duplicado','Plantilla'] },
              { key: 'bandeja.duplicar', label: 'Duplicar asiento', desc: 'Elegí de qué tipo de asiento puede duplicar.',
                subOptions: ['Automático','Manual','Importado','Duplicado','Plantilla'] },
              { key: 'bandeja.contabilizar', label: 'Contabilizar asiento', desc: 'Pasa el asiento de borrador a definitivo. Elegí de qué tipo de asiento puede contabilizar.',
                subOptions: ['Automático','Manual','Importado','Duplicado','Plantilla'] },
              { key: 'bandeja.anular', label: 'Anular asiento', desc: 'Elegí de qué tipo de asiento puede anular.',
                subOptions: ['Automático','Manual','Importado','Duplicado','Plantilla'] },
              { key: 'bandeja.restaurar', label: 'Restaurar asiento anulado' },
              { key: 'bandeja.adjuntos', label: 'Agregar adjuntos', desc: 'Elegí de qué tipo de asiento puede agregar adjuntos.',
                subOptions: ['Automático','Manual','Importado','Duplicado','Plantilla'] },
              { key: 'bandeja.correo', label: 'Enviar asiento por correo', desc: 'Elegí de qué tipo de asiento puede enviar por correo.',
                subOptions: ['Automático','Manual','Importado','Duplicado','Plantilla'] },
            ],
          },
          {
            key: 'programados', label: 'Asientos programados', flat: true,
            leaves: [
              { key: 'programados.view', label: 'Ver asientos programados' },
              { key: 'programados.crear', label: 'Programar asiento' },
              { key: 'programados.editar', label: 'Editar programación' },
              { key: 'programados.eliminar', label: 'Eliminar programación' },
            ],
          },
          {
            key: 'plantillasasiento', label: 'Plantillas', flat: true,
            leaves: [
              { key: 'plantillasasiento.view', label: 'Ver plantillas' },
              { key: 'plantillasasiento.crear', label: 'Crear plantilla' },
              { key: 'plantillasasiento.usar', label: 'Usar plantilla' },
              { key: 'plantillasasiento.editar', label: 'Editar plantilla' },
              { key: 'plantillasasiento.eliminar', label: 'Eliminar plantilla' },
              { key: 'plantillasasiento.importar', label: 'Importar plantilla' },
            ],
          },
          {
            key: 'importexport', label: 'Importación y exportación', flat: true,
            leaves: [
              { key: 'bandeja.importar', label: 'Importar asientos' },
              { key: 'bandeja.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'bandeja.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar asientos.', subOptions: ['CSV','XLSX','PDF'] },
            ],
          },
        ],
      },
      {
        key: 'bancos', label: 'Bancos',
        groups: [
          {
            key: 'cobros', label: 'Cobros',
            leaves: [
              { key: 'cobros.registrar', label: 'Registrar cobro' },
              { key: 'cobros.view', label: 'Ver cobros', desc: 'Elegí en qué estados puede ver cobros.', subOptions: ['Pendiente','Aplicado','Borrador','Anulado'] },
              { key: 'cobros.editar', label: 'Editar cobro' },
              { key: 'cobros.contabilizar', label: 'Contabilizar cobro' },
              { key: 'cobros.anular', label: 'Anular cobro' },
              { key: 'cobros.adjuntos', label: 'Agregar archivos adjuntos del cobro' },
              { key: 'cobros.correo', label: 'Enviar cobro por correo' },
              { key: 'cobros.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'cobros.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar cobros.', subOptions: ['PDF','XLSX','CSV'] },
            ],
          },
          {
            key: 'anticiposclientes', label: 'Anticipos de clientes',
            leaves: [
              { key: 'anticiposclientes.registrar', label: 'Registrar anticipo de cliente' },
              { key: 'anticiposclientes.view', label: 'Ver anticipos de clientes', desc: 'Elegí en qué estados puede ver anticipos de clientes.', subOptions: ['Pendiente','Aplicado','Borrador','Anulado'] },
              { key: 'anticiposclientes.editar', label: 'Editar anticipo de cliente' },
              { key: 'anticiposclientes.contabilizar', label: 'Contabilizar anticipo de cliente' },
              { key: 'anticiposclientes.anular', label: 'Anular anticipo de cliente' },
              { key: 'anticiposclientes.adjuntos', label: 'Agregar archivos adjuntos del anticipo de cliente' },
              { key: 'anticiposclientes.correo', label: 'Enviar anticipo de cliente por correo' },
              { key: 'anticiposclientes.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'anticiposclientes.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar anticipos de clientes.', subOptions: ['PDF','XLSX','CSV'] },
            ],
          },
          {
            key: 'pagos', label: 'Pagos',
            leaves: [
              { key: 'pagos.registrar', label: 'Registrar pago' },
              { key: 'pagos.view', label: 'Ver pagos', desc: 'Elegí en qué estados puede ver pagos.', subOptions: ['Pendiente','Aplicado','Borrador','Anulado'] },
              { key: 'pagos.editar', label: 'Editar pago' },
              { key: 'pagos.contabilizar', label: 'Contabilizar pago' },
              { key: 'pagos.anular', label: 'Anular pago' },
              { key: 'pagos.adjuntos', label: 'Agregar archivos adjuntos del pago' },
              { key: 'pagos.correo', label: 'Enviar pago por correo' },
              { key: 'pagos.archivobancario', label: 'Exportar archivo bancario' },
              { key: 'pagos.generarcheque', label: 'Generar cheque' },
              { key: 'pagos.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'pagos.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar pagos.', subOptions: ['PDF','XLSX','CSV'] },
            ],
          },
          {
            key: 'anticiposproveedores', label: 'Anticipos a proveedores',
            leaves: [
              { key: 'anticiposproveedores.registrar', label: 'Registrar anticipo a proveedor' },
              { key: 'anticiposproveedores.view', label: 'Ver anticipos a proveedores', desc: 'Elegí en qué estados puede ver anticipos a proveedores.', subOptions: ['Pendiente','Aplicado','Borrador','Anulado'] },
              { key: 'anticiposproveedores.editar', label: 'Editar anticipo a proveedor' },
              { key: 'anticiposproveedores.contabilizar', label: 'Contabilizar anticipo a proveedor' },
              { key: 'anticiposproveedores.anular', label: 'Anular anticipo a proveedor' },
              { key: 'anticiposproveedores.adjuntos', label: 'Agregar archivos adjuntos del anticipo a proveedor' },
              { key: 'anticiposproveedores.correo', label: 'Enviar anticipo a proveedor por correo' },
              { key: 'anticiposproveedores.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'anticiposproveedores.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar anticipos a proveedores.', subOptions: ['PDF','XLSX','CSV'] },
            ],
          },
          {
            key: 'tarjetas', label: 'Gestión de tarjetas',
            leaves: [
              { key: 'tarjetas.registrar', label: 'Registrar liquidación de tarjetas' },
              { key: 'tarjetas.view', label: 'Ver liquidaciones de tarjetas' },
              { key: 'tarjetas.editar', label: 'Editar liquidación de tarjetas' },
              { key: 'tarjetas.imprimir', label: 'Imprimir liquidación de tarjetas' },
              { key: 'tarjetas.anular', label: 'Anular liquidación de tarjetas' },
              { key: 'tarjetas.correo', label: 'Enviar liquidación de tarjetas por correo' },
              { key: 'tarjetas.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'tarjetas.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar liquidaciones.', subOptions: ['PDF','XLSX','CSV'] },
            ],
          },
          {
            key: 'depositos', label: 'Depósitos',
            leaves: [
              { key: 'depositos.registrar', label: 'Registrar depósito' },
              { key: 'depositos.view', label: 'Ver depósitos', desc: 'Elegí en qué estados puede ver depósitos.', subOptions: ['Pendiente','Contabilizado','Anulado'] },
              { key: 'depositos.editar', label: 'Editar depósito' },
              { key: 'depositos.contabilizar', label: 'Contabilizar depósito' },
              { key: 'depositos.anular', label: 'Anular depósito' },
              { key: 'depositos.adjuntos', label: 'Agregar archivos adjuntos del depósito' },
              { key: 'depositos.correo', label: 'Enviar depósito por correo' },
              { key: 'depositos.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'depositos.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar depósitos.', subOptions: ['PDF','XLSX','CSV'] },
            ],
          },
          {
            key: 'transferencias', label: 'Transferencias',
            leaves: [
              { key: 'transferencias.registrar', label: 'Registrar transferencia bancaria' },
              { key: 'transferencias.view', label: 'Ver transferencias', desc: 'Elegí en qué estados puede ver transferencias.', subOptions: ['Pendiente','Contabilizada','Anulada'] },
              { key: 'transferencias.editar', label: 'Editar transferencia bancaria' },
              { key: 'transferencias.contabilizar', label: 'Contabilizar transferencia bancaria' },
              { key: 'transferencias.anular', label: 'Anular transferencia bancaria' },
              { key: 'transferencias.adjuntos', label: 'Agregar archivos adjuntos de la transferencia' },
              { key: 'transferencias.correo', label: 'Enviar transferencia bancaria por correo' },
              { key: 'transferencias.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'transferencias.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar transferencias.', subOptions: ['PDF','XLSX','CSV'] },
            ],
          },
          {
            key: 'conciliacion', label: 'Conciliación bancaria',
            leaves: [
              { key: 'conciliacion.registrar', label: 'Crear conciliación bancaria' },
              { key: 'conciliacion.view', label: 'Ver conciliaciones bancarias', desc: 'Elegí en qué estados puede ver conciliaciones.', subOptions: ['Abierta','Cerrada'] },
              { key: 'conciliacion.editar', label: 'Editar conciliación bancaria' },
              { key: 'conciliacion.cargar', label: 'Cargar movimientos a la conciliación bancaria' },
              { key: 'conciliacion.cerrar', label: 'Cerrar conciliación bancaria' },
              { key: 'conciliacion.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'conciliacion.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar conciliaciones.', subOptions: ['PDF','XLSX','CSV'] },
            ],
          },
          {
            key: 'chequesbancarios', label: 'Cheques bancarios',
            info: 'Cheques emitidos o recibidos en operación diaria. No confundir con "Chequeras" en Catálogo de cuentas, que es la cuenta bancaria en sí.',
            leaves: [
              { key: 'chequesbancarios.registrar', label: 'Registrar cheque' },
              { key: 'chequesbancarios.view', label: 'Ver cheques', desc: 'Elegí en qué estados puede ver cheques.', subOptions: ['Pendiente','Emitido','Contabilizado','Anulado'] },
              { key: 'chequesbancarios.editar', label: 'Editar cheque' },
              { key: 'chequesbancarios.emitir', label: 'Emitir cheque' },
              { key: 'chequesbancarios.contabilizar', label: 'Contabilizar cheque' },
              { key: 'chequesbancarios.anular', label: 'Anular cheque' },
              { key: 'chequesbancarios.imprimir', label: 'Imprimir cheque' },
              { key: 'chequesbancarios.correo', label: 'Enviar cheque por correo' },
              { key: 'chequesbancarios.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'chequesbancarios.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar cheques.', subOptions: ['PDF','XLSX','CSV'] },
            ],
          },
        ],
      },
      {
        key: 'reportes', label: 'Reportes',
        groups: [
          {
            key: 'analitico', label: 'Analítico de cuenta',
            leaves: [
              { key: 'analitico.view', label: 'Ver analítico de cuenta', desc: 'Elegí por qué nivel de cuenta.', subOptions: ['Detalle','Auxiliar'] },
              { key: 'analitico.view_asientos', label: 'Ver asientos contables' },
              { key: 'analitico.view_detalleasiento', label: 'Ver detalle del asiento' },
              { key: 'analitico.descontabilizar', label: 'Descontabilizar asiento' },
              { key: 'analitico.duplicar', label: 'Duplicar asiento' },
              { key: 'analitico.anular', label: 'Anular asiento' },
              { key: 'analitico.imprimir', label: 'Imprimir asiento' },
              { key: 'analitico.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'analitico.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar.', subOptions: ['Excel','CSV','PDF'] },
            ],
          },
          {
            key: 'historico', label: 'Histórico clientes y proveedores',
            leaves: [
              { key: 'historico.view_clientes', label: 'Ver estado de cuenta de clientes' },
              { key: 'historico.view_proveedores', label: 'Ver estado de cuenta de proveedores' },
              { key: 'historico.view_antiguedadclientes', label: 'Ver antigüedad de saldos de clientes' },
              { key: 'historico.view_antiguedadproveedores', label: 'Ver antigüedad de saldos de proveedores' },
              { key: 'historico.correo_clientes', label: 'Enviar estado de cuenta de clientes por correo' },
              { key: 'historico.correo_proveedores', label: 'Enviar estado de cuenta de proveedores por correo' },
              { key: 'historico.correo_antiguedadclientes', label: 'Enviar antigüedad de saldos de clientes por correo' },
              { key: 'historico.correo_antiguedadproveedores', label: 'Enviar antigüedad de saldos de proveedores por correo' },
              { key: 'historico.exportformato_clientes', label: 'Formato de exportación · estado de cuenta clientes', desc: 'Elegí en qué formato.', subOptions: ['Excel','CSV','PDF'] },
              { key: 'historico.exportformato_proveedores', label: 'Formato de exportación · estado de cuenta proveedores', desc: 'Elegí en qué formato.', subOptions: ['Excel','CSV','PDF'] },
              { key: 'historico.exportformato_antiguedadclientes', label: 'Formato de exportación · antigüedad clientes', desc: 'Elegí en qué formato.', subOptions: ['Excel','CSV','PDF'] },
              { key: 'historico.exportformato_antiguedadproveedores', label: 'Formato de exportación · antigüedad proveedores', desc: 'Elegí en qué formato.', subOptions: ['Excel','CSV','PDF'] },
            ],
          },
          {
            key: 'diferencial', label: 'Diferencial cambiario',
            leaves: [
              { key: 'diferencial.view', label: 'Visualizar movimientos de diferencial cambiario' },
              { key: 'diferencial.crearajuste', label: 'Crear nuevo ajuste cambiario' },
              { key: 'diferencial.crearmovimiento', label: 'Crear nuevo movimiento cambiario' },
              { key: 'diferencial.aplicar', label: 'Aplicar movimiento cambiario' },
              { key: 'diferencial.contabilizar', label: 'Contabilizar movimiento cambiario' },
              { key: 'diferencial.anular', label: 'Anular movimiento cambiario' },
              { key: 'diferencial.export', label: 'Exportar', desc: 'Elegí el alcance de la exportación.', subOptions: ['Individual','Masivo'] },
              { key: 'diferencial.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar.', subOptions: ['Excel','CSV','PDF'] },
            ],
          },
        ],
      },
      {
        key: 'estadosfin', label: 'Estados financieros',
        groups: [
          {
            key: 'balance', label: 'Balance de comprobación',
            leaves: [
              { key: 'balance.view', label: 'Ver balance de comprobación' },
              { key: 'balance.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar.', subOptions: ['Excel','CSV','PDF'] },
            ],
          },
          {
            key: 'resultados', label: 'Estado de resultados',
            leaves: [
              { key: 'resultados.view', label: 'Ver estado de resultados' },
              { key: 'resultados.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar.', subOptions: ['Excel','CSV','PDF'] },
            ],
          },
          {
            key: 'situacion', label: 'Situación financiera',
            leaves: [
              { key: 'situacion.view', label: 'Ver situación financiera' },
              { key: 'situacion.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar.', subOptions: ['Excel','CSV','PDF'] },
            ],
          },
          {
            key: 'patrimonio', label: 'Cambio en el patrimonio',
            leaves: [
              { key: 'patrimonio.view', label: 'Ver cambio en el patrimonio' },
              { key: 'patrimonio.exportformato', label: 'Formato de exportación', desc: 'Elegí en qué formato puede exportar.', subOptions: ['Excel','CSV','PDF'] },
            ],
          },
        ],
      },
    ],
  },
  {
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
  },
  {
    // Calcado de las pantallas y acciones de Facturación electrónica
    key: 'facturacion', label: 'FACTURACIÓN ELECTRÓNICA',
    modules: [
      {
        key: 'feventas', label: 'Ventas (documentos emitidos)',
        groups: [
          { key: 'feventas.docs', label: 'Comprobantes', flat: true, leaves: [
            { key: 'fe.ventas.view', label: 'Ver ventas' },
            { key: 'fe.ventas.emitir', label: 'Emitir comprobantes', desc: 'Elegí qué tipos puede emitir.',
              subOptions: ['Factura electrónica', 'Tiquete electrónico', 'Factura de exportación', 'Nota de crédito', 'Nota de débito'] },
            { key: 'fe.ventas.borrador', label: 'Guardar y eliminar borradores' },
            { key: 'fe.ventas.refacturar', label: 'Refacturar y modificar rechazados' },
            { key: 'fe.ventas.reenviar', get label() { return segunPais('Reenviar a Hacienda y consultar estado'); } },
            { key: 'fe.ventas.correo', label: 'Enviar por correo' },
            { key: 'fe.ventas.descargar', label: 'Descargar PDF, XML y respuesta' },
            { key: 'fe.ventas.importarexterno', label: 'Importar comprobantes de otro sistema' },
          ]},
          { key: 'feventas.recibos', label: 'Crédito con recibo de pago', flat: true, leaves: [
            { key: 'fe.recibos.abonar', label: 'Registrar abonos (emite el recibo electrónico de pago)' },
          ]},
          { key: 'feventas.recurrentes', label: 'Facturas recurrentes', flat: true, leaves: [
            { key: 'fe.recurrentes.view', label: 'Ver recurrentes' },
            { key: 'fe.recurrentes.editar', label: 'Crear, editar y terminar recurrencias' },
            { key: 'fe.recurrentes.emitir', label: 'Emitir la siguiente factura' },
          ]},
        ],
      },
      {
        key: 'fecompras', label: 'Compras (documentos recibidos)',
        groups: [
          { key: 'fecompras.docs', label: 'Compras', flat: true, leaves: [
            { key: 'fe.compras.view', label: 'Ver compras' },
            { key: 'fe.compras.importar', label: 'Importar XML y correos' },
            { key: 'fe.compras.acuse', label: 'Emitir y cambiar acuses', desc: 'Aceptación total, parcial o rechazo.' },
            { key: 'fe.compras.eliminar', label: 'Eliminar facturas por importar' },
            { key: 'fe.compras.exportar', label: 'Exportar XML' },
            { key: 'fe.compras.fec', label: 'Emitir factura electrónica de compra' },
            { key: 'fe.compras.buzon', label: 'Configurar el buzón de correo' },
          ]},
        ],
      },
      {
        // Un grupo por reporte, como los reportes contables (ver y exportar cada uno)
        key: 'fereportes', label: 'Reportes fiscales',
        groups: [
          { key: 'fereportes.iva', label: 'Reporte de IVA', leaves: [
            { key: 'fe.reportes.iva.view', label: 'Ver Reporte de IVA' },
            { key: 'fe.reportes.iva.exportar', label: 'Exportar Reporte de IVA' },
          ]},
          { key: 'fereportes.general', label: 'Reporte general', leaves: [
            { key: 'fe.reportes.general.view', label: 'Ver Reporte general' },
            { key: 'fe.reportes.general.exportar', label: 'Exportar Reporte general' },
          ]},
          { key: 'fereportes.importe', label: 'Importe de impuesto', leaves: [
            { key: 'fe.reportes.importe.view', label: 'Ver Importe de impuesto' },
            { key: 'fe.reportes.importe.exportar', label: 'Exportar Importe de impuesto' },
          ]},
          { key: 'fereportes.actividad', label: 'Actividad económica', leaves: [
            { key: 'fe.reportes.actividad.view', label: 'Ver reporte de Actividad económica' },
            { key: 'fe.reportes.actividad.exportar', label: 'Exportar reporte de Actividad económica' },
          ]},
          { key: 'fereportes.rechazados', label: 'Comprobantes rechazados', leaves: [
            { key: 'fe.reportes.rechazados.view', label: 'Ver Comprobantes rechazados' },
            { key: 'fe.reportes.rechazados.exportar', label: 'Exportar Comprobantes rechazados' },
          ]},
        ],
      },
      {
        // Una sección por pantalla de la configuración, con cada acción posible
        key: 'feconfig', label: 'Configuración de facturación',
        groups: [
          { key: 'feconfig.tributaria', label: 'Información tributaria (Empresa)', leaves: [
            { key: 'fe.config.tributaria.view', label: 'Ver información tributaria' },
            { key: 'fe.config.tributaria.editar', label: 'Editar dirección fiscal, correos y teléfono' },
            { key: 'fe.config.tributaria.actividades', get label() { return segunPais('Editar actividades económicas y régimen (traer de Hacienda, agregar, quitar y marcar la principal)'); } },
            { key: 'fe.config.tributaria.llave', label: 'Cargar o generar la llave criptográfica' },
            { key: 'fe.config.tributaria.credenciales', get label() { return segunPais('Editar usuario y contraseña de la API de Hacienda'); } },
            { key: 'fe.config.tributaria.ambiente', label: 'Cambiar el ambiente (pruebas o producción)' },
          ]},
          { key: 'feconfig.sucursales', label: 'Sucursales', leaves: [
            { key: 'fe.config.sucursales.view', label: 'Ver sucursales' },
            { key: 'fe.config.sucursales.crear', label: 'Crear sucursal', desc: 'Además, el plan debe permitirlo.' },
            { key: 'fe.config.sucursales.editar', label: 'Editar sucursal (nombre, dirección, teléfono y correo)' },
            { key: 'fe.config.sucursales.codigo', label: 'Cambiar el código de la sucursal' },
          ]},
          { key: 'feconfig.cajas', label: 'Cajas / Terminales', leaves: [
            { key: 'fe.config.cajas.view', label: 'Ver cajas / terminales' },
            { key: 'fe.config.cajas.crear', label: 'Crear caja / terminal' },
            { key: 'fe.config.cajas.editar', label: 'Editar caja / terminal' },
            { key: 'fe.config.cajas.numeracion', label: 'Cambiar la numeración (próximo consecutivo por tipo)' },
            { key: 'fe.config.cajas.eliminar', label: 'Eliminar caja / terminal' },
          ]},
          { key: 'feconfig.impuestos', label: 'Impuestos', leaves: [
            { key: 'fe.config.impuestos.view', label: 'Ver impuestos' },
            { key: 'fe.config.impuestos.crear', label: 'Crear impuesto' },
            { key: 'fe.config.impuestos.editar', label: 'Editar impuesto' },
            { key: 'fe.config.impuestos.eliminar', label: 'Eliminar impuesto' },
          ]},
          { key: 'feconfig.descuentos', label: 'Descuentos', leaves: [
            { key: 'fe.config.descuentos.view', label: 'Ver descuentos' },
            { key: 'fe.config.descuentos.crear', label: 'Crear descuento' },
            { key: 'fe.config.descuentos.editar', label: 'Editar descuento' },
            { key: 'fe.config.descuentos.eliminar', label: 'Eliminar descuento' },
          ]},
          { key: 'feconfig.exoneraciones', label: 'Exoneraciones', leaves: [
            { key: 'fe.config.exoneraciones.view', label: 'Ver exoneraciones' },
            { key: 'fe.config.exoneraciones.crear', label: 'Crear exoneración' },
            { key: 'fe.config.exoneraciones.editar', label: 'Editar exoneración' },
            { key: 'fe.config.exoneraciones.eliminar', label: 'Eliminar exoneración' },
          ]},
          { key: 'feconfig.receptores', label: 'Receptores', leaves: [
            { key: 'fe.config.receptores.view', label: 'Ver receptores' },
            { key: 'fe.config.receptores.crear', label: 'Crear receptor' },
            { key: 'fe.config.receptores.editar', label: 'Editar datos tributarios (identificación, actividades, ubicación, correos y exoneración)' },
            { key: 'fe.config.receptores.credito', label: 'Editar días de crédito y recibo electrónico de pago' },
            { key: 'fe.config.receptores.cuenta', label: 'Crear su cuenta contable' },
          ]},
          { key: 'feconfig.grupos', label: 'Grupos CABYS', leaves: [
            { key: 'fe.config.grupos.view', label: 'Ver grupos CABYS' },
            { key: 'fe.config.grupos.crear', label: 'Crear grupo CABYS' },
            { key: 'fe.config.grupos.editar', label: 'Editar grupo CABYS' },
            { key: 'fe.config.grupos.eliminar', label: 'Eliminar grupo CABYS' },
          ]},
          { key: 'feconfig.productos', label: 'Productos / Servicios', leaves: [
            { key: 'fe.config.productos.view', label: 'Ver productos y servicios' },
            { key: 'fe.config.productos.crear', label: 'Crear producto o servicio' },
            { key: 'fe.config.productos.editar', label: 'Editar producto o servicio' },
            { key: 'fe.config.productos.eliminar', label: 'Eliminar productos y servicios' },
            { key: 'fe.config.productos.importar', label: 'Importar desde Excel' },
            { key: 'fe.config.productos.exportar', label: 'Descargar el listado' },
          ]},
          { key: 'feconfig.cuentas', label: 'Cuentas contables de facturación', leaves: [
            { key: 'fe.config.cuentas.view', label: 'Ver cuentas contables de facturación' },
            { key: 'fe.config.cuentas.editar', label: 'Editar cuentas contables de facturación' },
          ]},
        ],
      },
      {
        key: 'fedashboard', label: 'Dashboard de facturación',
        leaves: [
          { key: 'fe.dashboard.view', label: 'Ver la pestaña Factura electrónica del Dashboard' },
          // Una casilla por tarjeta de esa pestaña
          { key: 'fe.dashboard.card_avisos', label: 'Tarjeta: Avisos de facturas emitidas solas' },
          { key: 'fe.dashboard.card_recurrentes', label: 'Tarjeta: Facturas recurrentes' },
          { key: 'fe.dashboard.card_creditos', label: 'Tarjeta: Ventas a crédito con recibo de pago' },
          { key: 'fe.dashboard.card_indicadores', label: 'Tarjeta: Indicadores (aceptados, rechazados, ingresos)' },
          { key: 'fe.dashboard.card_ultimos', label: 'Tarjeta: Últimos documentos' },
          { key: 'fe.dashboard.card_compras', label: 'Tarjeta: Compras sin acuse' },
          { key: 'fe.dashboard.card_no_enviados', label: 'Tarjeta: Documentos no enviados por correo' },
        ],
      },
    ],
  },
];

// ── Árbol según los módulos contratados ────────────────────────────────────
// Solo facturación (sin Contabilidad): fuera todo lo contable (asientos,
// bancos, reportes y estados contables, catálogo, parámetros contables,
// clientes/proveedores contables, actividad bancaria, tarjetas contables del
// Dashboard y las cuentas contables de facturación). Solo contabilidad: fuera
// Facturación electrónica. PERMISSIONS_TREE se ajusta en sitio para que todo lo
// que lo usa (árbol, conteos, exportación) vea lo mismo.
const ARBOL_COMPLETO: PermCategory[] = PERMISSIONS_TREE.map(c => ({ ...c, modules: [...c.modules] }));
const MODULOS_CONTABLES = new Set(['bandeja', 'bancos', 'reportes', 'estadosfin', 'paramgen', 'catalogo', 'clientesprov', 'actividadbancaria']);
const HOJAS_CONTABLES = new Set(['fe.config.cuentas.view', 'fe.config.cuentas.editar', 'fe.config.receptores.cuenta', 'empresa.consecutivos']);
let arbolDe = 'completo';
export function ajustarArbolPermisos(m: { contabilidad: boolean; facturacion: boolean }) {
  const clave = `${m.contabilidad}-${m.facturacion}`;
  if (clave === arbolDe) return;
  arbolDe = clave;
  const filtrarHojas = (l: PermLeaf[]) => l.filter(h => m.contabilidad || (!HOJAS_CONTABLES.has(h.key) && !h.key.startsWith('dashboard.card_')));
  const nuevo: PermCategory[] = ARBOL_COMPLETO
    .filter(c => m.facturacion || c.key !== 'facturacion')
    .map(c => ({
      ...c,
      modules: c.modules
        .filter(mod => m.contabilidad || !MODULOS_CONTABLES.has(mod.key))
        .map(mod => ({
          ...mod,
          ...(mod.leaves ? { leaves: filtrarHojas(mod.leaves) } : {}),
          ...(mod.groups ? { groups: mod.groups.map(g => ({ ...g, leaves: filtrarHojas(g.leaves) })).filter(g => g.leaves.length) } : {}),
        }))
        .filter(mod => (mod.leaves?.length ?? 0) + (mod.groups?.length ?? 0) > 0),
    }))
    .filter(c => c.modules.length);
  PERMISSIONS_TREE.splice(0, PERMISSIONS_TREE.length, ...nuevo);
}

// Un permiso general de reportes fiscales equivale al de cada reporte.
const REPORTES_FISCALES = ['iva', 'general', 'importe', 'actividad', 'rechazados'];
// Permisos generales de configuración de facturación: cada uno equivale a
// todas las acciones de las secciones que cubre.
export const CONFIG_FE_VIEJOS: Record<string, string[]> = {
  'fe.config.tributaria': ['tributaria'],
  'fe.config.sucursales': ['sucursales', 'cajas'],
  'fe.config.productos': ['productos', 'grupos'],
  'fe.config.impuestos': ['impuestos', 'descuentos', 'exoneraciones'],
  'fe.config.receptores': ['receptores'],
  'fe.config.cuentas': ['cuentas'],
};
export function normalizarPermisos(lista: Iterable<string>): Set<string> {
  const s = new Set(lista);
  for (const [viejo, secciones] of Object.entries(CONFIG_FE_VIEJOS)) {
    if (!s.has(viejo)) continue;
    s.delete(viejo);
    const prefijos = secciones.map(x => `fe.config.${x}.`);
    ARBOL_COMPLETO.flatMap(allLeafKeysOfCategory).filter(k => prefijos.some(p => k.startsWith(p))).forEach(k => s.add(k));
  }
  for (const [viejo, accion] of [['fe.reportes.view', 'view'], ['fe.reportes.exportar', 'exportar']] as const) {
    if (!s.has(viejo)) continue;
    s.delete(viejo);
    REPORTES_FISCALES.forEach(r => s.add(`fe.reportes.${r}.${accion}`));
  }
  return s;
}
// Cuántos permisos del usuario se ven en el árbol actual (sin los de módulos no contratados)
export function contarPermisosVisibles(perms: Set<string>): number {
  const visibles = new Set(allLeafKeysGlobal());
  return [...perms].filter(k => visibles.has(k)).length;
}

export function isFirmaLeafKey(key: string): boolean {
  return key.endsWith('.firmar');
}
export type Firmantes = Record<string, number[]>;
export const FIRMANTES_INIT: Firmantes = {};
export interface Usuario {
  id: number; usuario: string; descripcion: string; dias: number;
  activo: boolean; cambiarClave: boolean; admin: boolean;
  fechaCreacion: string; ultimoAcceso: string; ultimoCambioClave: string;
  permisos: Set<string>;
  plantillaId?: number | null;
}

// Todas las claves de permisos de todo el árbol (incluyendo una entrada por
// cada sub-opción de los leaves con subOptions) - se usa para el
// administrador por defecto (primer usuario), que siempre tiene acceso total.
function allLeafKeys(): string[] {
  const base = PERMISSIONS_TREE.flatMap(cat => cat.modules.flatMap(mod =>
    mod.leaves ? mod.leaves : (mod.groups ?? []).flatMap(g=>g.leaves)
  ));
  return base.flatMap(l => l.subOptions ? l.subOptions.map(o=>`${l.key}:${o}`) : [l.key]);
}
const PERM_TODOS = new Set(allLeafKeys());
const PERM_BASICO = new Set(['dashboard.card_asientos','dashboard.card_situacion','bandeja.view']);

const PERM_CONTADOR = new Set([
  'dashboard.card_asientos','dashboard.card_situacion','dashboard.card_estadobancos','dashboard.card_cxc',
  'dashboard.card_cxp','dashboard.card_icg','dashboard.card_conciliaciones','dashboard.card_iva',
  'bandeja.registrar:Manual','bandeja.registrar:Importado','bandeja.registrar:Duplicado',
  'bandeja.editar:Manual','bandeja.contabilizar:Manual','bandeja.contabilizar:Importado','bandeja.view',
  'analitico.view:Detalle','analitico.view_asientos','analitico.export:Individual','analitico.exportformato:PDF',
  // Facturación: consulta, compras y reportes fiscales
  'fe.ventas.view','fe.ventas.descargar','fe.ventas.correo','fe.compras.view','fe.compras.importar','fe.compras.acuse','fe.compras.exportar',
  ...['iva','general','importe','actividad','rechazados'].flatMap(r => [`fe.reportes.${r}.view`, `fe.reportes.${r}.exportar`]),
  'fe.config.cuentas.view','fe.config.cuentas.editar','fe.dashboard.view','fe.recurrentes.view',
  'fe.dashboard.card_compras',
]);
// Facturación del día a día (recepción, caja)
const PERM_FACTURADOR = [
  'fe.ventas.view','fe.ventas.emitir:Factura electrónica','fe.ventas.emitir:Tiquete electrónico','fe.ventas.emitir:Nota de crédito',
  'fe.ventas.borrador','fe.ventas.reenviar','fe.ventas.correo','fe.ventas.descargar','fe.recibos.abonar',
  'fe.recurrentes.view','fe.recurrentes.emitir','fe.dashboard.view',
  'fe.dashboard.card_avisos','fe.dashboard.card_recurrentes','fe.dashboard.card_creditos','fe.dashboard.card_indicadores',
  'fe.dashboard.card_ultimos','fe.dashboard.card_no_enviados',
];
// El contador de ejemplo también factura
PERM_FACTURADOR.forEach(k => PERM_CONTADOR.add(k));

export const USUARIOS_INIT: Usuario[] = [
  { id:1000, usuario:'admin', descripcion:'Superusuario', dias:0, activo:true, cambiarClave:false, admin:true, fechaCreacion:'01/01/2026 08:00:00', ultimoAcceso:'05/10/2026 08:00:00', ultimoCambioClave:'01/01/2026 08:00:00', permisos:new Set(PERM_TODOS) },
  { id:1001, usuario:'jperez',    descripcion:'José Pérez',               dias:0, activo:true, cambiarClave:false, admin:false, fechaCreacion:'10/01/2026 08:30:00', ultimoAcceso:'13/08/2026 14:22:10', ultimoCambioClave:'10/01/2026 08:30:00', permisos:new Set(PERM_CONTADOR), plantillaId:1 },
  { id:1079, usuario:'dbonilla',  descripcion:'Daniel Bonilla',           dias:0, activo:true, cambiarClave:true,  admin:true, fechaCreacion:'22/12/2025 15:19:15', ultimoAcceso:'-', ultimoCambioClave:'07/08/2026 12:01:08', permisos:new Set(PERM_TODOS) },
  { id:1042, usuario:'kzamora',   descripcion:'Karen Zamora',             dias:0, activo:true, cambiarClave:false, admin:false, fechaCreacion:'03/02/2026 09:40:02', ultimoAcceso:'12/08/2026 08:12:44', ultimoCambioClave:'03/02/2026 09:40:02', permisos:new Set([...PERM_BASICO, ...PERM_FACTURADOR]), plantillaId:5 },
  { id:1032, usuario:'ldiaz',     descripcion:'Leslie Diaz',              dias:0, activo:true, cambiarClave:false, admin:false, fechaCreacion:'14/01/2026 11:05:30', ultimoAcceso:'11/08/2026 17:03:12', ultimoCambioClave:'14/01/2026 11:05:30', permisos:new Set(PERM_BASICO) },
  { id:1060, usuario:'lobando',   descripcion:'Leonor Obando Rodriguez',  dias:0, activo:true, cambiarClave:false, admin:false, fechaCreacion:'20/03/2026 14:22:10', ultimoAcceso:'10/08/2026 09:47:00', ultimoCambioClave:'20/03/2026 14:22:10', permisos:new Set(PERM_BASICO) },
  { id:1039, usuario:'lsandoval', descripcion:'Lorenzo Sandoval',         dias:0, activo:false, cambiarClave:false, admin:false, fechaCreacion:'02/02/2026 08:00:00', ultimoAcceso:'-', ultimoCambioClave:'02/02/2026 08:00:00', permisos:new Set(PERM_BASICO) },
  { id:1050, usuario:'lvalverde', descripcion:'Luis Valverde Murillo',    dias:0, activo:true, cambiarClave:false, admin:true,  fechaCreacion:'18/02/2026 10:15:45', ultimoAcceso:'13/08/2026 07:55:21', ultimoCambioClave:'18/02/2026 10:15:45', permisos:new Set(PERM_TODOS) },
];

// ── Roles (mock) ─────────────────────────────────────────────────────────────
export interface PlantillaPermiso { id:number; nombre:string; usuarios:number; permisos:Set<string> }

export const PLANTILLAS_INIT: PlantillaPermiso[] = [
  { id:4, nombre:'Administrador', usuarios:2, permisos:new Set(PERM_TODOS) },
  { id:1, nombre:'Contador',   usuarios:8, permisos:new Set(PERM_CONTADOR) },
  { id:2, nombre:'Recepción',  usuarios:5, permisos:new Set(['dashboard.card_asientos','dashboard.card_situacion', ...PERM_FACTURADOR]) },
  { id:5, nombre:'Facturador', usuarios:0, permisos:new Set(PERM_FACTURADOR) },
  { id:3, nombre:'Supervisor', usuarios:2, permisos:new Set(['dashboard.card_asientos','dashboard.card_situacion','dashboard.card_usuarios','dashboard.card_estadobancos','bandeja.view','analitico.view:Detalle']) },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function allLeavesFlat(mod: PermModule): PermLeaf[] {
  return mod.leaves ?? (mod.groups ?? []).flatMap(g=>g.leaves);
}
// "Cuenta" de un leaf: si tiene subOptions, cuenta como 1 solo permiso
// otorgado apenas tenga AL MENOS una sub-opción marcada (no una por cada
// sub-opción) - así el contador "3/8 permisos" sigue siendo legible.
function leafIsChecked(l: PermLeaf, perms: Set<string>): boolean {
  if (l.subOptions) return l.subOptions.some(o => perms.has(`${l.key}:${o}`));
  return perms.has(l.key);
}
export function countLeaves(mod: PermModule): number {
  return allLeavesFlat(mod).length;
}
export function countChecked(mod: PermModule, perms: Set<string>): number {
  return allLeavesFlat(mod).filter(l => leafIsChecked(l, perms)).length;
}
export function allLeafKeysOfModule(mod: PermModule): string[] {
  return allLeavesFlat(mod).flatMap(l => l.subOptions ? l.subOptions.map(o=>`${l.key}:${o}`) : [l.key]);
}
export function allLeafKeysOfGroup(g: PermGroup): string[] {
  return g.leaves.flatMap(l => l.subOptions ? l.subOptions.map(o=>`${l.key}:${o}`) : [l.key]);
}
export function totalLeavesInTree(): number {
  return PERMISSIONS_TREE.reduce((s,cat)=>s+cat.modules.reduce((s2,m)=>s2+countLeaves(m),0),0);
}
// Todas las claves de una categoría entera (p.ej. todo "OPERATIVO") o de todo
// el árbol - para los "Marcar todo / Quitar todo" globales, además de los que
// ya existen por módulo/sección.
export function allLeafKeysOfCategory(cat: PermCategory): string[] {
  return cat.modules.flatMap(allLeafKeysOfModule);
}
export function allLeafKeysGlobal(): string[] {
  return PERMISSIONS_TREE.flatMap(allLeafKeysOfCategory);
}
export function countCategory(cat: PermCategory): number {
  return cat.modules.reduce((s,m)=>s+countLeaves(m),0);
}
export function countCheckedCategory(cat: PermCategory, perms: Set<string>): number {
  return cat.modules.reduce((s,m)=>s+countChecked(m, perms),0);
}
export { leafIsChecked };

// ── Árbol aplanado, para reportes/exportación (una fila por permiso, o por
// cada sub-opción de los leaves que tienen "por tipo"/"por estado") ──────────
export interface PermFlatRow { key: string; categoria: string; modulo: string; grupo?: string; permiso: string; subopcion?: string }
export function flatPermissionRows(): PermFlatRow[] {
  const rows: PermFlatRow[] = [];
  function pushLeaf(l: PermLeaf, categoria: string, modulo: string, grupo?: string) {
    if (l.subOptions) {
      for (const o of l.subOptions) rows.push({ key: `${l.key}:${o}`, categoria, modulo, grupo, permiso: l.label, subopcion: o });
    } else {
      rows.push({ key: l.key, categoria, modulo, grupo, permiso: l.label });
    }
  }
  for (const cat of PERMISSIONS_TREE) {
    for (const mod of cat.modules) {
      (mod.leaves ?? []).forEach(l => pushLeaf(l, cat.label, mod.label));
      (mod.groups ?? []).forEach(g => g.leaves.forEach(l => pushLeaf(l, cat.label, mod.label, g.label)));
    }
  }
  return rows;
}

// ── Permisos de un usuario agrupados para lectura (detalle imprimible / envío
// por correo) - categoría > módulo (+ grupo si aplica) > permiso, uniendo las
// sub-opciones de un mismo permiso en una sola línea ────────────────────────
export interface PermisoDetalleItem { permiso: string; subopciones: string[] }
export interface PermisoDetalleGrupo { modulo: string; grupo?: string; items: PermisoDetalleItem[] }
export interface PermisoDetalleCategoria { categoria: string; grupos: PermisoDetalleGrupo[] }

export function permisosAgrupadosPorUsuario(permisos: Set<string>): PermisoDetalleCategoria[] {
  const filas = flatPermissionRows().filter(f => permisos.has(f.key));
  const cats = new Map<string, Map<string, PermisoDetalleGrupo>>();
  filas.forEach(f => {
    if (!cats.has(f.categoria)) cats.set(f.categoria, new Map());
    const mods = cats.get(f.categoria)!;
    const gKey = `${f.modulo}|${f.grupo ?? ''}`;
    if (!mods.has(gKey)) mods.set(gKey, { modulo: f.modulo, grupo: f.grupo, items: [] });
    const grupo = mods.get(gKey)!;
    let item = grupo.items.find(i => i.permiso === f.permiso);
    if (!item) { item = { permiso: f.permiso, subopciones: [] }; grupo.items.push(item); }
    if (f.subopcion) item.subopciones.push(f.subopcion);
  });
  return Array.from(cats.entries()).map(([categoria, mods]) => ({ categoria, grupos: Array.from(mods.values()) }));
}
