'use client';
// Página /design-system: referencia viva para desarrollo. Todo lo que se ve
// aquí son los componentes reales de components/suite, no capturas.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, SIDEBAR, SIZE, TEMAS, TYPE, radius, variablesDe, fmtNum, fmtMoney, fmtDate, type ModuloId } from './tokens';
import {
  Page, PageHeader, TabBar, FilterBar, PageBody, Button, FormField, Input, Select, SearchInput, Checkbox, Radio, Switch, Chip,
  Section, InfoBox, EmptyState, DataTable, DataRow, Td, StatusBadge, Modal, Toast,
} from './ui';
import { Logo, IcChevronDown, IcChevronRight, IcCollapse, IcBell, IcModulos, IcLogout, IcPlus, IcDownload, IcConfig, IcSearch } from './icons';
import { Isotipo } from './ModulosSuite';
import { MODULOS_SUITE } from './modulos';

const VISIBLES: ModuloId[] = ['ACC', 'FDK', 'POS', 'MGT', 'TO', 'INV', 'PAY', 'FA', 'DSS', 'ANA'];
const TABS = ['Color', 'Tipografía y medidas', 'Menú lateral', 'Componentes', 'Reglas'];

const codigo: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, background: C.n200, border: `1px solid ${C.n500}`, borderRadius: 4, padding: '1px 5px', color: C.n900, whiteSpace: 'nowrap' };
const Code = ({ children }: { children: ReactNode }) => <code style={codigo}>{children}</code>;
const Fila = ({ children, gap = 12, arriba }: { children: ReactNode; gap?: number; arriba?: boolean }) => <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: arriba ? 'flex-start' : 'center', gap }}>{children}</div>;
const Nota = ({ children }: { children: ReactNode }) => <p style={{ fontSize: 12, color: C.n700, margin: 0, lineHeight: 1.6, maxWidth: 720 }}>{children}</p>;

export default function DesignSystem({ modulo }: { modulo: ModuloId }) {
  const [vista, setVista] = useState<ModuloId>(modulo === 'DICR' ? 'ACC' : modulo);
  const [tab, setTab] = useState(0);
  const tema = TEMAS[vista];

  return (
    <Page>
      <PageHeader title="Design System" left={<StatusBadge label={`Viendo: ${tema.nombre}`} color="brand" />} />
      <div style={{ ...(variablesDe(tema) as CSSProperties), display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <FilterBar>
          <span style={{ fontSize: 11, color: C.n700, marginRight: 4 }}>Previsualizar con el color de:</span>
          {VISIBLES.map(id => {
            const t = TEMAS[id];
            const m = MODULOS_SUITE.find(x => x.id === id);
            const on = vista === id;
            return (
              <button key={id} onClick={() => setVista(id)} aria-pressed={on}
                style={{ height: 28, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: radius.pill, cursor: 'pointer', fontFamily: FONT,
                  fontSize: 11, fontWeight: on ? 600 : 500, border: `1px solid ${on ? t.brandBd : C.n500}`, background: on ? t.brandBg : C.n000, color: on ? t.brand : C.n900 }}>
                {m && <Isotipo colores={m.colores[0]} size={12} />}
                {t.sigla}{id === modulo || (id === 'ACC' && modulo === 'DICR') ? ' · este módulo' : ''}
              </button>
            );
          })}
        </FilterBar>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        <PageBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>
            {tab === 0 && <Colores vista={vista} />}
            {tab === 1 && <Tipografia />}
            {tab === 2 && <Menu />}
            {tab === 3 && <Componentes />}
            {tab === 4 && <Reglas />}
          </div>
        </PageBody>
      </div>
    </Page>
  );
}

// ── Color ───────────────────────────────────────────────────────────────────
function Muestra({ color, nombre, token, uso, borde }: { color: string; nombre: string; token: string; uso: string; borde?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
      <span style={{ width: 44, height: 44, borderRadius: radius.md, background: color, flexShrink: 0, border: borde ? `1px solid ${C.n500}` : 'none' }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: C.n900 }}>{nombre}</p>
        <p style={{ margin: '2px 0', fontSize: 11, color: C.n700 }}><Code>{token}</Code></p>
        <p style={{ margin: 0, fontSize: 11, color: C.n700, lineHeight: 1.4 }}>{uso}</p>
      </div>
    </div>
  );
}
const grilla: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 };

