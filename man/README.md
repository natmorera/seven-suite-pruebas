# Management (MAN) · Seven Suite

Módulo de administración de la suite. Guarda lo que comparten todos los módulos (Front Desk, POS, Accounting, DICR, Tour Operador…): la empresa, los usuarios, los parámetros generales, los módulos contratados, su conexión y sus enlaces, los perfiles de clientes, proveedores, receptores y empresas, la estructura (equipos, servidores, servicios e impresión) y las notificaciones.

> Estado actual: interfaz completa con datos de ejemplo en memoria. No hay backend todavía; las pruebas de conexión, las sincronizaciones y la ejecución de servicios son simuladas.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript 5 |
| Estilos | Estilos en línea con los tokens de `components/suite/tokens.ts` (tema `MGT`); Tailwind 4 solo para la base de `globals.css` |
| Calidad | ESLint 9 (`eslint-config-next`), `tsc --noEmit` |

## Primeros pasos

Requisitos: Node.js 20.9 o superior.

```bash
npm ci
npm run dev        # http://localhost:3000
```

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genera los tipos de rutas y verifica tipos |

Antes de abrir un PR: `npm run typecheck && npm run lint && npm run build`.

## Variables de entorno

Todas son opcionales; sin ellas el prototipo usa valores de ejemplo.

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_WHATSAPP_VENTAS` | Enlace de WhatsApp de ventas para «Solicitar módulo» (por defecto `https://wa.me/50640003444`) |
| `NEXT_PUBLIC_URL_MENU` | Menú principal de Seven Suite (botón «Ir al menú principal» y cerrar sesión) |
| `NEXT_PUBLIC_URL_SUITE` | Dirección base de la suite; el enlace de cada módulo es `<base>/<sigla>` |
| `NEXT_PUBLIC_URL_<ID>` | Enlace propio de un módulo (`ACC`, `DICR`, `ACC_DICR`, `FDK`, `POS`, `TO`, `INV`, `PAY`, `FA`, `DSS`, `ANA`, `MGT`). `FDK` y `ACC` tienen un valor por defecto en `next.config.ts` |
| `NEXT_PUBLIC_EMPRESAS` | Empresas del selector del menú, separadas por coma |
| `NEXT_PUBLIC_MODULOS_EMPRESA` | Módulos de la empresa en el inicio de la suite, separados por coma |

## Pantallas

Todas las secciones están en el menú principal; Módulos y Estructura despliegan sus pantallas debajo (no hay subpanel). Las pestañas de cada pantalla quedan en la dirección (`?tab=…`). Bajo 1024 px el menú lateral se reemplaza por una barra con menú desplegable. En el celular (menos de 720 px) nunca hay scroll horizontal: la barra de filtros muestra la búsqueda y «Filtros» despliega los demás en varias líneas; cada fila de tabla es una tarjeta plegada con su título y una flecha para ver el detalle; la paginación va fija al pie en una sola línea; los reportes largos se ven como documento. En el celular se puede consultar todo menos la integración de módulos (pide otro dispositivo, `components/layout/SoloEscritorio.tsx`), y crear un registro nuevo muestra el aviso de continuar en una computadora o tablet (`useCrearEnEscritorio`).

| Sección | Pantallas y pestañas |
|---|---|
| Empresa | Identificación y contacto de la empresa elegida (selector junto al título) |
| Usuarios | Usuarios · Bitácora de seguridad; el detalle de cada usuario (`?usuario=<id>`) tiene Datos y accesos · Bitácora de seguridad (solo sus eventos) |
| Parámetros | Monedas · Tipo de cambio · Nacionalidades · Impuestos |
| Módulos | Integración y enlaces (pestañas Módulos · Enlaces; el detalle de cada módulo, `?modulo=<id>`, tiene Conexión · Envío de datos (con «Configurar») · Perfiles compartidos, y el pie Verificar y guardar) · Entidades y datos |
| Perfiles | Todos · Clientes · Proveedores · Receptores · Empresas (según los módulos contratados) |
| Estructura | Terminales · Terminales PinPad · Servidores · Servicios · Impresión (Impresoras · Tipos de documento) |

