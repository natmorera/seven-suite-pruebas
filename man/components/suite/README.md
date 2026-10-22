# components/suite · Seven Suite UI

Carpeta compartida por todos los módulos (Front Desk, POS y los que vengan).
**Es idéntica en cada proyecto**: si cambias un archivo aquí, cópialo a los demás.

La base es Accounting / Digital Invoices, que ya pasó QA. Medidas, pesos,
bordes y comportamiento del menú son los mismos; lo único que cambia entre
módulos es el color.

| Archivo | Qué tiene |
|---|---|
| `tokens.ts` | Colores, tipografía, medidas, temas por módulo (`TEMAS`) y formatos (`fmtNum`, `fmtMoney`, `fmtDate`) |
| `SuiteShell.tsx` | Menú lateral oscuro, subpanel de Configuración y pie del sistema |
| `ui.tsx` | Button, PageHeader, TabBar, FilterBar, PageBody, FormField, Input, Select, SearchInput, Checkbox, Radio, Switch, Chip, Section, InfoBox, EmptyState, DataTable, StatusBadge, Modal, Toast |
| `icons.tsx` | Íconos del shell (14×14, `currentColor`) |
| `modulos.ts` | Catálogo de módulos (copia de `seven-suite-inicio/modulos.ts`) |
| `ModulosSuite.tsx` | Modal «Módulos» e isotipos |
| `DesignSystem.tsx` | La página `/design-system` |

## Color del módulo

Se define una sola vez en `app/globals.css`:

```css
:root {
  --brand: #213c89;          /* botón primario, pestaña activa, foco */
  --brand-dark: #1a306e;
  --brand-bg: #f2f3f8;
  --brand-border: #c1c8de;
  --brand-on-dark: #4c8fe6;  /* ítem activo del menú oscuro */
}
```

Los valores de cada módulo están en `TEMAS` (`tokens.ts`). `--brand-on-dark`
existe porque el azul de Front Desk o el verde del POS no se leen sobre el
negro del menú (contraste 1.9:1 y 3.3:1); el tono claro de la misma familia
pasa de 4.5:1. En Accounting es el mismo dorado.

## Usar el shell

```tsx
// components/layout/Shell.tsx  ("use client")
<SuiteShell modulo="FDK" producto="Seven Front Desk" nav={NAV} config={CONFIG} fechaHotelera="06/10/2026">
  {children}
</SuiteShell>
```

El menú de cada módulo vive en su propio `nav.tsx` (`NavItem[]` y `ConfigShell`).

## Una página típica

```tsx
import { Page, PageHeader, TabBar, FilterBar, PageBody, Button } from "@/components/suite/ui";

<Page>
  <PageHeader title="Reservaciones"><Button>Nueva reservación</Button></PageHeader>
  <TabBar tabs={["Llegadas", "En casa"]} active={tab} onChange={setTab} />
  <FilterBar>…</FilterBar>
  <PageBody>…</PageBody>
</Page>
```

El `<main>` del shell no tiene scroll: lo tiene `PageBody`, así el
encabezado de la página nunca se mueve.
