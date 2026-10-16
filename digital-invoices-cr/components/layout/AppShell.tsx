'use client';
import { useState, ReactNode, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useOnboardingObligatorio, verOnboarding, RUTA_ONBOARDING } from '@/components/pages/onboarding/useOnboardingObligatorio';
import { Logo, IcDashboard, IcRegistro, IcBancos, IcReportes, IcEstados, IcConfig, IcBell, IcLogout, IcChevronDown, IcChevronRight, IcInvoice } from '../ui/icons';
import { C, FONT, radius } from '../ui/primitives';
import { FECHA_HOTELERA_LABEL } from '../pages/config/fechaHotelera';
import { pedirTareas } from '@/lib/tareasCliente';
import ModulosSuiteModal from './ModulosSuite';
import { URL_MENU_SUITE } from '@/components/ui/modulosSuite';
import { useModulos, cambiarModo } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';
import { instalarEscapeGlobal } from '@/components/ui/escapeGlobal';

// ── Design tokens (del foundation, no redeclarar) ────────────────────────────
const BRAND  = C.brand;
const F = FONT;

// ── Sidebar widths ─────────────────────────────────────────────────────────────
const SIDEBAR_OPEN   = 220; // narrower so labels don't wrap
const SIDEBAR_CLOSED = 48;
const HEADER_H       = 52;  // unified height for all three column headers

// ── Nav structure (Funciones especiales removido ──────────────────
const NAV = [
  { id:'dashboard', label:'Dashboard',           Icon:IcDashboard, href:'/dashboard', children:null },
  { id:'registro',  label:'Bandeja de asientos',  Icon:IcRegistro,  href:'/asientos', children:null },
  { id:'bancos',    label:'Bancos',               Icon:IcBancos,    href:null,
    children:[{ label:'Cobros / Pagos',href:'/cobros-pagos'},{ label:'Gestión de tarjetas',href:'/tarjetas'},{ label:'Depósitos',href:'/depositos'},{ label:'Transferencias bancarias',href:'/transferencias'},{ label:'Conciliación bancaria',href:'/conciliacion'},{ label:'Cheques bancarios',href:'/cheques'}]},
  { id:'facturacion', label:'Facturación', Icon:IcInvoice, href:null,
    children:[{ label:'Ventas',href:'/facturacion/emitidos'},{ label:'Compras',href:'/facturacion/recepcion'}]},
  { id:'reportes',  label:'Reportes',             Icon:IcReportes,  href:null,
    children:[{ label:'Analítico de cuentas',href:'/analitico'},{ label:'Histórico de clientes',href:'/historico'},{ label:'Diferencial cambiario',href:'/diferencial'},{ label:'Reporte de IVA',href:'/reportes/iva'},{ label:'Reporte general',href:'/reportes/general'},{ label:'Importe de impuesto',href:'/reportes/importe-iva'},{ label:'Actividad económica',href:'/reportes/actividad-economica'},{ label:'Comprobantes rechazados',href:'/reportes/rechazados'}]},
  { id:'estados',   label:'Estados financieros',  Icon:IcEstados,   href:null,
    children:[{ label:'Balance de comprobación',href:'/balance'},{ label:'Estado de resultados',href:'/resultados'},{ label:'Situación financiera',href:'/situacion'},{ label:'Cambio en el patrimonio',href:'/patrimonio'},{ label:'Presupuesto',href:'/presupuesto'}]},
  { id:'config',    label:'Configuración',        Icon:IcConfig,    href:null,
    children:[{ label:'Mi cuenta',href:'/config-usuario'},{ label:'Configuración General',href:'/empresa'}]},
];

const CONFIG_ITEMS = [
  { label:'Empresa',                href:'/empresa'    },
  { label:'Usuarios y Permisos',    href:'/usuarios-permisos' },
  { label:'Parámetros generales',   href:'/parametros' },
  { label:'Configuración contable', href:'/config-contable' },
  { label:'Catálogo de cuentas',    href:'/catalogo'   },
  { label:'Clientes / Proveedores', href:'/clientes'   },
  { label:'Actividad bancaria',     href:'/config-actividad-bancaria' },
  { label:'Facturación electrónica', href:'/facturacion-config' },
];