`/design-system` muestra los componentes de la suite con el color del MAN. Las direcciones anteriores (`/terminales-pinpad`, `/bitacora-seguridad`, `/entidades-datos`, `/infraestructura/…`, `/integraciones`…) redirigen a su pantalla actual (`next.config.ts`).

## Reglas de negocio

**Empresa.** El usuario puede tener varias empresas; se elige en el header de la pantalla o en el menú (es la misma selección). Nombre legal, tipo y número de identificación, país y zona horaria son obligatorios. La moneda del país se deduce del país y al cambiarlo se propone su zona horaria.

**Usuarios.** Un usuario por persona para toda la suite. Solo se da acceso a los módulos conectados al MAN (con el API Key validado) y al propio MAN (`useModulosConAcceso`); los accesos guardados a módulos sin conectar no se muestran y vuelven a aparecer al integrarlos. En el detalle, por cada módulo al que entra se elige su rol y «Personalizar permisos» abre ese módulo con el usuario elegido (`RUTA_PERMISOS`), porque los permisos son de cada módulo. El MAN gestiona el nombre de usuario (no se cambia después de crearlo), el nombre, el correo, la contraseña, «cambiar la contraseña en el próximo ingreso», si es administrador de la suite y, por cada módulo al que entra, su rol (de la lista de roles de ese módulo); los permisos de cada rol se definen dentro del módulo. El alta y la edición se hacen en una pantalla amplia: datos a la izquierda y el panel de módulos y roles a la derecha. En la lista, los módulos se ven como chips con su sigla; al pasar el cursor o hacer clic sobre ellos se abre el listado del rol en cada módulo. Toda contraseña nueva tiene al menos 8 caracteres, una mayúscula y un número; se cambia con el botón de la llave. «Duplicar» crea un usuario nuevo con los mismos módulos y roles.

**Bitácora de seguridad.** Solo lectura. Sigue el reporte estándar de la suite: Imprimir (impresora y opciones del documento) y Exportar (CSV, XLS o PDF; el PDF con tamaño libre o carta) en el header; una sola barra de filtros que se aplican al instante (búsqueda, período de fechas y filtros de varias opciones para usuario, módulo, aplicación y base de datos); los filtros aplicados como chips con «Limpiar todo»; contadores (eventos, usuarios, módulos y bases de datos); la tabla y la paginación. Por defecto muestra los eventos de hoy; al cambiar un filtro vuelve a la página 1, y si no hay resultados ofrece limpiar los filtros. En el celular se ve el documento (como el PDF) en lugar de la tabla. El detalle de cada usuario tiene su propia pestaña Bitácora de seguridad: solo sus eventos y sin la columna Usuario.

**Monedas.** Una moneda principal y como máximo 3 divisas secundarias.

**Producto contable.** Accounting y Digital Invoices son un solo producto con tres modos: ACC, DICR o ACC + DICR. Una empresa tiene uno solo; los tres usan el mismo isotipo y cambia el nombre. El catálogo muestra solo el modo contratado (con «Cambiar modo») o, si no hay ninguno, los tres para solicitar.

