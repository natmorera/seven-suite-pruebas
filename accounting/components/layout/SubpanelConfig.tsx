'use client';
// Sub-panel «Configuración General» que se abre junto al menú lateral
import Link from 'next/link';
import { C, FONT, radius } from '@/components/ui/tokens';
import { CONFIG_ITEMS } from './navegacion';

export const HEADER_H = 52;  // misma altura en las tres columnas (menú, sub-panel y página)

export default function SubpanelConfig({ pathname }: { pathname: string }) {
  return (
    <div style={{ width:200, minWidth:200, background:C.n000, borderRight:`1px solid ${C.n500}`,
      display:'flex', flexDirection:'column', flexShrink:0, height:'100vh', position:'sticky', top:0, zIndex:10 }}>
      <div style={{ height:HEADER_H, minHeight:HEADER_H, padding:'0 20px', display:'flex', alignItems:'center', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
        <span style={{ fontSize:12, fontWeight:500, color:C.n900, fontFamily:FONT }}>Configuración General</span>
      </div>
      <nav style={{ flex:1, padding:'8px', overflowY:'auto' }}>
        {CONFIG_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            style={{ display:'block', padding:'8px 12px', fontSize:12, fontWeight:400,
              color: pathname === item.href ? C.brand : C.n900,
              background: pathname === item.href ? C.brandBg : 'transparent',
              textDecoration:'none', borderRadius:radius.md, marginBottom:2,
              border: pathname === item.href ? `1px solid ${C.brandBd}` : '1px solid transparent',
              fontFamily:FONT }}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
