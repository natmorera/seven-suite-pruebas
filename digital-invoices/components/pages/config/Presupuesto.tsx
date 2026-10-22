'use client';
import { useState, useEffect, useRef } from 'react';
import { PageHeader, Button, FormField, Input, Select, Modal, Checkbox, Radio, Toast, Pagination, radius, shadow, C, FONT, fmtNum, SearchInput, BulkActionBar } from '../../ui/primitives';
import { IcSearch, IcImport, IcExport, IcCheck, IcCopy, IcTrash, IcCalendar, IcInfo, IcClose, IcChevronDown } from '../../ui/icons';
import {
  MESES, TIPOS_PL, TipoPL, TIPOS_DE_CUENTA, TIPOS_DE_CUENTA_DEFAULT,
  EJERCICIOS_PRESUPUESTO, EjercicioPresupuesto, PresRow, INIT_ROWS,
} from './presupuestoData';
import { useCentrosCostoConfig, CentroCosto } from '../catalogo/centrosCostoConfig';
import { useCambio } from '@/components/ui/senales';
import { simboloLocal } from '@/lib/paisActual';

const F = FONT;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCelda(n: number) {
  const s = fmtNum(Math.abs(n), 2);
  return n < 0 ? `(${s})` : s;
}
function CeldaMonto({ value, onChange, disabled }: { value:number; onChange:(v:number)=>void; disabled?:boolean }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const mostrado = editando ? texto : (value ? fmtNum(value, 2) : '');
  return (
    <input type="text" inputMode="decimal" value={mostrado} disabled={disabled}
      onFocus={()=>{ setEditando(true); setTexto(value ? String(value) : ''); }}
      onChange={e=>setTexto(e.target.value)}
      onBlur={()=>{ setEditando(false); onChange(parseFloat(texto.replace(/,/g,'')) || 0); }}
      style={{ position:'relative', zIndex:0, width:110,height:26,padding:'0 6px',textAlign:'right',border:`1px solid ${C.n500}`,borderRadius:4,fontSize:12,fontFamily:F,
        color:value<0?C.error:C.n900,background:'#fff',outline:'none' }}
      onFocusCapture={e=>{ e.target.style.borderColor=C.brand; e.target.style.boxShadow=`0 0 0 2px ${C.brandBg}`; }}
      onBlurCapture={e=>{ e.target.style.borderColor=C.n500; e.target.style.boxShadow='none'; }} />
  );
}
function labelTipoCuenta(codigo: string) {
  const t = TIPOS_DE_CUENTA.find(x => x.codigo === codigo);
  return t ? `${t.codigo} - ${t.nombre}` : codigo;
}
function cloneRows(rows: PresRow[]): PresRow[] {
  return rows.map(r => ({ ...r, valores: [...r.valores] }));
}
function labelCentro(centros: CentroCosto[], id: string) {
  const c = centros.find(x => x.id === id);
  return c ? c.descripcion : id;
}
function soloCodigo(v: string) { return v.split(' - ')[0].trim(); }