**Módulos.** El MAN es la base de la empresa: muestra los módulos que tiene contratados en su suscripción y desde aquí se integran; los demás módulos solo usan la información. Por ahora se integran desde el MAN el producto contable y Front Desk (`MODULOS_INTEGRABLES`); al inicio ninguno está integrado. El producto contable va primero en la lista porque es la base de la integración. El resto (POS, Payroll, Inventory, DSS…) dice «Todavía no disponible» y muestra un «Integrar» sin acción. La lista muestra el avance de cada integración («Lista para operar» o los pasos que faltan), su conexión y sus perfiles; «Solicitar módulo» abre el WhatsApp de ventas con el mensaje listo. «Integrar» o «Abrir» lleva al detalle (`?modulo=<id>`), con los pasos en orden: 1) **Conexión**: el API Key se genera en el módulo (Configuración › Integraciones); en el MAN se pega y «Validar» comprueba que sea de ese módulo. Con la conexión hecha se ve el API Key oculto y «Cambiar API Key», que obliga a verificar de nuevo. 2) **Envío de datos**: una tabla con los demás módulos y dos casillas, si este módulo le envía datos y si recibe datos de él. Por ahora solo existe el envío entre Front Desk y Accounting (`ENVIOS` en `catalogo.ts`); las demás direcciones dicen «No disponible». Al marcar Front Desk → Accounting aparece «Configurar», que abre los parámetros del envío: el API Key de Front Desk si todavía no está validado y la configuración contable de Front Desk (sistema contable, forma de inventario, libro, opciones de contabilización, cuentas del catálogo de Accounting con buscador por código o nombre y chips por nivel —Mayor, Submayor, Detalle, Auxiliar—, de las que solo se eligen auxiliares, y correos de alertas). Empieza vacía; sistema, inventario, libro y las dos cuentas son obligatorios. Configurarlo desde Accounting deja también conectado a Front Desk; cada módulo conserva su propio detalle. 3) **Perfiles compartidos**: junta los perfiles del módulo y de los módulos enlazados y los agrupa por número de identificación, sin contar guiones, espacios ni puntos (`normId`): el mismo número en varios módulos o en el MAN es un solo perfil («Se une»). Los datos generales (nombre, tipo de identificación, correo, teléfono y país) se comparan sin contar mayúsculas, tildes, espacios ni puntuación, y en el teléfono solo los dígitos (`comparar.ts`); si alguno no coincide, el perfil se marca «Datos distintos» con los campos que difieren y hay que revisarlo antes de sincronizar. Un nombre igual con otra identificación (sin contar sufijos como S.A. o S.R.L.) se marca «Posible duplicado». Se eligen cuáles traer; «Revisar datos» muestra el perfil en el MAN y en cada módulo (generales y de cada rol), marca los datos que no coinciden y deja elegir con cuál quedarse; la columna «Queda en el MAN» muestra el resultado y en los datos que no coinciden se puede corregir a mano (el nombre es obligatorio y el correo debe ser válido). Los roles se suman y los datos de cada rol que el MAN no tiene se completan con los del módulo. Se puede «Omitir por ahora». Si ya se sincronizó, se ve el detalle (fecha y perfiles en el MAN, con «Ver en Perfiles») y «Sincronizar de nuevo». Al final, el pie tiene «Cancelar» (descarta los cambios) y «Verificar y guardar»: comprueba la conexión, cada envío marcado y los perfiles, muestra cada comprobación y, si todas pasan, pide confirmar, crea los enlaces y deja el módulo (y los enlazados que ya estén completos) «Lista para operar». En esta pantalla el header no muestra «Guardar cambios». La configuración de los módulos se hace en computadora o tablet; en el celular se pide otro dispositivo.

**Enlaces.** Un enlace es un módulo que envía datos a otro (origen → destino). La pestaña empieza vacía: un enlace aparece cuando se verifica y guarda la integración que lo marcó. Muestra su estado («Sin actualizar» o «Al día»), la última actualización y los datos nuevos que esperan pasar; «Refrescar» trae lo nuevo del origen y «Ver integración» abre el detalle del módulo de origen.

**Entidades y datos.** Lista de entidades (hoteles o empresas) con su Front Desk principal, si registran en la bitácora y cuántas bases tienen conectadas. El Front Desk principal se elige entre las bases de Front Desk («FDK - Entidad»). Al abrir una entidad se editan sus datos y la base de datos de cada módulo contratado: al abrir la base, un modal con descripción, origen de datos, base de datos, servidor, usuario y contraseña (oculta). Por base: refrescar la conexión, cambiar la fecha del sistema y eliminarla; no se elimina si su módulo tiene enlaces activos («La base de datos está siendo usada en enlaces entre módulos»).

