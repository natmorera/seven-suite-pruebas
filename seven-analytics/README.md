# Seven Analytics

Dashboard analítico de Seven Suite — construido con Next.js 16 (App Router), TypeScript, Tailwind CSS v4 y Recharts.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre http://localhost:3000

> La fuente Montserrat se carga vía `next/font/google`, así que necesitas conexión a internet la primera vez que compiles (`npm run dev` o `npm run build`). Next.js la cachea localmente después.

## Estructura

```
app/
  layout.tsx        # Layout raíz, carga la fuente Montserrat
  page.tsx           # Ensambla el dashboard completo
  globals.css        # Design tokens (colores, tipografía) como CSS variables + @theme de Tailwind v4
components/
  Sidebar.tsx             # Menú lateral colapsable
  Header.tsx              # Nombre del hotel + filtros (comparación, fecha) + exportar
  KpiCards.tsx             # 4 tarjetas: Utilidad Neta, Ingresos, Costo de Ventas, Gastos Operativos
  RevenueByDepartment.tsx  # Grid adaptable (2 o varios departamentos)
  FrontDeskLive.tsx        # Donut de ocupación + métricas (ADR, RevPAR, RevPOR...)
  RevenueOverTime.tsx      # Gráfico de barras con selector de periodo (1D/7D/1M/1Y)
  CostCenters.tsx          # Gráfico + tabla de centros de costo
  PLBridge.tsx             # Waterfall chart Ingresos -> Utilidad Bruta -> Utilidad Neta
  NetIncomeTrend.tsx       # Combo barras + línea (utilidad + margen %)
  TopCostsExpenses.tsx     # Lista de 2 columnas
  MonthlyComparison.tsx    # Tabla comparativa mensual
lib/
  mock-data.ts        # Todos los datos mock, sacados de las capturas de Figma
  format.ts            # Helpers de formato de moneda / porcentaje / delta
```

## Design tokens (definidos en `app/globals.css`)

- **Color principal:** `#5900D9`
- **Estados:** Success `#4CAF50`, Error `#F44336`, Warning `#EEB300`, Information `#2196F3` (con variantes Border 8% / Background 4%)
- **Neutros:** 900 `#0F0F0F`, 700 `#757575`, 500 `#ECECEC`, 200 `#F9F9F9`, 000 `#FFFFFF`
- **Tipografía:** Montserrat — H1 32/40, H2 24/32, H3 20/28, Body 16/20, Small 14/16, XSmall 12/16

Usa las clases de Tailwind `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-small`, `text-xs` y `bg-primary`, `text-success`, `border-neutral-500`, etc. — ya están mapeadas en `@theme` dentro de `globals.css`.

## Próximos pasos sugeridos

1. **Conectar datos reales**: reemplazar los imports de `lib/mock-data.ts` por llamadas a tu API (puedes crear `lib/api.ts` con fetch/SWR/React Query manteniendo la misma forma de los objetos).
2. **Sidebar con más secciones**: hoy solo tiene el ícono Home; agregar el resto de módulos de Seven Analytics como rutas de Next.js (`app/reportes/page.tsx`, etc.).
3. **Responsive del sidebar en mobile**: actualmente se oculta en pantallas pequeñas (`hidden md:flex`); si necesitas un drawer mobile, lo agregamos.
4. **Estados de carga/error**: los componentes asumen datos siempre presentes; al conectar API real conviene añadir skeletons y manejo de errores.
5. **Autenticación / multi-hotel**: si Seven Analytics maneja varios hoteles, el nombre "Hotel Layan" en el header debería venir de contexto/sesión.

## Configuración

El menú lateral tiene **Configuración** (`/configuracion`), con el mismo encabezado, pestañas, tarjetas y campos que Configuración › Empresa en Accounting y los demás módulos de la suite:

- **Empresa:** identificación (nombre legal y comercial, tipo y número de identificación, país y zona horaria) y contacto (dirección, teléfono, correo y sitio web) de la empresa elegida en el selector. Al editar aparecen **Cancelar** y **Guardar cambios** en el encabezado.
- **API Key:** la llave con la que Management (MAN) se conecta a Seven Analytics, con **Mostrar**, **Copiar** y **Generar API Key nueva** (la anterior deja de funcionar).

La empresa elegida en el selector se mantiene al pasar entre Dashboard y Configuración. Como el módulo no tiene servidor, los datos de empresa y la API Key se guardan en el navegador (`lib/empresa.ts`, `lib/apiKey.ts`). Las piezas de la pantalla están en `components/configuracion/piezas.tsx` y la sección de la API Key en `components/integracion/SeccionApiKey.tsx`, la misma de los demás módulos.
