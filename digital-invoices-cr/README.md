# Digital Invoices

Facturación electrónica de Costa Rica (v4.4) con contabilidad para hoteles: ventas, compras con buzón de correo, facturas recurrentes, productos y servicios, reportes y dashboard.

## Cómo correr el proyecto

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Publicar en Vercel

1. Sube este proyecto a un repositorio (GitHub, GitLab o Bitbucket) e impórtalo en Vercel. Vercel detecta Next.js solo.
2. En **Settings › Environment Variables** agrega las variables de la tabla de abajo. Sin `TURSO_DATABASE_URL` la aplicación funciona, pero los datos se guardan en `/tmp` y se borran cuando Vercel recicla la función.
3. Despliega.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Base de datos en Turso. Sin ellas se usa un archivo local (`data-runtime/`). En Vercel son necesarias para que los datos no se pierdan. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envío real de comprobantes por correo. Sin ellas el envío se simula. |
| `CRON_SECRET` | Opcional. Protege `/api/tareas` cuando lo llama el cron de Vercel. |
| `HACIENDA_USERNAME`, `HACIENDA_PASSWORD`, `HACIENDA_AMBIENTE` | Credenciales de la API de Hacienda (`produccion` o `sandbox`). Sin ellas el envío se simula. |
| `LIMITE_SUCURSALES` | Sucursales que incluye el plan del cliente. Por defecto 10. |
| `MODO_IMPLEMENTACION` | `1` (o sin definir) permite crear sucursales y cambiar su código; `0` lo reserva a implementación. |
| `HABILITAR_PRUEBAS` | `1` muestra el ambiente de pruebas (sandbox) de Hacienda, solo para pruebas internas. Sin definir está oculto. |
| `CORREO_RECEPCION_CM` | Correo al que el cliente redirige las facturas de sus proveedores. Acepta `{cedula}`, por ejemplo `facturas+{cedula}@cmsuite.com`. |

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

## Módulos de la suite

Al final del menú lateral, «Módulos» abre los módulos de la empresa y marca en cuál estás. Cada enlace se configura con variables de entorno (se leen al construir; si cambian, vuelve a desplegar):

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_URL_ACC_DICR` | Accounting + Facturación electrónica |
| `NEXT_PUBLIC_URL_ACC` | Accounting |
| `NEXT_PUBLIC_URL_DICR` | Facturación electrónica |
| `NEXT_PUBLIC_URL_FDK`, `NEXT_PUBLIC_URL_POS` | Front Desk y Point of Sale; sin enlace aparecen como «Próximamente» |
| `NEXT_PUBLIC_URL_MENU` | Menú principal de la suite (proyecto «Seven · Módulos») |

El prototipo entra siempre con el superusuario, que tiene todos los permisos.

El mismo código sirve para tres versiones: `?modo=completo` (Accounting + Digital Invoices), `?modo=dicr` (solo Digital Invoices) o `?modo=acc` (solo Accounting). También se cambia desde «Módulos». `?empresa=…` abre con esa empresa.

`NEXT_PUBLIC_MODO_FIJO=acc` (o `dicr`, `completo`) deja el sitio siempre en esa versión, sin poder cambiarla; así se publica Seven Accounting.

## Integración con Front Desk y Punto de Venta

- `POST /api/documentos/externo`: el módulo pide emitir un comprobante.
- `GET /api/documentos/externo/eventos?origen=...`: documentos rechazados, reemplazados o anulados aquí, para actualizarlos en el módulo. `POST` con `{ "ids": [...] }` los marca como leídos.

## Notas

- No subas `node_modules/`, `.next/` ni `data-runtime/` (ya están en `.gitignore`).
