'use client';
import { useState, useEffect } from 'react';
import { PageHeader, TabBar, Toast } from '../../ui/primitives';
import { Button } from '../../ui/formulario';
import { radius } from '../../ui/tokens';
import { IcCheck, IcPlus } from '../../ui/icons';
import { C, FONT } from '../../ui/tokens';
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

// Issue: "Firmas" vuelve a vivir acá, como pestaña propia dentro de
// Parámetros generales - es la ÚNICA sección donde se configura quién firma
// qué reporte y en qué orden (por eso ya no hay ningún permiso ".firmar" por
// reporte en Usuarios y Permisos, ni una pantalla de firma personal en Mi
// cuenta - todo pasa por acá).
const TABS = ['Monedas','Tipo de cambio','Firmas'];

export default function ParametrosGenerales() {
  const [tab, setTab]       = useState(0);
  const [config, setConfig] = useState<Config>(INIT);
  const [dirty, setDirty]   = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [toast, setToast]   = useState<{message:string;type:'success'|'error'}|null>(null);
  // Issue #10: "Agregar divisa" / "Nuevo registro" / "Nueva firma" ahora
  // viven en el header de la página, no adentro de cada pestaña.
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
  // Issue: el botón de guardar existía siempre, aunque no hubiera nada para
  // guardar (mostraba "Guardado" a modo de placeholder deshabilitado). Ahora
  // directamente no se renderiza si no hay cambios, y cuando sí los hay
  // aparece junto a "Cancelar" (no un botón solo) - Cancelar descarta lo
  // editado en la pestaña actual, sin necesidad de guardar.
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
      // Issue: en la pestaña Firmas no hay ningún "guardar" pendiente - cada
      // firma se guarda al toque desde su propio modal, así que el botón de
      // guardar de acá nunca representaba nada real. Se saca.
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
