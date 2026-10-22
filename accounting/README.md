# Seven Accounting

Prototipo de diseño del módulo de contabilidad de Seven Suite (Accounting). Muestra todas las pantallas del módulo con datos de ejemplo en memoria; no tiene backend.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Estilos en línea con los tokens de `components/ui/tokens.ts` y Tailwind 4 para utilidades puntuales
- Chart.js (gráficos del Dashboard) y jsPDF (descargas en PDF)

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genera los tipos de rutas de Next y corre `tsc --noEmit` |

## Variables de entorno

Todas son opcionales. Se leen al compilar: si cambian, hay que volver a compilar o desplegar.

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_URL_ACC_DICR` | Enlace a Accounting + Digital Invoices en «Módulos» |
| `NEXT_PUBLIC_URL_DICR` | Enlace a Digital Invoices (`https://digital-invoices-cr.vercel.app/`) |
| `NEXT_PUBLIC_URL_ANA` | Enlace a Seven Analytics |
| `NEXT_PUBLIC_URL_MGT` | Enlace a Management |
| `NEXT_PUBLIC_URL_FDK` | Enlace a Front Desk (`https://front-desk-cyan.vercel.app/`) |
| `NEXT_PUBLIC_URL_POS` | Enlace a Point of Sales |
| `NEXT_PUBLIC_URL_MENU` | Menú principal de la suite («Ir al menú principal») |

Un módulo sin enlace no aparece en la lista; Accounting siempre aparece marcado como el módulo actual. En Vercel las variables se cargan en Settings › Environment Variables y requieren un nuevo despliegue.

## Estructura de carpetas

```
app/                      Rutas (App Router). Cada page.tsx solo monta su pantalla.
components/
  layout/                 Menú lateral, sub-panel de Configuración, pie y «Módulos»
  ui/                     Componentes compartidos: tokens, formularios, tablas, filtros, modales
  pages/
    asientos/             Bandeja de asientos, detalle de asiento y adjuntos
    bancos/               Cobros/Pagos, tarjetas, depósitos, transferencias, conciliación y cheques
    catalogo/             Catálogo de cuentas (plan de cuentas, centros de costo, ajustes)
    clientes/             Clientes / Proveedores
    config/               Usuarios y permisos, presupuesto, Mi cuenta, actividad bancaria
    empresa/              Empresa: datos, consecutivos e impresión
    estados/              Estados financieros
    onboarding/           Asistente de configuración inicial de la contabilidad
    parametros/           Parámetros generales y configuración contable
    reportes/             Analítico de cuentas, histórico y diferencial cambiario
    Dashboard.tsx
```

Las pantallas grandes tienen una subcarpeta con su mismo nombre que contiene sus datos de ejemplo (`datos.ts`), sus modales y sus piezas. Cuando una pantalla tiene mucho estado, la lógica vive en un hook (`useBandeja`, `useAnalitico`, `useGestion`…) que devuelve el estado y las acciones; el componente de la pantalla y sus secciones lo reciben y solo dibujan.

Ningún archivo pasa de 350 líneas.

## Convenciones

- Nombres de dominio, textos y comentarios en español.
- Comillas simples.
- Imports relativos dentro de un módulo y alias `@/` entre módulos; `import { type X }` para tipos.
- Colores, radios, sombras y márgenes salen de `components/ui/tokens.ts` (escala Neutro 900/700/500/200/000 y color principal `#A77600`).
- Tablas con borde y encabezado gris (`DataTable` o `TABLA`), acciones de fila con `RowAction`, confirmaciones con `Modal`.
- Configuración: cada pestaña con tarjetas `Section` (título y descripción separados por una línea) y la acción principal arriba a la derecha.
- Formularios con `FormField`: la etiqueta queda asociada al campo. Los controles sueltos llevan `aria-label`.
- Ningún texto de menos de 10.5 px (excepto los gráficos del Dashboard).
- Tablas de pantalla con `className="tabla"`: a 1440 px entran completas. En pantallas más angostas reducen el margen de las celdas y, si aún no caben, tienen scroll horizontal dentro de la tabla (nunca en la página). Los textos largos se recortan con «…» y muestran el texto completo al pasar el mouse.
- La acción «+ Nuevo…» del encabezado llega a la pestaña activa con `useSenalAgregar`.

