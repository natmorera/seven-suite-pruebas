'use client';
import { useState } from 'react';
import { PageHeader } from '../../ui/primitives';
import { C, FONT } from '../../ui/tokens';
import { Button } from '../../ui/formulario';
import { IcPlus } from '../../ui/icons';
import { TabTransferencias } from '../parametros/conceptosLibros/TabTransferencias';
import Afiliados from '../bancos/Afiliados';
import { TabCheques } from '../catalogo/ajustes/piezas';

const F = FONT;
const BRAND = C.brand;

// Configuración > Actividad bancaria: acá vive lo que es SETUP, no operación
// diaria. Antes esto estaba repartido en dos lugares por error: los
// formularios de transferencia vivían en Parámetros generales, y los
// afiliados de datáfono se colaron dentro de la sección operativa de Bancos
// ("Actividad bancaria" allá abajo). Ambos son configuración de cómo se
// procesan las transferencias y cobros con tarjeta, así que se unifican acá.
// La parte operativa de Bancos ahora es solo "Transferencias bancarias"
// (ver components/pages/bancos/Transferencias.tsx).
// Issue: "Cheques" (configuración de chequera por cuenta bancaria) vivía
// dentro de Catálogo de cuentas, pero es configuración de actividad bancaria,
// no del plan de cuentas - se mueve para acá.
export default function ActividadBancariaConfig() {
  const [tab, setTab] = useState<'formularios'|'afiliados'|'cheques'>('formularios');
  // Issue #10: "Nueva" (formulario) / "Nuevo afiliado" ahora viven en el
  // header de la página en vez de adentro de cada pestaña.
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
