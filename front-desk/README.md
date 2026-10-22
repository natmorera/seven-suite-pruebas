# Front Desk · Seven Suite

Reservas, check-in, check-out y folios de huéspedes.

## Interfaz

Usa el mismo shell y los mismos componentes que Accounting, con el azul de
Front Desk. Todo vive en `components/suite` (ver su README) y se puede ver en
**/design-system**.

- Menú del módulo: `components/layout/nav.tsx`
- Color del módulo: `app/globals.css` (`--brand*`). El ítem activo del menú
  oscuro usa el azul de marca aclarado (`--brand-on-dark: #8FA3DC`); los avisos
  informativos y chips usan el azul de marca (`#213C89`), sin celestes.
- Pantallas nuevas: `Pantalla` de `components/layout/Pantalla.tsx` (ver abajo)

### Estándar de pantallas

Todas las pantallas siguen el mismo orden y tamaños (`components/layout/Pantalla.tsx`):

1. **Header** (alto 52, título 16/500): título a la izquierda y **todas las
   acciones de la pantalla a la derecha** (Exportar, Nuevo…, acciones de
   flujo). Nada de botones de acción dentro de las tarjetas.
2. **TabBar** (si hay pestañas): siempre entre el header y los filtros.
3. **Una sola barra de filtros**: búsqueda y todos los filtros de la vista,
   funcionales en vivo. A la derecha, el contador de registros.
   Cuando hay filas seleccionadas aparece, **debajo de los filtros**, la barra
   de **acciones masivas**: franja oscura del color del menú con «N seleccionados ·
   Deseleccionar» y las acciones a la derecha (patrón de Digital Invoices).
   Las casillas de selección son de borde gris claro.
4. **Cuerpo** con scroll propio.

Piezas:

- `Pantalla({ titulo, acciones, tabs, filtros, filtrosDerecha, seleccion })`.
- `useSeleccion()` + `CheckTodos` / `CheckFila` para listas con acciones masivas; `BarraMasiva` / `AccionesMasivas` dibujan la barra oscura.
- `conRanuras` + `FiltrosEnBarra` / `AccionesEnHeader` / `TabsEnBarra`: un
  componente hijo (contenido de una pestaña, una sección de Configuración)
  publica sus filtros, su Exportar y sus pestañas en la barra única de la
  pantalla. `BarraSeccion` y `useRanuraPrincipal` resuelven el caso de varias
  listas en una misma pantalla (la primera usa la barra; el resto, en línea).
- **Exportar** (`BotonExportar`): un único botón en el header que exporta lo
  que se está viendo, con los filtros aplicados, en CSV, XLS o PDF, con
  encabezado y criterio opcionales. Los nombres de archivo van sin tildes.
- **Modales**: una sola forma (`ModalBase`: título 14/500, cuerpo con padding
  20, pie a la derecha). Toda confirmación usa `Confirmacion` (o `Alerta`,
  que delega en ella): acciones destructivas en rojo, nunca `window.confirm`.

Acciones masivas por pantalla:

| Pantalla | Acciones masivas |
|---|---|
| Mapa de habitaciones | Marcar limpias / sucias, Bloquear libres, Desbloquear (se selecciona por tarjeta o por tipo de habitación) |
| Estado de las habitaciones | Marcar sucia / limpia / no requiere, Asignar camarera |
| Distribución de camareras | Asignar a (también se arrastran las habitaciones entre camareras) |
| Cambio de sábanas | Marcar cambiado |
| Perfiles | Exportar selección, Marcar / quitar VIP |
| Tareas | Completar, Cambiar estado, Asignar responsable, Eliminar |
| Reservas | Confirmar, Exportar selección, Anular (motivo obligatorio) |
| Asignación de habitaciones | Asignar automáticamente (primera libre del tipo) |
| Llegadas / salidas, Folios, Folios externos | Exportar selección |
| Depósitos en garantía | Exportar selección, Anular (motivo obligatorio) |
| Gestión de auditorías | Ver / descargar reportes seleccionados, Exportar selección |
| Catálogos de Configuración | Activar, Desactivar, Exportar selección, Eliminar |

### Estándar de reportes

Todos los reportes de la plataforma (Hospedaje, Facturación, Pronóstico y Auditoría) se ven **como tabla en el
sistema** y **como documento solo al imprimir o exportar** (`components/reportes/`):

- `useFiltros(defs)` (`filtros.tsx`): filtros declarativos (búsqueda, multi, único, radio, check, toggle, fecha,
  rango) con chips, «Limpiar» y persistencia en la URL (`?f.clave=`).
- `PantallaReporte` (`Reporte.tsx`): header estándar (con selector de reporte `?r=` cuando una pantalla agrupa
  varios), contadores, tabla paginada (50 filas, repite el encabezado de grupo «(cont.)») con totales fijos,
  Imprimir (impresora, encabezado y filtros opcionales) y Exportar (CSV / XLS / PDF).
- `DocumentoReporte` (`Documento.tsx`): el documento impreso/PDF — identidad del hotel, título y período, línea de FILTROS,
  tablas, y pie «Empresa · Generado · Página X de Y» en cada página.
- Navegación única: el menú «Reportes» abre directamente el primer reporte y se cambia de reporte con el selector del título (`?r=`); no hay páginas índice.
- Un reporte nuevo solo arma `DatosReporte` (`bloques` → `columnas` + `filas` + `total`) con `tabla()` / `cols()`.