// ── Filtro "Tipo" (Costos/Gastos/Ingresos): selección múltiple ──────────────
// con el activo resaltado en ámbar.
function TipoToggle({ value, onChange, disabled }: { value: Set<TipoPL>; onChange:(v:Set<TipoPL>)=>void; disabled?: boolean }) {
  function toggle(t: TipoPL) {
    if (disabled) return;
    const next = new Set(value);
    next.has(t) ? next.delete(t) : next.add(t);
    onChange(next);
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:12, color:C.n700, fontFamily:F }}>Tipo:</span>
      {TIPOS_PL.map(t => {
        const active = value.has(t.value);
        return (
          <button key={t.value} type="button" onClick={()=>toggle(t.value)} disabled={disabled}
            style={{ height:28, padding:'0 12px', borderRadius:radius.pill, border:`1px solid ${active?C.brand:C.n500}`,
              background:active?C.brandBg:'#fff', color:active?C.brand:C.n700, fontSize:12, fontWeight:active?600:400,
              fontFamily:F, cursor:disabled?'not-allowed':'pointer', whiteSpace:'nowrap', opacity:disabled?.6:1 }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Filtro de selección múltiple anclado al botón (popover): el panel se
// abre debajo del botón activo sin tapar la pantalla.
function FiltroMultiSelect({ label, items, selected, onApply }: {
  label:string; items:{ id:string; label:string; count?:number }[]; selected:Set<string>; onApply:(s:Set<string>)=>void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [temp, setTemp] = useState<Set<string>>(new Set(selected));
  const ref = useRef<HTMLDivElement>(null);
  const active = selected.size>0 && selected.size<items.length;

  useEffect(() => {
    function onClickFuera(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); } }
    if (open) { document.addEventListener('mousedown', onClickFuera); document.addEventListener('keydown', onEsc); }
    return () => { document.removeEventListener('mousedown', onClickFuera); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  function toggle(id:string) { setTemp(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  const filtrados = items.filter(i => !q || i.label.toLowerCase().includes(q.toLowerCase()));
  const labelBoton = selected.size===0 ? label : selected.size===items.length ? `${label} (todas)` : `${label} (${selected.size})`;

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button type="button" onClick={()=>{ setTemp(new Set(selected)); setQ(''); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active||open?C.brand:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#fff', color:active||open?C.brand:C.n900, fontSize:12, fontFamily:F,
          cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
        {labelBoton}
        <IcChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300, background:'#fff',
          border:`1px solid ${C.n500}`, borderRadius:10, width:340, boxShadow:shadow.panel, fontFamily:F, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px 0' }}>
            <span style={{ fontSize:13, fontWeight:500, color:C.n900 }}>{label}</span>
            <button onClick={()=>setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, display:'flex', padding:2 }}><IcClose className="w-3.5 h-3.5" /></button>
          </div>
          <div style={{ padding:'10px 14px' }}>
            <SearchInput value={q} onChange={setQ} placeholder={`Buscar ${label.toLowerCase()}…`} width="100%" autoFocus />
            <p style={{ fontSize:11, color:C.n700, margin:'8px 0 0' }}>{temp.size} de {items.length} seleccionados</p>
          </div>
          <div style={{ maxHeight:260, overflowY:'auto', borderTop:`1px solid ${C.n200}` }}>
            {filtrados.length===0 && <div style={{ padding:16, textAlign:'center', fontSize:12, color:C.n700 }}>Sin resultados.</div>}
            {filtrados.map(i => {
              const checked = temp.has(i.id);
              return (
                <div key={i.id} onClick={()=>toggle(i.id)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px',
                    cursor:'pointer', background:checked?C.brandBg:'#fff' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${checked?C.brand:C.n500}`,
                      background:checked?C.brand:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {checked && <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08"/></svg>}
                    </span>
                    <span style={{ fontSize:12, color:C.n900 }}>{i.label}</span>
                  </span>
                  {i.count !== undefined && <span style={{ fontSize:11, color:C.n700, background:C.n200, padding:'2px 8px', borderRadius:radius.pill }}>{i.count} cuenta{i.count!==1?'s':''}</span>}
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderTop:`1px solid ${C.n500}` }}>
            <button type="button" onClick={()=>setTemp(new Set())}
              style={{ background:'none', border:'none', color:C.n700, fontSize:12, cursor:'pointer', fontFamily:F, padding:0 }}>
              Deseleccionar todo
            </button>
            <div style={{ display:'flex', gap:8 }}>
              <Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button>
              <Button icon={<IcCheck className="w-3 h-3" />} onClick={()=>{ onApply(temp); setOpen(false); }}>Aplicar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Buscador simple de un código (cuenta o centro de costo) ──────────────────
function ModalBuscarCodigo({ title, opciones, onPick, onClose }: {
  title:string; opciones:{ value:string; label:string }[]; onPick:(v:string)=>void; onClose:()=>void;
}) {
  const [q, setQ] = useState('');
  const filtradas = opciones.filter(o => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal open title={title} onClose={onClose}
      footer={<div style={{ display:'flex', justifyContent:'flex-end' }}><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por código o descripción…" width="100%" autoFocus />
        <div style={{ maxHeight:280, overflowY:'auto', border:`1px solid ${C.n500}`, borderRadius:4 }}>
          {filtradas.length===0 && <div style={{ padding:16, textAlign:'center', fontSize:12, color:C.n700 }}>Sin resultados.</div>}
          {filtradas.map(o => (
            <button key={o.value} type="button" onClick={()=>{ onPick(o.label); onClose(); }}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', border:'none', borderBottom:`1px solid ${C.n200}`, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n900 }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function RangoInput({ inicial, final, onInicial, onFinal, disabled, opciones, tituloBuscador='Buscar código' }: {
  inicial:string; final:string; onInicial:(v:string)=>void; onFinal:(v:string)=>void; disabled?:boolean;
  opciones?: { value:string; label:string }[]; tituloBuscador?:string;
}) {
  const [picker, setPicker] = useState<'inicial'|'final'|null>(null);
  const puedeBuscar = !!opciones && opciones.length>0 && !disabled;
  const searchBtn: React.CSSProperties = { width:32, height:32, border:`1px solid ${C.n500}`, borderRadius:4, background:'#fff',
    display:'flex', alignItems:'center', justifyContent:'center', color: puedeBuscar?C.n700:C.n500, cursor: puedeBuscar?'pointer':'not-allowed', flexShrink:0 };
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto', gap:6, alignItems:'center' }}>
        <Input value={inicial} onChange={onInicial} placeholder="Inicial" disabled={disabled} />
        <button type="button" style={searchBtn} disabled={!puedeBuscar} onClick={()=>setPicker('inicial')} title={tituloBuscador}><IcSearch className="w-3 h-3" /></button>
        <Input value={final} onChange={onFinal} placeholder="Final" disabled={disabled} />
        <button type="button" style={searchBtn} disabled={!puedeBuscar} onClick={()=>setPicker('final')} title={tituloBuscador}><IcSearch className="w-3 h-3" /></button>
      </div>
      {picker && opciones && (
        <ModalBuscarCodigo title={tituloBuscador} opciones={opciones}
          onPick={v => picker==='inicial' ? onInicial(v) : onFinal(v)}
          onClose={()=>setPicker(null)} />
      )}
    </>
  );
}

// ── Importar presupuesto desde Excel ─────────────────────────────────────────
function descargarPlantilla() {
  const headers = ['Cuenta','Centro','Descripción', ...MESES];
  const filaEjemplo = ['600-001-0001','ADM','Ingresos hospedaje', ...MESES.map(()=>'0.00')];
  const lines = [headers, filaEjemplo].map(row => row.map(v=>`"${v}"`).join(','));
  const blob = new Blob(['\ufeff'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'plantilla-presupuesto.csv';
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function ModalImportar({ onClose, onImportar }: { onClose:()=>void; onImportar:()=>void }) {
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

// ── Recalcular presupuesto (global, desde el header) ─────────────────────────
interface RecalcParams {
  accion: 'cero'|'aumentar'|'disminuir'; pct: number;
  rango?: { inicial:string; final:string };
  centro?: { inicial:string; final:string };
  tipoCuenta?: string;
  soloPeriodo?: number; // índice de mes 0-11
}
function ModalRecalcularGlobal({ cuentaOpciones, centroOpciones, onClose, onAplicar }: {
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
                      <input type="number" value={pct} onChange={e=>setPct(e.target.value)}
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
              <Select value={tipoCuenta} onChange={setTipoCuenta}
                options={TIPOS_DE_CUENTA.map(t=>({ value:t.codigo, label:`${t.codigo} - ${t.nombre}` }))} />
            )}
            <Checkbox label="Solo por período" checked={usarPeriodo} onChange={setUsarPeriodo} />
            {usarPeriodo && (
              <Select value={String(periodo)} onChange={v=>setPeriodo(Number(v))}
                options={MESES.map((m,i)=>({ value:String(i), label:m }))} />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Recalcular N cuentas seleccionadas (contextual, desde la tabla) ──────────
function ModalRecalcularSeleccionadas({ cantidad, onClose, onAplicar }: {
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
                      <input type="number" value={pct} onChange={e=>setPct(e.target.value)}
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

// ── Proyectar presupuesto ─────────────────────────────────────────────────────
// Nota de alcance: esta maqueta trabaja con un único año de datos en memoria
// (no hay un almacén multi-ejercicio real), así que "Proyectar" aplica la
// fórmula elegida directamente sobre las filas visibles en vez de crear un
// ejercicio 2027 aparte. El selector Año base/destino queda funcional en la
// UI y se refleja en el mensaje de confirmación, pero no persiste un segundo
// año de datos independiente.
const ANIOS_PROYECCION = ['2024','2025','2026','2027','2028'];
interface ProyectarParams {
  accion: 'cero'|'copiar'|'aumentar'|'disminuir'; pct:number;
  rango?: { inicial:string; final:string }; tipoCuenta?: string;
  anioBase:string; anioDestino:string;
  rangoPeriodo?: { desde:number; hasta:number };
}
function ModalProyectar({ ejercicioActual, cuentaOpciones, onClose, onAplicar }: {
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
                      <input type="number" value={pct} onChange={e=>setPct(e.target.value)}
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
              <Select value={tipoCuenta} onChange={setTipoCuenta}
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
            <Select value={String(desde)} onChange={v=>setDesde(Number(v))} options={MESES.map((m,i)=>({ value:String(i),label:m }))} />
            <span style={{ color:C.n700 }}>→</span>
            <Select value={String(hasta)} onChange={v=>setHasta(Number(v))} options={MESES.map((m,i)=>({ value:String(i),label:m }))} />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Exportar presupuesto ──────────────────────────────────────────────────────
const NIVELES_DETALLE = ['Mayor','Submayor','Detalle','Auxiliar','Todo'] as const;
type NivelDetalle = typeof NIVELES_DETALLE[number];
type Comparativo = 'solo'|'vs_real'|'vs_anterior';
const MESES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ModalExportar({ rows, todasLasCuentas, ejercicio, centrosCosto, onClose }: {
  rows:PresRow[]; todasLasCuentas:PresRow[]; ejercicio:string; centrosCosto:CentroCosto[]; onClose:()=>void;
}) {
  const cuentaOpciones = todasLasCuentas.map(r=>({ value:r.cuenta, label:`${r.cuenta} - ${r.descripcion}` }));
  const centroOpciones = centrosCosto.map(c=>({ value:c.codigo, label:`${c.codigo} - ${c.descripcion}` }));
  const periodos = MESES.map(m => `${m} ${ejercicio}`);
  const [desde, setDesde] = useState(0);
  const [hasta, setHasta] = useState(11);
  const [nivel, setNivel] = useState<NivelDetalle>('Mayor');
  const [comparativo, setComparativo] = useState<Comparativo>('solo');
  const [usarRango, setUsarRango] = useState(false);
  const [rIni, setRIni] = useState(''); const [rFin, setRFin] = useState('');
  const [usarCentro, setUsarCentro] = useState(false);
  const [cIni, setCIni] = useState(''); const [cFin, setCFin] = useState('');
  const [usarTipo, setUsarTipo] = useState(true);
  const [tipoCuenta, setTipoCuenta] = useState(TIPOS_DE_CUENTA.find(t=>t.tipo==='costos')?.codigo ?? TIPOS_DE_CUENTA[0]?.codigo ?? '');
  const [titulosIngles, setTitulosIngles] = useState(false);

  function filasAExportar() {
    return rows.filter(r => {
      if (usarRango && rIni && rFin && (r.cuenta < soloCodigo(rIni) || r.cuenta > soloCodigo(rFin))) return false;
      if (usarCentro && cIni && cFin && (r.cg < soloCodigo(cIni) || r.cg > soloCodigo(cFin))) return false;
      if (usarTipo && r.tipoCuentaCodigo !== tipoCuenta) return false;
      return true;
    });
  }

  function descargarExcel() {
    const filas = filasAExportar();
    const mesesLabel = titulosIngles ? MESES_EN : MESES;
    const headers = [
      titulosIngles?'Account':'Cuenta', titulosIngles?'Cost center':'Centro', titulosIngles?'Description':'Descripción',
      ...mesesLabel.slice(desde, hasta+1),
    ];
    if (comparativo === 'vs_real') headers.push(...mesesLabel.slice(desde,hasta+1).map(m=>`${m} (${titulosIngles?'Actual':'Real'})`));
    if (comparativo === 'vs_anterior') headers.push(...mesesLabel.slice(desde,hasta+1).map(m=>`${m} (${titulosIngles?'Prior year':'Año anterior'})`));
    const lines = [headers.map(h=>`"${h}"`).join(',')];
    filas.forEach(r => {
      const vals = r.valores.slice(desde, hasta+1);
      const row = [r.cuenta, r.cg, r.descripcion, ...vals.map(v=>v.toFixed(2))];
      // Comparativo vs real / vs año anterior: valores ilustrativos (no hay
      // datos de ejecución real ni de un ejercicio anterior en esta maqueta).
      if (comparativo === 'vs_real') row.push(...vals.map(v=>(v*0.92).toFixed(2)));
      if (comparativo === 'vs_anterior') row.push(...vals.map(v=>(v*0.88).toFixed(2)));
      lines.push(row.map(v=>`"${v}"`).join(','));
    });
    const blob = new Blob(['\ufeff'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `presupuesto-${ejercicio}-${nivel.toLowerCase()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const filas = filasAExportar();

  return (
    <Modal open title="Exportar presupuesto" onClose={onClose}
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="secondary" icon={<IcExport className="w-3.5 h-3.5" />} onClick={descargarExcel}>Excel</Button>
        <Button variant="secondary" onClick={()=>window.print()}>PDF</Button>
        <Button icon={<IcImport className="w-3.5 h-3.5" />} onClick={()=>window.print()}>Imprimir</Button>
      </div>}>
      <style>{`@media print {
        body * { visibility:hidden; }
        #export-print-area-presupuesto, #export-print-area-presupuesto * { visibility:visible; }
        #export-print-area-presupuesto { position:absolute; left:0; top:0; width:100%; padding:24px; }
      }`}</style>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:8 }}>Período</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <FormField label="Desde"><Select value={String(desde)} onChange={v=>setDesde(Number(v))} options={periodos.map((p,i)=>({ value:String(i), label:p }))} /></FormField>
            <FormField label="Hasta"><Select value={String(hasta)} onChange={v=>setHasta(Number(v))} options={periodos.map((p,i)=>({ value:String(i), label:p }))} /></FormField>
          </div>
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:8 }}>Nivel de detalle</p>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {NIVELES_DETALLE.map(n => (
              <button key={n} type="button" onClick={()=>setNivel(n)}
                style={{ height:30, padding:'0 12px', borderRadius:radius.sm, border:`1px solid ${nivel===n?C.brand:C.n500}`,
                  background:nivel===n?C.brand:'#fff', color:nivel===n?'#fff':C.n900, fontSize:12, fontWeight:nivel===n?600:400,
                  fontFamily:F, cursor:'pointer' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:8 }}>Comparativo</p>
          {([
            ['solo','Solo presupuesto','Muestra únicamente los valores presupuestados por mes'],
            ['vs_real','Presupuesto vs real','Compara lo presupuestado con lo ejecutado en el mismo período'],
            ['vs_anterior','Presupuesto vs año anterior',`Compara con el presupuesto del ejercicio anterior (${Number(ejercicio)-1})`],
          ] as const).map(([val,label,hint])=>(
            <div key={val} style={{ marginBottom:8 }}>
              <Radio checked={comparativo===val} onChange={()=>setComparativo(val)} label={
                <div>
                  <span style={{ fontSize:13 }}>{label}</span>
                  <p style={{ fontSize:11,color:C.n700,margin:'2px 0 0' }}>{hint}</p>
                </div>
              }/>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:8 }}>Filtros</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Checkbox label="Rango de cuenta" checked={usarRango} onChange={setUsarRango} />
            {usarRango && <RangoInput inicial={rIni} final={rFin} onInicial={setRIni} onFinal={setRFin} opciones={cuentaOpciones} tituloBuscador="Buscar cuenta" />}
            <Checkbox label="Centro de costos" checked={usarCentro} onChange={setUsarCentro} />
            {usarCentro && <RangoInput inicial={cIni} final={cFin} onInicial={setCIni} onFinal={setCFin} opciones={centroOpciones} tituloBuscador="Buscar centro de costos" />}
            <Checkbox label="Tipo de cuenta" checked={usarTipo} onChange={setUsarTipo} />
            {usarTipo && (
              <Select value={tipoCuenta} onChange={setTipoCuenta}
                options={TIPOS_DE_CUENTA.map(t=>({ value:t.codigo, label:`${t.codigo} - ${t.nombre}` }))} />
            )}
            <Checkbox label="Mostrar títulos en inglés" checked={titulosIngles} onChange={setTitulosIngles} />
          </div>
        </div>
      </div>

      {/* Área que efectivamente se imprime con PDF/Imprimir */}
      <div id="export-print-area-presupuesto" style={{ display:'none' }}>
        <p style={{ fontSize:16, fontWeight:700 }}>Hotel Fortuna S.A.</p>
        <p style={{ fontSize:12, color:'#555' }}>Presupuesto {ejercicio} · Nivel: {nivel} · {periodos[desde]} a {periodos[hasta]}</p>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, marginTop:12 }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', borderBottom:'1px solid #999', padding:4 }}>{titulosIngles?'Description':'Descripción'}</th>
              {MESES.slice(desde,hasta+1).map(m=><th key={m} style={{ textAlign:'right', borderBottom:'1px solid #999', padding:4 }}>{titulosIngles?MESES_EN[MESES.indexOf(m)]:m}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map(r=>(
              <tr key={r.id}>
                <td style={{ padding:4 }}>{r.descripcion}</td>
                {r.valores.slice(desde,hasta+1).map((v,i)=><td key={i} style={{ padding:4, textAlign:'right' }}>{fmtCelda(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function PresupuestoPage() {
  const { centrosCosto } = useCentrosCostoConfig();
  const [ejerciciosList, setEjerciciosList] = useState<EjercicioPresupuesto[]>(EJERCICIOS_PRESUPUESTO);
  const [data, setData] = useState<Record<string, PresRow[]>>(() => ({
    '2026': cloneRows(INIT_ROWS), '2025': cloneRows(INIT_ROWS), '2024': cloneRows(INIT_ROWS),
  }));
  const [savedData, setSavedData] = useState<Record<string, PresRow[]>>(() => ({
    '2026': cloneRows(INIT_ROWS), '2025': cloneRows(INIT_ROWS), '2024': cloneRows(INIT_ROWS),
  }));
  const [ejercicio, setEjercicio] = useState('2026');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [tiposPL, setTiposPL] = useState<Set<TipoPL>>(new Set(['costos','gastos','ingresos']));
  const [tiposCuenta, setTiposCuenta] = useState<Set<string>>(new Set(TIPOS_DE_CUENTA_DEFAULT));
  const [centros, setCentros] = useState<Set<string>>(new Set()); // vacío = todos
  const [showImportar, setImportar] = useState(false);
  const [showExportar, setExportar] = useState(false);
  const [showRecalcGlobal, setRecalcGlobal] = useState(false);
  const [showRecalcSel, setRecalcSel] = useState(false);
  const [showProyectar, setProyectar] = useState(false);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);
  const [confirmDescartar, setConfirmDescartar] = useState(false);

  // Sincroniza el scroll vertical entre la tabla de columnas fijas y la de
  // meses (son dos tablas separadas, cada una con su propio scroll).
  const fixedScrollRef = useRef<HTMLDivElement>(null);
  const mesesScrollRef = useRef<HTMLDivElement>(null);
  function onScrollFixed(e: React.UIEvent<HTMLDivElement>) {
    if (mesesScrollRef.current && mesesScrollRef.current.scrollTop !== e.currentTarget.scrollTop) {
      mesesScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }
  function onScrollMeses(e: React.UIEvent<HTMLDivElement>) {
    if (fixedScrollRef.current && fixedScrollRef.current.scrollTop !== e.currentTarget.scrollTop) {
      fixedScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const ejercicioObj = ejerciciosList.find(e=>e.value===ejercicio);
  const isClosed = ejercicioObj?.cerrado ?? false;
  const rows = data[ejercicio] ?? [];
  const savedRows = savedData[ejercicio] ?? [];

  // Al cambiar de ejercicio, la selección y la página quedan referidas al set
  // de filas anterior - se limpian para evitar estados confusos.
  useCambio(ejercicio, () => { setSelected(new Set()); setPage(1); });

  function updateRows(fn: (rows: PresRow[]) => PresRow[]) {
    setData(prev => ({ ...prev, [ejercicio]: fn(prev[ejercicio] ?? []) }));
  }

  const filtered = rows.filter(r => {
    if (search && !r.descripcion.toLowerCase().includes(search.toLowerCase()) && !r.cuenta.includes(search)) return false;
    if (!tiposCuenta.has(r.tipoCuentaCodigo)) return false;
    if (centros.size > 0 && !centros.has(r.centroCostoId)) return false;
    if (!tiposPL.has(r.tipo)) return false;
    return true;
  });
  // Opciones para los buscadores de rango (lupa) - sobre TODAS las cuentas del
  // ejercicio actual, sin importar los filtros activos en la tabla.
  const cuentaOpciones = rows.map(r=>({ value:r.cuenta, label:`${r.cuenta} - ${r.descripcion}` }));
  const centroOpciones = centrosCosto.map(c=>({ value:c.codigo, label:`${c.codigo} - ${c.descripcion}` }));
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);
  const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

  // Aviso del navegador si se intenta cerrar/recargar la pestaña con cambios
  // sin guardar en el ejercicio actual.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) { e.preventDefault(); e.returnValue = ''; }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function notify(message:string, type:'success'|'error'='success') { setToast({ message, type }); }

  function toggleRow(id:string) { if (isClosed) return; setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleAll() { if (isClosed) return; setSelected(s => s.size===filtered.length && filtered.length>0 ? new Set() : new Set(filtered.map(r=>r.id))); }

  function updateValor(rowId:string, mesIdx:number, val:string) {
    if (isClosed) return;
    updateRows(rs => rs.map(r => r.id===rowId ? { ...r, valores:r.valores.map((v,i)=>i===mesIdx?(Number(val)||0):v) } : r));
  }

  function copiarEnero() {
    const filasSel = rows.filter(r=>selected.has(r.id));
    updateRows(rs => rs.map(r => selected.has(r.id) ? { ...r, valores:r.valores.map(()=>r.valores[0]) } : r));
    if (filasSel.length === 1) {
      notify(`Enero (${simboloLocal()}${fmtNum(filasSel[0].valores[0])}) copiado a los 11 meses restantes`);
    } else {
      notify(`Enero copiado a los 11 meses restantes en ${filasSel.length} cuentas`);
    }
  }

  function limpiarSeleccionadas() {
    updateRows(rs => rs.map(r => selected.has(r.id) ? { ...r, valores:r.valores.map(()=>0) } : r));
    notify('Valores eliminados de las cuentas seleccionadas.');
  }

  function aplicarPct(valor:number, accion:'cero'|'aumentar'|'disminuir', pct:number) {
    if (accion==='cero') return 0;
    if (accion==='aumentar') return valor * (1 + pct/100);
    return valor * (1 - pct/100);
  }

  function recalcularGlobal(p: RecalcParams) {
    let afectadas = 0;
    updateRows(prev => prev.map(r => {
      if (p.rango && p.rango.inicial && p.rango.final && (r.cuenta < soloCodigo(p.rango.inicial) || r.cuenta > soloCodigo(p.rango.final))) return r;
      if (p.centro && p.centro.inicial && p.centro.final && (r.cg < soloCodigo(p.centro.inicial) || r.cg > soloCodigo(p.centro.final))) return r;
      if (p.tipoCuenta && r.tipoCuentaCodigo !== p.tipoCuenta) return r;
      afectadas++;
      const nuevosValores = r.valores.map((v,i) => (p.soloPeriodo===undefined || p.soloPeriodo===i) ? Math.round(aplicarPct(v,p.accion,p.pct)) : v);
      return { ...r, valores:nuevosValores };
    }));
    notify(`Recálculo aplicado a ${afectadas} cuenta${afectadas!==1?'s':''}.`);
  }

  function recalcularSeleccionadas(accion:'cero'|'aumentar'|'disminuir', pct:number) {
    updateRows(prev => prev.map(r => selected.has(r.id) ? { ...r, valores:r.valores.map(v=>Math.round(aplicarPct(v,accion,pct))) } : r));
    notify(`Recálculo aplicado a ${selected.size} cuenta${selected.size!==1?'s':''}.`);
  }

  // Proyectar SÍ escribe en el año destino (no en el ejercicio que se está
  // viendo): lee la base de `data[anioBase]` y guarda el resultado en
  // `data[anioDestino]`, creando ese ejercicio en el selector si hace falta.
  function proyectar(p: ProyectarParams) {
    const destinoObj = ejerciciosList.find(e=>e.value===p.anioDestino);
    if (destinoObj?.cerrado) {
      notify(`El ejercicio ${p.anioDestino} está cerrado - no se puede proyectar sobre él.`, 'error');
      return;
    }
    const base = data[p.anioBase] ?? [];
    let afectadas = 0;
    const nuevasFilas = base.map(r => {
      if (p.rango && p.rango.inicial && p.rango.final && (r.cuenta < soloCodigo(p.rango.inicial) || r.cuenta > soloCodigo(p.rango.final))) return r;
      if (p.tipoCuenta && r.tipoCuentaCodigo !== p.tipoCuenta) return r;
      afectadas++;
      const nuevosValores = r.valores.map((v,i) => {
        if (p.rangoPeriodo && (i < p.rangoPeriodo.desde || i > p.rangoPeriodo.hasta)) return v;
        if (p.accion === 'copiar') return v;
        return Math.round(aplicarPct(v, p.accion, p.pct));
      });
      return { ...r, valores:nuevosValores };
    });
    setData(prev => ({ ...prev, [p.anioDestino]: nuevasFilas }));
    if (!destinoObj) {
      setEjerciciosList(prev => [...prev, { value:p.anioDestino, cerrado:false }].sort((a,b)=>b.value.localeCompare(a.value)));
    }
    const mismoEjercicio = p.anioDestino === ejercicio ? ' Guardá los cambios para persistirlo.' : ` Cambiá "Ejercicio" a ${p.anioDestino} para revisarlo y guardarlo.`;
    notify(`Presupuesto proyectado de ${p.anioBase} a ${p.anioDestino} en ${afectadas} cuenta${afectadas!==1?'s':''}.${mismoEjercicio}`);
  }

  function guardarCambios() { setSavedData(prev => ({ ...prev, [ejercicio]: rows })); notify('Cambios guardados.'); }
  function descartarCambios() { setData(prev => ({ ...prev, [ejercicio]: savedRows })); notify('Cambios descartados.'); }

  const hayFiltrosActivos = !!search || centros.size>0 || tiposCuenta.size!==TIPOS_DE_CUENTA_DEFAULT.size || tiposPL.size!==3;
  function limpiarFiltros() {
    setSearch(''); setCentros(new Set()); setTiposCuenta(new Set(TIPOS_DE_CUENTA_DEFAULT)); setTiposPL(new Set(['costos','gastos','ingresos']));
  }

  return (
    <div style={{ height:'100%',display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <PageHeader title="Presupuesto">
        <Button variant="secondary" onClick={()=>setImportar(true)} disabled={isClosed} icon={<IcImport className="w-3.5 h-3.5" />}>Importar</Button>
        <Button variant="secondary" onClick={()=>setExportar(true)} icon={<IcExport className="w-3.5 h-3.5" />}>Exportar</Button>
        <Button variant="secondary" onClick={()=>setRecalcGlobal(true)} disabled={isClosed}>Recalcular presupuesto</Button>
        <Button variant="secondary" onClick={()=>setProyectar(true)} disabled={isClosed}>Proyectar presupuesto</Button>
        {dirty && !isClosed && (
          <>
            <Button variant="secondary" onClick={()=>setConfirmDescartar(true)}>Cancelar</Button>
            <Button icon={<IcCheck className="w-3 h-3" />} onClick={guardarCambios}>Guardar cambios</Button>
          </>
        )}
      </PageHeader>

      {/* Barra de filtros */}
      <div style={{ padding:'8px 24px',background:C.n000,borderBottom:`1px solid ${C.n500}`,display:'flex',gap:10,alignItems:'center',flexShrink:0,flexWrap:'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por descripción…" width={200} />
        <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
          <span style={{ fontSize:12,color:C.n700 }}>Ejercicio</span>
          <Select value={ejercicio} onChange={setEjercicio}
            options={[...ejerciciosList].sort((a,b)=>b.value.localeCompare(a.value)).map(e=>({ value:e.value, label:e.value + (e.cerrado?' (cerrado)':'') }))} />
        </div>
        <FiltroMultiSelect label="Tipo de cuenta"
          items={TIPOS_DE_CUENTA.map(t=>({ id:t.codigo, label:`${t.codigo} - ${t.nombre}`, count:t.cuentas }))}
          selected={tiposCuenta} onApply={setTiposCuenta} />
        <FiltroMultiSelect label="Centro de costos"
          items={centrosCosto.map(c=>({ id:c.id, label:`${c.codigo} - ${c.descripcion}` }))}
          selected={centros} onApply={setCentros} />
        <TipoToggle value={tiposPL} onChange={setTiposPL} />
        {hayFiltrosActivos && (
          <button onClick={limpiarFiltros}
            style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F, flexShrink:0 }}>
            × Limpiar filtros
          </button>
        )}
      </div>

      {/* Banner ejercicio cerrado */}
      {isClosed && (
        <div style={{ padding:'8px 24px',background:'rgba(33,150,243,.06)',borderBottom:'1px solid rgba(33,150,243,.2)',display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
          <span style={{ color:'#1565c0',display:'flex' }}><IcInfo className="w-3.5 h-3.5" /></span>
          <span style={{ fontSize:12,color:'#1565c0' }}>El ejercicio {ejercicio} está cerrado. Podés ver los datos pero no editarlos.</span>
        </div>
      )}

      {/* Barra de selección - componente compartido BulkActionBar */}
      {selected.size > 0 && !isClosed && (
        <BulkActionBar count={selected.size} onClose={()=>setSelected(new Set())} actions={[
          { label:'Copiar enero a todos los meses', icon:<IcCopy className="w-3.5 h-3.5" />, onClick:copiarEnero },
          { label:'Recalcular seleccionadas', icon:<IcCalendar className="w-3.5 h-3.5" />, onClick:()=>setRecalcSel(true) },
          { label:'Limpiar seleccionadas', icon:<IcTrash className="w-3.5 h-3.5" />, variant:'danger', onClick:limpiarSeleccionadas },
        ]}/>
      )}

      {/* Tabla - Cuenta/Centro/Descripción van en una tabla fija aparte (no con
          "sticky", que en tablas HTML tiene bugs conocidos de renderizado) y
          los 12 meses en otra con su propio scroll horizontal. Ambas comparten
          el mismo scroll vertical mediante los refs de abajo. */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#fff', padding:'0 24px', gap:0 }}>
        {/* Columnas fijas */}
        <div ref={fixedScrollRef} onScroll={onScrollFixed} style={{ flexShrink:0, overflowY:'auto', overflowX:'hidden', borderRight:`1px solid ${C.n500}`, background:'#fff' }}>
          <table style={{ borderCollapse:'separate', borderSpacing:0, fontSize:12, fontFamily:F, background:'#fff' }}>
            <thead>
              <tr>
                <th style={{ position:'sticky', top:0, zIndex:1, padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,width:30,background:C.n200 }}>
                  <input type="checkbox" checked={selected.size===filtered.length && filtered.length>0} onChange={toggleAll} disabled={isClosed} style={{ accentColor:C.brand }} />
                </th>
                <th style={{ position:'sticky', top:0, zIndex:1, padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,width:130,whiteSpace:'nowrap',background:C.n200 }}>Cuenta</th>
                <th title="Centro de costos asociado a la cuenta" style={{ position:'sticky', top:0, zIndex:1, padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,width:90,whiteSpace:'nowrap',background:C.n200,cursor:'help' }}>Centro</th>
                <th style={{ position:'sticky', top:0, zIndex:1, padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,width:220,background:C.n200 }}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(r => {
                const filaBg = selected.has(r.id) ? C.brandBg : '#fff';
                return (
                  <tr key={r.id} style={{ borderBottom:`1px solid ${C.n500}`, height:39 }}>
                    <td style={{ padding:'6px 10px', background:filaBg, width:30 }}><input type="checkbox" checked={selected.has(r.id)} onChange={()=>toggleRow(r.id)} disabled={isClosed} style={{ accentColor:C.brand }} /></td>
                    <td style={{ padding:'6px 10px',color:C.n900,fontWeight:500,whiteSpace:'nowrap', background:filaBg, width:130 }}>{r.cuenta}</td>
                    <td style={{ padding:'6px 10px',color:C.n700,whiteSpace:'nowrap', background:filaBg, width:90 }} title={labelCentro(centrosCosto, r.centroCostoId)}>{r.cg}</td>
                    <td style={{ padding:'6px 10px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap', background:filaBg, width:220 }} title={r.descripcion}>{r.descripcion}</td>
                  </tr>
                );
              })}
              {paginated.length===0 && <tr><td style={{ height:1 }}></td></tr>}
            </tbody>
          </table>
        </div>

        {/* Meses - con su propio scroll horizontal */}
        <div ref={mesesScrollRef} onScroll={onScrollMeses} style={{ flex:1, overflow:'auto', background:'#fff' }}>
          <table style={{ borderCollapse:'separate', borderSpacing:0, fontSize:12, fontFamily:F, minWidth:'max-content', width:'100%', background:'#fff' }}>
            <thead>
              <tr>
                {MESES.map((m,i) => <th key={i} style={{ position:'sticky', top:0, zIndex:1, padding:'8px 10px',textAlign:'right',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,minWidth:130,background:C.n200 }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {paginated.length===0 && (
                <tr><td colSpan={12} style={{ padding:32, textAlign:'center', color:C.n700, fontSize:12 }}>Sin cuentas para los filtros seleccionados.</td></tr>
              )}
              {paginated.map(r => {
                const filaBg = selected.has(r.id) ? C.brandBg : '#fff';
                return (
                  <tr key={r.id} style={{ borderBottom:`1px solid ${C.n500}`, height:39 }}>
                    {r.valores.map((v,i) => (
                      <td key={i} style={{ padding:'4px 6px',textAlign:'right', background:filaBg }}>
                        {isClosed
                          ? <span style={{ color:v<0?C.error:C.n900 }}>{fmtCelda(v)}</span>
                          : <CeldaMonto value={v} onChange={val=>updateValor(r.id,i,String(val))} />
                        }
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer - solo paginación, completo a lo ancho */}
      <div style={{ background:C.n000,borderTop:`1px solid ${C.n500}`,display:'flex',alignItems:'center',padding:'8px 24px',gap:16,flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
        <span style={{ fontSize:12, color:C.n700, flexShrink:0 }}>{filtered.length} cuenta{filtered.length!==1?'s':''}</span>
      </div>

      {confirmDescartar && (
        <Modal open title="Descartar cambios" onClose={()=>setConfirmDescartar(false)}
          footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
            <Button variant="secondary" onClick={()=>setConfirmDescartar(false)}>Cancelar</Button>
            <Button icon={<IcTrash className="w-3 h-3" />} onClick={()=>{ descartarCambios(); setConfirmDescartar(false); }}>Sí, descartar</Button>
          </div>}>
          <p style={{ fontSize:13, color:C.n900, margin:0 }}>
            Se van a perder los cambios sin guardar en el ejercicio {ejercicio}. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}

      {showImportar && <ModalImportar onClose={()=>setImportar(false)} onImportar={()=>notify('Presupuesto importado correctamente.')} />}
      {showExportar && <ModalExportar rows={filtered} todasLasCuentas={rows} ejercicio={ejercicio} centrosCosto={centrosCosto} onClose={()=>setExportar(false)} />}
      {showRecalcGlobal && <ModalRecalcularGlobal cuentaOpciones={cuentaOpciones} centroOpciones={centroOpciones} onClose={()=>setRecalcGlobal(false)} onAplicar={recalcularGlobal} />}
      {showRecalcSel && <ModalRecalcularSeleccionadas cantidad={selected.size} onClose={()=>setRecalcSel(false)} onAplicar={recalcularSeleccionadas} />}
      {showProyectar && <ModalProyectar ejercicioActual={ejercicio} cuentaOpciones={cuentaOpciones} onClose={()=>setProyectar(false)} onAplicar={proyectar} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}
