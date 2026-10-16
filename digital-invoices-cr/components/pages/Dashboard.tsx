'use client';
import React, { useEffect, useRef, useState, useSyncExternalStore, type DependencyList } from 'react';
import { fmtNum, MoneyCell, FONT, C, radius, PageHeader, TabBar, USUARIO_ACTUAL } from '../ui/primitives';
import { TARJETAS_DASHBOARD, NOMBRE_GRUPO, type GrupoTarjeta } from '@/data/tarjetasDashboard';
import { USUARIOS_INIT } from './config/permissionsData';
import { flattenAll } from './catalogo/catalogoData';
import { useCatalogo } from './catalogo/catalogoStore';
import DashboardFacturacion from './DashboardFacturacion';
import AvisoEmitidasSolas from './AvisoEmitidasSolas';
import RecurrentesDashboard from './RecurrentesDashboard';
import CreditosReciboDashboard from './CreditosReciboDashboard';
import { useModulos } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';
import ChecklistFE from './facturacion/ChecklistFE';
import { Chart, type ChartEvent, type ActiveElement, type TooltipModel, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, BarController } from 'chart.js';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, BarController);

// Montserrat global para todos los charts
Chart.defaults.font.family = "'Montserrat', sans-serif";
Chart.defaults.font.size = 11;

const BRAND = '#A77600';
const F = FONT;