function Colores({ vista }: { vista: ModuloId }) {
  const t = TEMAS[vista];
  return (
    <>
      <Section title={`Marca · ${t.nombre}`} hint="Lo único que cambia entre módulos. Se define una vez en :root (app/globals.css).">
        <div style={grilla}>
          <Muestra color={t.brand} nombre={`Brand ${t.brand}`} token="C.brand · var(--brand)" uso="Botón primario, pestaña activa, foco, checkbox, ítem activo del subpanel." />
          <Muestra color={t.brandDk} nombre={`Brand oscuro ${t.brandDk}`} token="C.brandDk" uso="Hover y texto sobre fondo de marca." />
          <Muestra color={t.brandBg} nombre={`Brand fondo ${t.brandBg}`} token="C.brandBg" uso="Fila seleccionada, chip, InfoBox." borde />
          <Muestra color={t.brandBd} nombre={`Brand borde ${t.brandBd}`} token="C.brandBd" uso="Borde de chip, InfoBox e ítem activo del subpanel." />
          <Muestra color={t.brandOnDark} nombre={`Brand en menú ${t.brandOnDark}`} token="C.brandOnDark" uso="Ítem activo del menú oscuro. Más claro para que se lea sobre #0D0D0D." />
        </div>
      </Section>
      <Section title="Neutros" hint="Iguales en toda la suite. No usar otros grises.">
        <div style={grilla}>
          <Muestra color={C.n900} nombre="#0F0F0F" token="C.n900" uso="Texto principal." />
          <Muestra color={C.n700} nombre="#757575" token="C.n700" uso="Texto secundario, labels de tabla, íconos." />
          <Muestra color={C.n500} nombre="#ECECEC" token="C.n500" uso="Todos los bordes y divisores." />
          <Muestra color={C.n200} nombre="#F9F9F9" token="C.n200" uso="Fondo de la app, header de tabla, hover de fila." borde />
          <Muestra color={C.n000} nombre="#FFFFFF" token="C.n000" uso="Superficies: barras, cards, modales." borde />
          <Muestra color={SIDEBAR.bg} nombre="#0D0D0D" token="SIDEBAR.bg" uso="Fondo del menú lateral en todos los módulos." />
        </div>
      </Section>
      <Section title="Semánticos" hint="Para estado, nunca como color de marca.">
        <div style={grilla}>
          <Muestra color={C.success} nombre="#4CAF50" token="C.success" uso="Éxito, switch encendido, toast de confirmación." />
          <Muestra color={C.error} nombre="#F44336" token="C.error" uso="Error de campo, acción destructiva." />
          <Muestra color={C.warning} nombre="#EEB300" token="C.warning" uso="Advertencias y pendientes." />
          <Muestra color={C.info} nombre="#2196F3" token="C.info" uso="Información neutral." />
        </div>
      </Section>
      <Section title="Todos los módulos">
        <DataTable headers={['Módulo', 'Brand', 'Brand en menú', 'Fondo', 'Borde']}>
          {VISIBLES.map(id => {
            const x = TEMAS[id];
            const punto = (c: string) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: c, border: `1px solid ${C.n500}` }} />{c}</span>;
            return (
              <DataRow key={id} selected={id === vista}>
                <Td>{x.sigla} · {x.nombre}</Td><Td>{punto(x.brand)}</Td><Td>{punto(x.brandOnDark)}</Td><Td>{punto(x.brandBg)}</Td><Td>{punto(x.brandBd)}</Td>
              </DataRow>
            );
          })}
        </DataTable>
      </Section>
    </>
  );
}

