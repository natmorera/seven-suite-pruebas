'use client';
// ─────────────────────────────────────────────────────────────────────────────
// SuiteShell · menú lateral oscuro + subpanel de Configuración + pie del sistema
//
// Réplica del AppShell de Accounting (mismas medidas: 220/48 px, header de
// 52 px, ítems de 32 px, pie de 32 px). Cada módulo solo le pasa su menú y su
// id; el color activo sale del tema del módulo (var(--brand-on-dark)).
//
// Uso (app/layout.tsx):
//   <SuiteShell modulo="FDK" producto="Seven Front Desk" nav={NAV} config={CONFIG}>
//     {children}
//   </SuiteShell>
//
// Cada página dibuja su propio PageHeader (52 px) y su zona con scroll: el
// <main> de aquí NO scrollea, para que el header de la página quede fijo.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { C, FONT, SIDEBAR, SIZE, radius, Z, type ModuloId } from './tokens';
import { Logo, IcChevronDown, IcChevronRight, IcCollapse, IcGlobe, IcBell, IcLogout, IcModulos } from './icons';
import { EstilosSuite } from './ui';
import ModulosSuiteModal from './ModulosSuite';
import { URL_MENU_SUITE, EMPRESAS } from './modulos';

export interface NavHijo {
  label: string;
  href: string;
  /** Prefijo que lo marca activo si es distinto del href (p. ej. href /catalogo/familias, match /catalogo) */
  match?: string;
}
export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;          // ícono de 14×14 con stroke="currentColor"
  href?: string;            // ítem directo…
  hijos?: NavHijo[];        // …o grupo desplegable
}
export interface GrupoConfig { titulo?: string; items: NavHijo[] }
export interface ConfigShell {
  /** Rutas que muestran el subpanel (p. ej. "/configuracion") */
  prefijo: string;
  titulo?: string;          // "Configuración General"
  grupos: GrupoConfig[];
  /** id del ítem del menú que se marca activo dentro de Configuración */
  navId?: string;
}

interface Props {
  modulo: ModuloId;
  producto: string;                      // texto del pie: "Seven Front Desk"
  nav: NavItem[];
  config?: ConfigShell;
  empresas?: string[];
  empresa?: string;                      // controlado (opcional)
  onEmpresaChange?: (e: string) => void;
  fechaHotelera?: string;
  onCerrarSesion?: () => void;
  /** En pantallas < 1024 px el menú se oculta (el módulo trae su navegación móvil). */
  ocultarEnMovil?: boolean;
  children: ReactNode;
}

// ── Preferencia abierto/cerrado guardada en la sesión (igual que Accounting) ─
const EVENTO = 'menu-lateral';
const suscribir = (f: () => void) => { window.addEventListener(EVENTO, f); return () => window.removeEventListener(EVENTO, f); };
const leerAbierto = () => { try { return sessionStorage.getItem('sidebar') !== 'closed'; } catch { return true; } };
const guardarAbierto = (v: boolean) => {
  try { sessionStorage.setItem('sidebar', v ? 'open' : 'closed'); } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new Event(EVENTO));
};

const coincide = (p: string, href: string) => (href === '/' ? p === '/' : p === href || p.startsWith(href + '/'));
/** Entre hermanos gana el enlace más largo (/hospedaje/perfiles antes que /hospedaje) */
const clave = (h: NavHijo) => h.match ?? h.href.split('?')[0];
const masEspecifico = (p: string, hijos: NavHijo[]) => hijos.filter(h => coincide(p, clave(h))).sort((a, b) => clave(b).length - clave(a).length)[0];