## Datos y backend

No hay backend. Cada pantalla arranca con datos de ejemplo definidos en sus archivos `datos.ts`, y los cambios viven en memoria hasta recargar la página.

Los datos que comparten varias pantallas usan un almacén en memoria (`components/pages/empresa/datos/almacen.ts`, con el hook `useAlmacen`):

| Almacén | Contenido | Dónde se conecta el backend |
|---|---|---|
| `empresaAlmacen` | Datos de empresa | GET/PUT de la empresa |
| `consecutivosAlmacen` | Formatos y contadores de documentos | Consecutivos por tipo de documento |
| `impresionAlmacen` | Impresoras, tipos de documento y asignaciones | Servidor de impresión |
| `onboardingAlmacen` | Avance del onboarding contable | Estado del asistente por empresa |

Para conectar el backend, cada almacén se reemplaza por llamadas a la API manteniendo la misma forma de datos.

Los adjuntos de los asientos no existen como archivos. La vista previa y la descarga se generan a partir de los datos del asiento en `asientos/adjuntos/documentoEjemplo.ts`; ese es el punto donde se pide el archivo real al servidor.

## Pantallas

- **API Key:** Empresa › API Key muestra la API Key para conectar el módulo con Management, con Mostrar, Copiar y Generar nueva.
- **Exportar e imprimir:** reportes y listados usan el documento estándar (encabezado con empresa, título, período y filtros; pie con fecha de generación y paginación), en CSV, XLS o PDF. Las operaciones bancarias tienen su comprobante (y sus constancias de retención) para ver, descargar e imprimir.


- **Dashboard:** indicadores, saldos bancarios, cuentas por cobrar y por pagar, usuarios conectados.
- **Bandeja de asientos:** Pendientes, Anulados, Programados y Plantillas. Crear, importar, duplicar, contabilizar y anular asientos. El detalle del asiento muestra los adjuntos con vista previa.
- **Bancos:** Cobros/Pagos (con anticipos y pago masivo), gestión de tarjetas, depósitos, transferencias, conciliación bancaria y cheques.
- **Reportes:** Analítico de cuentas (el detalle del asiento también abre la vista previa de adjuntos), histórico de clientes/proveedores y diferencial cambiario.
- **Estados financieros:** balance de comprobación, estado de resultados, situación financiera, cambio en el patrimonio y presupuesto.
- **Configuración General:**
  - **Empresa:** Datos de empresa (identificación y contacto), Consecutivos de documentos, Asignación de impresoras, Impresoras y Tipos de documento.
  - **Usuarios y permisos, Parámetros generales, Configuración contable, Catálogo de cuentas, Clientes / Proveedores y Actividad bancaria.**
- **Onboarding contable** (`/onboarding-contable`): asistente de cinco pasos (empresa, código de cuenta, plan de cuentas, ejercicio fiscal y consecutivos). En el menú, «Ver onboarding (demo)» lo vuelve a pedir.

## Reglas de negocio

- **Consecutivos:**
  - El formato combina texto fijo con `{AAAA}`, `{MM}` y `{N:k}` (contador de k dígitos, de 1 a 18).
  - El reinicio puede ser nunca, anual o mensual. El reinicio mensual exige `{AAAA}` y `{MM}`; el anual exige `{AAAA}`.
  - El contador lo lleva el sistema y no se retrocede. Un cambio de formato rige solo para documentos nuevos, y al cambiar el reinicio el contador del período vuelve a 1.
- **Impresión:**
  - Los nombres de impresora no se repiten y el código de un tipo de documento es único.
  - Solo se asignan impresoras habilitadas. Al eliminar una impresora, sus documentos pasan a la predeterminada del sistema.
- **Onboarding:** es obligatorio mientras esté pendiente y cada paso depende del anterior.
  - El país propone la moneda primaria.
  - El plan de cuentas necesita al menos dos cuentas posteables con moneda.
  - El ejercicio va del mes de inicio al cierre del año, con un período abierto por mes.
  - Si se cambia la nomenclatura después de armar el plan, los códigos se recalculan.
