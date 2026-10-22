# Digital Invoices

Facturación electrónica de Costa Rica (Hacienda, v4.4) y Guatemala (FEL de la SAT) con contabilidad para hoteles: ventas, compras con buzón de correo, facturas recurrentes, productos y servicios, asientos contables, bancos, reportes, estados financieros y dashboard. Forma parte de Seven Suite.

## Stack

- Next.js 16 (App Router) con React 19 y TypeScript.
- Base de datos libSQL: Turso en producción o un archivo local (`data-runtime/`).
- Tailwind CSS 4 y componentes propios en `components/ui`.
- Firma XAdES de comprobantes con `node-forge` y `xml-crypto`; PDF con `jspdf`; correo con `nodemailer` e `imapflow`; Excel con `xlsx`.

## Cómo correr el proyecto

```bash
npm install
npm run dev
```

Abre http://localhost:3000

Otros comandos: `npm run build` (compila), `npm run lint` (ESLint) y `npx tsc --noEmit` (tipos).

## Publicar en Vercel

1. Sube este proyecto a un repositorio (GitHub, GitLab o Bitbucket) e impórtalo en Vercel. Vercel detecta Next.js solo.
2. En **Settings › Environment Variables** agrega las variables de la tabla de abajo. Sin `TURSO_DATABASE_URL` la aplicación funciona, pero los datos se guardan en `/tmp` y se borran cuando Vercel recicla la función.
3. Despliega.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Base de datos en Turso. Sin ellas se usa un archivo local (`data-runtime/`). En Vercel son necesarias para que los datos no se pierdan. |
| `TURSO_DATABASE_URL_GT`, `TURSO_AUTH_TOKEN_GT` | Base de datos de las empresas de Guatemala. Sin ellas se usa el archivo local `facturacion-gt.db`. |
| `NEXT_PUBLIC_EMPRESAS` | Empresas del selector, separadas por coma; las de Guatemala con `:GT` (por defecto `Hotel Fortuna,Grand Horizon,Hotel San José,Hotel Guatemala:GT`). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envío real de comprobantes por correo. Sin ellas el envío se simula. |
| `CRON_SECRET` | Opcional. Protege `/api/tareas` cuando lo llama el cron de Vercel. |
| `HACIENDA_USERNAME`, `HACIENDA_PASSWORD`, `HACIENDA_AMBIENTE` | Credenciales de la API de Hacienda (`produccion` o `sandbox`). Sin ellas el envío se simula. |
| `LIMITE_SUCURSALES` | Sucursales que incluye el plan del cliente. Por defecto 10. |
| `MODO_IMPLEMENTACION` | `1` (o sin definir) permite crear sucursales y cambiar su código; `0` lo reserva a implementación. |
| `HABILITAR_PRUEBAS` | `1` muestra el ambiente de pruebas (sandbox) de Hacienda, solo para pruebas internas. Sin definir está oculto. |
| `CORREO_RECEPCION_CM` | Correo al que el cliente redirige las facturas de sus proveedores. Acepta `{cedula}`, por ejemplo `facturas+{cedula}@cmsuite.com`. |

## Estructura

| Carpeta | Contenido |
|---|---|
| `app/` | Rutas de la aplicación y API (`app/api/…`; `app/api/gt/…` para Guatemala). `proxy.ts` guarda la empresa que llega con `?empresa=`. |
| `components/layout/` | Marco de la aplicación: menú lateral, módulos y control de acceso por versión. |
| `components/pages/` | Pantallas por área: asientos, bancos, catálogo, clientes, configuración, empresa, estados, facturación, onboarding, parámetros y reportes. |
| `components/ui/` | Componentes y utilidades compartidas (primitivas, filtros, selectores, utilidades de estado). |
| `lib/` | Lógica del servidor: base de datos, Hacienda, firma, asientos automáticos, onboarding, empresa y terceros; país de la empresa y reglas FEL de Guatemala. |
| `data/` | Catálogos de Hacienda y datos de referencia. |
| `scripts/` | Actualización de catálogos de Hacienda. |

## Versiones

El mismo código sirve para tres versiones: `?modo=completo` (Accounting + Digital Invoices), `?modo=dicr` (solo Digital Invoices) o `?modo=acc` (solo Accounting). También se cambia desde «Módulos». `?empresa=…` abre con esa empresa (y su país). `NEXT_PUBLIC_MODO_FIJO=acc` (o `dicr`, `completo`) deja el sitio siempre en esa versión.

