'use client';
// Estructura de la aplicación: menú lateral, sub-panel de Configuración
// General, contenido de la página y pie con la fecha de operación.
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo, IcChevronDown, IcChevronRight } from '../ui/icons';
import { C, FONT, radius } from '../ui/tokens';
import { fechaOperacionAlmacen, fechaCorta } from '../pages/empresa/datos/fechaOperacion';
import { useOnboardingObligatorio, RUTA_ONBOARDING } from '../pages/onboarding/datos/obligatorio';
import { NAV, COMPANIES, CONFIG_HREFS, seccionDeRuta, seccionActiva } from './navegacion';
import { useMenuAbierto, guardarMenuAbierto } from './preferenciaMenu';
import { filaMenu } from './estiloMenu';
import { CollapseArrow } from './iconosMenu';
import PieMenu from './PieMenu';
import SubpanelConfig, { HEADER_H } from './SubpanelConfig';
import { useAlmacen } from '@/components/pages/empresa/datos/almacen';

const BRAND = C.brand;
const F = FONT;
const SIDEBAR_OPEN   = 220;
const SIDEBAR_CLOSED = 48;

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const preferenciaAbierto = useMenuAbierto();
  const [expanded, setExpanded] = useState<string>(() => seccionDeRuta(pathname));
  const [company, setCompany] = useState(COMPANIES[0]);
  const [coOpen, setCoOpen] = useState(false);
  const fecha = useAlmacen(fechaOperacionAlmacen);
  const onboarding = useOnboardingObligatorio(pathname);

  const isConfigSection = CONFIG_HREFS.has(pathname);
  const activeId = seccionActiva(pathname);

  // Al cambiar de ruta se expande la sección activa. Al entrar a
  // Configuración el menú se cierra (se abre un sub-panel extra) y al salir
  // vuelve a como lo tenía el usuario.
  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  const [abiertoEnConfig, setAbiertoEnConfig] = useState(false);
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname);
    const seccion = seccionDeRuta(pathname);
    if (seccion) setExpanded(seccion);
    if (CONFIG_HREFS.has(rutaPrevia) !== isConfigSection) setAbiertoEnConfig(false);
  }
  const open = isConfigSection ? abiertoEnConfig : preferenciaAbierto;

  function setSidebarOpen(value: boolean) {
    if (isConfigSection) { setAbiertoEnConfig(value); return; }
    guardarMenuAbierto(value);
  }
  function toggle(id: string) { setExpanded(e => e === id ? '' : id); }

  // Onboarding contable: obligatorio y a pantalla completa, sin menú ni pie
  if (pathname === RUTA_ONBOARDING) return <>{children}</>;
  if (onboarding === 'pendiente') return <div style={{ height:'100vh', background:C.n200 }} />;

  const sidebarW = open ? SIDEBAR_OPEN : SIDEBAR_CLOSED;

  return (
    <div style={{ display:'flex', height:'100vh', background:C.n200, fontFamily:F }}>

      {/* ── Menú lateral ── */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW,
        background:C.n900, borderRight:'1px solid rgba(255,255,255,.06)',
        display:'flex', flexDirection:'column', transition:'width .18s, min-width .18s',
        overflow:'hidden', flexShrink:0, height:'100vh',
        position:'sticky', top:0, zIndex:20,
      }}>

        {/* Empresa y botón para cerrar el menú */}
        <div style={{
          height:HEADER_H, minHeight:HEADER_H,
          padding: open ? '0 12px' : '0',
          display:'flex', alignItems:'center', gap:8,
          borderBottom:'1px solid rgba(255,255,255,.06)', flexShrink:0, position:'relative',
        }}>
          {open ? (
            <>
              {/* Logo */}
              <div style={{ width:28, height:28, background:BRAND, borderRadius:radius.sm, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Logo />
              </div>
              {/* Selector de empresa */}
              <button onClick={() => setCoOpen(v=>!v)}
                style={{ display:'flex', alignItems:'center', gap:4, flex:1, background:'none', border:'none', cursor:'pointer', minWidth:0, padding:0 }}>
                <span style={{ fontSize:12, fontWeight:500, color:C.n000, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{company}</span>
                <IcChevronDown className="w-3 h-3" style={{ color:C.n700, flexShrink:0 }} />
              </button>
              {/* Cerrar el menú */}
              <button onClick={() => setSidebarOpen(false)} title="Cerrar menú"
                style={{ width:28, height:28, flexShrink:0, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:radius.sm, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}>
                <CollapseArrow />
              </button>
            </>
          ) : (
            // Colapsado: el logo es el botón para abrir el menú
            <button onClick={() => setSidebarOpen(true)}
              title="Abrir menú"
              style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              <div style={{ width:28, height:28, background:BRAND, borderRadius:radius.sm, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Logo />
              </div>
            </button>
          )}

          {/* Lista de empresas */}
          {coOpen && open && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:C.n900, border:'1px solid rgba(255,255,255,.1)', borderRadius:radius.md, zIndex:100, boxShadow:'0 4px 16px rgba(0,0,0,.5)', overflow:'hidden' }}>
              {COMPANIES.map(c => (
                <button key={c} onClick={() => { setCompany(c); setCoOpen(false); }}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 16px', fontSize:12, color: c===company ? BRAND : '#ECECEC', background: c===company ? 'rgba(167,118,0,.12)' : 'transparent', border:'none', cursor:'pointer', fontFamily:F, fontWeight: c===company ? 500 : 400 }}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Secciones */}
        <nav style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'8px 4px' }}>
          {NAV.map(item => {
            const isAct = activeId === item.id;
            const isExp = expanded === item.id;
            return (
              <div key={item.id}>
                {item.href ? (
                  <Link href={item.href} style={filaMenu(isAct, !open)}>
                    <item.Icon className="w-[14px] h-[14px]" style={{ flexShrink:0 }} />
                    {open && item.label}
                  </Link>
                ) : (
                  <>
                    <button onClick={() => { if (!open) setSidebarOpen(true); toggle(item.id); }} style={filaMenu(isAct, !open)}>
                      <item.Icon className="w-[14px] h-[14px]" style={{ flexShrink:0 }} />
                      {open && (
                        <>
                          <span style={{ flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>
                          {isExp
                            ? <IcChevronDown className="w-3 h-3" style={{ flexShrink:0, color: isAct ? BRAND : C.n700 }} />
                            : <IcChevronRight className="w-3 h-3" style={{ flexShrink:0, color: isAct ? BRAND : C.n700 }} />
                          }
                        </>
                      )}
                    </button>
                    {open && isExp && item.children?.map(sub => (
                      <Link key={sub.href} href={sub.href}
                        style={{ display:'block', padding:'7px 16px 7px 40px', fontSize:12,
                          fontWeight: pathname === sub.href ? 500 : 400, color: pathname === sub.href ? BRAND : '#757575', background: pathname === sub.href ? 'rgba(167,118,0,.08)' : 'transparent', borderRadius:radius.sm,
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

        <PieMenu open={open} />
      </aside>

      {isConfigSection && <SubpanelConfig pathname={pathname} />}

      {/* ── Contenido ──
          Este contenedor no hace scroll (overflow:hidden): cada página trae su
          propio encabezado fijo y su propia zona de contenido con scroll. Si este
          contenedor hiciera scroll, arrastraría el encabezado de la página. */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        <main style={{ flex:1, minWidth:0, minHeight:0, overflow:'hidden' }}>{children}</main>
        <footer style={{
          height:32, minHeight:32, flexShrink:0, background:C.n000, borderTop:`1px solid ${C.n500}`,
          display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px',
          fontSize:11, color:C.n700, fontFamily:F,
        }}>
          <span>Seven Accounting Cloud</span>
          <span>Fecha de operación: {fechaCorta(fecha.fecha)}</span>
          <span>© {new Date().getFullYear()} · Todos los derechos reservados</span>
        </footer>
      </div>
    </div>
  );
}