// El multiempresa real es post-MVP (ver Mapa de requerimientos, sección 8):
// hoy cada hotel es un dominio separado, así que elegir otra empresa acá no
// cambia ningún dato todavía. Se mantiene el dropdown a propósito — sirve
// para mostrar el caso de uso en demos — pero sin funcionalidad real detrás.
const COMPANIES = ['Hotel Fortuna','Grand Horizon','Hotel San José','Hotel Uvita'];
const CONFIG_HREFS = new Set(CONFIG_ITEMS.map(x => x.href).concat(['/config-modulo']));
// Subpantallas de configuración (ej. el formulario de un producto) siguen
// mostrando el menú de Configuración General.
const esConfig = (p: string) => CONFIG_HREFS.has(p) || p.startsWith('/facturacion-config/');
const configActivo = (p: string, href: string) => p === href || p.startsWith(href + '/');

// Globe icon as SVG - no emoji (#6)
const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="7" r="5.83"/>
    <path d="M1.17 7h11.66M7 1.17C5.54 3.09 4.67 5 4.67 7s.87 3.91 2.33 5.83M7 1.17C8.46 3.09 9.33 5 9.33 7s-.87 3.91-2.33 5.83"/>
  </svg>
);

// Collapse-left arrow
const CollapseArrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M8.75 2.33L4.08 7L8.75 11.67" stroke="#757575" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function seccionDeRuta(pathname: string): string {
  for (const n of NAV) {
    if (n.children?.some(c => pathname.startsWith(c.href))) return n.id;
  }
  return '';
}

const EVENTO_MENU = 'menu-lateral';
function suscribirMenu(avisar: () => void) {
  window.addEventListener(EVENTO_MENU, avisar);
  return () => window.removeEventListener(EVENTO_MENU, avisar);
}
function leerMenuAbierto(): boolean {
  try { return sessionStorage.getItem('sidebar') !== 'closed'; } catch { return true; }
}
function guardarMenuAbierto(valor: boolean) {
  try { sessionStorage.setItem('sidebar', valor ? 'open' : 'closed'); } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new Event(EVENTO_MENU));
}

// Ícono de módulos: cuatro cuadros
function IcModulos() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden style={{ flexShrink:0 }}>
      <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" /><rect x="8" y="1.5" width="4.5" height="4.5" rx="1" />
      <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" /><rect x="8" y="8" width="4.5" height="4.5" rx="1" />
    </svg>
  );
}

