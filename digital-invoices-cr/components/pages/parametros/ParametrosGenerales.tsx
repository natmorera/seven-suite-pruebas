'use client';
import { useState, useEffect } from 'react';
import { PageHeader, TabBar, Button, Toast, radius } from '../../ui/primitives';
import { IcCheck, IcPlus } from '../../ui/icons';
import { C, FONT } from '../../ui/primitives';
import { TabMonedas, TabTipoCambio } from './TabMonedas';
import FirmasPersonalizadas from './FirmasPersonalizadas';

const F = FONT;

interface Config {
  monedaPrincipal: string;
  divisa1: { code:string; enabled:boolean };
  divisa2: { code:string; enabled:boolean };
}

const INIT: Config = {
  monedaPrincipal: 'CRC',
  divisa1: { code:'USD', enabled:true  },
  divisa2: { code:'EUR', enabled:false },
};

const TABS = ['Monedas','Tipo de cambio','Firmas'];

export default function ParametrosGenerales() {
  const [tab, setTab]       = useState(0);
  const [config, setConfig] = useState<Config>(INIT);
  const [dirty, setDirty]   = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [toast, setToast]   = useState<{message:string;type:'success'|'error'}|null>(null);
  const [divisaAddSignal, setDivisaAddSignal]   = useState(0);
  const [tasaAddSignal, setTasaAddSignal]       = useState(0);
  const [firmaAddSignal, setFirmaAddSignal]     = useState(0);
  const [hayDivisasDisponibles, setHayDivisasDisponibles] = useState(true);

  // Acceso directo desde un reporte (?tab=firmas) cuando todavía no hay
  // firmas configuradas para ese reporte - abre de una vez esta pestaña.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'firmas') setTab(2);
    } catch { /* noop - SSR o entorno sin window */ }
  }, []);

  function patch(partial: Partial<Config>) { setConfig(c => ({ ...c, ...partial })); setDirty(true); }

  function save() {
    setDirty(false);
    setToast({ message:'Parámetros guardados correctamente.', type:'success' });
    setTimeout(() => setToast(null), 3000);
  }
  function cancelar() { setResetKey(k => k + 1); setDirty(false); }

  const guardarCancelarBtns = dirty ? (
    <>
      <Button variant="secondary" onClick={cancelar}>Cancelar</Button>
      <Button onClick={save} icon={<IcCheck className="w-3 h-3" />}>Guardar cambios</Button>
    </>
  ) : null;

  const actions =
    tab === 0 ? (
      <>
        <Button variant="secondary" icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setDivisaAddSignal(s=>s+1)} disabled={!hayDivisasDisponibles}
          title={!hayDivisasDisponibles ? 'Ya están configuradas ambas divisas permitidas (USD y EUR)' : undefined}>Agregar divisa</Button>
        {guardarCancelarBtns}
      </>
    ) : tab === 1 ? (
      <>
        <Button variant="secondary" icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setTasaAddSignal(s=>s+1)}>Nuevo registro</Button>
        {guardarCancelarBtns}
      </>
    ) : (
      <Button variant="secondary" icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setFirmaAddSignal(s=>s+1)}>Nueva firma</Button>
    );

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <PageHeader title="Parámetros generales">{actions}</PageHeader>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ flex:1, overflowY:'auto' }}>
        {tab === 0 && <div style={{ padding:24 }}><TabMonedas key={`m${resetKey}`} config={config} patch={patch} addSignal={divisaAddSignal} onAddHandled={()=>{}} onAvailabilidadChange={setHayDivisasDisponibles} /></div>}
        {tab === 1 && <div style={{ padding:24 }}><TabTipoCambio key={`t${resetKey}`} addSignal={tasaAddSignal} onAddHandled={()=>{}} /></div>}
        {tab === 2 && <div style={{ padding:24 }}><FirmasPersonalizadas addSignal={firmaAddSignal} onAddHandled={()=>{}} /></div>}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
