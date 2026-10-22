'use client';
// Navegación en pantallas de menos de 1024 px, donde el menú lateral de la suite se oculta: barra superior con el
// botón de menú, la empresa y un panel lateral con las mismas secciones del menú.
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { C, FONT, radius, SIDEBAR, SIZE } from '@/components/suite/tokens';
import { IcBell, IcChevronDown, IcChevronRight, IcClose, Logo } from '@/components/suite/icons';
import { EMPRESAS } from '@/components/suite/modulos';
import { NAV } from './nav';

const coincide = (p: string, href: string) => p === href || p.startsWith(href + '/');

export function MenuMovil({ empresa, onEmpresa, onNotificaciones }: { empresa: string; onEmpresa: (e: string) => void; onNotificaciones: () => void }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [expandido, setExpandido] = useState('');
  // Entre rutas anidadas (/modulos y /modulos/entidades) gana la más específica.
  const actual = NAV.flatMap(n => n.hijos?.map(h => h.href) ?? (n.href ? [n.href] : [])).filter(h => coincide(pathname, h)).sort((a, b) => b.length - a.length)[0];
  const activo = (href: string) => href === actual;
  const fila = (on: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 40, padding: '0 12px', borderRadius: radius.sm, border: 'none',
    background: on ? SIDEBAR.activeBg : 'transparent', color: on ? C.brandOnDark : SIDEBAR.text, fontSize: 13, fontFamily: FONT, textDecoration: 'none', cursor: 'pointer', textAlign: 'left' as const,
  });
  return (
    <>
      <div className="solo-movil" style={{ height: SIZE.header, flexShrink: 0, background: SIDEBAR.bg, alignItems: 'center', gap: 12, padding: '0 12px', fontFamily: FONT }}>
        <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto}
          style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: radius.sm, cursor: 'pointer', color: '#fff' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <span style={{ width: 28, height: 28, background: C.brand, borderRadius: radius.sm, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Logo /></span>
        <span style={{ color: '#E0E0E0', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{empresa}</span>
        <button type="button" onClick={onNotificaciones} aria-label="Notificaciones"
          style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#E0E0E0' }}><IcBell size={16} /></button>
      </div>
      {abierto && (
        <div className="solo-movil" onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.45)' }}>
          <nav aria-label="Menú principal" onClick={e => e.stopPropagation()}
            style={{ width: 'min(300px, 86vw)', height: '100%', background: SIDEBAR.bg, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
            <div style={{ height: SIZE.header, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: `1px solid ${SIDEBAR.divider}` }}>
              <span style={{ color: '#E0E0E0', fontSize: 13, fontWeight: 600 }}>Seven Management</span>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" style={{ background: 'none', border: 'none', color: SIDEBAR.muted, cursor: 'pointer', display: 'flex', padding: 6 }}><IcClose size={16} /></button>
            </div>
            <label style={{ padding: '12px 12px 4px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: SIDEBAR.muted }}>
              Empresa
              <select value={empresa} onChange={e => onEmpresa(e.target.value)}
                style={{ height: 36, borderRadius: radius.sm, border: '1px solid rgba(255,255,255,.12)', background: SIDEBAR.dropdownBg, color: '#E0E0E0', padding: '0 8px', fontSize: 13, fontFamily: FONT }}>
                {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV.map(item => item.href ? (
                <Link key={item.id} href={item.href} onClick={() => setAbierto(false)} style={fila(activo(item.href))} aria-current={activo(item.href) ? 'page' : undefined}>
                  <span style={{ display: 'flex', width: 14, height: 14 }}>{item.icon}</span>{item.label}
                </Link>
              ) : (
                <div key={item.id}>
                  <button type="button" onClick={() => setExpandido(e => (e === item.id ? '' : item.id))} aria-expanded={expandido === item.id}
                    style={fila(!!item.hijos?.some(h => activo(h.href)))}>
                    <span style={{ display: 'flex', width: 14, height: 14 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {expandido === item.id ? <IcChevronDown /> : <IcChevronRight />}
                  </button>
                  {expandido === item.id && item.hijos?.map(h => (
                    <Link key={h.href} href={h.href} onClick={() => setAbierto(false)} aria-current={activo(h.href) ? 'page' : undefined}
                      style={{ ...fila(activo(h.href)), paddingLeft: 36, color: activo(h.href) ? C.brandOnDark : SIDEBAR.subText }}>{h.label}</Link>
                  ))}
                </div>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