## Vercel

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_URL_MENU` | Menú principal de Seven Suite («Ir al menú principal» y «Cerrar sesión») |
| `NEXT_PUBLIC_URL_ACC`, `_DICR`, `_FDK`, `_POS`… | Enlaces del modal «Módulos» |

## Correr

```bash
npm install
npm run dev
npm run typecheck && npm run lint && npm run build   # antes de subir cambios
```

## Configuración (`/configuracion`)

Todo vive en `components/configuracion/`:

| Archivo | Qué tiene |
|---|---|
| `datos.ts`, `inicial.ts`, `inicialEmpresa.ts` | Tipos y catálogos (`datos.ts`) y datos iniciales. Reemplazar `INICIAL` por la API. |
| `store.tsx` | Estado de toda la configuración. «Guardar cambios» fija una copia; «Cancelar» vuelve a ella. Persistir en `guardar()` cuando haya backend. |
| `CrudCatalogo.tsx` | Patrón CRUD de catálogos: búsqueda, modal nuevo/editar, validación, «¿Eliminar X?», aviso de cambios sin guardar, paginación, popover de detalle. Cada catálogo solo declara columnas y campos. |
| `kit.tsx`, `kit/` | Tarjeta (título + descripción + línea, como Accounting), tabla con borde y encabezado gris, multiselección, color, popover, modales, plantillas CSV. |
| `secciones/*.tsx` | Una pantalla por ítem del menú. |
| `permisos/` | Árbol de permisos de Front Desk (`arbol.ts`), usuarios y roles de ejemplo, su estado (`store.tsx`) y el árbol en pantalla (`Arbol.tsx`). |

La Configuración sigue la base de Accounting: Empresa, Usuarios y Permisos y Parámetros generales tienen sus mismas pestañas
y el mismo diseño (solo cambian el color y los datos). Lo que es solo de Accounting (Configuración contable, Firmas, Catálogo
de cuentas…) no se copia. Después vienen las pestañas y secciones propias de Front Desk.

| Sección | Pestañas |
|---|---|
| Empresa | Datos de empresa (Identificación, Contacto, Fecha de operación) · Consecutivos de documentos · Asignación de impresoras · Impresoras · Tipos de documento. «Importar datos» es un botón del header que abre el catálogo de plantillas |
| Usuarios y Permisos | Usuarios · Permisos · Roles |
| Parámetros generales | Monedas · Tipo de cambio · Operación · Folios y cargos · Comportamiento · Políticas |
| Alojamiento | Habitaciones · Grupos de disponibilidad · Regímenes · Camareras / Mucamas · Rangos de habitación |
| Tarifas / Contratos | Tarifario · Contratos · Empresas · Mercados · Agentes de ventas · Referidores |
| Facturación | Producción · Servicios · Tipos de cobro · Impuestos · Exoneración · Descuentos · Folios externos |
| Caja y cierre | Fondo de caja · Cajeros · Seguridad · Cierre diario |
| Operaciones | Tipos de tareas · Nacionalidades |
| Correo electrónico | Cuenta · Correos especiales · Notificaciones · Histórico de correos enviados |
| Integraciones | Web Check In · Formulario Check-In · Errores de sincronización · DEGA |

**Consecutivos de documentos** (`secciones/Consecutivos.tsx`): formato con texto fijo + `{AAAA}`, `{MM}` y `{N:k}`, reinicio
Nunca / Anual / Mensual (mensual exige año y mes; anual, año) y el próximo número calculado con la fecha hotelera.
**Monedas y Tipo de cambio**: la moneda principal es la de referencia (CRC); la tasa vigente de cada divisa es el último
registro del historial, y de ahí la toman Canje de divisas y Caja (`hotel/finanzas.ts`).

**Tarifario y Actualización** (`secciones/Tarifario.tsx`, `secciones/ActualizacionTarifas.tsx` + `ActualizacionPiezas.tsx`, `secciones/DetalleTarifa.tsx`, lógica en `tarifario.ts`):
- Un solo botón **Actualización** en el header con dos modalidades: **Masiva** (varias tarifas y tipos por período) y **Por tarifa** (crear o editar una tarifa; ahí se cambia el precio base de forma permanente).
- Masiva, en un solo formulario (como el sistema actual): Desde / Hasta y días de la semana (sin días marcados = todos), listas de Tipo de habitación y Tarifa con casilla «todos» (las derivadas en cursiva), dos secciones siempre visibles, sin casillas para activarlas (un campo vacío no cambia ese valor): «Precio por noche» (Tarifa = fijar, aumentar o disminuir por monto o %) y «Pax adicionales»: un precio base de adulto y niño para cada persona adicional; con «Hacer desglose por pax adicional» se agregan filas Pax adicional N (con el total de personas cuando los tipos elegidos tienen la misma ocupación base) y las personas sin fila o los campos vacíos usan el base. Solo aplica hasta la capacidad de cada tipo. Resumen «tarifas × tipos × días» al pie. Guardar / Cancelar.
- Los cambios quedan como valores por día en la grilla y pendientes hasta «Guardar cambios». Cerrar ventas, CTA, CTD y estancias se cambian en la grilla.
- En la grilla se marcan filas (tarifa × tipo) y «Actualizar seleccionadas» abre la masiva con esa selección.
- Clic en el nombre de una tarifa abre su detalle en panel lateral (precio del día por tipo, pax adicionales, restricciones, derivación) con «Editar tarifa» y «Actualizar precios».
- El editor de tarifa permite pax adicionales por escalón; la grilla tiene las vistas «Adulto/Niño Extra · Pax N».

Las direcciones anteriores (`/configuracion/general`, `/ama-de-llaves`, `/cierre-diario`,
`/integraciones/*`, `/sistema/*`…) redirigen a su sección nueva (`next.config.ts`).

**Usuarios y permisos** sigue el patrón de la suite: categorías (Operativo, Configuración) ›
módulos en acordeón › grupos › permisos en tres columnas, con «Marcar todo / Quitar todo»
en cada nivel y búsqueda. Los permisos «por tipo» se eligen con chips (p. ej. Crear reserva:
Directa / Agencia; Exportar: CSV / XLS / PDF; Ver caja: Propia / Todos los cajeros) y se
guardan como `clave:opción`. Los roles son plantillas: al editar uno con usuarios se elige
guardar solo el rol o aplicarlo también a sus usuarios. Esta sección guarda con sus propios
botones (no usa «Guardar cambios» de Configuración). Los permisos todavía no restringen las
pantallas: eso se conecta cuando exista el backend de sesión.

Supuestos fuera del diseño: Impresoras y Seven DEGA no tenían pantalla (propuesta base);
Contratos usa los campos de la historia de usuario (vigencia, cupos, release, tarifa); la
actualización masiva agrega rango de fechas. La importación lee CSV (la plantilla se descarga en CSV y Excel la abre).

## Dashboard y Hospedaje (`/`, `/hospedaje/*`)

Datos operativos compartidos en `components/hotel/` (habitaciones, reservas, perfiles, tareas, cajas):
el store vive en el Shell, así que un check-out en el Mapa se refleja en el Dashboard y los Reportes.

| Ruta | Componente |
|---|---|
| `/` | `components/dashboard/Dashboard.tsx` + `Operativo.tsx` / `Financiero.tsx` (reportes rápidos; datos derivados en `dashboard/datos.ts`) |
| `/hospedaje/mapa-de-habitaciones` | `components/hospedaje/Mapa.tsx` + `mapa/` (agrupado por **tipo de habitación**, plegable; chips Todas / Listas para vender / Llegan hoy / Salen hoy / Ocupadas / Sucias / Bloqueadas; vista Tarjetas o Compacta; acción rápida según el estado; **arrastrar y soltar** llegadas sin habitación y huéspedes a una habitación libre; bandeja «Hoy» con llegadas sin habitación, por registrar y salidas; panel lateral y menú contextual; bloqueo rápido con fecha final opcional) |
| `/hospedaje/perfiles` | `components/hospedaje/Perfiles.tsx` + `perfiles/` (se reconoce por el nombre; detalle con resumen, estancias, preferencias y facturación) |
| `/hospedaje/tareas` | `components/hospedaje/Tareas.tsx` + `tareas/` (pestañas por estado: Pendientes · En proceso · Atrasadas · Completadas · Anuladas · Todas; detalle en panel lateral con historial e Iniciar / Completar / Editar / Duplicar / Anular / Eliminar; **Anulada** solo desde Pendiente, con motivo — una atrasada solo se elimina; edición y bloqueo en modales aparte) |
| `/hospedaje/reportes?r=` | `components/hospedaje/Reportes.tsx`: una sola pantalla con selector de reporte (registros sin perfiles, listado de ocupación, saldos en el pick, etiquetas), igual que Pronóstico, Auditoría y Facturación; las rutas anteriores redirigen |

**Dashboard.** Sigue el diseño de referencia (Operativo primero, Financiero después) dentro del estándar de pantallas:
header con Exportar · Nueva reserva · Planificador ↗ · Reportes, y la barra de filtros con el **Día actual**, que mueve
todo el tablero (llegadas, salidas, habitaciones, tareas urgentes, KPIs, forecast y contratos). *Operativo*: Llegadas y
Salidas (dona + Check-In / Check-Out), Habitaciones (ocupación y limpieza), Tareas por estado, Tareas urgentes,
Disponibilidad por tipo (1D · 7D · 1M · 1Y · Custom, 7 noches por página) y Alertas con «Revisar». *Financiero*: KPIs
(ADR, RevPAR, RevPOR, Ocupación vs. mes anterior; ingresos diarios y mensuales), Ingresos totales en el tiempo
(1D · 7D · 1M · 1Y por mes · Custom), Forecast de 7 días y top 5 de Contratos. Para aligerar el Operativo, Tareas es
visual (barra por estado con accesos a cada pestaña + tablero Atrasadas / Vencen hoy / Mañana con el responsable) y
Alertas muestra las 3 primeras con «Ver todas». Las cajas abiertas ya no están en el
Dashboard: se gestionan en Facturación › Caja.

Flujos de check-in/out compartidos: `components/hotel/checkin.tsx` (con `CheckInFormulario.tsx` y `TarjetaRegistro.tsx`).

- Los datos están en memoria (semilla determinista en `hotel/semilla.ts`, fecha hotelera `HOY` en `hotel/datos.ts`); se reinician al recargar.
  Para conectar la API, reemplazar `crearSemilla()` y convertir cada acción de `hotel/store.tsx` en una llamada.
- «Excel» exporta CSV; «PDF» usa la impresión del navegador con la plantilla de reporte del diseño.
- La consulta DICR de Perfiles está simulada (`REGISTRO_DICR` en `perfiles/FormPerfil.tsx`).
- El QR de Web Check-In usa api.qrserver.com (requiere internet).

## Facturación (`/facturacion/*`)

Implementa los diseños «Canje de divisas», «Caja» y «Folios». Los datos viven en el mismo store
de Front Desk (`useHotel()`), así que un pago en un folio aparece en la caja del cajero, en Vouchers,
en Transacciones diarias y en el saldo de la reserva (Mapa, Dashboard, Saldos en el pick).

| Ruta | Componente | Qué tiene |
|---|---|---|
| `/facturacion/canje-de-divisas` | `CanjeDivisas.tsx` | Canje rápido en la misma pantalla (huésped en casa o perfil, monedas con ⇄, «entrega» o «quiere recibir», montos rápidos, comisión sugerida), tasas del día, totales de hoy, historial; recibo de 2 copias |
| `/facturacion/caja` | `Caja.tsx` + `caja/` | **Una sola caja por hotel**; lo que cambian son los cajeros. Un **Cajero Responsable** abre y cierra la caja del día y ve a todos los cajeros (tarjetas por cajero, movimientos e historial de todos, forzar cierre, abrir turno manual) y lo propio; el **Cajero** regular solo ve sus movimientos y sus turnos. Turnos y cambio de turno con conteo de billetes, precierre (X), arqueo → resumen → firma (trazo + PIN), cierre del día con firma de contabilidad, reportes |
| `/facturacion/folios-cuenta-casa` | `FoliosCasa.tsx` | Cargo interno, corrección, traslado, liquidación, exportación por detalle o por concepto |
| `/facturacion/folios-externos` | `FoliosExternos.tsx` | Lista por nombre + panel lateral del folio (`folios/Panel.tsx`: resumen Cargos / Pagado / Saldo / Crédito y acciones directas), wizard de 4 pasos, exoneración, referencia, prefactura, cierre y factura, NC/ND |
| `/facturacion/folios` | `Folios.tsx` | Vistas Abiertos / En casa / Agencias por cobrar / Con saldo / Exceden crédito / Cerrados; mismo panel y operaciones; traslado y redirección de cargos |
| `/facturacion/historico-de-folios` | `HistoricoFolios.tsx` | 8 criterios de orden + opciones (resumido, sin agrupar, por moneda, moneda local) |
| `/facturacion/transacciones-diarias` | `TransaccionesDiarias.tsx` | 9 sub-reportes (`?r=dia|transcript|resumen|historicas|impuestos|operativo|tarifa|empresa|mercado`) |
| `/facturacion/depositos-en-garantia` | `Depositos.tsx` | Alta con vuelto/comisión, edición, anulación, comprobante y comprobante de anulación |
| `/facturacion/vouchers` | `Vouchers.tsx` | Vouchers e histórico de tarjetas (lotes por terminal) |

Datos y acciones: `components/hotel/finanzas.ts` (tipos y catálogos), `semillaFinanzas.ts` (semilla determinista) y
`components/hotel/accionesFinanzas.ts` (acciones que se suman a `useHotel()`).

Supuestos de Facturación:
- No hay login: Caja tiene un selector de usuario (Cajero Responsable / Regular / Administrador). PIN de prueba: **1234**. Canjes, pagos y depósitos se registran en el turno abierto del usuario elegido; si no tiene turno, se bloquea con aviso. Configuración → Caja y cierre → Cajeros muestra el rol de cada cajero y qué puede ver (el rol se asigna en Usuarios y permisos).
- Una sola tasa del día por moneda, tomada de Configuración → Monedas (CRC 506 = BCCR del diseño). Modalidad de fondo y método de firma salen de Configuración → Caja (por defecto fondo variable y firma «ambos»).
- «Cajas abiertas» del Dashboard = turnos abiertos de Caja.
- El folio de una reserva se calcula: hospedaje y régimen por noche + cargos de la reserva + movimientos manuales. Número de folio = «7» + número de reserva.
- La factura electrónica se simula (documento imprimible); el envío real a Hacienda/DICR queda para el backend.

## Reservaciones (`/reservaciones/*`)

| Ruta | Pantalla |
|---|---|
| `/reservaciones/planificador` | Línea de tiempo por habitación (reservas por estado, bloqueos, preasignaciones, % ocupación diaria). Clic en reserva → detalle; clic en día libre → nueva reserva. |
| `/reservaciones/reservas` | Listado Directa/Agencia + filtros avanzados (6 secciones), detalle con estados, acciones y 8–9 pestañas, nueva reserva multi-habitación. `?id=` abre una reserva, `?nueva=1&hab=&entrada=` precarga una nueva. |
| `/reservaciones/asignacion-de-habitaciones` | Asignación y preasignación de habitaciones. |
| `/reservaciones/llegadas-y-salidas` | Listado de llegadas / salidas (solo lectura) con notas y exportación. |

### Nueva reserva y modalidades

La creación es una sola pantalla guiada con el resumen fijo a la derecha (cliente, estancia, noches, huéspedes, habitaciones, importes, depósito requerido y las acciones **Confirmar reserva** / **Guardar como solicitada** / Descartar):

1. **Cliente y tarifa** (perfil o nombre libre, tarifa, moneda).
2. **Estancia y habitaciones**: una línea por habitación con fechas, tipo (disponibilidad en vivo), habitación opcional, pax, régimen y precio; el menú «⋯» de cada línea tiene Cargos, Duplicar y Eliminar.
3. **¿Cómo se maneja esta reserva?** — obligatorio si hay más de una habitación:
   - **Individual (múltiple)**: cada habitación es su propia reserva y cuenta. En el **primer check-in** se pregunta si la facturación se separa por habitación o va en **una sola factura** (`facturaUnica`, se aplica a todas las líneas).
   - **Grupal**: todo va a una sola factura. En Facturación de la reserva la **cuenta 1 es siempre el folio de agencia** (hospedaje y régimen de todas las habitaciones, a nombre de la empresa/agencia) y después hay **una cuenta de consumo por habitación**.
4. **Huésped**: por defecto «Mismo huésped para todas las habitaciones»; los datos de cada habitación se completan luego en la gestión de la reserva (pestaña Huésped).
5. Otras informaciones y Observaciones (plegables).

Cuando la reserva se cobra en una sola factura (grupo, o individual con factura única), las cuentas por habitación no se cierran por separado: la cuenta 1 muestra el desglose (hospedaje, régimen, consumos), la **Prefactura única** y **Facturar todo en una factura** (disponible tras el check-out de todas las habitaciones), que cierra todas las cuentas con un mismo documento (`facturarAgrupado`). El check-out no exige saldar la cuenta de cada habitación en esos casos.

Supuestos: las reservas de varias habitaciones son varias líneas con el mismo `grupo` (RD-4400_1, _2…) y `modalidad` ('individual' | 'grupo'); cada habitación tiene su folio y desde «Facturación» de la reserva se pueden crear cuentas adicionales (nombre, moneda, habitación), que también aparecen en Facturación › Folios externos y solo se eliminan si están en 0; en los grupos el hospedaje sigue calculándose por habitación y el «folio de agencia» lo reúne para la factura única; el Planificador no tenía diseño y se hizo como Gantt; los estados de la reserva son Solicitada, Confirmada, Lista de espera, In-House, Completada, No-Show y Anulada.

## Pronóstico / Estadísticas (`/pronostico-estadisticas/*`)

Pronóstico por tipo de habitación (Disponibilidad/Ocupación, filtros de grupo, estado, contrato y «Más filtros», detalle por celda), Detalle del tipo de habitación (Estancias, Fuera de orden, Disponibles, Tarifas) y 8 reportes (Resumen de ocupación, Ocupación acumulada, Pronóstico por régimen, Explotación de segmentos, Reservas realizadas, Plazos de depósitos, Informe diario, Pronóstico de ingresos) con exportación CSV / XLS / PDF.

Supuestos: el menú de la suite no tiene tercer nivel, así que el submenú «Reportes ›» se reemplaza por un selector en el encabezado (`?r=`); los cupos/release por contrato están en `CUPOS` (reservas.ts); los meses anteriores a la ventana de datos de ejemplo del «Informe diario» usan un histórico simulado.

## Auditoría (`/auditoria/*`)

Gestión de auditorías (historial, reportes generados, configuración de cierre y de auditoría automática), asistente «Generar auditoría nocturna» (preauditoría con verificaciones, envío por correo, selección de reportes por correo, descuentos, diagnóstico de enlaces contables, contraseña si ya hubo cierre hoy), Problemas de sincronización y 3 reportes (Check-In en proceso, Reservas con habitaciones incorrectas, Sincronización con Channel Managers).

Supuestos: la fecha hotelera de ejemplo es fija (06/10/2026), por lo que la auditoría registra el cierre y aplica sus efectos (No-Show de llegadas no presentadas, prórrogas automáticas, habitaciones sucias) sin avanzar la fecha; los reportes de cierres anteriores se recalculan con los datos actuales para esa fecha; los correos son simulados.

## Ama de llaves (`/ama-de-llaves/*`)

Implementa los diseños «Estado de las habitaciones» (escritorio y móvil de camareras) y «Bloqueo de habitaciones».
Todo vive en el store del hotel (`useHotel()`), así que un cambio se ve al instante en el Mapa, el Planificador,
el inventario de reservas y la vista de la camarera.

| Ruta | Componente | Qué tiene |
|---|---|---|
| `/ama-de-llaves` | Redirige a **Distribución de camareras**, primera opción del menú |
| `/ama-de-llaves/estado-de-habitaciones` | `components/ama-de-llaves/EstadoHabitaciones.tsx` | Hab · Estado (Libre / Ocupada / F/O) · Pax · Estado de limpieza (Sucia / Limpia / No requiere, excluyentes) · Tiempo de limpieza (en curso / pausada / terminada) · Discrepancias en línea con adjuntos · Camarera. Búsqueda por número, filtros de limpieza, disponibilidad y camarera (AND, en vivo), contadores clicables, «Limpiar todas las habitaciones» con alerta, guardado automático, Exportar |
| `/ama-de-llaves/estado-de-habitaciones/camarera?c=` | `VistaCamarera.tsx` | Vista móvil: solo las habitaciones asignadas, pestañas Todas / Sucias / Limpias / Sin limpieza con conteo en vivo, tarjetas que se expanden de una en una, cronómetro **Iniciar / Pausar / Reanudar / Finalizar** (mide la duración; Finalizar la deja Limpia), «No requiere limpieza», discrepancia con **fotos o archivos adjuntos** (cámara del teléfono) y observaciones internas (se guardan al salir del campo). En el teléfono ocupa toda la pantalla |
| `/ama-de-llaves/bloqueo-de-habitaciones` | `BloqueoHabitaciones.tsx` | Tabla editable en línea (Habitación, Desde, Hasta vacío = indefinido, Motivo); «Crear nuevo bloqueo» agrega una fila que se guarda sola al completarla y salir; desplegable con búsqueda que solo ofrece habitaciones sin bloqueo en el período; validaciones (Desde ≥ fecha hotelera, Hasta > Desde, sin solaparse, ocupada → empieza a la salida); aviso de reservas asignadas en el período; bloqueos de tareas (enlazan a Tareas); historial con «Mostrar finalizados»; eliminar con alerta; Exportar |
| `/ama-de-llaves/distribucion-de-camareras` | `DistribucionCamareras.tsx` | Tablero por camarera (+ Sin asignar) con carga estimada (salida 45 min, limpieza 30, repaso 25); arrastrar o seleccionar y «Asignar a»; «Distribuir automáticamente» por carga; hojas de trabajo imprimibles por camarera |
| `/ama-de-llaves/cambio-de-sabanas` | `CambioSabanas.tsx` | Ocupadas con último y próximo cambio según la política (cada N noches): Atrasado / Toca hoy / Al día / Sale antes / Sale hoy; «Marcar cambiado» individual o masivo; Exportar |

Reglas de bloqueo (`hotel/store.tsx`, `reservaciones/inventario.ts`):
- Los bloqueos viven en `bloqueos` (`BloqueoHab`); los de tareas siguen en la tarea. `bloqueadasEn()` y
  `bloqueadaEnEstancia()` suman ambos, así que el Planificador lo pinta como fuera de orden, el inventario lo descuenta
  y el selector de habitación de reservas no la ofrece en esas fechas.
- El estado «Bloqueada» del Mapa se deriva después de cada operación: una habitación libre con bloqueo vigente pasa a
  Bloqueada (F/O) y al terminar o eliminar el bloqueo vuelve a Libre. El bloqueo rápido del Mapa crea un bloqueo
  desde hoy (con fecha final opcional); al desbloquear, un bloqueo que empezó antes de hoy termina ayer y queda en el historial.
- Supuestos: no hay login, así que la vista de camarera tiene un selector «Ver como»; las camareras activas son las de
  Configuración → Alojamiento → Camareras / Mucamas (`CAMARERAS` en `hotel/datos.ts`); la política de sábanas se elige
  en la pantalla (por defecto cada 3 noches).

## Planificador

`components/reservaciones/Planificador.tsx`. Es la pieza central, así que nada saca al usuario de la pantalla: clic en
una reserva (o en una reserva sin habitación) abre un panel a la derecha con huésped, fechas, tarifa, total / pagado /
saldo y las acciones Check-in, Check-out, Cambiar / Asignar habitación; «Reserva completa ↗» es la única salida y es
explícita. Clic en un día libre (o «Nueva reserva») abre la reserva rápida en un modal con la habitación y la fecha.
La leyenda incluye ★ VIP.

- Periodo: la fecha de inicio (por defecto hoy) más 7, 15, 20 o 30 días, o «Personalizado» con fecha final (hasta 90 días).
  En personalizado, ‹ › y «Hoy» mueven las dos fechas y conservan el largo del periodo.
- «Asignar habitaciones» va en el header con el número de reservas sin habitación del periodo; abre la lista (clic abre
  el panel de la reserva) y el acceso a Asignación de habitaciones. Solo aparece si hay reservas sin habitación.

## Historial de cambios

### Caja, check-in, folios y Configuración (22/10/2026, tercera revisión)

- **Caja: cierres de turno y de caja.** El flujo funcionaba, pero las validaciones quedaban fuera de la vista en pantallas de 768 px de alto y parecía que los botones no hacían nada. Ahora:
  - Los avisos salen en la barra fija del pie, junto a los botones, en la página y en los modales (`AvisoPie` en `facturacion/comun.tsx`).
  - El arqueo muestra en vivo «declarado · esperado · diferencia» y la justificación de la diferencia va arriba del desglose.
  - La firma indica el PIN de prueba (1234) y da mensajes claros; el área de firma toma el ancho real dentro de los modales.
  - «Cerrar mi turno» desde el cierre del día vuelve al cierre del día (`desde: 'cierreDia'` en la vista), y si quedan turnos abiertos el pie dice cuál falta.
- **Mapa de habitaciones:** el pie del panel de la habitación es una sola fila: «Más acciones» a la izquierda (Mover, Prepago, Editar bloqueo y, al final en rojo, Anular) y a la derecha la consulta más usada y la acción principal.
- **Registro del huésped** (`hotel/TarjetaRegistro.tsx`): un solo componente con tres vistas excluyentes.
  - Pendiente: enlaces del Web Check-In por idioma (QR, copiar, «Abrir aquí»), «Completar aquí en recepción» y «Marcar como recibido».
  - Formulario: el mismo del Web Check-In con selector de idioma, documentos y firma, llenado por el colaborador.
  - Completada: solo la tarjeta, con Imprimir y Editar datos.
  - La reserva guarda `registro` (origen web o recepción, fecha, idioma). En Llegadas hay una columna con estado y un solo enlace; «Check-In» con el registro pendiente abre el registro y al guardarlo sigue al check-in. Reservas y el detalle de la reserva tienen una sola entrada en lugar de «Tarjeta» y «Web Check-In» por separado.
- **Check-in con estancia por tramos** (`hotel/checkinEstancia.tsx`): sección «Estancia y habitaciones» con líneas como «Nueva reserva» (desde, hasta, noches, tipo, habitación libre en ese tramo, precio) y barra de tiempo. «Dividir estancia» programa cambios de habitación. Al confirmar, la acción `dividirEstancia` (`hotel/reservas.ts`) deja la reserva con el primer tramo y crea una línea confirmada del mismo grupo por cada tramo siguiente (`continuaDe`, habitación asignada, tarjeta lista, `facturaUnica`). El Planificador, el Mapa y las llegadas lo muestran sin cambios extra. Con un tramo, la salida editable sigue funcionando como prórroga.
- **Creación de folios** (`layout/HojaCreacion.tsx` + `facturacion/folios/NuevoFolio.tsx`): hoja a pantalla completa con índice de secciones, todas las secciones a la vista (las opcionales marcadas), resumen fijo con «Crear» y confirmación al salir con datos. Reemplaza el asistente de 4 pasos del folio externo y agrega **Nueva cuenta casa** (antes no existía). «Nueva cuenta» de la reserva pasó al panel lateral estándar.
- **Configuración: un solo patrón para la información por niveles** (`configuracion/kit/maestro.tsx`), tomado del detalle de la reserva:
  1. Pestañas de la pantalla.
  2. Sub-tipo con control segmentado (`SubTabs`; `PillTabs` delega en él).
  3. Lista maestra en recuadro con encabezado y contador; el elemento activo con fondo de marca y barra a la izquierda (`ItemMaestro`).
  4. Detalle en recuadro con `CabeceraDetalle` (título, subtítulo, acciones y «Eliminar» siempre igual) y pestañas subrayadas (`CardTabs`).
  - Aplicado a Producción, Servicios, Contratos, Cupos del contrato, Correo (cuentas con pestañas Servidor · Datos predefinidos · Otros, y correos especiales) e Integraciones. Facturación y Correo ya no repiten el nombre de la sección dentro de la tarjeta: el título es la pestaña con una línea de ayuda.
- Supuestos: los QR del Web Check-In siguen usando api.qrserver.com; los cambios de habitación de una estancia dividida se ejecutan como el check-in de la línea siguiente el día del cambio.

### API Key y pendientes de la revisión (22/10/2026)

- **API Key** en Configuración › Empresa (nueva pestaña, también en el árbol de permisos): la llave con la que Management se conecta a Front Desk, con Mostrar, Copiar y Generar nueva. Componente común de la suite `components/ui/integracion/SeccionApiKey.tsx`; la llave (`fdk_live_` + 48 caracteres) se genera y guarda en el navegador (`components/configuracion/apiKey.ts`) hasta que el módulo tenga servidor.
- **Depósitos en garantía** con pestañas Todos · Adelantados (reservas por llegar) · En casa · Folios externos · Sin asignar, columna «Llegada» con los días que faltan, importes con moneda y 50 filas por página. `?vista=adelantados` abre esa pestaña.
- **Caja**: el resumen del turno ocupa menos alto; el desglose por forma de pago va en una línea debajo de los indicadores.
- **Estado de las habitaciones**: Iniciar, Pausar, Reanudar y Finalizar la limpieza también desde el escritorio, junto al tiempo de cada habitación.

### Folios, listados y pantallas pendientes de la segunda revisión (22/10/2026)

- **Panel lateral estándar** (`components/suite/PanelLateral.tsx`): media pantalla a la derecha con cabecera, contenido con scroll y barra de acciones fija al pie. Lo usan todas las operaciones de folios (Nuevo cargo, Trasladar, Redirigir, Corrección, Liquidar, Estado de cuenta, Asociar perfil, Asociar depósitos y el detalle de una línea), así el folio sigue visible a la izquierda.
- **Folios cuenta casa**: Corrección ya no cambia la pantalla; abre el panel con los cargos vigentes para marcar. Liquidar muestra el resumen por concepto antes de confirmar. Clic en una línea abre su detalle (concepto, origen, estado, motivo, movimientos relacionados) con Corregir y Trasladar. El saldo de la cuenta va en la barra fija al pie. Trasladar, Corrección y Liquidar son botones secundarios.
- **Folio externo**: el panel del folio lleva la barra de acciones al pie: a la izquierda «Eliminar folio» y «Más acciones» (nuevo folio externo, asociar o cambiar perfil, asociar depósitos en garantía, trasladar, redirigir, corrección, exoneración, referencia, factura, nota, cerrar o reabrir); a la derecha Prefactura, Agregar cargo y Registrar pago. Eliminar avisa y bloquea si el folio tiene cargos, pagos, depósitos o saldo. Nuevas acciones del store: `asociarPerfil` y `asociarDepositos`.
- **Detalle del folio**: tablas de cargos, pagos y bitácora con el mismo formato (borde, encabezado gris, total gris); clic en un cargo abre su detalle. Dentro del panel no se repiten los botones en cada pestaña.
- **Histórico de folios**: una sola fecha («Fecha: Salida / Entrada / Emisión» + «Período») en lugar de dos rangos, búsqueda más corta y la agrupación dentro de «Opciones»; cabe en una sola barra en 1366 px.
- **Reportes**: los contadores son tarjetas sobre el fondo gris; las modalidades excluyentes (agrupar, vista) se suman a «Opciones» cuando el reporte tiene casillas. Los botones de filtro de selección única y de fecha tienen ancho máximo con puntos suspensivos (el valor completo queda en el título).
- **Vouchers y depósitos**: nuevo listado por defecto que une los vouchers de tarjeta y los depósitos en garantía (con su voucher si se pagaron con tarjeta), con tipo, documento, cliente, reserva, forma de pago, autorización, terminal, estado y moneda; se exporta e imprime como cualquier reporte. Siguen «Vouchers» e «Histórico de tarjetas».
- **Canje de divisas**: selección de filas con acciones masivas (exportar e imprimir la selección), filtro de fecha estándar y 50 filas por página.
- **Filtros de fecha**: Listados de caja, Detalle del tipo de habitación, Bloqueo de habitaciones e historial del perfil pasan del par de fechas al filtro de rango estándar.
- **Pronóstico**: «Período» en la barra (antes en Más filtros), tabla con el formato estándar sin tarjeta envolvente; la tabla de pronóstico comparte encabezado, celdas y bordes con los reportes.
- **Detalle de la reserva**: encabezado con número completo (RE/RL), titular y estado en una línea y debajo el tipo de reserva, fecha de creación, ID externo y modalidad; resumen con Perfil, Tarifa, Estancia (con noches), Habitaciones, Total, Pagado y Saldo. En Facturación, la cuenta muestra su estado, folio, factura y crédito y los importes en tarjetas.
- **Estado de las habitaciones**: columna «Hoy» (llega hoy, sale hoy, en casa hasta…, VIP), orden por prioridad (llegadas sin limpiar, salidas, ocupadas sucias, libres sucias), filtro «Hoy», tarjeta de avance del día con las habitaciones a preparar primero y la carga por camarera, y contadores de llegadas por preparar y salidas. «Marcar todas como limpias» pasa a botón secundario.
- Botones secundarios: se quitó el borde y texto azul de los que lo tenían (PDF de la reserva, Buscar del perfil, + Agregar habitación, Perfil de cliente y los botones contorneados de Configuración).

### Reglas comunes de la suite y segunda revisión (22/10/2026)

- **Management** en el selector de módulos (https://man-ten-eta.vercel.app/empresa, se puede cambiar con `NEXT_PUBLIC_URL_MGT`).
- **Montos** (`components/suite/Monto.tsx`): siempre 2 decimales (también en colones), coma para miles y punto para decimales; en tablas el signo de la moneda va a la izquierda y el número a la derecha. Lo aplican la celda de los catálogos, las tablas de reportes, los documentos impresos y las celdas de montos de caja, folios, reservas y check-in.
- **Paginación** (`components/suite/Paginacion.tsx`): la de Digital Invoices («1–50 de 595 · ‹ Anterior 1 … 6 Siguiente ›») en una barra fija al pie de la pantalla (`PieFijo`); dentro de un modal queda al final del contenido. La usan los reportes, catálogos, tareas, folios, depósitos, canjes, caja y el historial de perfiles.
- **Filtro de fecha** (`components/suite/FiltroFecha.tsx`): el de Digital Invoices (Limpiar, atajos, rango personalizado, «Hoy · …», Cancelar / Aplicar), con atajos desde la fecha hotelera. Reemplaza el rango de los reportes, `RangoBoton` y el filtro de Disponibilidad del Dashboard.
- **Barra de filtros en una sola línea** en los reportes: las opciones excluyentes van en desplegable y, con dos o más casillas o interruptores, se agrupan en «Opciones ▾».
- **Reportes**: tabla en tarjeta blanca sobre fondo gris, encabezado gris y fila de total fija.
- **Enlaces** en tablas siempre azules y subrayados.
- Dashboard: Pendientes en un gris más suave; hasta 4 tareas por bandeja con «Ver N más»; Disponibilidad con los encabezados alineados arriba (código y habitaciones en la primera línea).
- Reservas: consecutivos **RE** (cliente) y **RL** (agencia / rooming list) en todos los números.
- Tareas: confirmación al cambiar el tipo o el responsable (en la tabla y al guardar la edición); el bloqueo desde el detalle se edita en el mismo modal de la tarea; el recordatorio por correo se envía al correo del usuario y se quitó WhatsApp.
- Perfiles: identificación alineada arriba; «Información fiscal (crear receptor en DICR)» con **Consultar en Hacienda** (ruta `app/api/hacienda/contribuyente`, consulta pública por cédula) y buscador de actividad económica; Información adicional agrupada en Crédito, Condiciones comerciales y Preferencias del huésped.
- Mapa: detalle de la habitación con las acciones como botones en la barra fija del pie y el número de reserva como enlace.
- Caja: el estado de la caja va a la derecha de las pestañas (sin barra propia); «Tipo de cambio» sin «BCCR»; indicadores con separadores.
- Folios: estados en desplegable y estancia con el filtro de fecha estándar.
- Pendiente de esta revisión: detalle y acciones de folios (cuenta casa y externos) unificados con barra de acciones al pie, Histórico de folios, Vouchers + depósitos en un listado descargable, acciones masivas de exportar en Canje, encabezado y cuentas del detalle de la reserva, reportes y tablas de Pronóstico y Ama de llaves, y revisar una por una las barras de filtros de las demás pantallas.

### Revisión general: Dashboard, Hospedaje, Reservas, Facturación, reportes e Histórico (22/10/2026)

- **Dashboard**
  - Header con el filtro de período de la suite (modal con atajos y calendario de dos meses). El Operativo muestra el último día del período y el Financiero, todo el período (con un solo día, el gráfico muestra los 7 días que terminan en él).
  - Disponibilidad con el filtro corto «Período de fecha» (Hoy, Esta semana, Este mes, Próximo mes, Este trimestre, Este año, rango personalizado, Limpiar).
  - Donas con tooltip (nombre, cantidad y %). Llegadas y salidas más baja, con la misma altura que Habitaciones y 3 reservas por lado.
  - Tareas con los cinco estados más «Todas», en el mismo orden que la pantalla de Tareas.
  - Cupos garantizados: acción por fila (abre el contrato en la pestaña de cupos) y «Ver todos» con scroll cuando hay más de 5.
  - «Nueva reserva» abre el formulario completo de Reservas; el menú Reportes abre la pantalla de cada reporte (se creó «Ocupación por nacionalidades» en Reportes de hospedaje).
- **Hospedaje**
  - Mapa: los chips de estado pasan a un desplegable (una sola barra de filtros); «Editar bloqueo» en el menú, el panel y el modal; «Ver reserva» y «Nueva reserva» llevan a Reservas (con «atrás» se vuelve).
  - Bandeja «Hoy»: buscador, saltos entre secciones y detalle de cada reserva (las llegadas sin habitación siguen arrastrables e indican si tienen observaciones).
  - Perfiles: encabezado blanco y compacto, «Enviar correo electrónico», «Reserva» abre el formulario con el huésped elegido, el resumen ya no repite las últimas estancias, historial con paginación y barra fija de Guardar / Cancelar al editar.
  - Tareas: la pestaña «Todas» va primero y es la inicial.
- **Reservaciones**
  - Llegadas y salidas: columnas Adultos y Niños separadas y notas como ícono con popover.
  - Listados de check-in y check-out: pestañas Pendientes / Listas, huésped en dos líneas y notas como ícono.
  - Detalle de la reserva › Facturación: cuentas en una lista compacta de dos líneas con scroll (muchas cuentas ya no forman un menú gigante).
  - El Planificador y la reserva rápida abren el formulario completo.
- **Facturación › Canje de divisas**: listado de todos los canjes con filtros y detalle; «Nuevo canje» en el header abre el formulario (monedas en desplegables).
- **Reportes**: índice estándar por módulo (`components/reportes/Indice.tsx`) en Hospedaje, Pronóstico y Auditoría, con buscador y tarjetas por grupo; cada reporte tiene «‹ Reportes» para volver.
- **Histórico** (nuevo, `components/historico`): Estancias y huéspedes (por estancia o por huésped, repitentes), Bitácora de cambios (lo registrado en las reservas + ejemplos; tipo, antes → después, motivo, usuario), No-shows (agrupados por tarifa con subtotales) y Mensajes. Reemplaza los 8 históricos anteriores; Reservas / Rooming List, Depósitos en garantía, Canjes y Folios externos quedan en sus pantallas.
- Pendiente: pestaña de depósitos adelantados en Facturación › Depósitos, ajustes visuales de Caja y folios, y el color de los botones Check-in / Check-out (por confirmar).

### Cupos garantizados del Dashboard como listado (21/10/2026)

- La tarjeta de cupos con barras y mapa de calor no se entendía. Ahora es un listado de los cupos guardados el día elegido: contrato (código y tarifa), tipo de habitación, cupos por día, desde, guardados hasta y días que quedan (en amarillo si terminan en 7 días o menos), ordenado por los que terminan primero. Si la cantidad cambia dentro del período, se indica debajo («2 desde el dd/mm»).
- Debajo, «Empiezan en los próximos 30 días» con el mismo formato. Arriba, el total de habitaciones guardadas y de contratos.

### Dashboard, Configuración y Tarifario rediseñado (20/10/2026)

- **Dashboard › Operativo**
  - Colores de estado con los tokens de la suite (`C.success`, `C.error`, `C.warning`, `C.info`).
  - Llegadas y Salidas en una sola tarjeta de dos columnas «Llegadas y salidas» (dona, leyenda, hasta 4 reservas y botón Check-In / Check-Out) junto a Habitaciones.
  - Disponibilidad con el filtro de período estándar (`components/dashboard/Periodo.tsx`, igual al de Accounting): Día actual, próximos 7/28/90 días, esta semana, este mes, este año y Personalizado, con calendario de dos meses (doble clic = un solo día) e inputs desde–hasta. Financiero usa el mismo filtro con los períodos pasados.
  - Disponibilidad sin paginación: tabla con scroll y encabezado fijo, nombres largos de tipo en dos líneas con código y cantidad, columna Total; más de 62 días pasa a filas por mes con el mínimo.
  - Cupos garantizados visual: 4 indicadores, barras por contrato partidas por tipo y mapa de calor de los próximos 30 días. Enlaces separados a Contratos y a Tarifario (`?tab=`).
- **Configuración**
  - Empresa: se quitó la tarjeta Fecha de operación (el pie sigue mostrando la fecha hotelera).
  - Consecutivos: se quitó el aviso del contador; queda el de Digital Invoices.
  - Parámetros generales: pestañas Monedas, Tipo de cambio, **Reservas y habitaciones**, Folios y cargos, Políticas, **Nacionalidades** y **Tipos de tareas**. Se eliminaron Operación y Comportamiento: sus casillas tenían duplicados (asignar habitaciones, desbloquear, NTP) y se reagruparon por función, cada una con su explicación: Asignación y estado de habitaciones, Reservas, Check-in y registro. Los parámetros de cargos (máx. cargos de divisa, forma de venta, interno TCP) y «Mostrar habitaciones en facturas de agencia» pasaron a Folios y cargos. Las casillas de integraciones pasaron a Integraciones › **Servicios**.
  - La sección Operaciones se eliminó del menú y de permisos; `/configuracion/operaciones` redirige a Parámetros generales.
  - Empresas, Mercados, Agentes de ventas y Referidores: campo Activo, «Mostrar inactivos», activar / desactivar en lote; Empresas filtra por venta directa o por intermediario. Sin subtítulo: el buscador va directo a la tabla. Los selects de Contratos solo ofrecen los activos.
  - «Guardar cambios / Descartar» salen del header a una barra al pie que aparece solo con cambios, para no competir con las acciones de cada pestaña.
  - Contratos: la lista y el encabezado del contrato (nombre, vigencia, Activo y pestañas) quedan fijos al hacer scroll; Datos pasa a ser la primera pestaña.
- **Tarifario**
  - 15 días visibles, navegación ‹‹ ‹ fecha › ›› y Hoy; encabezado de días fijo al hacer scroll; día actual resaltado; números sin decimales cuando son enteros.
  - **Filtrar** (modal): mercado (tarifas de sus contratos), tipos de habitación y tarifas con buscador. Además Moneda, Vista global y Mostrar inactivos.
  - ⚡ ahora es el selector de vista de cada fila; editar la tarifa es un botón propio (lápiz); 🔗 marca las tarifas derivadas.
  - Ayuda con la explicación de cada vista.
  - Detalle de la tarifa: día navegable, cómo se calcula, resumen de todos los tipos (precio, cupos, venta abierta / cerrada, CTA / CTD, estancia) y detalle por tipo con cada concepto explicado y pax adicionales desglosados por persona (adulto / niño).
- Desplegables nativos: flecha propia a 10 px del borde derecho, igual que el texto a la izquierda (`app/globals.css`).
- Pendiente por confirmar: el significado exacto de «Confirmación automática de reserva con OE», «Tiempo sucursal (Stop Over)», «Plataforma aut. reservas agen. al check-in» y «Portada OTA / MPos»; se dejaron con una explicación provisional.

### Contratos completos sin Release (19/10/2026, tarde)

- Contratos volvía a tener solo vigencia, cupos y tarifa: se perdían funciones del sistema actual. Ahora es maestro-detalle (`secciones/Contratos.tsx`): lista con buscador y «Mostrar inactivos» a la izquierda; a la derecha **Datos** (código, descripción, nacionalidad, empresa, mercado, descuento, tarifario, vigencia, modo de pago, cuenta, tasa fija, C. Sáb., máx. días, saldo máximo, depósito en garantía, contrato CPL, Web Check-in automático, observaciones, activo) y las pestañas **Servicios de agencia** (servicio, por pax, pax, automático, precio), **Impuestos** (incluido en el precio), **Políticas** (texto por idioma), **Cupos y precios directos** (tipo de habitación a la izquierda; períodos De / A / cupos a la derecha, agregar y quitar) y **Restricción** (tipo, régimen, cerrado / CTA / CTD / estancia mín. / máx., estancias, desde, hasta, aplicar). Solo se quitó Release.
- Nuevo contrato y Eliminar en el header; los cambios usan «Guardar cambios / Cancelar» de Configuración.
- Pendiente por confirmar: qué significa «C. Sáb.» (se dejó con el mismo nombre) y el botón de tarjeta junto a «Saldo máximo» del sistema actual (no se incluyó).

### Cupos garantizados y pax de la masiva (19/10/2026)

- Actualización masiva: Pax adicionales funciona en una de dos modalidades. Sin desglose, precio base (adulto / niño) para cada adicional; al marcar «Hacer desglose por pax adicional» el precio base se oculta y solo cuentan las filas por persona (las filas vacías arrancan con el base que ya se había escrito). Quitar fila con ícono de papelera.
- **Release eliminado** en todo el módulo: contratos (campo y columna), pronóstico («Respetar release» y columna Release del detalle por tipo), Disponibilidad de cupos de la reserva y el texto del resumen de tarifas.
- **Cupos garantizados**: habitaciones de un tipo que se guardan cada día para una tarifa (y su contrato). Se guardan en el mapa del tarifario con la vista nueva «Cupos» (`components/configuracion/cupos.ts`: tramos, fijar y quitar).
  - Contratos: columna «Cupos garantizados» (resumen) y sección **Disponibilidad de cupos** por contrato con los tramos desde hoy (tipo, desde, hasta, días, cupos), Asignar / Editar / Quitar (`secciones/CuposContratos.tsx`).
  - Actualización masiva: sección «Cupos garantizados» (cupos por día para los tipos, tarifas y días elegidos; 0 quita el cupo).
  - Tarifario: vista «Cupos» en la grilla, editable por día.
  - Dashboard › Operativo: tarjeta **Cupos garantizados** con los vigentes del día (contrato / tarifa, tipo, cupos, vigente hasta), total guardado y los que empiezan en los próximos 30 días (`components/dashboard/Cupos.tsx`).
  - Datos de ejemplo de cupos para Agencias Fits, Ara Tours y Costa Rica Vacations.
- Pendiente: que la disponibilidad de la operación (Planificador, inventario, channel manager) descuente estos cupos cuando exista backend; hoy el inventario de reservas usa `CUPOS` de `hotel/reservas.ts`.

### Configuración: Empresa, monedas y Tarifario (15/10/2026, segunda ronda)

- Datos de empresa como la captura de referencia: Identificación (sin No. de legalización ni Citas de presentación; país solo Costa Rica, Nicaragua o Guatemala, por defecto Costa Rica) y Contacto. Se quitó «Actividad e idioma».
- Nueva tarjeta **Fecha de operación** con «Ver historial o cambiar»: fecha actual, origen, último cambio, nueva fecha + motivo y últimos cambios. Se guarda al instante (no espera «Guardar cambios») y el pie del sistema muestra esa fecha. El resto de los datos de ejemplo sigue usando la fecha fija `HOY` hasta que haya backend.
- Consecutivos: Reservas (RE) y Reservas de agencia · rooming list (RL); fuera Registros (check-in), Consultas de rooming, Facturas electrónicas y Notas de crédito (estas dos se configuran en Digital Invoices; hay un aviso).
- Se eliminó la pestaña Contabilidad (sistema contable, cuentas de cargo de divisa / no cheques y opciones contables). Las cuentas contables de impuestos, descuentos, tipos de cobro, conceptos y folios externos siguen en sus catálogos: pendiente confirmar si también salen.
- Las alertas por módulo pasan a Correo electrónico › **Notificaciones** (son correos de avisos de la operación, no contables).
- Importar datos: botón en el header de Empresa que abre el modal con las plantillas.
- Monedas como la captura: sin «Uso en Front Desk»; catálogo CRC, NIO, GTQ, USD y EUR; aviso amarillo; estado Activa / Inactiva como píldora.
- Tarifario: clic en el nombre de una tarifa abre su detalle en panel lateral (precio del día por tipo, personas adicionales, restricciones, derivación) con «Editar tarifa» y «Actualizar precios».
- Actualización masiva (12): un solo botón «Actualización» con las modalidades Masiva y Por tarifa; la masiva es un formulario único como el sistema actual (sin pasos, sin matriz ni vista previa). Las restricciones (cerrar ventas, CTA, CTD, estancias) salen de la masiva y se editan en la grilla.
- Pax adicionales de la masiva: precio base siempre visible; el desglose por persona es opcional y se suma debajo.
- Masiva (16/10, tarde): modal ancho a dos columnas sin scroll (izquierda: fechas, días y listas; derecha: precio y pax). Buscador en Tipo de habitación y Tarifa («todos» marca lo filtrado). Se quitó el resumen «tarifas × tipos × días» y la nota de pax sin desglose. Texto que explica por qué hace falta al menos un tipo y una tarifa. El desglose llega hasta los adicionales de la habitación más grande seleccionada y cada fila indica «Solo …» cuando no aplica a todas. Dato de ejemplo nuevo: tipo Villa Familiar (600V, base 2, máx. 10).
- Masiva (16/10): Precio por noche y Pax adicionales ya no se activan con casilla ni van en recuadros; son secciones separadas por una línea y se aplica lo que tenga datos. La única casilla es la del desglose.
- Pendiente con captura: Tipo de cambio (10).

### Planificador, Tarifario, Empresa y Mi cuenta (15/10/2026)

- Planificador (comentarios de Yader): el botón «Asignar habitaciones» sube al header con contador y lista desplegable; se quita la franja ancha de abajo. Periodo: inicio + 7 / 15 / 20 / 30 días o Personalizado (antes 14 / 21 / 31 días desde dos días atrás).
- Tarifario › Desglose por escalón: «+ Agregar escalón» llega solo hasta los adicionales que admite el tipo de habitación más grande (muestra «N de M») y la nota se reescribió.
- Empresa › Datos de empresa con el diseño de Digital Invoices: tarjetas Identificación (nombre legal, nombre comercial, tipo y número de identificación, país, moneda del país, zona horaria), Actividad e idioma y Contacto.
- Mi cuenta (`/mi-cuenta`), como en Digital Invoices: Mi perfil, Mis permisos (solo lectura), Contraseña e Impresora personal por tipo de documento. El menú Configuración pasa a tener «Mi cuenta» y «Configuración General».
- Los stores de Configuración y de Usuarios y Permisos suben al Shell: los lee Mi cuenta y los cambios ya no se pierden al salir de Configuración.

### Configuración con la base de Accounting (14/10/2026)

- Empresa, Usuarios y Permisos y Parámetros generales tienen las mismas pestañas y el mismo diseño que Accounting. Configuración contable y Firmas son de Accounting y no se copian; el enlace contable de Front Desk queda en Empresa › Contabilidad.
- Nuevas pantallas: Consecutivos de documentos (formato, reinicio, emitidos, próximo número), Asignación de impresoras, Tipos de documento y Tipo de cambio (historial, importar CSV, corregir tasa).
- Monedas pasa de Operaciones a Parámetros generales con el formato de Accounting; comisión, decimales y depósitos quedan en «Uso en Front Desk» de cada moneda.
- Dónde quedó cada campo anterior: ver el documento «MAN y Configuración de la suite».

### Corrección de Configuración (14/10/2026)

- **Consecutivos** y **Cuentas y numeración** vuelven a Parámetros generales › Parámetros, con sus 12 campos. El pedido original era que se vieran igual que en Accounting, no quitarlos; la pantalla queda como estaba hasta igualarla con la de Accounting.
- **Alojamiento › Habitaciones** vuelve a sus columnas: Serv. Facturación, Adultos, Niños, Pax. y Color (en la ronda anterior se habían resumido en «Capacidad»).
- Se mantiene el resto de la reorganización: texto de ayuda por pestaña, Tarifas / Contratos con Tarifario y Contratos primero, celdas en una línea y Guardar / Cancelar solo con cambios reales.

### Revisión de código y UI (octubre 2026)

Código:
- Ningún archivo pasa de 350 líneas (salvo `components/suite/DesignSystem.tsx`, 375, que es de la suite y se corrige en su repositorio de origen). Los archivos grandes se dividieron por responsabilidad en subcarpetas del mismo módulo: `facturacion/caja/`, `hospedaje/mapa/`, `hospedaje/perfiles/`, `hospedaje/tareas/`, `dashboard/` (`Operativo`, `Financiero`, `piezas`, `datos`), `configuracion/kit/`, `reportes/` (`modelo`, `Tabla`, `Documento`), y archivos hermanos (`hotel/semilla.ts`, `hotel/semillaFinanzas.ts`, `hotel/montoEnLetras.ts`, `hotel/CheckInFormulario.tsx`, `hotel/TarjetaRegistro.tsx`, `configuracion/inicial.ts`, `secciones/Tarifario.tsx`, `secciones/Roles.tsx`, `secciones/FacturacionServicios.tsx` / `FacturacionCobros.tsx`, `reservaciones/FormReservaPartes.tsx`, `folios/Pagos.tsx`, `facturacion/ReciboCanje.tsx`, `auditoria/piezas.tsx`, `reserva/Facturacion.tsx`).
- Sin dependencias circulares entre módulos (se resolvieron Generar ↔ Gestión en Auditoría y datos ↔ semilla con la interfaz `DatosOperacion`).
- Imports homogéneos: rutas relativas dentro de la carpeta del módulo, alias `@/` entre módulos, `type` en los imports que solo traen tipos; comillas simples en todo el código.
- Código muerto eliminado: `lib/tokens.ts`, `components/layout/nav-data.ts`, SVG de la plantilla de Next en `public/` y exportaciones sin uso (`FilaGrupo`, `IcExterno`, `SelectorReporte`, `ListaMaestra`, `BotonFiltro`, `AccionesReporte`, `ESTADOS_HAB`).
- Hooks: se quitaron `useMemo` innecesarios, se completaron dependencias (Reportes de Auditoría y Hospedaje, Pestañas de la reserva) y cada `eslint-disable` que queda explica por qué.
- Nuevo helper `reservaCerrada()` en `hotel/reservas.ts` (Completada, No-Show o Anulada) usado por el detalle y la facturación de la reserva.
- Comentarios sin referencias a documentos de diseño; describen el código.
- Script `npm run typecheck`.

Interfaz (auditoría de todas las rutas a 1440, 1280 y 1100 px y vista de camarera a 390 px):
- Sin scroll horizontal de página en ninguna ruta. Se corrigió Configuración › Alojamiento y Usuarios, donde el texto accesible de la última columna salía del contenedor de la tabla.
- Los campos de formulario de Configuración quedan asociados a su etiqueta (lectores de pantalla y pruebas automatizadas los encuentran por nombre).
- Textos de menos de 10.5 px subidos a 10.5–11 px: días y meses del Planificador y del Tarifario, «(derivada)» / «(inactiva)», tipos en Actualización colectiva, etiqueta VIP de Perfiles, datos de las tarjetas de cajero, estado en el Mapa, Web Check-In.
- Consola del navegador sin errores ni advertencias en todas las rutas.
- Pendiente de la suite (no se toca desde este módulo): `StatusBadge` y los contadores de pestañas usan 10 px; conviene llevarlos a 11 px en `components/suite`.

### Configuración (ronda anterior)
- «Cancelar / Guardar cambios» solo aparecen cuando hay cambios reales (si se vuelve al valor original desaparecen), como en Accounting.
- ~~Parámetros generales sin Consecutivos ni Cuentas y numeración~~: revertido (ver «Corrección de Configuración»).
- Alojamiento y Tarifas / Contratos: cada pestaña con su título y una línea que explica para qué sirve; Tarifas / Contratos ordenado por uso (Tarifario, Contratos, Empresas, Mercados, Agentes, Referidores); celdas en una línea, color como muestra + código. La capacidad resumida se revirtió (ver «Corrección de Configuración»).