**Perfiles.** Un perfil se identifica por su número de identificación y no se repite. Roles: *Cliente* (el mismo perfil en Accounting y Front Desk), *Proveedor* (Accounting), *Receptor* (Digital Invoices) y *Empresa* (Front Desk). Cada pestaña de rol aparece solo si la empresa tiene el módulo que lo usa (sin DICR no hay receptores) y muestra las columnas que usa ese módulo. El detalle edita los datos generales y los de cada rol, y tiene «Abrir en el módulo» para cada módulo que lo usa. Al sincronizar, los perfiles con la misma identificación se unen sumando rol, módulo y los datos que falten.

**Estructura.** Las terminales son los equipos que se conectan a la suite (estaciones, servidores y accesos web); las terminales PinPad son los lectores de tarjeta de cada proveedor. Los servicios (módulo + base de datos + frecuencia) se crean en Servicios y en Servidores se elige si cada uno corre ahí de forma automática o manual. Impresión: cada impresora indica qué módulos imprimen en ella; los tipos de documento son de un módulo o generales (los usan todos), y cada módulo asigna sus tipos a una impresora.

**Notificaciones.** La campana del menú (debajo del idioma; en el celular, en la barra superior) abre un panel con lo que necesita atención: servicios, enlaces o bases de datos con error, módulos sin conectar, perfiles sin sincronizar, usuarios que deben cambiar su contraseña y tipo de cambio del día sin registrar. Cada aviso lleva a la pantalla donde se resuelve y se puede marcar como leído.

**Guardar y cancelar.** Los cambios de configuración quedan pendientes hasta «Guardar cambios» (arriba a la derecha); «Cancelar» los descarta con confirmación. Los botones aparecen solo cuando hay cambios reales. Las operaciones (validar un API Key, sincronizar perfiles, refrescar un enlace, ejecutar un servicio) se aplican de inmediato y no cuentan como cambios pendientes.

## Qué es de cada módulo

- **MAN**: lo descrito arriba.
- **Cada módulo**: roles y permisos de sus usuarios, consecutivos y asignación de impresoras a sus tipos de documento.
- **Cada módulo**: el detalle de sus perfiles (el MAN guarda la base común y abre el perfil en el módulo).
- **Accounting**: configuración contable, catálogo de cuentas, actividad bancaria y firmas. Cómo contabiliza Front Desk se configura en el MAN, en la integración de Front Desk, eligiendo cuentas de ese catálogo.
- **DICR**: facturación electrónica (los demás módulos consultan los impuestos del MAN).

## Estructura

```
app/                          Rutas; cada page.tsx solo monta su pantalla
components/
  suite/                      UI compartida por todos los módulos de Seven Suite (idéntica en cada proyecto)
  layout/                     Shell (menú, empresa elegida, Guardar / Cancelar), MenuMovil, Notificaciones (panel), nav.tsx (menú y títulos),
                              Pantalla (header, pestañas, filtros), Pestanas (pestañas en la dirección),
                              SoloEscritorio (aviso en el celular para procesos críticos), íconos
  kit/                        Piezas de pantalla: tarjeta, campos, tabla, catálogos (CrudCatalogo), filtros (opciones y fechas),
                              modales, insignias, exportación e impresión, reporte (filtros aplicados, contadores, vista del documento)
  man/
    tipos.ts                  Tipos de datos
    catalogo.ts               Catálogo de módulos, modos del producto contable, roles de cada módulo, roles de perfiles y enlace de WhatsApp
    avisos.ts                 Avisos del panel de notificaciones, calculados a partir de los datos
    inicial.ts                Datos iniciales (INICIAL), armados desde datos/
    datos/                    Datos de ejemplo por área, la sincronización simulada de perfiles, la validación del API Key y la integración contable
    store.tsx                 Estado: «Guardar cambios» fija una copia, «Cancelar» vuelve a ella; useOperacion aplica resultados sin cambios pendientes
    piezas.tsx                Chip y logo de módulo, estado de conexión, prueba de conexión simulada
    secciones/                Una carpeta por sección del menú y un archivo por pantalla (y sus modales)
```

