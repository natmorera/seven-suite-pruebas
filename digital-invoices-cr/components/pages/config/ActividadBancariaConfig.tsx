'use client';
import { useState } from 'react';
import { C, FONT, PageHeader, Button } from '../../ui/primitives';
import { IcPlus } from '../../ui/icons';
import { TabTransferencias } from '../parametros/TabConceptosLibros';
import Afiliados from '../bancos/Afiliados';
import { TabCheques } from '../catalogo/CatalogoTabs2';

const F = FONT;
const BRAND = C.brand;

export default function ActividadBancariaConfig() {
  const [tab, setTab] = useState<'formularios'|'afiliados'|'cheques'>('formularios');
  const [formularioAddSignal, setFormularioAddSignal] = useState(0);
  const [afiliadoAddSignal, setAfiliadoAddSignal] = useState(0);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F }}>
      <PageHeader title="Actividad bancaria">
        {tab==='formularios' && <Button icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setFormularioAddSignal(s=>s+1)}>Nueva</Button>}
        {tab==='afiliados' && <Button icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setAfiliadoAddSignal(s=>s+1)}>Nuevo afiliado</Button>}
      </PageHeader>

      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'0 24px', display:'flex', gap:4, flexShrink:0 }}>
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

      <div style={{ flex:1, minHeight:0, overflow: tab==='afiliados' ? 'hidden' : 'auto', padding: tab==='afiliados' ? 0 : 24 }}>
        {tab==='formularios' && <TabTransferencias addSignal={formularioAddSignal} onAddHandled={()=>{}}/>}
        {tab==='afiliados' && <Afiliados addSignal={afiliadoAddSignal} onAddHandled={()=>{}}/>}
        {tab==='cheques' && <TabCheques/>}
      </div>
    </div>
  );
}
