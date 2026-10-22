'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { C, FONT } from '@/components/ui/tokens';
import { Button } from '@/components/ui/formulario';
import { IcPlus } from '@/components/ui/icons';
import { TabTransferencias } from '@/components/pages/parametros/conceptosLibros/TabTransferencias';
import Afiliados from '@/components/pages/bancos/Afiliados';
import { TabCheques } from '@/components/pages/catalogo/ajustes/piezas';

const F = FONT;
const BRAND = C.brand;

// Configuración › Actividad bancaria: la configuración de la actividad bancaria (formularios de
// transferencia, afiliados de datáfono y chequeras por cuenta). La operación diaria está en el
// menú Bancos.
export default function ActividadBancariaConfig() {
  const [tab, setTab] = useState<'formularios'|'afiliados'|'cheques'>('formularios');
  // Los botones «Nueva» (formulario) y «Nuevo afiliado» están en el encabezado de la página.
  const [formularioAddSignal, setFormularioAddSignal] = useState(0);
  const [afiliadoAddSignal, setAfiliadoAddSignal] = useState(0);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F }}>
      <PageHeader title="Actividad bancaria">
        {tab==='formularios' && <Button icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setFormularioAddSignal(s=>s+1)}>Nueva</Button>}
        {tab==='afiliados' && <Button icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setAfiliadoAddSignal(s=>s+1)}>Nuevo afiliado</Button>}
      </PageHeader>

      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'0 24px', display:'flex', gap:4, flexShrink:0 }}>
        {(['formularios','afiliados','cheques'] as const).map(t=>{
          const active = tab===t;
          return (
            <button key={t} onClick={()=>setTab(t)}
              style={{ height:44, padding:'0 4px', marginRight:22, border:'none', background:'none', cursor:'pointer',
                borderBottom:`2px solid ${active?BRAND:'transparent'}`, color:active?BRAND:C.n700,
                fontWeight:active?600:400, fontSize:13, fontFamily:F }}>
              {t==='formularios' ? 'Formularios de transferencia' : t==='afiliados' ? 'Afiliados' : 'Cheques'}
            </button>
          );
        })}
      </div>

      <div style={{ flex:1, minHeight:0, overflow:'auto', padding:24 }}>
        {tab==='formularios' && <TabTransferencias addSignal={formularioAddSignal} onAddHandled={()=>{}}/>}
        {tab==='afiliados' && <Afiliados addSignal={afiliadoAddSignal} onAddHandled={()=>{}}/>}
        {tab==='cheques' && <TabCheques/>}
      </div>
    </div>
  );
}
