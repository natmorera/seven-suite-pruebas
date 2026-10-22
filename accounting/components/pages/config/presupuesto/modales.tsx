'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/primitives';
import { Button, FormField, Select, Checkbox, Radio } from '@/components/ui/formulario';
import { radius, C } from '@/components/ui/tokens';
import { IcImport, IcCheck, IcInfo, IcClose } from '@/components/ui/icons';
import { MESES, TIPOS_DE_CUENTA } from '../presupuestoData';
import { ANIOS_PROYECCION, F, type ProyectarParams, type RecalcParams, descargarPlantilla } from './datos';
import { RangoInput } from './piezas';

export function ModalImportar({ onClose, onImportar }: { onClose:()=>void; onImportar:()=>void }) {
  const [file, setFile] = useState<string|null>(null);
  return (
    <Modal open title="Importar presupuesto desde Excel" onClose={onClose}
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!file} icon={<IcImport className="w-3.5 h-3.5" />} onClick={()=>{ if (file) { onImportar(); onClose(); } }}>Importar</Button>
      </div>}>
      <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
        <p style={{ fontSize:12,color:C.n700,margin:0 }}>El archivo debe seguir el formato de la plantilla. Las columnas deben coincidir con las del sistema.</p>
        {file ? (
          <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',border:`1px solid ${C.success}`,borderRadius:radius.md,background:'rgba(76,175,80,.05)' }}>
            <span style={{ color:C.success,display:'flex' }}><IcCheck className="w-3.5 h-3.5" /></span>
            <span style={{ fontSize:12,flex:1,color:C.n900 }}>{file}</span>
            <span style={{ fontSize:11,color:C.n700 }}>48 KB</span>
            <button onClick={()=>setFile(null)} style={{ background:'none',border:'none',cursor:'pointer',color:C.n700 }}><IcClose className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <label style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:32,border:`2px dashed ${C.n500}`,borderRadius:radius.md,cursor:'pointer',background:C.n200 }}>
            <span style={{ color:C.n700,display:'flex' }}><IcImport className="w-6 h-6" /></span>
            <p style={{ fontSize:13,fontWeight:500,color:C.n900,margin:0 }}>Arrastrá tu archivo acá</p>
            <p style={{ fontSize:11,color:C.n700,margin:0 }}>o hacé clic para seleccionarlo · Solo .xlsx</p>
            <input type="file" accept=".xlsx" style={{ display:'none' }} onChange={e=>setFile(e.target.files?.[0]?.name||null)} />
          </label>
        )}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <p style={{ fontSize:12,color:C.n700,margin:0 }}>¿No tenés la plantilla?</p>
          <button onClick={descargarPlantilla} style={{ fontSize:12,color:C.brand,background:'none',border:'none',cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:4 }}>
            <IcImport className="w-3.5 h-3.5" />Descargar plantilla
          </button>
        </div>
        {file && <p style={{ fontSize:11,color:C.n700 }}>El archivo se procesará al importar. Se actualizarán los valores de todas las cuentas que coincidan con el catálogo actual.</p>}
      </div>
    </Modal>
  );
}
export function ModalRecalcularGlobal({ cuentaOpciones, centroOpciones, onClose, onAplicar }: {
  cuentaOpciones:{value:string;label:string}[]; centroOpciones:{value:string;label:string}[];
  onClose:()=>void; onAplicar:(p:RecalcParams)=>void;
}) {
  const [accion, setAccion] = useState<'cero'|'aumentar'|'disminuir'>('cero');
  const [pct, setPct] = useState('10');
  const [usarRango, setUsarRango] = useState(false);
  const [rIni, setRIni] = useState(''); const [rFin, setRFin] = useState('');
  const [usarCentro, setUsarCentro] = useState(false);
  const [cIni, setCIni] = useState(''); const [cFin, setCFin] = useState('');
  const [usarTipo, setUsarTipo] = useState(true);
  const [tipoCuenta, setTipoCuenta] = useState(TIPOS_DE_CUENTA.find(t=>t.tipo==='costos')?.codigo ?? TIPOS_DE_CUENTA[0]?.codigo ?? '');
  const [usarPeriodo, setUsarPeriodo] = useState(true);
  const [periodo, setPeriodo] = useState(0);

  function aplicar() {
    onAplicar({
      accion, pct: Number(pct) || 0,
      rango: usarRango ? { inicial:rIni, final:rFin } : undefined,
      centro: usarCentro ? { inicial:cIni, final:cFin } : undefined,
      tipoCuenta: usarTipo ? tipoCuenta : undefined,
      soloPeriodo: usarPeriodo ? periodo : undefined,
    });
    onClose();
  }

  return (
    <Modal open title="Recalcular presupuesto" onClose={onClose}
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button icon={<IcCheck className="w-3 h-3" />} onClick={aplicar}>Aplicar recálculo</Button>
      </div>}>
      <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:10 }}>Acción sobre los importes</p>
          {([
            ['cero','Poner en cero','Elimina todos los valores del rango seleccionado'],
            ['aumentar','Aumentar','Incrementa los valores actuales'],
            ['disminuir','Disminuir','Reduce los valores actuales'],
          ] as const).map(([val,label,hint])=>(
            <div key={val} style={{ marginBottom:10 }}>
              <Radio checked={accion===val} onChange={()=>setAccion(val)} label={
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <span style={{ fontSize:13 }}>{label}</span>
                    {val!=='cero' && accion===val && <>
                      <input aria-label="Porcentaje" type="number" value={pct} onChange={e=>setPct(e.target.value)}
                        style={{ width:60,height:28,padding:'0 8px',border:`1px solid ${C.n500}`,borderRadius:4,fontSize:12,fontFamily:F }} />
                      <span style={{ fontSize:12,color:C.n700 }}>%</span>
                    </>}
                  </div>
                  <p style={{ fontSize:11,color:C.n700,margin:'2px 0 0' }}>{hint}</p>
                </div>
              }/>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:10 }}>A qué cuentas aplicar</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Checkbox label="Rango de cuenta" checked={usarRango} onChange={setUsarRango} />
            {usarRango && <RangoInput inicial={rIni} final={rFin} onInicial={setRIni} onFinal={setRFin} opciones={cuentaOpciones} tituloBuscador="Buscar cuenta" />}
            <Checkbox label="Centro de costos" checked={usarCentro} onChange={setUsarCentro} />
            {usarCentro && <RangoInput inicial={cIni} final={cFin} onInicial={setCIni} onFinal={setCFin} opciones={centroOpciones} tituloBuscador="Buscar centro de costos" />}
            <Checkbox label="Tipo de cuenta" checked={usarTipo} onChange={setUsarTipo} />
            {usarTipo && (
              <Select ariaLabel="A qué cuentas aplicar" value={tipoCuenta} onChange={setTipoCuenta}
                options={TIPOS_DE_CUENTA.map(t=>({ value:t.codigo, label:`${t.codigo} - ${t.nombre}` }))} />
            )}
            <Checkbox label="Solo por período" checked={usarPeriodo} onChange={setUsarPeriodo} />
            {usarPeriodo && (
              <Select ariaLabel="A qué cuentas aplicar" value={String(periodo)} onChange={v=>setPeriodo(Number(v))}
                options={MESES.map((m,i)=>({ value:String(i), label:m }))} />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
// ── Recalcular N cuentas seleccionadas (contextual, desde la tabla) ──────────
export function ModalRecalcularSeleccionadas({ cantidad, onClose, onAplicar }: {
  cantidad:number; onClose:()=>void; onAplicar:(accion:'cero'|'aumentar'|'disminuir', pct:number)=>void;
}) {
  const [accion, setAccion] = useState<'cero'|'aumentar'|'disminuir'>('aumentar');
  const [pct, setPct] = useState('15');
  return (
    <Modal open title={`Recalcular ${cantidad} cuenta${cantidad!==1?'s':''} seleccionada${cantidad!==1?'s':''}`} onClose={onClose}
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button icon={<IcCheck className="w-3 h-3" />} onClick={()=>{ onAplicar(accion, Number(pct)||0); onClose(); }}>
          Aplicar a {cantidad} cuenta{cantidad!==1?'s':''}
        </Button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md }}>
          <IcInfo className="w-3.5 h-3.5" style={{ color:C.brand, flexShrink:0 }} />
          <span style={{ fontSize:12, color:C.brand }}>Se aplicará solo a las {cantidad} cuentas seleccionadas en la tabla.</span>
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:10 }}>Acción sobre los importes</p>
          {([
            ['cero','Poner en cero','Elimina todos los valores'],
            ['aumentar','Aumentar','Incrementa los valores actuales'],
            ['disminuir','Disminuir','Reduce los valores actuales'],
          ] as const).map(([val,label,hint])=>(
            <div key={val} style={{ marginBottom:10 }}>
              <Radio checked={accion===val} onChange={()=>setAccion(val)} label={
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <span style={{ fontSize:13 }}>{label}</span>
                    {val!=='cero' && accion===val && <>
                      <input aria-label="Porcentaje" type="number" value={pct} onChange={e=>setPct(e.target.value)}
                        style={{ width:60,height:28,padding:'0 8px',border:`1px solid ${C.n500}`,borderRadius:4,fontSize:12,fontFamily:F }} />
                      <span style={{ fontSize:12,color:C.n700 }}>%</span>
                    </>}
                  </div>
                  <p style={{ fontSize:11,color:C.n700,margin:'2px 0 0' }}>{hint}</p>
                </div>
              }/>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
export function ModalProyectar({ ejercicioActual, cuentaOpciones, onClose, onAplicar }: {
  ejercicioActual:string; cuentaOpciones:{value:string;label:string}[]; onClose:()=>void; onAplicar:(p:ProyectarParams)=>void;
}) {
  const [accion, setAccion] = useState<'cero'|'copiar'|'aumentar'|'disminuir'>('copiar');
  const [pct, setPct] = useState('10');
  const [usarRango, setUsarRango] = useState(false);
  const [rIni, setRIni] = useState(''); const [rFin, setRFin] = useState('');
  const [usarTipo, setUsarTipo] = useState(true);
  const [tipoCuenta, setTipoCuenta] = useState(TIPOS_DE_CUENTA.find(t=>t.tipo==='ingresos')?.codigo ?? TIPOS_DE_CUENTA[0]?.codigo ?? '');
  const [anioBase, setAnioBase] = useState(ejercicioActual);
  const [anioDestino, setAnioDestino] = useState(String(Number(ejercicioActual)+1));
  const [limitarPeriodo, setLimitarPeriodo] = useState(false);
  const [desde, setDesde] = useState(0);
  const [hasta, setHasta] = useState(5);

  function aplicar() {
    onAplicar({
      accion, pct: Number(pct)||0,
      rango: usarRango ? { inicial:rIni, final:rFin } : undefined,
      tipoCuenta: usarTipo ? tipoCuenta : undefined,
      anioBase, anioDestino,
      rangoPeriodo: limitarPeriodo ? { desde, hasta } : undefined,
    });
    onClose();
  }

  return (
    <Modal open title="Proyectar presupuesto" onClose={onClose}
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button icon={<IcCheck className="w-3 h-3" />} onClick={aplicar}>Proyectar</Button>
      </div>}>
      <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:10 }}>Acción sobre los importes</p>
          {([
            ['cero','Poner en cero','El año destino arranca vacío'],
            ['copiar','Copiar importes del año base','Los valores del año base se trasladan tal cual al destino'],
            ['aumentar','Aumentar sobre el año base','Se incrementan en el porcentaje indicado'],
            ['disminuir','Disminuir sobre el año base','Se reducen en el porcentaje indicado'],
          ] as const).map(([val,label,hint])=>(
            <div key={val} style={{ marginBottom:10 }}>
              <Radio checked={accion===val} onChange={()=>setAccion(val)} label={
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <span style={{ fontSize:13 }}>{label}</span>
                    {(val==='aumentar'||val==='disminuir') && accion===val && <>
                      <input aria-label="Porcentaje" type="number" value={pct} onChange={e=>setPct(e.target.value)}
                        style={{ width:60,height:28,padding:'0 8px',border:`1px solid ${C.n500}`,borderRadius:4,fontSize:12,fontFamily:F }} />
                      <span style={{ fontSize:12,color:C.n700 }}>%</span>
                    </>}
                  </div>
                  <p style={{ fontSize:11,color:C.n700,margin:'2px 0 0' }}>{hint}</p>
                </div>
              }/>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:10 }}>A qué cuentas aplicar</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Checkbox label="Rango de cuenta" checked={usarRango} onChange={setUsarRango} />
            {usarRango && <RangoInput inicial={rIni} final={rFin} onInicial={setRIni} onFinal={setRFin} opciones={cuentaOpciones} tituloBuscador="Buscar cuenta" />}
            <Checkbox label="Tipo de cuenta" checked={usarTipo} onChange={setUsarTipo} />
            {usarTipo && (
              <Select ariaLabel="A qué cuentas aplicar" value={tipoCuenta} onChange={setTipoCuenta}
                options={TIPOS_DE_CUENTA.map(t=>({ value:t.codigo, label:`${t.codigo} - ${t.nombre}` }))} />
            )}
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:10,alignItems:'end' }}>
          <FormField label="Año base (origen)">
            <Select value={anioBase} onChange={setAnioBase} options={ANIOS_PROYECCION.map(a=>({ value:a,label:a }))} />
          </FormField>
          <span style={{ fontSize:18,color:C.n700,paddingBottom:4 }}>→</span>
          <FormField label="Año destino">
            <Select value={anioDestino} onChange={setAnioDestino} options={ANIOS_PROYECCION.map(a=>({ value:a,label:a }))} />
          </FormField>
        </div>
        <Checkbox label="Limitar a un rango de períodos" checked={limitarPeriodo} onChange={setLimitarPeriodo} />
        {limitarPeriodo && (
          <div style={{ display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:10,alignItems:'center' }}>
            <Select ariaLabel="Mes desde" value={String(desde)} onChange={v=>setDesde(Number(v))} options={MESES.map((m,i)=>({ value:String(i),label:m }))} />
            <span style={{ color:C.n700 }}>→</span>
            <Select ariaLabel="Hasta" value={String(hasta)} onChange={v=>setHasta(Number(v))} options={MESES.map((m,i)=>({ value:String(i),label:m }))} />
          </div>
        )}
      </div>
    </Modal>
  );
}