## Datos y backend

- Todo vive en memoria: `INICIAL` (`components/man/inicial.ts`) es el estado inicial y `store.tsx` lo expone con `useDato('clave')`. Para conectar el backend, cargar `INICIAL` desde la API y persistir en `guardar()` de `components/man/store.tsx`.
- `useProbarConexion` (`components/man/piezas.tsx`) simula las pruebas de conexión (bases de datos, PinPad, correo): reemplazarla por la llamada real.
- `components/man/datos/sincronizacion.ts` simula lo que devuelve cada módulo al sincronizar perfiles (`perfilesDelModulo`) y une por número de identificación (`unirPerfiles`); la unión se puede mantener y solo cambiar el origen de los datos.
- «Abrir en el módulo» (Perfiles) arma la dirección con el enlace del módulo y `RUTA_PERFILES` (`components/man/catalogo.ts`).
- `validarApiKey` (`components/man/datos/conexion.ts`) solo revisa el formato y el prefijo del módulo, y `verificar` (`secciones/modulos/integracion.ts`) evalúa las comprobaciones con los datos en memoria: con backend, validar el API Key y verificar la integración son llamadas a la API del MAN, que se comunica con el módulo.
- Las cuentas y los libros de la configuración del envío Front Desk → Accounting (`components/man/datos/contabilidad.ts`) son del catálogo de Accounting: con backend se leen de Accounting por su conexión.
- «Refrescar» (Enlaces) y «Ejecutar» (Servicios) solo actualizan la fecha y el estado en pantalla; las notificaciones solo se configuran.
- Los roles de cada módulo (`ROLES_MODULO` en `catalogo.ts`) son de ejemplo: con backend se piden a cada módulo.
- Los demás módulos deben leer de aquí: empresa, usuarios y a qué módulos entran, módulos activos, monedas y tipo de cambio, impuestos, nacionalidades, perfiles, impresoras, tipos de documento y terminales PinPad.

## Convenciones

- Máximo 350 líneas por archivo; las pantallas grandes se dividen en la carpeta de su sección (pantalla, modales, reglas).
- Imports relativos dentro de `components/man` y alias `@/` entre carpetas; `import { type X }` para tipos; sin dependencias circulares.
- Comillas simples, nombres de dominio y textos en español.
- Orden de cada pantalla: header, pestañas, barra de filtros (buscador primero, luego filtros desplegables y el de fechas) y contenido.
- Tarjetas con título y descripción separados por una línea, tablas con borde y encabezado gris, acción principal arriba a la derecha, textos de 10.5 px o más y cada campo con su etiqueta.
- Un módulo se menciona con su isotipo y su sigla en su color (`ChipModulo`); el nombre completo solo aparece en la lista de Módulos.
- Las listas paginan con `usePaginado` y `Paginacion`: la paginación va siempre fija al pie de la pantalla (ranura de `Pantalla`), aunque la tabla esté vacía.
- El detalle de un registro (usuario, entidad) muestra una flecha para volver antes del título (`VolverEnTitulo`) y el nombre junto al título.
- Con cambios sin guardar, el header muestra solo «Cancelar» y «Guardar cambios»: las acciones de la pantalla vuelven al guardar o descartar.
- Las tablas usan `Tabla` del kit: en el celular cada celda toma el título de su columna y la fila se ve como tarjeta plegable (`Fila` agrega la flecha de detalle cuando hay más de dos datos); `Celda movil` marca el título de la tarjeta, un bloque a todo el ancho o una celda que no se muestra.
- Los reportes siguen el patrón estándar de la suite (ver Bitácora de seguridad): header con Imprimir y Exportar, barra de filtros, filtros aplicados, contadores, tabla y paginación; los catálogos de 3 o más opciones usan `FiltroMulti`. En el celular, un reporte largo se ve como documento (`VistaDocumento`).
- Confirmaciones con `useConfirmar` / `Confirmar` del kit (nunca `window.confirm`).
- `components/suite` no se modifica en este proyecto: es idéntica en todos los módulos.
