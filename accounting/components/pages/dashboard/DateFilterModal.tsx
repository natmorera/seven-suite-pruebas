'use client';
import { useState } from 'react';
import { radius } from '@/components/ui/tokens';
import { BRAND, F, MONTHS_ES, addMonths, presetRange } from './datos';
import { MiniCalendar } from './piezas';

// ── DateFilterModal - based on reference screenshot ───────────────────────────
export function DateFilterModal({ onClose, onApply }: { onClose: () => void; onApply: (label: string) => void }) {
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
      // empieza un rango nuevo
      setFrom(iso); setTo(null);
    } else {
      // fija el final (desde <= hasta)
      if (iso < from) { setTo(from); setFrom(iso); }
      else             { setTo(iso); }
    }
  }

  // Fecha para mostrar en el campo
  function fmtDisplay(iso: string | null) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  const presets = ['Día actual','Últimos 7 días','Últimos 28 días','Últimos 90 días','Esta semana','Este mes','Este año','Personalizado'];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:radius.lg, overflow:'hidden', maxWidth:740, width:'95%', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)', display:'flex', flexDirection:'column' }}>
        {/* Barra superior */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #ECECEC', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ height:32, padding:'0 14px', border:'1px solid #CBD5E1', borderRadius:radius.sm, display:'flex', alignItems:'center', gap:6, background:'#fff', fontSize:12, fontFamily:F }}>
            <span style={{ color:'#475569' }}>Período:</span>
            <strong style={{ color:'#0F0F0F' }}>{sel}</strong>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#475569"><path d="M11.62 5.22L7.82 9.02C7.37 9.47 6.63 9.47 6.18 9.02L2.38 5.22" strokeLinecap="round"/></svg>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ display:'flex' }}>
          {/* Izquierda: rangos predefinidos */}
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

          {/* Derecha: calendarios */}
          <div style={{ flex:1, padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
            {/* Hint */}
            <div style={{ padding:'8px 14px', background:'#FFF8EC', borderRadius:radius.sm, border:'1px solid #EED89A' }}>
              <span style={{ fontSize:12, color:'', fontFamily:F }}>Para seleccionar una única fecha haz doble clic en la fecha deseada.</span>
            </div>

            {/* Dual calendars */}
            <div style={{ display:'flex', gap:0 }}>
              {/* Calendario izquierdo */}
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

              {/* Calendario derecho */}
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
                placeholder="00/00/0000" aria-label="00/00/0000"
                style={{ height:32, width:120, padding:'0 10px', border:'1px solid #ECECEC', borderRadius:radius.sm, fontSize:12, fontFamily:F, color:'#0F0F0F', outline:'none', textAlign:'center' }}
              />
              <span style={{ color:'#94A3B8', fontSize:14 }}>-</span>
              <input
                value={fmtDisplay(to)}
                readOnly
                placeholder="00/00/0000" aria-label="00/00/0000"
                style={{ height:32, width:120, padding:'0 10px', border:'1px solid #ECECEC', borderRadius:radius.sm, fontSize:12, fontFamily:F, color:'#0F0F0F', outline:'none', textAlign:'center' }}
              />
            </div>
          </div>
        </div>

        {/* Pie */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid #ECECEC', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:'1px solid #ECECEC', borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, color:'#0F0F0F' }}>Cancelar</button>
          <button onClick={()=>{ onApply(sel); onClose(); }} style={{ height:36, padding:'0 18px', border:'none', borderRadius:radius.sm, background:BRAND, color:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500 }}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}