Cada versión muestra solo sus pantallas; una ruta que no le corresponde lleva al Dashboard.

## Países: Costa Rica y Guatemala

El mismo sitio factura en Costa Rica (Hacienda, TRIBU-CR v4.4) y en Guatemala (FEL de la SAT, con certificador). El país lo decide la empresa elegida, no un ajuste aparte: al cambiar a una empresa de otro país cambian la base de datos, el asistente inicial, la configuración, las pantallas de Facturación, los reportes, el dashboard y la moneda.

- **Empresas**: `NEXT_PUBLIC_EMPRESAS` lleva los nombres separados por coma; las que no son de Costa Rica llevan el país después de dos puntos. Por defecto: `Hotel Fortuna,Grand Horizon,Hotel San José,Hotel Guatemala:GT`.
- **Elegir la empresa**: con el selector del menú lateral (si es de otro país, la aplicación se recarga) o desde el inicio de Seven Suite con `?empresa=…`, que `proxy.ts` guarda en la cookie `empresa`.
- **Una base por país**: Costa Rica usa `TURSO_DATABASE_URL`; Guatemala, `TURSO_DATABASE_URL_GT`. Sin Turso, los archivos locales `facturacion.db` y `facturacion-gt.db`. Cada base tiene sus datos de ejemplo y su API Key (módulo `DICR` o `DIGT`).
- **Código**: `lib/empresas.ts` (empresas y país), `lib/paisServidor.ts` (cada ruta de la API corre con el país de su empresa: `conPaisDeSolicitud`), `lib/paisActual.ts` (lo que comparten servidor y pantallas: `esGuatemalaActual`, `simboloLocal`, `segunPais`), `lib/paisCliente.tsx` (`PaisProvider` y `usePaisEmpresa`) y `lib/perfilPais.ts` (catálogos y reglas de Guatemala).

| Tema en Guatemala | Cómo funciona |
|---|---|
| Ante quién | SAT, a través de un certificador FEL (DIGIFACT, Infile, Megaprint): uno principal y los de respaldo |
| Identificación del emisor | NIT, con dígito verificador |
| Régimen | Afiliación al IVA (con su vigencia) y régimen de ISR |
| Leyendas | Frases por tipo y escenario: las del RTU salen de la afiliación y el régimen; las de cada documento (tipo 4, 5 y 9) se agregan al emitir; las demás se agregan a mano con su resolución |
| Dirección | Departamento, municipio y código postal |
| Desde dónde se emite | Establecimientos y sus cajas |
| Impuestos | Unidades gravables (Configuración › Facturación electrónica): impuesto de FEL, código, valor, cuenta contable y estado. Por defecto IVA 12 % o exento (incluido en el precio) y turismo hospedaje 10 % (se suma al total) |
| Unidades de medida | Catálogo propio en Configuración › Facturación electrónica; en el DTE van las tres primeras letras |
| Producto | Formulario corto o completo, como en Costa Rica. Clasificación de producto (el grupo, con su clasificación, IVA, unidad y cuentas), bien o servicio, unidades gravables y escenario de exención |
| Documentos | Factura, factura cambiaria con abonos, notas de crédito y débito, recibo de anticipos y factura especial; la serie y el número los asigna el certificador. No hay factura de exportación, otros cargos, QR de consulta ni XML de respuesta; la referencia solo va en las notas |
| Medios de pago | Efectivo (EF), tarjeta de crédito (TC), tarjeta de débito (TD) y cheque (CH) |
| Factura cambiaria | Cada abono lleva vencimiento, monto y, si se quiere, medio de pago. En el detalle de la factura se confirma el pago de cada abono (fecha, medio y comprobante) con `PATCH /api/documentos/[id]/abonos` |
| Receptor | NIT, consumidor final (CF, hasta Q2,500), CUI o extranjero |
| Compras | Sin emitir, aceptadas (entran al libro de compras) o rechazadas, sin acuse ante la SAT; facturas especiales con retenciones y compras físicas (origen «Compra física») |
| Reportes | Libros de ventas y compras y Listado de DTE en lugar del Reporte de IVA y Actividad económica |
| Moneda | Quetzales (Q) y dólares |