// ── Tipografía y medidas ────────────────────────────────────────────────────
function Tipografia() {
  const usos: Record<string, string> = {
    pageTitle: 'Título de la página (PageHeader)', modalTitle: 'Título de modal', sectionTitle: 'Título de card / Section',
    body: 'Texto base, inputs, botones, celdas, pestañas', bodyStrong: 'Énfasis dentro de texto base', small: 'Ayudas, pie del sistema',
    label: 'Label de campo, encabezado de tabla', badge: 'Badges de estado',
  };
  return (
    <>
      <Section title="Montserrat" hint="Una sola familia en toda la suite: @fontsource/montserrat 400, 500, 600 y 700. Números con tabular-nums.">
        <DataTable headers={['Ejemplo', 'Token', 'Tamaño / peso', 'Uso']}>
          {Object.entries(TYPE).map(([k, v]) => (
            <DataRow key={k}>
              <Td><span style={{ fontSize: v.fontSize, fontWeight: v.fontWeight, color: C.n900 }}>Reservación confirmada</span></Td>
              <Td><Code>TYPE.{k}</Code></Td>
              <Td muted>{v.fontSize}px · {v.fontWeight}</Td>
              <Td muted>{usos[k]}</Td>
            </DataRow>
          ))}
        </DataTable>
        <Nota>Pesos: 400 normal, 500 por defecto en la interfaz (botones, labels, títulos), 600 activo o énfasis, 700 totales. Nada en mayúsculas sostenidas.</Nota>
      </Section>
      <Section title="Medidas" hint="Las barras de la página y del menú comparten alturas para que las líneas coincidan.">
        <DataTable headers={['Token', 'Valor', 'Dónde']}>
          {[
            ['SIZE.header', `${SIZE.header}px`, 'Header del menú, subpanel de Configuración y PageHeader'],
            ['SIZE.tabBar', `${SIZE.tabBar}px`, 'Barra de pestañas'],
            ['SIZE.filterBarMin', `${SIZE.filterBarMin}px`, 'Barra de filtros (alto mínimo)'],
            ['SIZE.control', `${SIZE.control}px`, 'Botones, inputs, selects, búsqueda'],
            ['SIZE.controlSm', `${SIZE.controlSm}px`, 'Botones dentro de filas y dropdowns'],
            ['SIZE.sidebarOpen / Closed', `${SIZE.sidebarOpen} / ${SIZE.sidebarClosed}px`, 'Menú lateral abierto / cerrado'],
            ['SIZE.configSubpanel', `${SIZE.configSubpanel}px`, 'Subpanel de Configuración'],
            ['SIZE.appFooter', `${SIZE.appFooter}px`, 'Pie del sistema'],
            ['PAGE_PAD', '24px', 'Padding horizontal de todas las barras y del contenido'],
          ].map(([a, b, c]) => <DataRow key={a}><Td><Code>{a}</Code></Td><Td>{b}</Td><Td muted>{c}</Td></DataRow>)}
        </DataTable>
      </Section>
      <Section title="Radios">
        <Fila gap={24}>
          {Object.entries(radius).map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 44, borderRadius: v, background: C.brandBg, border: `1px solid ${C.brandBd}` }} />
              <p style={{ margin: '6px 0 0', fontSize: 11, color: C.n700 }}>{k} · {v}px</p>
            </div>
          ))}
        </Fila>
        <Nota>control: botones e inputs. md: dropdowns, InfoBox, toasts. card: cards, tablas y modales. pill: badges, chips y switch.</Nota>
      </Section>
    </>
  );
}

// ── Menú lateral ────────────────────────────────────────────────────────────
function MenuMuestra({ abierto }: { abierto: boolean }) {
  const w = abierto ? SIZE.sidebarOpen : SIZE.sidebarClosed;
  const item = (label: string, activo = false, grupo = false, exp = false): ReactNode => (
    <div style={{ display: 'flex', alignItems: 'center', gap: abierto ? 10 : 0, height: 32, justifyContent: abierto ? 'flex-start' : 'center',
      color: activo ? C.brandOnDark : SIDEBAR.text, borderLeft: activo && abierto ? `3px solid ${C.brandOnDark}` : '3px solid transparent',
      paddingLeft: abierto ? (activo ? 13 : 16) : 0, paddingRight: abierto ? 16 : 0, margin: abierto ? '1px 4px' : '1px auto', width: abierto ? 'calc(100% - 8px)' : 32,
      fontSize: 12, fontWeight: activo ? 600 : 400, borderRadius: 4 }}>
      <IcConfig />
      {abierto && <span style={{ flex: 1 }}>{label}</span>}
      {abierto && grupo && (exp ? <IcChevronDown style={{ color: activo ? C.brandOnDark : SIDEBAR.chevron }} /> : <IcChevronRight style={{ color: SIDEBAR.chevron }} />)}
    </div>
  );
  const sub = (label: string, on = false) => (
    <div style={{ padding: '7px 16px 7px 40px', fontSize: 12, fontWeight: on ? 500 : 400, color: on ? C.brandOnDark : SIDEBAR.subText, background: on ? SIDEBAR.activeBg : 'transparent', borderRadius: radius.sm }}>{label}</div>
  );
  return (
    <div style={{ width: w, height: 440, background: SIDEBAR.bg, borderRadius: radius.card, overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ height: SIZE.header, padding: abierto ? '0 12px' : 0, display: 'flex', alignItems: 'center', justifyContent: abierto ? 'flex-start' : 'center', gap: 8, borderBottom: `1px solid ${SIDEBAR.divider}` }}>
        <span style={{ width: 28, height: 28, background: C.brand, borderRadius: radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Logo /></span>
        {abierto && <>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#E0E0E0' }}>Hotel Fortuna</span>
          <span style={{ width: 28, height: 28, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SIDEBAR.muted }}><IcCollapse /></span>
        </>}
      </div>
      <div style={{ flex: 1, padding: '8px 4px' }}>
        {item('Dashboard')}
        {item('Operación', true, true, true)}
        {abierto && <>{sub('Mapa de habitaciones', true)}{sub('Perfiles')}{sub('Tareas')}</>}
        {item('Reportes', false, true)}
        {item('Configuración', false, true)}
      </div>
      <div style={{ borderTop: `1px solid ${SIDEBAR.divider}`, padding: 4 }}>
        {[['Notificaciones', <IcBell key="b" />], ['Módulos', <IcModulos key="m" />], ['Cerrar sesión', <IcLogout key="l" />]].map(([l, ic]) => (
          <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 32, color: SIDEBAR.text, fontSize: 12, justifyContent: abierto ? 'flex-start' : 'center', paddingLeft: abierto ? 19 : 0 }}>{ic}{abierto && l}</div>
        ))}
      </div>
    </div>
  );
}

