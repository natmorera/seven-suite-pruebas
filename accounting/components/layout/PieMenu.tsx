'use client';
// Pie del menú lateral: idioma, notificaciones, módulos de la suite,
// onboarding (demostración) y cerrar sesión.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IcBell, IcLogout, IcChevronDown } from '../ui/icons';
import { C, FONT, radius } from '../ui/tokens';
import { verOnboarding } from '../pages/onboarding/datos/obligatorio';
import ModulosSuiteModal, { IcModulos } from './modulos/ModulosSuite';
import { GlobeIcon, IcPlay } from './iconosMenu';
import { filaMenu } from './estiloMenu';

export default function PieMenu({ open }: { open: boolean }) {
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState('Español');
  const [verModulos, setVerModulos] = useState(false);
  return (
    <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'4px', flexShrink:0 }}>
      {open && (
        <div style={{ position:'relative' }}>
          <button onClick={() => setLangOpen(v=>!v)}
            style={{ ...filaMenu(false, false), width:'100%', margin:0, gap:10 }}>
            <span style={{ width:14, height:14, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}>
              <GlobeIcon />
            </span>
            <span style={{ flex:1, textAlign:'left', color:C.n700 }}>{lang}</span>
            <IcChevronDown className="w-3 h-3" style={{ color:C.n700 }} />
          </button>
          {langOpen && (
            <div style={{ position:'absolute', bottom:'100%', left:4, right:4, background:C.n900, border:'1px solid rgba(255,255,255,.1)', borderRadius:radius.md, zIndex:100, boxShadow:'0 4px 16px rgba(0,0,0,.5)', overflow:'hidden', marginBottom:4 }}>
              {['Español','English'].map(l => (
                <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 16px', fontSize:12, color: l===lang ? C.brand : C.n700, background:'transparent', border:'none', cursor:'pointer', fontFamily:FONT }}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button style={filaMenu(false, !open)} title="Notificaciones">
        <IcBell className="w-[14px] h-[14px]" style={{ flexShrink:0 }} />
        {open && 'Notificaciones'}
      </button>
      {/* Módulos de la suite */}
      <button style={filaMenu(false, !open)} onClick={() => setVerModulos(true)} title="Módulos">
        <IcModulos />
        {open && 'Módulos'}
      </button>
      {/* Solo para la demostración: vuelve a pedir el onboarding contable */}
      <button style={filaMenu(false, !open)} title="Ver onboarding (demo)" onClick={() => verOnboarding(r => router.push(r))}>
        <IcPlay />
        {open && 'Ver onboarding (demo)'}
      </button>
      <button style={filaMenu(false, !open)} title="Cerrar sesión">
        <IcLogout className="w-[14px] h-[14px]" style={{ flexShrink:0 }} />
        {open && 'Cerrar sesión'}
      </button>
      {verModulos && <ModulosSuiteModal onClose={() => setVerModulos(false)} />}
    </div>
  );
}