// Tooltip HTML externo para los donuts chicos (88x88px). El tooltip nativo de
// Chart.js se dibuja DENTRO del canvas, así que en un donut tan chico
// cualquier tooltip más ancho que el canvas se corta contra su borde. Con
// esto el tooltip es un <div> aparte, posicionado encima del canvas pero sin
// límite de tamaño, así nunca se corta.
function externalDonutTooltip(wrapperId: string) {
  return (context: { tooltip: TooltipModel<'doughnut'> }) => {
    const { tooltip } = context;
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    let el = wrapper.querySelector<HTMLDivElement>('.donut-tooltip');
    if (!el) {
      el = document.createElement('div');
      el.className = 'donut-tooltip';
      Object.assign(el.style, {
        position:'absolute', pointerEvents:'none', zIndex:'50', transition:'opacity .08s ease',
        background:'#1A1A1A', color:'#fff', padding:'7px 11px', borderRadius:'6px', fontSize:'11px',
        fontFamily:"'Montserrat', sans-serif", whiteSpace:'nowrap', boxShadow:'0 4px 14px rgba(0,0,0,.28)',
        transform:'translate(-50%, -115%)',
      } as CSSStyleDeclaration);
      wrapper.appendChild(el);
    }
    if (tooltip.opacity === 0) { el.style.opacity = '0'; return; }
    const dp = tooltip.dataPoints?.[0];
    if (dp) {
      const color = tooltip.labelColors?.[0]?.backgroundColor ?? BRAND;
      el.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:2px;background:${color};display:inline-block;flex-shrink:0;"></span>
        <span>${dp.label}: <strong>${dp.raw}</strong></span>
      </span>`;
    }
    el.style.opacity = '1';
    el.style.left = tooltip.caretX + 'px';
    el.style.top = tooltip.caretY + 'px';
  };
}

function useChartJS(cb: () => void, deps: DependencyList = []) {
  useEffect(() => {
    cb();
  }, deps); // eslint-disable-line
}

// ── Calendar helpers ──────────────────────────────────────────────────────────
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['D','L','M','X','J','V','S'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// preset → {from, to} in ISO
function presetRange(label: string): { from: string; to: string } {
  const today = new Date();
  const iso = isoDate(today);
  function sub(days: number) {
    const d = new Date(today); d.setDate(d.getDate() - days); return isoDate(d);
  }
  function startOf(unit: 'week' | 'month' | 'year') {
    const d = new Date(today);
    if (unit === 'week') d.setDate(d.getDate() - d.getDay());
    else if (unit === 'month') d.setDate(1);
    else { d.setMonth(0); d.setDate(1); }
    return isoDate(d);
  }
  switch (label) {
    case 'Día actual':      return { from: iso, to: iso };
    case 'Últimos 7 días':  return { from: sub(6), to: iso };
    case 'Últimos 28 días': return { from: sub(27), to: iso };
    case 'Últimos 90 días': return { from: sub(89), to: iso };
    case 'Esta semana':     return { from: startOf('week'), to: iso };
    case 'Este mes':        return { from: startOf('month'), to: iso };
    case 'Este año':        return { from: startOf('year'), to: iso };
    default:                return { from: iso, to: iso };
  }
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────
function MiniCalendar({
  year, month, from, to, hovered,
  onDayClick, onDayHover,
}: {
  year: number; month: number;
  from: string | null; to: string | null; hovered: string | null;
  onDayClick: (iso: string) => void; onDayHover: (iso: string | null) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const rangeEnd    = to || hovered;

  function isoOf(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  function inRange(iso: string) {
    if (!from || !rangeEnd) return false;
    const [a, b] = from <= rangeEnd ? [from, rangeEnd] : [rangeEnd, from];
    return iso >= a && iso <= b;
  }
  function isEndpoint(iso: string) { return iso === from || iso === to; }
  function isStart(iso: string)    { return iso === from; }
  function isEnd(iso: string)      { return iso === to; }

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ width: 240 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0, marginBottom: 6 }}>
        {DAYS_ES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', fontFamily: F, padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const iso = isoOf(day);
          const endpoint = isEndpoint(iso);
          const inR = !endpoint && inRange(iso);
          const start = isStart(iso);
          const end   = isEnd(iso);

          return (
            <div key={iso} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
              background: inR && !endpoint ? '#FFF8EC' : 'transparent',
              borderRadius: start ? '50% 0 0 50%' : end ? '0 50% 50% 0' : inR ? '0' : undefined,
            }}>
              <button
                onClick={() => onDayClick(iso)}
                onMouseEnter={() => onDayHover(iso)}
                onMouseLeave={() => onDayHover(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: endpoint ? '' : 'transparent',
                  color: endpoint ? '#fff' : inR ? '' : '#0F0F0F',
                  fontSize: 12, fontFamily: F, fontWeight: endpoint ? 600 : 400,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DateFilterModal - based on reference screenshot ───────────────────────────
function DateFilterModal({ onClose, onApply }: { onClose: () => void; onApply: (label: string) => void }) {
  const today = new Date();
  const [sel,     setSel]     = useState('Día actual');
  const [from,    setFrom]    = useState<string|null>(null);
  const [to,      setTo]      = useState<string|null>(null);
  const [hovered, setHovered] = useState<string|null>(null);
  const [leftY,   setLeftY]   = useState(today.getFullYear());
  const [leftM,   setLeftM]   = useState(today.getMonth());

  const rightYear  = leftM === 11 ? leftY + 1 : leftY;
  const rightMonth = leftM === 11 ? 0 : leftM + 1;

  function navLeft(delta: number) {
    const next = addMonths(leftY, leftM, delta);
    setLeftY(next.year); setLeftM(next.month);
  }

  function handlePreset(label: string) {
    setSel(label);
    if (label !== 'Personalizado') {
      const r = presetRange(label);
      setFrom(r.from); setTo(r.to);
    }
  }

  function handleDayClick(iso: string) {
    setSel('Personalizado');
    if (!from || (from && to)) {
      // start new range
      setFrom(iso); setTo(null);
    } else {
      // set end - ensure from <= to
      if (iso < from) { setTo(from); setFrom(iso); }
      else             { setTo(iso); }
    }
  }

  // Format date for display input
  function fmtDisplay(iso: string | null) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  const presets = ['Día actual','Últimos 7 días','Últimos 28 días','Últimos 90 días','Esta semana','Este mes','Este año','Personalizado'];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:radius.lg, overflow:'hidden', maxWidth:740, width:'95%', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)', display:'flex', flexDirection:'column' }}>
        {/* Top bar */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #ECECEC', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ height:32, padding:'0 14px', border:'1px solid #CBD5E1', borderRadius:radius.sm, display:'flex', alignItems:'center', gap:6, background:'#fff', fontSize:12, fontFamily:F }}>
            <span style={{ color:'#475569' }}>Período:</span>
            <strong style={{ color:'#0F0F0F' }}>{sel}</strong>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#475569"><path d="M11.62 5.22L7.82 9.02C7.37 9.47 6.63 9.47 6.18 9.02L2.38 5.22" strokeLinecap="round"/></svg>
          </div>
        </div>

        {/* Body */}
        <div style={{ display:'flex' }}>
          {/* Left: presets */}
          <div style={{ width:170, borderRight:'1px solid #ECECEC', padding:'12px 0', display:'flex', flexDirection:'column', gap:2 }}>
            {presets.map(p => (
              <button key={p} onClick={() => handlePreset(p)}
                style={{ textAlign:'left', padding:'9px 18px', fontSize:12, fontFamily:F, border:'none', cursor:'pointer',
                  background: sel===p ? '#FFF8EC' : 'transparent',
                  color: sel===p ? '#A77600' : '#0F0F0F',
                  fontWeight: sel===p ? 600 : 400,
                }}>
                {p}
              </button>
            ))}
          </div>

          {/* Right: calendars */}
          <div style={{ flex:1, padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
            {/* Hint */}
            <div style={{ padding:'8px 14px', background:'#FFF8EC', borderRadius:radius.sm, border:'1px solid #EED89A' }}>
              <span style={{ fontSize:12, color:'', fontFamily:F }}>Para seleccionar una única fecha haz doble clic en la fecha deseada.</span>
            </div>

            {/* Dual calendars */}
            <div style={{ display:'flex', gap:0 }}>
              {/* Left calendar */}
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <button onClick={()=>navLeft(-1)} style={{ width:28, height:28, borderRadius:radius.sm, border:'1px solid #ECECEC', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#475569" strokeWidth="1.5"><path d="M9 2L4 7l5 5" strokeLinecap="round"/></svg>
                  </button>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', fontFamily:F }}>{MONTHS_ES[leftM]} {leftY}</span>
                  <div style={{ width:28 }}/>
                </div>
                <MiniCalendar year={leftY} month={leftM} from={from} to={to} hovered={hovered}
                  onDayClick={handleDayClick} onDayHover={setHovered}/>
              </div>

              {/* Divider */}
              <div style={{ width:1, background:'#ECECEC', margin:'0 16px' }}/>

              {/* Right calendar */}
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ width:28 }}/>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', fontFamily:F }}>{MONTHS_ES[rightMonth]} {rightYear}</span>
                  <button onClick={()=>navLeft(1)} style={{ width:28, height:28, borderRadius:radius.sm, border:'1px solid #ECECEC', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#475569" strokeWidth="1.5"><path d="M5 2l5 5-5 5" strokeLinecap="round"/></svg>
                  </button>
                </div>
                <MiniCalendar year={rightYear} month={rightMonth} from={from} to={to} hovered={hovered}
                  onDayClick={handleDayClick} onDayHover={setHovered}/>
              </div>
            </div>

            {/* Date inputs */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <input
                value={fmtDisplay(from)}
                readOnly
                placeholder="00/00/0000"
                style={{ height:32, width:120, padding:'0 10px', border:'1px solid #ECECEC', borderRadius:radius.sm, fontSize:12, fontFamily:F, color:'#0F0F0F', outline:'none', textAlign:'center' }}
              />
              <span style={{ color:'#94A3B8', fontSize:14 }}>-</span>
              <input
                value={fmtDisplay(to)}
                readOnly
                placeholder="00/00/0000"
                style={{ height:32, width:120, padding:'0 10px', border:'1px solid #ECECEC', borderRadius:radius.sm, fontSize:12, fontFamily:F, color:'#0F0F0F', outline:'none', textAlign:'center' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid #ECECEC', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:'1px solid #ECECEC', borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, color:'#0F0F0F' }}>Cancelar</button>
          <button onClick={()=>{ onApply(sel); onClose(); }} style={{ height:36, padding:'0 18px', border:'none', borderRadius:radius.sm, background:BRAND, color:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500 }}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}

// ── Card shell ────────────────────────────────────────────────────────────────
function Card({ title, titleExtra, sub, children }: { title: string; titleExtra?: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <div className="dash-card" style={{ background:'#fff',border:'1px solid #ECECEC',borderRadius:10,padding:'16px 18px',display:'flex',flexDirection:'column',gap:10,height:'100%',boxSizing:'border-box' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:8 }}>
        <span style={{ fontSize:14,fontWeight:500,color:'#0F0F0F',fontFamily:F }}>{title}</span>
        {titleExtra}
      </div>
      {sub && <span style={{ fontSize:10,color:'#757575',fontFamily:F,marginTop:-6 }}>{sub}</span>}
      {children}
    </div>
  );
}

const AVATAR_COLORS = ['#2563EB',C.success,'#E0642C','#8B5CF6','#D4A017','#DB2777','#0891B2'];
const SESION_DESDE_MIN = [12, 47, 185, 3, 96, 22];
const USUARIOS_CONECTADOS = USUARIOS_INIT.filter(u=>u.activo).map((u,i)=>({
  iniciales: u.descripcion.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(),
  color: AVATAR_COLORS[i % AVATAR_COLORS.length],
  nombre: u.descripcion,
  sesionDesdeMin: SESION_DESDE_MIN[i % SESION_DESDE_MIN.length],
}));

// Tiempo transcurrido desde el inicio de la sesión, en formato corto legible.
function tiempoDesde(min: number): string {
  const hrs = Math.floor(min/60);
  if (hrs > 0) return `${hrs} hora${hrs===1?'':'s'} ${min%60?`${min%60}min`:''}`.trim();
  return `${min} minuto${min===1?'':'s'}`;
}

function CardUsuariosActivos() {
  const [hover, setHover] = useState<string|null>(null);
  return (
    <div className="dash-card" style={{ background:'#fff', border:'1px solid #ECECEC', borderRadius:10, padding:'16px 20px', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:12, color:'#757575', fontFamily:F }}>Usuarios activos</span>
        <span style={{ fontSize:11, color:'#4CAF50', fontFamily:F, fontWeight:500 }}>{USUARIOS_CONECTADOS.length} en línea</span>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {USUARIOS_CONECTADOS.map(u=>(
          <div key={u.nombre} onMouseEnter={()=>setHover(u.nombre)} onMouseLeave={()=>setHover(null)}
            style={{ position:'relative', display:'flex', alignItems:'center', gap:7, background:'#FAFAFA', border:'1px solid #F0F0F0', borderRadius:radius.pill, padding:'5px 10px 5px 5px' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:u.color, color:'#fff', fontSize:9, fontWeight:600, fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center' }}>{u.iniciales}</div>
              <span style={{ position:'absolute', bottom:-1, right:-1, width:6, height:6, borderRadius:'50%', background:'#4CAF50', border:'1.5px solid #fff' }}/>
            </div>
            <span style={{ fontSize:12, color:'#0F0F0F', fontFamily:F, whiteSpace:'nowrap' }}>{u.nombre.split(' ').slice(0,2).join(' ')}</span>
            {hover===u.nombre && (
              <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)', background:'#1A1A1A',
                color:'#fff', padding:'6px 10px', borderRadius:6, fontSize:11, fontFamily:F, whiteSpace:'nowrap', zIndex:20,
                boxShadow:'0 4px 12px rgba(0,0,0,.25)' }}>
                Conectado hace {tiempoDesde(u.sesionDesdeMin)}
                <div style={{ position:'absolute', top:'100%', left:'50%', transform:'translateX(-50%)', width:0, height:0,
                  borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:'5px solid #1A1A1A' }}/>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const OPERACIONES_PENDIENTES = [
  { modulo:'Cobros / Pagos',        pendientes:4 },
  { modulo:'Gestión de tarjetas',   pendientes:4 },
  { modulo:'Depósitos',             pendientes:3 },
  { modulo:'Transferencias',        pendientes:4 },
  { modulo:'Conciliación bancaria', pendientes:2 },
  { modulo:'Cheques bancarios',     pendientes:2 },
] as const;

function DesgloseOperacionesPendientes() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {OPERACIONES_PENDIENTES.map(m=>(
        <div key={m.modulo} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, fontSize:11, fontFamily:F }}>
          <span style={{ color:'#555' }}>{m.modulo}</span>
          <span style={{ fontWeight:600, color:'#1A1A1A' }}>{m.pendientes}</span>
        </div>
      ))}
    </div>
  );
}

// ── C1: Situación actual (donut compacto) - sin Card wrapper, para usar inline ──
function C1() {
  const ref = useRef<Chart | null>(null);
  const [selIdx, setSelIdx] = React.useState<number|null>(null);
  const [hovering, setHovering] = React.useState(false);
  const BASE = ['#A77600','#C49520','#D9B54A','#EDD47E','#F5E8C0'];
  const data = [90,60,45,35,18];
  const labels = ['Ingresos','Gastos','Costos','Bancos','Otros'];
  useChartJS(() => {
    const el = document.getElementById('c1') as HTMLCanvasElement; if(!el) return;
    ref.current?.destroy();
    ref.current = new Chart(el, {
      type:'doughnut',
      data:{ labels, datasets:[{ data, backgroundColor:BASE, borderWidth:2, borderColor:'#fff', hoverOffset:4 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins:{ legend:{ display:false }, tooltip:{ enabled:false, external:externalDonutTooltip('c1-wrap') } },
        onClick:(_:ChartEvent,els:ActiveElement[])=>{ setSelIdx(els.length>0?els[0].index:null); },
        onHover:(_:ChartEvent,els:ActiveElement[])=>setHovering(els.length>0),
      }
    });
  });
  return (
    <div style={{ display:'flex', gap:12, alignItems:'center', minWidth:0 }}>
      <div id="c1-wrap" style={{ width:88, height:88, flexShrink:0, position:'relative' }}>
        <canvas id="c1" />
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', pointerEvents:'none', opacity:hovering?0:1, transition:'opacity .1s' }}>
          <span style={{ fontSize:16, fontWeight:700, color:'#1A1A1A', fontFamily:F, lineHeight:1 }}>248</span>
          <span style={{ fontSize:9, color:'#9E9E9E', fontFamily:F }}>total</span>
        </div>
      </div>
      {/* Leyenda en grilla de 2 columnas (etiqueta | número): a diferencia de un
          flex column, las columnas de una grilla nunca se estiran para llenar
          espacio sobrante salvo que se use `fr` - así el número queda pegado
          a su etiqueta sin importar cuánto espacio le sobre a la tarjeta.
          minWidth:0 en el contenedor y minmax(0,...) en las columnas son
          necesarios para que, cuando la tarjeta se angosta (ej. al abrir el
          menú lateral), la leyenda se ENCOJA/trunque en vez de desbordarse
          sobre la columna vecina - sin eso, flexbox nunca la deja bajar de
          su ancho de contenido y el sobrante se derrama hacia afuera. */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,max-content) minmax(0,max-content)', columnGap:10, rowGap:5, justifyContent:'start', minWidth:0, overflow:'hidden' }}>
        {labels.map((label,i)=>(
          <React.Fragment key={label}>
            <span onClick={()=>setSelIdx(selIdx===i?null:i)}
              style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontFamily:F, cursor:'pointer', minWidth:0 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:BASE[i], flexShrink:0 }}/>
              <span style={{ color:'#555', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth:0 }}>{label}</span>
            </span>
            <span onClick={()=>setSelIdx(selIdx===i?null:i)}
              style={{ fontWeight:600, color:'#1A1A1A', fontSize:11, fontFamily:F, cursor:'pointer', textAlign:'right', alignSelf:'center', whiteSpace:'nowrap' }}>
              {data[i]}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── helpers aging ─────────────────────────────────────────────────────────────
function agingColor(d: number): string {
  if (d > 120) return '#F44336';
  if (d > 90)  return '#E07B00';
  if (d > 60)  return '#A77600';
  return '#4CAF50';
}
function agingBg(d: number): string {
  if (d > 120) return C.errorBg;
  if (d > 90)  return '#FFF7ED';
  if (d > 60)  return '#FFF8EC';
  return '#F0FAF5';
}
function agingLabel(d: number): string {
  if (d > 120) return '+120 días';
  if (d > 90)  return '90–120 días';
  if (d > 60)  return '60–90 días';
  return '30–60 días';
}

// Moneda separada: cifra a la izquierda, símbolo a la derecha (regla transversal)
function MoneyAmt({ sym, amount, color, size=15 }: { sym:string; amount:number; color:string; size?:number }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
      <span style={{ fontSize:size-2, color, fontFamily:F, fontWeight:500 }}>{sym}</span>
      <span style={{ fontSize:size, fontWeight:400, color, fontFamily:F, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{fmtNum(amount,2)}</span>
    </div>
  );
}

// ── C2: Cartera clientes vencida ─────────────────────────────────────────────
function C2() {
  const vencidas: [string,number,number][] = [
    ['Distribuidora La Florida S.A.',  980000, 148],
    ['Hotel Las Palmas S.A.',          750000, 120],
    ['AuraTours S.A.',                 620000,  95],
    ['Grupo Hotelero Central S.A.',    340000,  62],
  ];
  const totalVig = 1440000;
  const totalVen = vencidas.reduce((s,i)=>s+i[1],0);
  const total    = 5490000;
  const GREEN = '#4CAF50', RED = '#F44336';
  return (
    <Card title="Cuentas por cobrar">
      <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:10 }}>
        <span style={{ fontSize:13, color:'#555', fontFamily:F }}>₡</span>
        <span style={{ fontSize:28, fontWeight:600, color:'#0F0F0F', fontFamily:F, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{fmtNum(total,2)}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <div style={{ width:3, height:16, background:GREEN, borderRadius:2, flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#555', fontFamily:F }}>Vigentes</span>
          </div>
          <MoneyAmt sym="₡" amount={totalVig} color={GREEN} />
          <div style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, marginTop:1 }}>3 documentos</div>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <div style={{ width:3, height:16, background:RED, borderRadius:2, flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#555', fontFamily:F }}>Vencidas</span>
          </div>
          <MoneyAmt sym="₡" amount={totalVen} color={RED} />
          <div style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, marginTop:1 }}>4 documentos</div>
        </div>
      </div>
      <div style={{ display:'flex', height:5, borderRadius:4, overflow:'hidden', marginBottom:12, background:'#F0F0F0' }}>
        <div style={{ width:`${(totalVig/total*100).toFixed(1)}%`, background:GREEN }}/>
        <div style={{ width:`${(totalVen/total*100).toFixed(1)}%`, background:RED }}/>
      </div>
      {/* Subtítulo con línea */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', fontFamily:F, whiteSpace:'nowrap' }}>Saldo vencido por cliente</span>
        <div style={{ flex:1, height:1, background:'#ECECEC' }}/>
      </div>
      {/* Tabla: columnas fijas - nombre | ₡ | cifra | período */}
      <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:F }}>
        <thead>
          <tr>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'left', paddingBottom:5, fontFamily:F }}>Cliente</th>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'right', paddingBottom:5, width:106, fontFamily:F }}>Saldo</th>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'left', paddingBottom:5, paddingLeft:10, width:90, fontFamily:F }}>Período</th>
          </tr>
        </thead>
        <tbody>
          {vencidas.map(([n,m,d],i)=>(
            <tr key={i}>
              <td style={{ fontSize:11, color:'#0F0F0F', padding:'3px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:0 }}>{n}</td>
              <td style={{ fontSize:11, fontWeight:500, color:'#0F0F0F', padding:'3px 0', width:106, whiteSpace:'nowrap' }}><MoneyCell n={m} decimals={2} /></td>
              <td style={{ fontSize:9, paddingLeft:10, verticalAlign:'middle', width:90, whiteSpace:'nowrap' }}>
                <span style={{ padding:'2px 6px', borderRadius:4, background:agingBg(d), color:agingColor(d), fontWeight:600 }}>{agingLabel(d)}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop:'1px solid #ECECEC' }}>
            <td style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', paddingTop:6, fontFamily:F }}>Total vencido</td>
            <td style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', paddingTop:6, whiteSpace:'nowrap' }}><MoneyCell n={totalVen} decimals={2} style={{ fontWeight:600 }} /></td>
            <td/>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

// ── C3: Cartera proveedores vencida ──────────────────────────────────────────
function C3() {
  const vencidas: [string,number,number][] = [
    ['Materiales Occidente S.A.',   2000000, 135],
    ['Ferretero Monteverde S.A.',   1800000, 110],
    ['Insumos del Norte Ltda.',      820000,  78],
    ['Proveedor General CR S.A.',    280000,  42],
  ];
  const totalVig = 500000;
  const totalVen = vencidas.reduce((s,i)=>s+i[1],0);
  const total    = 5400000;
  const GREEN = '#4CAF50', RED = '#F44336';
  return (
    <Card title="Cuentas por pagar">
      <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:10 }}>
        <span style={{ fontSize:13, color:'#555', fontFamily:F }}>₡</span>
        <span style={{ fontSize:28, fontWeight:600, color:'#0F0F0F', fontFamily:F, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{fmtNum(total,2)}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <div style={{ width:3, height:16, background:GREEN, borderRadius:2, flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#555', fontFamily:F }}>Vigentes</span>
          </div>
          <MoneyAmt sym="₡" amount={totalVig} color={GREEN} />
          <div style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, marginTop:1 }}>2 documentos</div>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <div style={{ width:3, height:16, background:RED, borderRadius:2, flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#555', fontFamily:F }}>Vencidas</span>
          </div>
          <MoneyAmt sym="₡" amount={totalVen} color={RED} />
          <div style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, marginTop:1 }}>4 documentos</div>
        </div>
      </div>
      <div style={{ display:'flex', height:5, borderRadius:4, overflow:'hidden', marginBottom:12, background:'#F0F0F0' }}>
        <div style={{ width:`${(totalVig/total*100).toFixed(1)}%`, background:GREEN }}/>
        <div style={{ width:`${(totalVen/total*100).toFixed(1)}%`, background:RED }}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', fontFamily:F, whiteSpace:'nowrap' }}>Saldo vencido por proveedor</span>
        <div style={{ flex:1, height:1, background:'#ECECEC' }}/>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:F }}>
        <thead>
          <tr>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'left', paddingBottom:5, fontFamily:F }}>Proveedor</th>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'right', paddingBottom:5, width:106, fontFamily:F }}>Saldo</th>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'left', paddingBottom:5, paddingLeft:10, width:90, fontFamily:F }}>Período</th>
          </tr>
        </thead>
        <tbody>
          {vencidas.map(([n,m,d],i)=>(
            <tr key={i}>
              <td style={{ fontSize:11, color:'#0F0F0F', padding:'3px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:0 }}>{n}</td>
              <td style={{ fontSize:11, fontWeight:500, color:'#0F0F0F', padding:'3px 0', width:106, whiteSpace:'nowrap' }}><MoneyCell n={m} decimals={2} /></td>
              <td style={{ fontSize:9, paddingLeft:10, verticalAlign:'middle', width:90, whiteSpace:'nowrap' }}>
                <span style={{ padding:'2px 6px', borderRadius:4, background:agingBg(d), color:agingColor(d), fontWeight:600 }}>{agingLabel(d)}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop:'1px solid #ECECEC' }}>
            <td style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', paddingTop:6, fontFamily:F }}>Total vencido</td>
            <td style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', paddingTop:6, whiteSpace:'nowrap' }}><MoneyCell n={totalVen} decimals={2} style={{ fontWeight:600 }} /></td>
            <td/>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

// ── C4: Ingresos / costos / gastos ────────────────────────────────────────────
function C4() {
  const ref = useRef<Chart | null>(null);
  const days = ['26/5','27/5','28/5','29/5','30/5','31/5','1/6','2/6'];
  useChartJS(() => {
    const el = document.getElementById('c4') as HTMLCanvasElement; if(!el) return;
    ref.current?.destroy();
    ref.current = new Chart(el, { type:'bar', data:{ labels:days, datasets:[
      { label:'Ingresos', data:[4200000,3800000,5100000,4600000,3900000,5800000,4100000,4900000], backgroundColor:'#6B4C00', borderRadius:3 },
      { label:'Costos',   data:[1200000,1000000,1500000,1300000,1100000,1700000,1200000,1400000], backgroundColor:'#D9B54A', borderRadius:3 },
      { label:'Gastos',   data:[2100000,1900000,2300000,2000000,1800000,2500000,2000000,2200000], backgroundColor:'#EDD47E', borderRadius:3 },
    ]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
      scales:{ x:{ grid:{ display:false }, ticks:{ font:{ family:"'Montserrat', sans-serif",size:10 }, color:'#757575' } },
               y:{ grid:{ color:'#F5F5F5' }, ticks:{ font:{ family:"'Montserrat', sans-serif",size:10 }, color:'#757575',
                 callback:(v:string|number)=>fmtNum(Number(v), 0) } } } } });
  });
  return (
    <Card title="Ingresos, costos y gastos" sub="Últimos 8 días al día de operación">
      <div style={{ height:130 }}><canvas id="c4" /></div>
      {/* Leyenda interactiva */}
      {(() => {
        const series = [['#6B4C00','Ingresos'],['#D9B54A','Costos'],['#EDD47E','Gastos']];
        return (
          <div style={{ display:'flex',gap:8 }}>
            {series.map(([bg,l])=>(
              <span key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:10,fontFamily:F,cursor:'pointer',padding:'3px 8px',borderRadius:5,border:'none',background:'transparent' }}>
                <span style={{ width:8,height:8,borderRadius:2,background:bg,flexShrink:0 }}/>
                <span style={{ color:'#1A1A1A',fontWeight:500 }}>{l}</span>
              </span>
            ))}
          </div>
        );
      })()}
    </Card>
  );
}

// ── C5: Estado conciliaciones ────────────────────────────────────────────────
function C5() {
  const legend = (
    <div style={{ display:'flex',gap:10,fontSize:10,color:'#757575',fontFamily:F }}>
      {[['#4CAF50','Cerrada'],['#A77600','En proceso'],['#F44336','Pendiente']].map(([bg,l])=>(
        <span key={l} style={{ display:'flex',alignItems:'center',gap:4 }}>
          <span style={{ width:8,height:8,borderRadius:'50%',background:bg }}/>{l}
        </span>
      ))}
    </div>
  );
  // movsPend: cantidad de movimientos de ese banco/período aún sin conciliar
  // (no el estado de la conciliación en sí, sino cuántas líneas le faltan).
  const items = [
    { bg:'#4CAF50', bank:'Banco Nacional - cta. 001', month:'May 2026', st:'Cerrada',    sBg:'#F0FAF5', sC:C.successDk, movsPend:0 },
    { bg:'#A77600', bank:'BAC Credomatic - cta. 002', month:'May 2026', st:'En proceso', sBg:'#FFF8EC', sC:'#7A5800',   movsPend:1 },
    { bg:'#E07B00', bank:'Banco de Costa Rica',        month:'May 2026', st:'Pendiente', sBg:'#FFF7ED', sC:'#9E4E00',  movsPend:6 },
    { bg:'#F44336', bank:'Scotiabank - cta. 004',      month:'Abr 2026', st:'Pendiente', sBg:C.errorBg, sC:'#9E1A1A',  movsPend:9 },
  ];
  const totalMovsPend = items.reduce((s,it)=>s+it.movsPend,0);
  // Tendencia de movimientos pendientes de conciliar por mes (últimos 6 meses).
  const tendencia = [6,9,4,11,7,16];
  const mesesTendencia = ['Ene','Feb','Mar','Abr','May','Jun'];
  const maxTend = Math.max(...tendencia, 1);
  return (
    <Card title="Estado de conciliaciones bancarias" titleExtra={legend}>
      {totalMovsPend > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#F44336', flexShrink:0 }}/>
          <span style={{ fontSize:11, fontWeight:600, color:'#9E1A1A', fontFamily:F }}>{totalMovsPend} movimientos sin conciliar en total</span>
        </div>
      )}
      {items.map(it=>(
        <div key={it.bank} style={{ display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid #F5F5F5',fontSize:11,fontFamily:F }}>
          <span style={{ width:8,height:8,borderRadius:'50%',background:it.bg,flexShrink:0 }}/>
          <span style={{ flex:1,color:'#0F0F0F',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{it.bank}</span>
          {it.movsPend > 0 && (
            <span style={{ fontSize:10, color:'#9E1A1A', flexShrink:0, whiteSpace:'nowrap' }}>{it.movsPend} sin conciliar</span>
          )}
          <span style={{ fontSize:10,color:'#757575',flexShrink:0 }}>{it.month}</span>
          <span style={{ fontSize:10,padding:'2px 8px',borderRadius:radius.pill,background:it.sBg,color:it.sC,flexShrink:0,whiteSpace:'nowrap' }}>{it.st}</span>
        </div>
      ))}
      {/* Comportamiento de pendientes por mes - mini barras, sin librería de charts */}
      <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #F5F5F5' }}>
        <p style={{ fontSize:10, color:'#9E9E9E', margin:'0 0 6px', fontFamily:F }}>Pendientes por mes</p>
        <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:40 }}>
          {tendencia.map((v,i)=>(
            <div key={i} title={`${mesesTendencia[i]}: ${v} pendientes`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <div style={{ width:'100%', height:Math.max(3,(v/maxTend)*30), background: i===tendencia.length-1?'#A77600':'#EDD47E', borderRadius:2 }}/>
              <span style={{ fontSize:9, color:'#9E9E9E', fontFamily:F }}>{mesesTendencia[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function C6() {
  const ref = useRef<Chart | null>(null);
  const catalogo = useCatalogo();
  const cuentasImpuesto = flattenAll(catalogo).filter(c => c.configImpuesto);
  const totalAcreditable = cuentasImpuesto.filter(c => c.configImpuesto?.rol==='acreditable').reduce((s,c)=>s+(c.saldo||0),0);
  const totalDebito      = cuentasImpuesto.filter(c => c.configImpuesto?.rol==='debito').reduce((s,c)=>s+(c.saldo||0),0);
  const sinConfigurar = cuentasImpuesto.length === 0;
  // Serie histórica ilustrativa que termina en el saldo real de hoy (no hay
  // ledger mensual de impuestos todavía para calcular los 6 meses reales).
  const serieAcreditable = [0.76,0.67,0.98,0.86,0.93,1].map(f=>Math.round(totalAcreditable*f));
  const serieDebito      = [0.80,0.71,0.93,0.86,0.91,1].map(f=>Math.round(totalDebito*f));
  useChartJS(() => {
    const el = document.getElementById('c6') as HTMLCanvasElement; if(!el || sinConfigurar) return;
    ref.current?.destroy();
    ref.current = new Chart(el, { type:'bar', data:{ labels:['Ene','Feb','Mar','Abr','May','Jun'], datasets:[
      { label:'Crédito fiscal', data:serieAcreditable, backgroundColor:'#6B4C00', borderRadius:3 },
      { label:'Débito fiscal',  data:serieDebito,      backgroundColor:'#D9B54A', borderRadius:3 },
    ]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
      scales:{ x:{ grid:{ display:false }, ticks:{ font:{ family:"'Montserrat', sans-serif",size:10 }, color:'#757575' } },
               y:{ grid:{ color:'#F5F5F5' }, ticks:{ font:{ family:"'Montserrat', sans-serif",size:10 }, color:'#757575',
                 callback:(v:string|number)=>fmtNum(Number(v), 0) } } } } });
  }, [totalAcreditable, totalDebito, sinConfigurar]);
  if (sinConfigurar) {
    return (
      <Card title="Impuestos de ventas (IVA)">
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, padding:'20px 8px', textAlign:'center' }}>
          <span style={{ fontSize:12, color:'#757575', fontFamily:F }}>Todavía no hay cuentas configuradas como cuenta de impuestos.</span>
          <span style={{ fontSize:11, color:'#9E9E9E', fontFamily:F }}>Configuralas desde el Catálogo de cuentas (Rol especial → Es cuenta de impuestos).</span>
        </div>
      </Card>
    );
  }
  return (
    <Card title="Impuestos de ventas (IVA)">
      <div style={{ height:130 }}><canvas id="c6" /></div>
      <div style={{ display:'flex',gap:8 }}>
        {[['#6B4C00','Crédito fiscal'],['#D9B54A','Débito fiscal']].map(([bg,l])=>(
          <span key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:10,fontFamily:F,cursor:'pointer',padding:'3px 8px',borderRadius:5,border:'none',background:'transparent' }}>
            <span style={{ width:8,height:8,borderRadius:2,background:bg,flexShrink:0 }}/>
            <span style={{ color:'#1A1A1A',fontWeight:500 }}>{l}</span>
          </span>
        ))}
      </div>
      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #F5F5F5', display:'flex', flexDirection:'column', gap:6 }}>
        {cuentasImpuesto.map(c=>(
          <div key={c.id} style={{ padding:'6px 8px', background:'#FAFAFA', borderRadius:6, fontFamily:F }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ color:'#9E9E9E', fontFamily:'monospace', fontSize:10 }}>{c.code}</span>
              <span style={{ fontSize:9.5, fontWeight:600, padding:'1px 7px', borderRadius:999,
                color: c.configImpuesto?.rol==='acreditable'?'#6B4C00':'#A77600',
                background: c.configImpuesto?.rol==='acreditable'?'#F3ECDD':'#FFF3DC' }}>
                {c.configImpuesto?.rol==='acreditable'?'Acreditable':'Débito fiscal'}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
              <span style={{ fontSize:11, color:'#333', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', flexShrink:0, fontVariantNumeric:'tabular-nums' }}>₡ {fmtNum(c.saldo||0,2)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

// ── Exportar (PDF único - sin selector de formato) ─────────────────────────
function BotonExportarPDF({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ height:32, padding:'0 12px', border:'1px solid #ECECEC', borderRadius:4, background:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:10, color:'#475569' }}>
      <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7A1.5 1.5 0 0012 11.5V10"/>
      </svg>
      Exportar
    </button>
  );
}



const suscribirNada = () => () => {};

export default function DashboardPage() {
  // Los gráficos se dibujan solo en el navegador (Chart.js usa el canvas).
  const ready = useSyncExternalStore(suscribirNada, () => true, () => false);
  const [showFilter, setFilt] = useState(false);
  const [periodo, setPeriodo] = useState('Hoy');

  const fechaHoy = new Date().toLocaleDateString('es-CR');

  // Tarjetas que ve el usuario: las de sus permisos (Usuarios y permisos › Permisos › Dashboard)
  const { contabilidad, facturacion } = useModulos();
  const { puede } = usePermisos();
  // Usuarios guardados antes de que las tarjetas de facturación fueran permisos: si
  // no tienen ninguna marcada, ven todas las de la pestaña (si pueden verla).
  const sinTarjetasFe = !TARJETAS_DASHBOARD.some(t => t.grupo === 'facturacion' && puede(t.permiso));
  const ver = (id: string) => {
    const t = TARJETAS_DASHBOARD.find(x => x.id === id);
    if (!t) return false;
    if (t.grupo === 'facturacion' && sinTarjetasFe) return true;
    return puede(t.permiso) || (id === 'situacion' && puede('dashboard.card_situacion'));
  };
  // Sin Contabilidad no hay pestaña contable; sin permiso, no hay la de facturación
  const pestanasVisibles = (['contabilidad', 'facturacion'] as GrupoTarjeta[])
    .filter(g => (g !== 'contabilidad' || contabilidad) && (g !== 'facturacion' || (facturacion && puede('fe.dashboard.view'))))
    .filter(g => TARJETAS_DASHBOARD.some(t => t.grupo === g && ver(t.id)));
  const tabUrl = useSyncExternalStore(suscribirNada, () => new URLSearchParams(window.location.search).get('tab'), () => null);
  const [pestanaElegidaManual, setPestanaElegida] = useState<GrupoTarjeta | null>(null);
  const pestanaElegida: GrupoTarjeta = pestanaElegidaManual ?? (tabUrl === 'facturacion' ? 'facturacion' : 'contabilidad');
  const pestana: GrupoTarjeta | null = pestanasVisibles.includes(pestanaElegida) ? pestanaElegida : pestanasVisibles[0] ?? null;
  const sinTarjetas = pestanasVisibles.length === 0;
  function elegirPestana(p: GrupoTarjeta) {
    setPestanaElegida(p);
    const url = new URL(window.location.href); url.searchParams.set('tab', p); window.history.replaceState(null, '', url.toString());
  }

  return (
    <div style={{ height:'100%',display:'flex',flexDirection:'column',overflow:'hidden' }}>
      {/* Exportar = PDF directo (sin selector de formato), imprimiendo solo el
          contenido de #dashboard-print-area - mismo patrón que Analítico e
          Histórico de clientes/proveedores. */}
      <style>{`@media print {
        body * { visibility:hidden; }
        #dashboard-print-area, #dashboard-print-area * { visibility:visible; }
        #dashboard-print-area { position:absolute; left:0; top:0; width:100%; padding:24px; background:#fff !important; }
        #dashboard-print-header { display:block !important; }
        .dash-card { break-inside: avoid; page-break-inside: avoid; }
        .dash-row-grid { display: block !important; }
        .dash-row-grid > * { margin-bottom: 12px; }
      }`}</style>

      {/* Header */}
      <PageHeader title="Dashboard" left={
        <button onClick={()=>setFilt(true)}
          style={{ height:30, padding:'0 10px', border:'1px solid #ECECEC', borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', gap:6, color:'#475569' }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#475569" strokeWidth="1.3" strokeLinecap="round">
            <rect x="1.5" y="2" width="11" height="11" rx="2"/><path d="M5 1v2M9 1v2M1.5 5.5h11"/>
          </svg>
          <span style={{ fontWeight:400 }}>{periodo}</span>
          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#475569"><path d="M11.62 5.22L7.82 9.02C7.37 9.47 6.63 9.47 6.18 9.02L2.38 5.22" strokeLinecap="round"/></svg>
        </button>
      }>
        <BotonExportarPDF onClick={()=>window.print()}/>
      </PageHeader>

      {pestanasVisibles.length > 1 && (
        <TabBar tabs={pestanasVisibles.map(p => ({ label: NOMBRE_GRUPO[p] }))} active={Math.max(0, pestanasVisibles.indexOf(pestana))}
          onChange={i => elegirPestana(pestanasVisibles[i])} />
      )}

      <div id="dashboard-print-area" style={{ flex:1, overflowY:'auto', padding:16, background:'#F9F9F9', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Encabezado solo visible al imprimir/exportar a PDF. */}
        <div id="dashboard-print-header" style={{ display:'none', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
          <div>
            <p style={{ fontSize:16, fontWeight:700, margin:0, fontFamily:F }}>Hotel Fortuna S.A.</p>
            <p style={{ fontSize:12, color:'#757575', margin:'2px 0 0', fontFamily:F }}>Dashboard · {periodo}</p>
          </div>
          <p style={{ fontSize:11, color:'#757575', margin:0, fontFamily:F }}>Generado: {fechaHoy}</p>
        </div>

        {sinTarjetas && (
          <div style={{ background:'#fff', border:'1px solid #ECECEC', borderRadius:10, padding:24, fontSize:12.5, color:C.n700, fontFamily:F }}>
            No tienes tarjetas asignadas en el Dashboard. Pídele a un administrador que las active en Usuarios y permisos › Dashboard.
          </div>
        )}

        {pestana === 'contabilidad' && <>
          {(ver('situacion') || ver('usuarios')) && (
            <div className="dash-row-grid" style={{ display:'grid', gridTemplateColumns: ver('situacion') && ver('usuarios') ? '1fr 1fr' : '1fr', gap:12 }}>
              {ver('situacion') && (
                <div className="dash-card" style={{ background:'#fff', border:'1px solid #ECECEC', borderRadius:10, padding:'20px 24px', display:'flex', alignItems:'flex-start', gap:24 }}>
                  <div style={{ flexShrink:0 }}>
                    <div style={{ fontSize:12, color:'#757575', fontFamily:F, marginBottom:8 }}>Asientos pendientes</div>
                    <div style={{ fontSize:44, fontWeight:600, color:'#0F0F0F', fontFamily:F, lineHeight:1, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.5px' }}>{fmtNum(248,2)}</div>
                    <div style={{ fontSize:12, color:'#0F0F0F', fontFamily:F, marginTop:6, fontWeight:400 }}>Por contabilizar</div>
                  </div>
                  <div style={{ width:1, alignSelf:'stretch', background:'#ECECEC', flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:'#757575', fontFamily:F, marginBottom:12 }}>Situación actual</div>
                    {ready ? <C1/> : <div style={{ height:90, background:'#F9F9F9', borderRadius:radius.md }}/>}
                  </div>
                  <div style={{ width:1, alignSelf:'stretch', background:'#ECECEC', flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:'#757575', fontFamily:F, marginBottom:12 }}>Operaciones bancarias pendientes</div>
                    <DesgloseOperacionesPendientes/>
                  </div>
                </div>
              )}
              {ver('usuarios') && <CardUsuariosActivos/>}
            </div>
          )}
          {ready && (ver('cxc') || ver('cxp')) && (
            <div className="dash-row-grid" style={{ display:'grid', gridTemplateColumns: ver('cxc') && ver('cxp') ? '1fr 1fr' : '1fr', gap:12 }}>
              {ver('cxc') && <C2/>}{ver('cxp') && <C3/>}
            </div>
          )}
          {ready && ver('ingresos') && <C4/>}
          {ready && (ver('conciliaciones') || ver('iva')) && (
            <div className="dash-row-grid" style={{ display:'grid', gridTemplateColumns: ver('conciliaciones') && ver('iva') ? '1fr 1fr' : '1fr', gap:12 }}>
              {ver('conciliaciones') && <C5/>}{ver('iva') && <C6/>}
            </div>
          )}
        </>}

        {pestana === 'facturacion' && ready && <>
          <ChecklistFE variante="completo" />
          <DashboardFacturacion ver={ver} parte="kpis"/>
          {ver('fe_avisos') && <AvisoEmitidasSolas/>}
          {ver('fe_recurrentes') && <RecurrentesDashboard/>}
          {ver('fe_creditos') && <CreditosReciboDashboard/>}
          <DashboardFacturacion ver={ver} parte="resto"/>
        </>}

        {!ready && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{ background:'#fff', border:'1px solid #ECECEC', borderRadius:10, padding:24, height:160, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:12, color:'#ECECEC', fontFamily:F }}>Cargando…</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFilter && <DateFilterModal onClose={()=>setFilt(false)} onApply={p=>{ setPeriodo(p); }} />}
    </div>
  );
}
