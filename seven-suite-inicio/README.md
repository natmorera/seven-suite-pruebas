# Seven Suite · Inicio

Página de inicio de la suite: los módulos de la empresa, los que puede solicitar y las promociones. Cada módulo abre su propio proyecto de Vercel.

## Inicio de sesión

El prototipo pide usuario y contraseña antes de mostrar los módulos: siempre **seven** / **1**, y se elige la entidad (empresa). «Cerrar sesión», en el menú del usuario, vuelve a esta pantalla.

## Publicar en Vercel

1. Sube este proyecto (o el zip) a Vercel como un proyecto nuevo.
2. En **Settings › Environment Variables** agrega el enlace de cada módulo publicado. Los que no tengan enlace aparecen como «Próximamente».
3. Despliega. Si después cambias un enlace, vuelve a desplegar (Vercel guarda estas variables al construir).

**Mis módulos** muestra los de la empresa (por defecto ACC, ACC + DICR, DICR, Seven Analytics, Front Desk y Management, ya con sus enlaces); el resto aparece en **Módulos disponibles**, solo como información (sin acciones).

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_MODULOS_EMPRESA` | Módulos de la empresa, en orden: `ACC,ACC_DICR,DICR,ANA,FDK,MGT` |
| `NEXT_PUBLIC_URL_ACC` | Accounting (por defecto accounting-rho-five.vercel.app) |
| `NEXT_PUBLIC_URL_ACC_DICR`, `NEXT_PUBLIC_URL_DICR` | El mismo sitio de Digital Invoices: `?modo=completo` (con Contabilidad) o `?modo=dicr` (solo facturación) |
| `NEXT_PUBLIC_URL_ANA` | Seven Analytics (por defecto seven-analytics-green.vercel.app) |
| `NEXT_PUBLIC_URL_FDK` | Front Desk (por defecto front-desk-cyan.vercel.app) |
| `NEXT_PUBLIC_URL_MGT` | Management, el MAN (por defecto man-ten-eta.vercel.app) |
| `NEXT_PUBLIC_URL_POS`, `_TO`, `_INV`, `_PAY`, `_FA`, `_DSS` | Enlace de cada módulo cuando exista |
| `NEXT_PUBLIC_URL_SUITE` | Dirección principal actual: los módulos sin enlace propio abren `dirección/SIGLA` |
| `NEXT_PUBLIC_EMPRESAS` | Empresas del selector, separadas por coma |

La empresa elegida viaja al módulo como `?empresa=…`.

## Promociones (slides de la derecha)

Se siguen editando en WordPress:

| Variable | Para qué |
|---|---|
| `PROMOS_WP_URL` | Dirección del sitio de WordPress, por ejemplo `https://www.seven.cr` |
| `PROMOS_WP_CATEGORIA` | Slug de la categoría con las entradas que son slides |

Cada entrada de esa categoría es un slide: el **título**, el **extracto** como texto y la **imagen destacada** de fondo. Si el sitio tiene ACF, los campos `boton` (texto), `enlace` y `fondo` (color) agregan el botón y el color. Se actualizan solos cada hora.

Sin WordPress se usan los slides de `data/promociones.json`, que también se pueden editar a mano.

Ejemplo: `NEXT_PUBLIC_URL_DICR = https://digital-invoices-cr.vercel.app`

En cada módulo se pone `NEXT_PUBLIC_URL_MENU` con el enlace de este menú, para que «Módulos» (al final de su menú lateral) ofrezca volver aquí.

## Correr en tu computadora

```bash
npm install
npm run dev
```
