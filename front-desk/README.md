# Front Desk · Seven Suite

Módulo de recepción hotelera de Seven Suite: reservas, mapa de habitaciones, check-in y check-out, folios, caja, ama de llaves, auditoría nocturna y configuración del módulo.

> Estado actual: interfaz completa con datos de ejemplo en memoria. No hay backend todavía; los puntos de integración están señalados en [Datos y estado](#datos-y-estado).

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript 5 |
| Estilos | Estilos en línea con los tokens de `components/suite/tokens.ts`; Tailwind 4 solo para la base de `globals.css` |
| Tipografía | Montserrat (`@fontsource/montserrat`) |
| Calidad | ESLint 9 (`eslint-config-next`), `tsc --noEmit` |

## Requisitos

- Node.js 20.9 o superior
- npm 10 o superior

## Primeros pasos

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos |

Antes de abrir un PR: `npm run typecheck && npm run lint && npm run build`.

## Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_URL_MENU` | Menú principal de Seven Suite («Ir al menú principal» y «Cerrar sesión») |
| `NEXT_PUBLIC_URL_<ID>` (`ACC`, `DICR`, `ANA`, `POS`…) | Enlace de cada módulo en el modal «Módulos» |

Todas son opcionales: sin ellas los módulos usan los enlaces por defecto de `components/suite/modulos.ts`.

## Estructura

```
app/                      Rutas (App Router). Cada page.tsx solo monta el componente de la pantalla.
components/
  suite/                  UI compartida por todos los módulos de Seven Suite (no se modifica aquí)
  layout/                 Shell, menú del módulo (nav.tsx) y Pantalla (estándar de pantallas)
  hotel/                  Store operativo (useHotel), tipos, semillas y flujos de check-in/out
  reportes/               Motor de reportes: filtros, tabla en pantalla y documento impreso
  dashboard/              Dashboard Operativo y Financiero
  hospedaje/              Mapa de habitaciones, Perfiles, Tareas y Reportes
  reservaciones/          Planificador, Reservas, Asignación, Llegadas y salidas
  facturacion/            Caja, Canje de divisas, Folios, Depósitos, Vouchers, Transacciones
  ama-de-llaves/          Estado de habitaciones, vista móvil de camarera, Distribución, Bloqueos, Sábanas
  pronostico/             Pronóstico por tipo, Detalle del tipo y reportes
  auditoria/              Auditoría nocturna, sincronización y reportes
  configuracion/          Configuración del módulo (store propio, catálogos, permisos)
  icons/                  Íconos del menú
public/                   Recursos estáticos
next.config.ts            Redirecciones de rutas anteriores de Configuración
```

Cada módulo agrupa sus piezas internas en subcarpetas (`facturacion/caja/`, `hospedaje/mapa/`, `configuracion/kit/`, `reservaciones/reserva/`…). El archivo principal de la pantalla queda en la raíz del módulo.

## Convenciones

**Código**
- Componentes de cliente (`'use client'`) salvo las páginas de `app/`, que solo componen.
- Máximo 350 líneas por archivo. Si un componente crece, se separa por responsabilidad en una subcarpeta del módulo.
- Imports: relativos dentro de la carpeta del módulo, alias `@/` entre módulos. `import { type X }` para tipos. Sin dependencias circulares.
- Comillas simples; punto y coma al final.
- Nombres de dominio en español (`reserva`, `folio`, `habitacion`), igual que la interfaz.
- Cada `eslint-disable` lleva al lado el motivo.

**Interfaz**
- `components/suite` es idéntica en todos los módulos de la suite: los cambios se hacen en su origen y se copian a cada proyecto. Ver `components/suite/README.md`.
- Estilos en línea con los tokens (`C`, `FONT`, `radius`, `SIZE`). El color del módulo se define una sola vez en `app/globals.css` (`--brand*`).
- Textos de la interfaz en español; no menos de 10.5 px.
- Confirmaciones con `Confirmacion` / `Alerta` (nunca `window.confirm`); acciones destructivas en rojo.
- La página `/design-system` muestra todos los componentes de la suite.

## Estándar de pantallas

Todas las pantallas usan `Pantalla` (`components/layout/Pantalla.tsx`) y siguen el mismo orden:

1. **Header** (alto 52): título a la izquierda y todas las acciones de la pantalla a la derecha (Exportar, Nuevo…, acciones de flujo).
2. **Pestañas**, si las hay.
3. **Una sola barra de filtros**: búsqueda y filtros en vivo; a la derecha, el contador de registros. Con filas seleccionadas aparece debajo la barra de acciones masivas (`useSeleccion`, `CheckTodos`, `CheckFila`, `BarraMasiva`).
4. **Cuerpo** con scroll propio.

Un componente hijo (una pestaña o una sección de Configuración) publica sus filtros, su Exportar y sus pestañas en la barra de la pantalla con `FiltrosEnBarra`, `AccionesEnHeader` y `TabsEnBarra`.

- **Exportar** (`BotonExportar`): un único botón en el header; exporta lo que se ve, con los filtros aplicados, en CSV, XLS o PDF.
- **Modales**: `ModalBase` (título, cuerpo con padding 20, pie a la derecha).

## Reportes

Todos los reportes (Hospedaje, Facturación, Pronóstico y Auditoría) se ven como tabla en pantalla y como documento al imprimir o exportar (`components/reportes/`):

- `useFiltros(defs)` (`filtros.tsx`): filtros declarativos con chips, «Limpiar» y persistencia en la URL (`?f.clave=`).
- `PantallaReporte` (`Reporte.tsx`): header con selector de reporte (`?r=`), tabla paginada con totales, Imprimir y Exportar.
- `DocumentoReporte` (`Documento.tsx`): documento impreso / PDF con identidad del hotel, período, filtros y pie paginado.
- Un reporte nuevo solo construye un `DatosReporte` (`modelo.ts`) con `tabla()` y `cols()`.

## Datos y estado

Hay dos stores, ambos en memoria y con datos deterministas (se reinician al recargar):

| Store | Archivo | Contiene | Integración con backend |
|---|---|---|---|
| Operación | `components/hotel/store.tsx` (`useHotel()`) | Habitaciones, reservas, perfiles, tareas, bloqueos, folios, caja y auditorías | Reemplazar `crearSemilla()` (`hotel/semilla.ts`) y `crearFinanzas()` (`hotel/semillaFinanzas.ts`) por la carga desde la API y convertir cada acción del store en una llamada |
| Configuración | `components/configuracion/store.tsx` (`useConfig()`) | Catálogos, parámetros, consecutivos, monedas y tipo de cambio, tarifario, usuarios y permisos | Reemplazar `INICIAL` (`configuracion/inicial.ts` e `inicialEmpresa.ts`) y persistir en `guardar()` |

El store de operación vive en el Shell, así que cualquier cambio (un check-out en el Mapa, un pago en un folio) se refleja en todas las pantallas.

La fecha hotelera de ejemplo es fija: `HOY` en `components/hotel/datos.ts`.

Simulado hasta tener backend:
- Sesión: no hay login. Caja y la vista de camarera tienen un selector «Ver como». PIN de prueba de Caja: `1234`.
- Permisos: el árbol y los roles se configuran, pero aún no restringen pantallas.
- Factura electrónica, envío a Hacienda / DICR, correos y Channel Managers.
- Consulta DICR de Perfiles (`REGISTRO_DICR` en `hospedaje/perfiles/FormPerfil.tsx`).
- El QR de Web Check-In usa `api.qrserver.com` (requiere internet).

## Módulos

| Ruta | Pantalla |
|---|---|
| `/` | Dashboard Operativo (llegadas, salidas, habitaciones, tareas, disponibilidad, alertas) y Financiero (ADR, RevPAR, ingresos, forecast, contratos) |
| `/hospedaje/mapa-de-habitaciones` | Mapa por tipo de habitación con acciones rápidas, arrastrar y soltar, bandeja «Hoy» y bloqueo rápido |
| `/hospedaje/perfiles` | Perfiles de clientes y empresas con estancias, preferencias y facturación |
| `/hospedaje/tareas` | Tareas por estado (Pendientes, En proceso, Atrasadas, Completadas, Anuladas) con detalle lateral |
| `/hospedaje/reportes` | Registros sin perfiles, Listado de ocupación, Saldos en el pick, Etiquetas |
| `/reservaciones/planificador` | Línea de tiempo por habitación; el detalle y la reserva rápida se abren sin salir de la pantalla |
| `/reservaciones/reservas` | Listado Directa / Agencia, detalle con pestañas y nueva reserva multi-habitación |
| `/reservaciones/asignacion-de-habitaciones` | Asignación y preasignación |
| `/reservaciones/llegadas-y-salidas` | Llegadas y salidas del día |
| `/facturacion/caja` | Caja única por hotel con turnos por cajero, arqueo, firma y cierre del día |
| `/facturacion/canje-de-divisas` | Canje con tasas del día y recibo |
| `/facturacion/folios`, `/folios-externos`, `/folios-cuenta-casa` | Folios de huéspedes, externos y de cuenta casa |
| `/facturacion/historico-de-folios`, `/transacciones-diarias`, `/vouchers`, `/depositos-en-garantia` | Consultas y reportes de facturación |
| `/pronostico-estadisticas/*` | Pronóstico por tipo, Detalle del tipo y reportes de ocupación e ingresos |
| `/ama-de-llaves/*` | Distribución de camareras, Estado de habitaciones (escritorio y móvil), Bloqueos y Cambio de sábanas |
| `/auditoria/*` | Gestión y asistente de auditoría nocturna, sincronización y reportes |
| `/configuracion/*` | Base común de la suite (Empresa, Usuarios y Permisos, Parámetros generales, igual que Accounting) + Alojamiento, Tarifas / Contratos, Facturación, Caja y cierre, Operaciones, Correo, Integraciones |
| `/design-system` | Catálogo de componentes de la suite |

## Reglas de negocio

**Caja.** Hay una sola caja por hotel; lo que cambian son los cajeros. El Cajero Responsable abre y cierra la caja del día y ve a todos los cajeros; el Cajero regular solo ve sus movimientos y turnos. Canjes, pagos y depósitos se registran en el turno abierto del usuario.

**Reservas.**
- Estados: Solicitada, Confirmada, Lista de espera, In-House, Completada, No-Show y Anulada.
- Una reserva de varias habitaciones son varias líneas con el mismo `grupo` y una `modalidad`:
  - **Individual**: cada habitación es su propia cuenta; en el primer check-in se elige si se factura por separado o en una sola factura.
  - **Grupal**: la cuenta 1 es el folio de agencia (hospedaje y régimen de todas las habitaciones) y cada habitación tiene su cuenta de consumo.

**Tareas.** Una tarea solo se anula desde Pendiente y con motivo; una atrasada solo se elimina.

**Bloqueos.** Los bloqueos de habitación (`bloqueos`) y los de tareas se suman en `bloqueadasEn()`: el Planificador los muestra como fuera de orden, el inventario los descuenta y el selector de habitación no los ofrece. Una habitación libre con bloqueo vigente pasa a Bloqueada (F/O) y vuelve a Libre al terminar el bloqueo.

**Configuración.** Empresa, Usuarios y Permisos y Parámetros generales repiten la base de Accounting (mismas pestañas y diseño); lo exclusivo de Accounting no se copia; las secciones propias de Front Desk van después. «Guardar cambios» y «Cancelar» solo aparecen cuando hay cambios reales; Usuarios y Permisos guarda con sus propios botones. Los consecutivos usan `{AAAA}`, `{MM}` y `{N:k}`; el reinicio mensual exige año y mes, y el anual, año. La tasa vigente de cada divisa es el último registro de Tipo de cambio.