function Menu() {
  return (
    <>
      <Section title="Menú lateral oscuro" hint="Mismo menú en todos los módulos. Solo cambia el color del ítem activo y del logo.">
        <Fila gap={24} arriba>
          <MenuMuestra abierto />
          <MenuMuestra abierto={false} />
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Nota>Arriba: logo con el color del módulo y selector de empresa. La empresa elegida en el inicio de Seven Suite llega como <Code>?empresa=…</Code>.</Nota>
            <Nota>Ítem activo: texto en el color del menú, peso 600 y borde izquierdo de 3 px. Subítem activo: fondo del color al 10 %.</Nota>
            <Nota>Abajo, siempre en este orden: idioma, Notificaciones, Módulos (salta a otro módulo o al menú principal) y Cerrar sesión.</Nota>
            <Nota>Abierto 220 px, cerrado 48 px. Cerrado, el logo es el botón para abrir. La preferencia se guarda en la sesión. Al entrar a Configuración el menú se cierra y aparece el subpanel blanco de 200 px.</Nota>
            <Nota>En código: <Code>{'<SuiteShell modulo="FDK" producto="Seven Front Desk" nav={…} config={…}>'}</Code> en <Code>app/layout.tsx</Code>. El menú de cada módulo vive en <Code>components/layout/nav.tsx</Code>.</Nota>
          </div>
        </Fila>
      </Section>
      <Section title="Estructura de una página" hint="De arriba hacia abajo. Las barras que no se usen se omiten.">
        <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.card, overflow: 'hidden', fontSize: 11, color: C.n700 }}>
          {[['PageHeader · 52 px', 'Título a la izquierda, acciones de la página a la derecha (un solo botón primario).'],
            ['TabBar · 44 px', 'Pestañas con contador opcional.'],
            ['FilterBar · mín. 48 px', 'Búsqueda, dropdowns, radios, checkboxes, toggles. Acciones de la sección a la derecha.'],
            ['PageBody', 'Contenido con su propio scroll y padding de 24 px. Los headers de arriba nunca se mueven.'],
            ['Pie del sistema · 32 px', 'Lo pone el shell: producto, fecha hotelera y derechos.']].map(([a, b], i) => (
            <div key={a} style={{ display: 'flex', gap: 16, padding: '10px 14px', background: i === 3 ? C.n200 : C.n000, borderTop: i ? `1px solid ${C.n500}` : 'none' }}>
              <span style={{ width: 170, flexShrink: 0, fontWeight: 500, color: C.n900 }}>{a}</span><span>{b}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ── Componentes ─────────────────────────────────────────────────────────────
function Componentes() {
  const [texto, setTexto] = useState('Grand Horizon');
  const [busqueda, setBusqueda] = useState('');
  const [sel, setSel] = useState('CRC');
  const [chk, setChk] = useState(true);
  const [rad, setRad] = useState('a');
  const [sw, setSw] = useState(true);
  const [chips, setChips] = useState(['Estado: Pendiente', 'Mes: Octubre']);
  const [tabDemo, setTabDemo] = useState(0);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<null | 'success' | 'error'>(null);
  const [filaSel, setFilaSel] = useState(1);
  const filas = [
    { doc: 'FE-00012', cliente: 'Grand Horizon', fecha: '2026-10-01', monto: 185400, estado: ['Aceptada', 'green'] },
    { doc: 'FE-00013', cliente: 'Hotel Uvita', fecha: '2026-10-03', monto: 42750.5, estado: ['Pendiente', 'yellow'] },
    { doc: 'FE-00014', cliente: 'Hotel San José', fecha: '2026-10-05', monto: 9800, estado: ['Rechazada', 'red'] },
  ] as const;

  return (
    <>
      <Section title="Botones" hint="32 px de alto, 12 px, peso 500, radio 4. Un solo primario por vista.">
        <Fila>
          <Button icon={<IcPlus />}>Nueva reservación</Button>
          <Button variant="secondary" icon={<IcDownload />}>Exportar</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="danger">Anular</Button>
          <Button disabled>Guardar cambios</Button>
        </Fila>
        <Nota><Code>{'<Button variant="primary | secondary | ghost | danger" icon={…}>'}</Code></Nota>
      </Section>

      <Section title="Campos" hint="Label arriba (11 px, 500). El foco pinta el borde con el color del módulo.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          <FormField label="Nombre comercial" required><Input value={texto} onChange={setTexto} /></FormField>
          <FormField label="Moneda" hint="Se usa en reportes y facturas."><Select value={sel} onChange={setSel} options={[{ value: 'CRC', label: 'Colones (₡)' }, { value: 'USD', label: 'Dólares ($)' }]} /></FormField>
          <FormField label="Correo" error="Escribe un correo válido, por ejemplo reservas@hotel.cr"><Input value="reservas@" error="x" onChange={() => {}} /></FormField>
          <FormField label="Cédula jurídica"><Input value="3-101-123456" readOnly /></FormField>
        </div>
        <Fila gap={24}>
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar huésped…" />
          <Checkbox label="Incluir anuladas" checked={chk} onChange={setChk} id="ds-chk" />
          <Radio label="Por fecha" checked={rad === 'a'} onChange={() => setRad('a')} name="ds-r" id="ds-r1" />
          <Radio label="Por cliente" checked={rad === 'b'} onChange={() => setRad('b')} name="ds-r" id="ds-r2" />
          <Switch label="Activo" checked={sw} onChange={setSw} />
        </Fila>
        <Nota>El switch encendido es verde en todos los módulos (estado, no marca). Checkbox y radio usan el color del módulo.</Nota>
      </Section>

      <Section title="Barras de página" hint="Así se ven juntas, con el color del módulo.">
        <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.card, overflow: 'hidden' }}>
          <PageHeader title="Reservaciones"><Button variant="secondary" icon={<IcDownload />}>Exportar</Button><Button icon={<IcPlus />}>Nueva reservación</Button></PageHeader>
          <TabBar tabs={[{ label: 'Llegadas', count: 12 }, { label: 'En casa', count: 48 }, { label: 'Salidas', count: 9 }]} active={tabDemo} onChange={setTabDemo} />
          <FilterBar right={<Button variant="secondary">Limpiar filtros</Button>}>
            <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar…" />
            {chips.map(c => <Chip key={c} label={c} onClear={() => setChips(x => x.filter(y => y !== c))} />)}
          </FilterBar>
          <div style={{ padding: 16, background: C.n200, fontSize: 11, color: C.n700 }}>PageBody · contenido con scroll propio</div>
        </div>
      </Section>

      <Section title="Tabla" hint="Encabezado 11 px gris sobre #F9F9F9. Montos a la derecha con tabular-nums. Fila seleccionada con el fondo del módulo.">
        <DataTable headers={['Documento', 'Cliente', 'Fecha', 'Monto', 'Estado']} alinearDerecha={[3]}>
          {filas.map((f, i) => (
            <DataRow key={f.doc} selected={filaSel === i} onClick={() => setFilaSel(i)}>
              <Td>{f.doc}</Td><Td>{f.cliente}</Td><Td muted>{fmtDate(f.fecha)}</Td><Td right>{fmtMoney(f.monto)}</Td>
              <Td><StatusBadge label={f.estado[0]} color={f.estado[1]} /></Td>
            </DataRow>
          ))}
        </DataTable>
      </Section>

      <Section title="Estado y mensajes">
        <Fila>
          {(['green', 'yellow', 'red', 'blue', 'orange', 'gray', 'brand'] as const).map(c => <StatusBadge key={c} label={{ green: 'Aceptada', yellow: 'Pendiente', red: 'Rechazada', blue: 'En proceso', orange: 'Vencida', gray: 'Borrador', brand: 'Destacado' }[c]} color={c} />)}
        </Fila>
        <InfoBox>Las facturas aceptadas por Hacienda no se pueden editar. Para corregir una, emite una nota de crédito.</InfoBox>
        <div style={{ border: `1px dashed ${C.n500}`, borderRadius: radius.card }}>
          <EmptyState message="Todavía no hay reservaciones para esta fecha. Crea la primera o cambia el rango de fechas." action={<Button icon={<IcPlus />}>Nueva reservación</Button>} />
        </div>
        <Fila>
          <Button variant="secondary" onClick={() => setModal(true)}>Abrir modal</Button>
          <Button variant="secondary" onClick={() => setToast('success')}>Mostrar aviso de éxito</Button>
          <Button variant="secondary" onClick={() => setToast('error')}>Mostrar aviso de error</Button>
        </Fila>
      </Section>

      <Modal open={modal} title="Anular factura FE-00013" onClose={() => setModal(false)} width={460}
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button><Button variant="danger" onClick={() => { setModal(false); setToast('success'); }}>Anular factura</Button></>}>
        <p style={{ fontSize: 12, color: C.n900, margin: 0, lineHeight: 1.6 }}>Se enviará una nota de crédito a Hacienda por {fmtMoney(42750.5)}. Esta acción no se puede deshacer.</p>
      </Modal>
      {toast && <Toast type={toast} message={toast === 'success' ? 'Factura anulada' : 'Hacienda no respondió. Intenta de nuevo en unos minutos.'} onClose={() => setToast(null)} />}
    </>
  );
}