export default function AppShell({ children }: { children:ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  // Preferencia del menú (abierto o cerrado) guardada en la sesión. En el
  // servidor siempre se dibuja abierto; el navegador toma la preferencia.
  const preferenciaAbierto = useSyncExternalStore(suscribirMenu, leerMenuAbierto, () => true);
  const [expanded, setExpanded] = useState<string>(() => seccionDeRuta(pathname));
  const [company, setCompanyLocal] = useState(COMPANIES[0]);
  const setCompany = (c: string) => { setCompanyLocal(c); try { localStorage.setItem('empresa', c); } catch { /* sin almacenamiento */ } };
  // Desde el inicio de Seven Suite: ?empresa=… (con qué empresa entrar) y
  // ?modo=completo | dicr (Accounting + Digital Invoices o solo Digital Invoices)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const emp = p.get('empresa') ?? (() => { try { return localStorage.getItem('empresa'); } catch { return null; } })();
    if (emp && COMPANIES.includes(emp)) queueMicrotask(() => setCompany(emp));
    const modo = p.get('modo');
    if (modo === 'dicr' || modo === 'completo' || modo === 'acc') cambiarModo(modo);
    if (p.has('empresa') || p.has('modo')) {
      p.delete('empresa'); p.delete('modo');
      window.history.replaceState(null, '', window.location.pathname + (p.toString() ? `?${p}` : ''));
    }
  }, []);
  const [coOpen, setCoOpen]      = useState(false);
  const [langOpen, setLangOpen]  = useState(false);
  const [lang, setLang]          = useState('Español');
  const [verModulos, setVerModulos] = useState(false);

  useEffect(() => { if (pathname === '/') router.replace('/empresa'); }, [pathname, router]);

  // Tareas automáticas (buzón y recurrentes) mientras la aplicación está
  // abierta: al entrar y cada 5 minutos si la pestaña está a la vista. Así no
  // dependen solo del cron del servidor.
  useEffect(() => {
    pedirTareas();
    const t = setInterval(() => { if (document.visibilityState === 'visible') pedirTareas(); }, 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  // La tecla Escape cierra el modal que esté abierto (ver escapeGlobal.ts)
  useEffect(() => instalarEscapeGlobal(), []);

  const isConfigSection = esConfig(pathname);

  // Menú según los módulos contratados (solo facturación oculta lo contable)
  // y los permisos de Facturación del usuario
  const { contabilidad, facturacion } = useModulos();
  const { puede } = usePermisos();
  const HREF_PERMISO: Record<string, string> = {
    '/facturacion/emitidos': 'fe.ventas.view', '/facturacion/recepcion': 'fe.compras.view',
    '/reportes/iva': 'fe.reportes.iva.view', '/reportes/general': 'fe.reportes.general.view', '/reportes/importe-iva': 'fe.reportes.importe.view',
    '/reportes/actividad-economica': 'fe.reportes.actividad.view', '/reportes/rechazados': 'fe.reportes.rechazados.view',
  };
  const CONTABLES = new Set(['registro', 'bancos', 'estados']);
  const REPORTES_CONTABLES = new Set(['/analitico', '/historico', '/diferencial']);
  // Solo Accounting: sin Facturación ni reportes fiscales
  const REPORTES_FISCALES = new Set(['/reportes/iva', '/reportes/general', '/reportes/importe-iva', '/reportes/actividad-economica', '/reportes/rechazados']);
  const navVisible = NAV
    .filter(n => (contabilidad || !CONTABLES.has(n.id)) && (facturacion || n.id !== 'facturacion'))
    .map(n => n.children ? { ...n, children: n.children.filter(c => (contabilidad || !REPORTES_CONTABLES.has(c.href)) && (facturacion || !REPORTES_FISCALES.has(c.href)) && (!HREF_PERMISO[c.href] || puede(HREF_PERMISO[c.href]))) } : n)
    .filter(n => !n.children || n.children.length > 0);
  const CONFIG_CONTABLES = new Set(['/config-contable', '/catalogo', '/clientes', '/config-actividad-bancaria', '/parametros']);
  const puedeConfigFe = ['sucursales', 'cajas', 'impuestos', 'descuentos', 'exoneraciones', 'receptores', 'grupos', 'productos', ...(contabilidad ? ['cuentas'] : [])].some(x => puede(`fe.config.${x}.view`));
  const configVisible = CONFIG_ITEMS.filter(i => (contabilidad || !CONFIG_CONTABLES.has(i.href)) && (i.href !== '/facturacion-config' || (facturacion && puedeConfigFe)));

  // Al cambiar de ruta se expande la sección activa. Al entrar a
  // Configuración el menú se cierra (hay un sub-panel extra) y al salir vuelve
  // a como lo tenía el usuario.
  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  const [abiertoEnConfig, setAbiertoEnConfig] = useState(false);
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname);
    const seccion = seccionDeRuta(pathname);
    if (seccion) setExpanded(seccion);
    if (esConfig(rutaPrevia) !== isConfigSection) setAbiertoEnConfig(false);
  }

  const open = isConfigSection ? abiertoEnConfig : preferenciaAbierto;

  function setSidebarOpen(value: boolean) {
    if (isConfigSection) { setAbiertoEnConfig(value); return; }
    guardarMenuAbierto(value);
  }

  const activeId = (() => {
    for (const n of NAV) {
      if (n.href && pathname.startsWith(n.href)) return n.id;
      if (n.children?.some(c => pathname.startsWith(c.href))) return n.id;
    }
    if (isConfigSection) return 'config';
    return '';
  })();

  function toggle(id:string) { setExpanded(e => e === id ? '' : id); }

  const row = (isActive:boolean, isCollapsed:boolean): React.CSSProperties => ({
    display:'flex', alignItems:'center', gap: isCollapsed ? 0 : 10,
    height:32, paddingRight: isCollapsed ? 0 : 16,
    justifyContent: isCollapsed ? 'center' : 'flex-start',
    color: isActive ? BRAND : '#C0C0C0',
    background: 'transparent',
    textDecoration:'none', border:'none', cursor:'pointer',
    borderRadius:4,
    borderLeft: isActive && !isCollapsed ? '3px solid #A77600' : '3px solid transparent',
    paddingLeft: isActive && !isCollapsed ? 13 : isCollapsed ? 0 : 16,
    margin: isCollapsed ? '1px auto' : '1px 4px',
    width: isCollapsed ? 32 : 'calc(100% - 8px)',
    fontSize:12, fontWeight: isActive ? 600 : 400, fontFamily:F,
    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
    flexShrink:0,
  });

  const sidebarW = open ? SIDEBAR_OPEN : SIDEBAR_CLOSED;

  // Asistente inicial (Accounting + Digital Invoices): obligatorio y a pantalla completa, sin menú ni pie
  const onboarding = useOnboardingObligatorio(contabilidad && facturacion, pathname);
  if (pathname === RUTA_ONBOARDING) return <>{children}</>;
  if (onboarding === 'pendiente') return <div style={{ height:'100vh', background:'#F9F9F9' }} />;

  return (
    <div style={{ display:'flex', height:'100vh', background:'#F9F9F9', fontFamily:F }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW,
        background:'#0D0D0D', borderRight:'1px solid rgba(255,255,255,.06)',
        display:'flex', flexDirection:'column', transition:'width .18s, min-width .18s',
        overflow:'hidden', flexShrink:0, height:'100vh',
        position:'sticky', top:0, zIndex:20,
      }}>

        {/* Company/header row - fixed height HEADER_H to match sub-panel (#8) */}
        <div style={{
          height:HEADER_H, minHeight:HEADER_H,
          padding: open ? '0 12px' : '0',
          display:'flex', alignItems:'center', gap:8,
          borderBottom:'1px solid rgba(255,255,255,.06)', flexShrink:0, position:'relative',
        }}>
          {open ? (
            <>
              {/* Logo badge */}
              <div style={{ width:28, height:28, background:BRAND, borderRadius:radius.sm, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Logo />
              </div>
              {/* Company picker */}
              <button onClick={() => setCoOpen(v=>!v)}
                style={{ display:'flex', alignItems:'center', gap:4, flex:1, background:'none', border:'none', cursor:'pointer', minWidth:0, padding:0 }}>
                <span style={{ fontSize:12, fontWeight:500, color:'#E0E0E0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{company}</span>
                <IcChevronDown className="w-3 h-3" style={{ color:'#757575', flexShrink:0 }} />
              </button>
              {/* Collapse button - rightmost, never overlaps logo (#3) */}
              <button onClick={() => setSidebarOpen(false)}
                style={{ width:28, height:28, flexShrink:0, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:radius.sm, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#E0E0E0' }}>
                <CollapseArrow />
              </button>
            </>
          ) : (
            // Colapsado: el logo ES el botón para abrir, sin flecha (#1), centrado (#2)
            <button onClick={() => setSidebarOpen(true)}
              title="Abrir menú"
              style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              <div style={{ width:28, height:28, background:BRAND, borderRadius:radius.sm, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Logo />
              </div>
            </button>
          )}

          {/* Company dropdown */}
          {coOpen && open && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#1A1A1A', border:'1px solid rgba(255,255,255,.1)', borderRadius:radius.md, zIndex:100, boxShadow:'0 4px 16px rgba(0,0,0,.5)', overflow:'hidden' }}>
              {COMPANIES.map(c => (
                <button key={c} onClick={() => { setCompany(c); setCoOpen(false); }}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 16px', fontSize:12, color: c===company ? BRAND : '#C0C0C0', background: c===company ? 'rgba(167,118,0,.12)' : 'transparent', border:'none', cursor:'pointer', fontFamily:F, fontWeight: c===company ? 500 : 400 }}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'8px 4px' }}>
          {navVisible.map(item => {
            const isAct = activeId === item.id;
            const isExp = expanded === item.id;
            return (
              <div key={item.id}>
                {item.href ? (
                  <Link href={item.href} style={row(isAct, !open)}>
                    <item.Icon className="w-[14px] h-[14px]" style={{ flexShrink:0 }} />
                    {open && item.label}
                  </Link>
                ) : (
                  <>
                    <button onClick={() => { if (!open) setSidebarOpen(true); toggle(item.id); }} style={row(isAct, !open)}>
                      <item.Icon className="w-[14px] h-[14px]" style={{ flexShrink:0 }} />
                      {open && (
                        <>
                          <span style={{ flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>
                          {isExp
                            ? <IcChevronDown className="w-3 h-3" style={{ flexShrink:0, color: isAct ? BRAND : '#606060' }} />
                            : <IcChevronRight className="w-3 h-3" style={{ flexShrink:0, color: isAct ? BRAND : '#606060' }} />
                          }
                        </>
                      )}
                    </button>
                    {open && isExp && item.children?.map(sub => (
                      <Link key={sub.href} href={sub.href}
                        style={{ display:'block', padding:'7px 16px 7px 40px', fontSize:12,
                          fontWeight: pathname === sub.href ? 500 : 400, color: pathname === sub.href ? BRAND : '#909090', background: pathname === sub.href ? 'rgba(167,118,0,.08)' : 'transparent', borderRadius:radius.sm,
                          textDecoration:'none', whiteSpace:'nowrap', fontFamily:F }}>
                        {sub.label}
                      </Link>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer: lang + notif + logout */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'4px', flexShrink:0 }}>
          {open && (
            <div style={{ position:'relative' }}>
              <button onClick={() => setLangOpen(v=>!v)}
                style={{ ...row(false, false), width:'100%', margin:0, gap:10 }}>
                {/* SVG globe - no emoji (#6) */}
                <span style={{ width:14, height:14, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#757575' }}>
                  <GlobeIcon />
                </span>
                <span style={{ flex:1, textAlign:'left', color:'#808080' }}>{lang}</span>
                <IcChevronDown className="w-3 h-3" style={{ color:'#757575' }} />
              </button>
              {langOpen && (
                <div style={{ position:'absolute', bottom:'100%', left:4, right:4, background:'#1A1A1A', border:'1px solid rgba(255,255,255,.1)', borderRadius:radius.md, zIndex:100, boxShadow:'0 4px 16px rgba(0,0,0,.5)', overflow:'hidden', marginBottom:4 }}>
                  {['Español','English'].map(l => (
                    <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                      style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 16px', fontSize:12, color: l===lang ? BRAND : '#C0C0C0', background:'transparent', border:'none', cursor:'pointer', fontFamily:F }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button style={row(false, !open)}>
            <IcBell className="w-[14px] h-[14px]" style={{ flexShrink:0 }} />
            {open && 'Notificaciones'}
          </button>
          {/* Módulos de la suite: pasar a Accounting, Facturación, Front Desk, POS… */}
          <button style={row(false, !open)} onClick={() => setVerModulos(true)} title="Módulos">
            <IcModulos />
            {open && 'Módulos'}
          </button>
          {/* Solo para la demostración: vuelve a pedir el asistente inicial */}
          {contabilidad && facturacion && (
            <button style={row(false, !open)} title="Ver onboarding (demo)" onClick={() => verOnboarding(r => router.push(r))}>
              <IcPlay />
              {open && 'Ver onboarding (demo)'}
            </button>
          )}
          {/* Cerrar sesión: vuelve al inicio de sesión de Seven Suite */}
          <button style={row(false, !open)} title="Cerrar sesión"
            onClick={() => { if (URL_MENU_SUITE) { const u = new URL(URL_MENU_SUITE); u.searchParams.set('salir', '1'); window.location.href = u.href; } else window.location.href = '/dashboard'; }}>
            <IcLogout className="w-[14px] h-[14px]" style={{ flexShrink:0 }} />
            {open && 'Cerrar sesión'}
          </button>
        </div>
      </aside>
      {verModulos && <ModulosSuiteModal onClose={() => setVerModulos(false)} />}

      {/* ── Config subpanel - same header height as sidebar (#8) ── */}
      {isConfigSection && (
        <div style={{ width:200, minWidth:200, background:'#fff', borderRight:'1px solid #ECECEC',
          display:'flex', flexDirection:'column', flexShrink:0, height:'100vh', position:'sticky', top:0, zIndex:10 }}>
          <div style={{ height:HEADER_H, minHeight:HEADER_H, padding:'0 20px', display:'flex', alignItems:'center', borderBottom:'1px solid #ECECEC', flexShrink:0 }}>
            <span style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', fontFamily:F }}>Configuración General</span>
          </div>
          <nav style={{ flex:1, padding:'8px', overflowY:'auto' }}>
            {configVisible.map(item => (
              <Link key={item.href} href={item.href}
                style={{ display:'block', padding:'8px 12px', fontSize:12, fontWeight:400,
                  color: configActivo(pathname, item.href) ? BRAND : '#0F0F0F',
                  background: configActivo(pathname, item.href) ? '#FFF8EC' : 'transparent',
                  textDecoration:'none', borderRadius:radius.md, marginBottom:2,
                  border: configActivo(pathname, item.href) ? '1px solid #EED89A' : '1px solid transparent',
                  fontFamily:F }}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* ── Main ──
          Este wrapper NO debe scrollear (overflow:hidden). Cada página ya trae su propio
          header fijo (flexShrink:0) y su propia zona de contenido con overflowY:auto.
          Si este wrapper scrollea en vez de eso, el scroll "se sale" hacia afuera y
          arrastra con él el header de la página, que debería quedar siempre visible. */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        <main style={{ flex:1, minWidth:0, minHeight:0, overflow:'hidden' }}>{children}</main>
        {/* Footer del sistema (#26) */}
        <footer style={{
          height:32, minHeight:32, flexShrink:0, background:'#fff', borderTop:'1px solid #ECECEC',
          display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px',
          fontSize:11, color:'#757575', fontFamily:F,
        }}>
          <span>{contabilidad ? 'Seven Accounting Cloud' : 'Seven Digital Invoices'}</span>
          <span>Fecha hotelera: {FECHA_HOTELERA_LABEL}</span>
          <span>© {new Date().getFullYear()} · Todos los derechos reservados</span>
        </footer>
      </div>
    </div>
  );
}

function IcPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }} aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l5.5-3.5z" />
    </svg>
  );
}