La empresa de ejemplo de Guatemala es Hotel Guatemala (Corporación Petenera de Turismo, S.A., NIT 16896963), con afiliación General y DIGIFACT como certificador principal. La certificación está simulada: no se conecta con el certificador. Los datos tributarios se guardan con `GET` y `PUT /api/gt/tributaria` (las contraseñas de los certificadores no se devuelven nunca) y `POST /api/gt/certificadores/verificar` revisa las credenciales de un certificador.

## Módulos de la suite

Al final del menú lateral, «Módulos» abre los módulos de la empresa y marca en cuál estás. Cada enlace se configura con variables de entorno (se leen al construir; si cambian, vuelve a desplegar):

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_URL_ACC_DICR` | Accounting + Facturación electrónica |
| `NEXT_PUBLIC_URL_ACC` | Accounting |
| `NEXT_PUBLIC_URL_DICR` | Facturación electrónica |
| `NEXT_PUBLIC_URL_MGT` | Management (por defecto, el despliegue de Management de la suite) |
| `NEXT_PUBLIC_URL_FDK` | Front Desk (por defecto, el despliegue de Front Desk de la suite) |
| `NEXT_PUBLIC_URL_POS` | Point of Sale; sin enlace aparece como «Próximamente» |
| `NEXT_PUBLIC_URL_MENU` | Menú principal de la suite (proyecto «Seven · Módulos») |

## Comportamientos de la demo
- **API Key:** Empresa › API Key muestra la API Key para conectar el módulo con Management, con Mostrar, Copiar y Generar nueva.
- **Exportar e imprimir:** reportes y listados usan el documento estándar (encabezado con empresa, título, período y filtros; pie con fecha de generación y paginación), en CSV, XLS o PDF. Las operaciones bancarias tienen su comprobante (y sus constancias de retención) para ver, descargar e imprimir.
- **Impuestos con cuenta contable**: cada impuesto (incluidas las tarifas de IVA) tiene su cuenta en Configuración › Impuestos, y el asiento de venta reparte el IVA entre las cuentas de sus tarifas.

- **Facturación electrónica**: si el producto la incluye, queda activa sin preguntarlo en Empresa.
- **Adjuntos y facturas asociadas**: los adjuntos de asientos y las facturas de cobros y pagos se abren en una vista previa sin descargarlos. Los adjuntos de ejemplo se arman con los datos del asiento (PDF como página, XML como texto, hojas como tabla) y se pueden descargar desde el mismo modal.
- **Crear mi plan de cuentas**: el asistente lleva al Catálogo de cuentas y, al volver, asocia las cuentas de facturación al plan guardado.

## Asistente inicial

Mientras la empresa no termina la configuración inicial, la aplicación abre un asistente a pantalla completa que no se puede saltar. Cada paso trae valores por defecto y usa los mismos formularios que Configuración.

| Versión | Pasos |
|---|---|
| Accounting + Digital Invoices | Empresa, Código de cuenta, Plan de cuentas, Cuentas de facturación, Ejercicio fiscal, Consecutivos, Datos para Hacienda, Conexión con Hacienda, Sucursal y caja |
| Solo Digital Invoices | Empresa, Datos para Hacienda, Conexión con Hacienda, Sucursal y caja |

Con una empresa de Guatemala los pasos de facturación son Datos para la SAT (afiliación al IVA, frases y dirección), Certificador y Establecimiento y caja.

- **Empresa**: identificación, país y zona horaria; con contabilidad, moneda primaria y monedas secundarias (CRC, USD, EUR, GTQ, NIO). La moneda primaria no cambia después de registrar asientos.
- **Código de cuenta**: dígitos por nivel (mayor, sub mayor, detalle), separador y formato decimal.
- **Plan de cuentas**: plan base en cero, importación desde Excel o creación por nivel. Necesita al menos dos cuentas posteables con moneda. Si cambia la nomenclatura, el plan y todas las referencias a cuentas se recodifican.
- **Cuentas de facturación**: las cuentas que usan los asientos automáticos; deben existir en el plan y ser posteables.
- **Ejercicio fiscal**: del mes de inicio a diciembre, con un período abierto por mes.
- **Datos para Hacienda / Conexión con Hacienda**: actividades, dirección fiscal, correo, certificado (llave criptográfica) y credenciales; las credenciales se pueden verificar contra Hacienda.
- **Sucursal y caja**: sucursal 001 y su primera caja, con la numeración inicial de cada comprobante si la caja ya emitía en otro sistema.

En el menú lateral, «Ver onboarding (demo)» vuelve a abrir el asistente; «Salir de la demostración» lo cierra y vuelve a la pantalla de origen con la configuración como estaba. Si la versión cambia mientras el asistente está abierto (por ejemplo con `?modo=dicr`), vuelve a leer sus pasos.

## Reglas de negocio

- **Asientos automáticos**: cada venta aceptada por Hacienda y cada compra con acuse de aceptación genera su asiento. Usa la fecha del documento y nace contabilizado, así que aparece en el Analítico de cuentas y en los estados financieros. Se puede descontabilizar o anular en la Bandeja.
- **Un asiento activo por documento**: un asiento anulado no impide generar otro, pero no se restaura si el documento ya tiene uno activo.
- **Navegación entre documento y asiento**: el número de asiento en Ventas, Compras y sus detalles abre una vista previa con las cuentas y los totales. El detalle del asiento en la Bandeja muestra el documento de origen. `/asientos?asiento=<consecutivo>` abre ese asiento.
- **Factura electrónica de compra**: la emite la empresa cuando le compra a alguien que no factura electrónicamente. El emisor es el proveedor (vendedor) y el receptor es la empresa, en el XML, al crearla, en el detalle y en su representación impresa. Al aceptarse queda registrada en Compras con su asiento.
- **Compras**: como en Ventas, «Importar» (secundario: XML o Excel) y «Agregar documento» (principal: factura electrónica de compra; en Guatemala se elige entre factura especial y compra física). Los estados son Por importar, Sin emitir, Aceptadas y Rechazadas en los dos países. En todos los formularios y detalles de compra el proveedor va a la izquierda y la empresa a la derecha.
- **Cuentas por defecto de facturación**: ingresos, IVA por pagar, cuentas por cobrar, caja, bancos, gastos, IVA acreditable y cuentas por pagar; se usan cuando el producto, cliente o proveedor no trae su propia cuenta.
- **Cuentas auxiliares de terceros**: cuelgan de las cuentas por cobrar (clientes) y por pagar (proveedores) configuradas y usan el separador de la nomenclatura.
- **Consecutivos de documentos**: formato con texto fijo, `{AAAA}`, `{MM}` y `{N:k}`; reinicio nunca, anual o mensual. El mensual exige año y mes en el formato; el anual, el año.
- **Número consecutivo**: lo asigna la caja al emitir; mientras tanto, el formulario muestra «Se asigna al emitir».
- **Reporte de IVA (D-150)**: incluye las ventas a tarifa 0% con y sin derecho a crédito (códigos de tarifa 01/05 y 11; las exportaciones sin líneas cuentan como 0% con crédito) y el IVA devuelto de servicios de salud privados (CABYS 93…) pagados con tarjeta, como casilla informativa. Se puede filtrar por actividad económica.
- **Licencias**: Información tributaria guarda el registro fiscal de bebidas alcohólicas (Ley 8707) y su vencimiento.
- **Impresoras**: cada tipo de documento se asigna a una impresora registrada o a la predeterminada del sistema.

## Tareas automáticas

La revisión del buzón y la emisión de facturas recurrentes automáticas corren:
- cada minuto con `npm start` en un servidor propio,
- con el cron de Vercel (`vercel.json`): una vez al día, que es lo que permite el plan gratuito. En un plan de pago se puede cambiar a `*/15 * * * *`,
- mientras la aplicación está abierta en el navegador: al entrar y cada 5 minutos.

## Actualizar catálogos de Hacienda

CABYS, la división territorial y los medios de pago se guardan en la base de cada cliente. Cuando Hacienda publique cambios:

```bash
npm run actualizar-catalogos -- --cabys catalogo-cabys.xlsx --ubicaciones division-territorial.xlsx --medios medios.csv --bases bases.txt
```

`bases.txt` lleva una base por línea (`libsql://cliente.turso.io TOKEN`). Sin `--bases` se usa `TURSO_DATABASE_URL`. Con `--simular` solo muestra lo que cambiaría.

## Integración con Front Desk y Punto de Venta

- `POST /api/documentos/externo`: el módulo pide emitir un comprobante.
- `GET /api/documentos/externo/eventos?origen=...`: documentos rechazados, reemplazados o anulados aquí, para actualizarlos en el módulo. `POST` con `{ "ids": [...] }` los marca como leídos.

## Notas

- No subas `node_modules/`, `.next/` ni `data-runtime/` (ya están en `.gitignore`).
- El prototipo entra siempre con el superusuario, que tiene todos los permisos.