// ── Reglas ──────────────────────────────────────────────────────────────────
function Reglas() {
  const reglas: [string, ReactNode][] = [
    ['Números', <>Siempre 2 decimales, coma de miles y punto decimal: <Code>fmtNum(1234567)</Code> → {fmtNum(1234567)}</>],
    ['Moneda', <>Símbolo a la izquierda, cifra a la derecha: <Code>fmtMoney(50000, &apos;$&apos;)</Code> → {fmtMoney(50000, '$')}</>],
    ['Fechas', <>DD/MM/AAAA en toda la suite: <Code>fmtDate(&apos;2026-10-06&apos;)</Code> → {fmtDate('2026-10-06')}</>],
    ['Exportar', 'Un solo botón «Exportar» que abre la vista previa con PDF o Excel. Nunca «Exportar» e «Imprimir» sueltos.'],
    ['Botón primario', 'Uno por vista, en el PageHeader o en el pie del modal, a la derecha. Nombra la acción: «Guardar cambios», no «Aceptar».'],
    ['Filtros', 'Orden fijo: búsqueda, dropdowns, radios, checkboxes, toggles. Los filtros activos se muestran como chips.'],
    ['Escape', 'Cierra el modal o el panel que esté abierto.'],
    ['Íconos', '14 × 14 con stroke="currentColor". Sin emojis en la interfaz.'],
    ['Textos', 'Español, en oración (solo la primera letra en mayúscula). Los errores dicen qué pasó y cómo arreglarlo.'],
    ['Colores', 'No escribir hex en las pantallas. Usar C.brand, C.n700, etc. desde components/suite/tokens.ts.'],
  ];
  return (
    <Section title="Reglas transversales" hint="Vienen de Accounting, que ya pasó por QA. Aplican igual en todos los módulos.">
      <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.card, overflow: 'hidden' }}>
        {reglas.map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 16, padding: '12px 14px', borderTop: i ? `1px solid ${C.n500}` : 'none', fontSize: 12 }}>
            <span style={{ width: 130, flexShrink: 0, fontWeight: 500, color: C.n900 }}>{t}</span>
            <span style={{ color: C.n700, lineHeight: 1.6 }}>{d}</span>
          </div>
        ))}
      </div>
      <Nota>¿Falta un componente? Primero búscalo en Accounting (components/ui/primitives.tsx). Si existe, cópialo a components/suite cambiando los hex de marca por C.brand, y pásalo a todos los módulos.</Nota>
      <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.n700, margin: 0 }}><IcSearch /> Esta página vive en /design-system de cada módulo.</p>
    </Section>
  );
}