export default function SuiteShell({
  modulo, producto, nav, config, empresas = EMPRESAS, empresa: empresaProp, onEmpresaChange,
  fechaHotelera, onCerrarSesion, ocultarEnMovil, children,
}: Props) {
  const pathname = usePathname();
  const preferencia = useSyncExternalStore(suscribir, leerAbierto, () => true);

  const seccionDe = (p: string) => nav.find(n => n.hijos?.some(h => coincide(p, clave(h))))?.id ?? '';
  const [expandido, setExpandido] = useState(() => seccionDe(pathname));

  // ── Empresa: ?empresa=… desde el inicio de la suite, o la última elegida ──
  const [empresaLocal, setEmpresaLocal] = useState(empresas[0] ?? '');
  const empresa = empresaProp ?? empresaLocal;
  const elegirEmpresa = (e: string) => {
    if (onEmpresaChange) onEmpresaChange(e); else setEmpresaLocal(e);
    try { localStorage.setItem('empresa', e); } catch { /* sin almacenamiento */ }
  };
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const e = p.get('empresa') ?? (() => { try { return localStorage.getItem('empresa'); } catch { return null; } })();
    if (e && empresas.includes(e)) queueMicrotask(() => { if (onEmpresaChange) onEmpresaChange(e); else setEmpresaLocal(e); });
    if (p.has('empresa')) {
      p.delete('empresa');
      window.history.replaceState(null, '', window.location.pathname + (p.toString() ? `?${p}` : ''));
    }
    // Solo al entrar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [empresaAbierta, setEmpresaAbierta] = useState(false);
  const [idiomaAbierto, setIdiomaAbierto] = useState(false);
  const [idioma, setIdioma] = useState('Español');
  const [verModulos, setVerModulos] = useState(false);

  // Cerrar los dropdowns del menú al hacer clic afuera
  const refEmpresa = useRef<HTMLDivElement>(null);
  const refIdioma = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!empresaAbierta && !idiomaAbierto) return;
    const f = (e: MouseEvent) => {
      if (refEmpresa.current && !refEmpresa.current.contains(e.target as Node)) setEmpresaAbierta(false);
      if (refIdioma.current && !refIdioma.current.contains(e.target as Node)) setIdiomaAbierto(false);
    };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [empresaAbierta, idiomaAbierto]);

  // ── Configuración: al entrar el menú se cierra (hay un subpanel extra) y al
  //    salir vuelve a como lo tenía el usuario. Igual que Accounting.
  const enConfig = !!config && coincide(pathname, config.prefijo);
  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  const [abiertoEnConfig, setAbiertoEnConfig] = useState(false);
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname);
    const s = seccionDe(pathname);
    if (s) setExpandido(s);
    if (!!config && coincide(rutaPrevia, config.prefijo) !== enConfig) setAbiertoEnConfig(false);
  }
  const abierto = enConfig ? abiertoEnConfig : preferencia;
  const setAbierto = (v: boolean) => (enConfig ? setAbiertoEnConfig(v) : guardarAbierto(v));

  const activoId = (() => {
    if (enConfig) return config?.navId ?? 'config';
    for (const n of nav) {
      if (n.href && coincide(pathname, n.href.split('?')[0])) return n.id;
      if (n.hijos?.some(h => coincide(pathname, clave(h)))) return n.id;
    }
    return '';
  })();

  const fila = (activo: boolean, cerrado: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: cerrado ? 0 : 10, height: 32,
    justifyContent: cerrado ? 'center' : 'flex-start',
    color: activo ? C.brandOnDark : SIDEBAR.text, background: 'transparent',
    textDecoration: 'none', border: 'none', cursor: 'pointer', borderRadius: 4,
    borderLeft: activo && !cerrado ? `3px solid ${C.brandOnDark}` : '3px solid transparent',
    paddingLeft: activo && !cerrado ? 13 : cerrado ? 0 : 16, paddingRight: cerrado ? 0 : 16,
    margin: cerrado ? '1px auto' : '1px 4px', width: cerrado ? 32 : 'calc(100% - 8px)',
    fontSize: 12, fontWeight: activo ? 600 : 400, fontFamily: FONT,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0,
  });

  const cerrarSesion = () => {
    if (onCerrarSesion) return onCerrarSesion();
    if (URL_MENU_SUITE) { const u = new URL(URL_MENU_SUITE); u.searchParams.set('salir', '1'); window.location.href = u.href; }
  };

  const ancho = abierto ? SIZE.sidebarOpen : SIZE.sidebarClosed;
  const badge = (
    <span style={{ width: 28, height: 28, background: C.brand, borderRadius: radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Logo />
    </span>
  );
  const dropdownOscuro: CSSProperties = {
    position: 'absolute', background: SIDEBAR.dropdownBg, border: `1px solid ${SIDEBAR.dropdownBorder}`, borderRadius: radius.md,
    zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,.5)', overflow: 'hidden',
  };
  const opcionOscura = (on: boolean): CSSProperties => ({
    display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 12, fontFamily: FONT, border: 'none', cursor: 'pointer',
    color: on ? C.brandOnDark : SIDEBAR.text, background: on ? SIDEBAR.activeBg : 'transparent', fontWeight: on ? 500 : 400,
  });

  return (
    <div className="suite-shell" style={{ display: 'flex', height: '100vh', background: C.n200, fontFamily: FONT }}>
      <EstilosSuite />
      {ocultarEnMovil && <style>{`@media (max-width: 1023px) { .suite-solo-escritorio { display: none !important; } }`}</style>}

      {/* ── Menú lateral ── */}
      <aside className={ocultarEnMovil ? 'suite-solo-escritorio' : undefined} aria-label="Menú principal"
        style={{ width: ancho, minWidth: ancho, background: SIDEBAR.bg, borderRight: `1px solid ${SIDEBAR.divider}`, display: 'flex', flexDirection: 'column',
          transition: 'width .18s, min-width .18s', overflow: 'hidden', flexShrink: 0, height: '100vh', position: 'sticky', top: 0, zIndex: Z.sidebar }}>

        {/* Empresa */}
        <div ref={refEmpresa} style={{ height: SIZE.header, minHeight: SIZE.header, padding: abierto ? '0 12px' : 0, display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: `1px solid ${SIDEBAR.divider}`, flexShrink: 0, position: 'relative' }}>
          {abierto ? (
            <>
              {badge}
              <button onClick={() => setEmpresaAbierta(v => !v)} aria-expanded={empresaAbierta} aria-label="Cambiar empresa"
                style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, background: 'none', border: 'none', cursor: 'pointer', minWidth: 0, padding: 0, fontFamily: FONT }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empresa}</span>
                <IcChevronDown style={{ color: SIDEBAR.muted }} />
              </button>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar menú"
                style={{ width: 28, height: 28, flexShrink: 0, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: radius.sm,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SIDEBAR.muted }}>
                <IcCollapse />
              </button>
            </>
          ) : (
            // Cerrado: el logo es el botón para abrir
            <button onClick={() => setAbierto(true)} title="Abrir menú" aria-label="Abrir menú"
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {badge}
            </button>
          )}
          {empresaAbierta && abierto && (
            <div style={{ ...dropdownOscuro, top: '100%', left: 0, right: 0 }}>
              {empresas.map(e => (
                <button key={e} onClick={() => { elegirEmpresa(e); setEmpresaAbierta(false); }} style={opcionOscura(e === empresa)}>{e}</button>
              ))}
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 4px' }}>
          {nav.map(item => {
            const activo = activoId === item.id;
            const exp = expandido === item.id;
            if (item.href && !item.hijos) {
              return (
                <Link key={item.id} href={item.href} style={fila(activo, !abierto)} title={!abierto ? item.label : undefined} aria-current={activo ? 'page' : undefined}>
                  <span style={{ display: 'flex', width: 14, height: 14, flexShrink: 0 }}>{item.icon}</span>
                  {abierto && item.label}
                </Link>
              );
            }
            return (
              <div key={item.id}>
                <button onClick={() => { if (!abierto) setAbierto(true); setExpandido(e => (e === item.id ? '' : item.id)); }}
                  style={fila(activo, !abierto)} title={!abierto ? item.label : undefined} aria-expanded={abierto ? exp : undefined}>
                  <span style={{ display: 'flex', width: 14, height: 14, flexShrink: 0 }}>{item.icon}</span>
                  {abierto && (
                    <>
                      <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      {exp ? <IcChevronDown style={{ color: activo ? C.brandOnDark : SIDEBAR.chevron }} /> : <IcChevronRight style={{ color: activo ? C.brandOnDark : SIDEBAR.chevron }} />}
                    </>
                  )}
                </button>
                {abierto && exp && item.hijos?.map((h, _i, todos) => {
                  const on = masEspecifico(pathname, todos) === h;
                  return (
                    <Link key={h.href} href={h.href} aria-current={on ? 'page' : undefined}
                      style={{ display: 'block', padding: '7px 16px 7px 40px', fontSize: 12, fontWeight: on ? 500 : 400, color: on ? C.brandOnDark : SIDEBAR.subText,
                        background: on ? SIDEBAR.activeBg : 'transparent', borderRadius: radius.sm, textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: FONT,
                        overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Pie del menú: idioma, notificaciones, módulos, cerrar sesión */}
        <div style={{ borderTop: `1px solid ${SIDEBAR.divider}`, padding: 4, flexShrink: 0 }}>
          {abierto && (
            <div ref={refIdioma} style={{ position: 'relative' }}>
              <button onClick={() => setIdiomaAbierto(v => !v)} aria-expanded={idiomaAbierto} style={{ ...fila(false, false), width: '100%', margin: 0 }}>
                <IcGlobe style={{ color: SIDEBAR.muted }} />
                <span style={{ flex: 1, textAlign: 'left', color: '#808080' }}>{idioma}</span>
                <IcChevronDown style={{ color: SIDEBAR.muted }} />
              </button>
              {idiomaAbierto && (
                <div style={{ ...dropdownOscuro, bottom: '100%', left: 4, right: 4, marginBottom: 4 }}>
                  {['Español', 'English'].map(l => (
                    <button key={l} onClick={() => { setIdioma(l); setIdiomaAbierto(false); }} style={{ ...opcionOscura(l === idioma), padding: '9px 16px' }}>{l}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button style={fila(false, !abierto)} title={!abierto ? 'Notificaciones' : undefined}><IcBell />{abierto && 'Notificaciones'}</button>
          <button style={fila(false, !abierto)} onClick={() => setVerModulos(true)} title={!abierto ? 'Módulos' : undefined}><IcModulos />{abierto && 'Módulos'}</button>
          <button style={fila(false, !abierto)} onClick={cerrarSesion} title={!abierto ? 'Cerrar sesión' : undefined}><IcLogout />{abierto && 'Cerrar sesión'}</button>
        </div>
      </aside>
      {verModulos && <ModulosSuiteModal actual={modulo} onClose={() => setVerModulos(false)} />}

      {/* ── Subpanel de Configuración ── */}
      {enConfig && config && (
        <div className={ocultarEnMovil ? 'suite-solo-escritorio' : undefined}
          style={{ width: SIZE.configSubpanel, minWidth: SIZE.configSubpanel, background: C.n000, borderRight: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column',
            flexShrink: 0, height: '100vh', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ height: SIZE.header, minHeight: SIZE.header, padding: '0 20px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.n500}`, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.n900 }}>{config.titulo ?? 'Configuración General'}</span>
          </div>
          <nav style={{ flex: 1, padding: 8, overflowY: 'auto' }}>
            {config.grupos.map((g, gi) => (
              <div key={g.titulo ?? gi} style={{ marginTop: gi ? 12 : 0 }}>
                {g.titulo && <p style={{ fontSize: 11, fontWeight: 500, color: C.n700, margin: '4px 12px 6px' }}>{g.titulo}</p>}
                {g.items.map(it => {
                  const on = masEspecifico(pathname, config.grupos.flatMap(x => x.items)) === it;
                  return (
                    <Link key={it.href} href={it.href} aria-current={on ? 'page' : undefined}
                      style={{ display: 'block', padding: '8px 12px', fontSize: 12, color: on ? C.brand : C.n900, background: on ? C.brandBg : 'transparent',
                        textDecoration: 'none', borderRadius: radius.md, marginBottom: 2, border: on ? `1px solid ${C.brandBd}` : '1px solid transparent', fontFamily: FONT }}>
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* ── Contenido ── (no scrollea: cada página trae su header fijo y su zona con scroll) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>{children}</main>
        <footer className={ocultarEnMovil ? 'suite-solo-escritorio' : undefined}
          style={{ height: SIZE.appFooter, minHeight: SIZE.appFooter, flexShrink: 0, background: C.n000, borderTop: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 20px', fontSize: 11, color: C.n700, fontFamily: FONT, gap: 16 }}>
          <span>{producto}</span>
          {fechaHotelera && <span>Fecha hotelera: {fechaHotelera}</span>}
          <span>© {new Date().getFullYear()} · Todos los derechos reservados</span>
        </footer>
      </div>
    </div>
  );
}
