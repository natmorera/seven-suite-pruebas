'use client';
import { useState } from 'react';
import { C, FONT, radius } from '../../ui/tokens';

const F = FONT;
const BRAND = '#A77600';

interface Props { onClose: () => void; }

type EstadoItem = 'completado' | 'pendiente' | 'advertencia' | 'espera';

const IC = {
  check: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#F0FAF5"/>
      <path d="M5 9.5L7.5 12L13 6.5" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  warn: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5L16.5 15H1.5L9 1.5Z" fill="#FFF7ED" stroke="#E07B00" strokeWidth="1.2"/>
      <path d="M9 7v3M9 12.5h.01" stroke="#E07B00" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  num: (n: number) => (
    <div style={{ width:26, height:26, borderRadius:'50%', background:C.n200, border:`1px solid ${C.n500}`,
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:C.n700, flexShrink:0 }}>
      {n}
    </div>
  ),
};

const BADGE: Record<EstadoItem, { label:string; bg:string; color:string; border:string }> = {
  completado: { label:'Completado',   bg:'#F0FAF5', color:C.successDk, border:'#9FE1CB' },
  pendiente:  { label:'Pendiente',    bg:C.errorBg, color:'#B71C1C', border:`${C.errorBorder}` },
  advertencia:{ label:'Advertencia',  bg:'#FFF7ED', color:'#9A4E00', border:'#FDB97D' },
  espera:     { label:'En espera',    bg:C.n200,    color:C.n700,    border:C.n500    },
};

export default function ModalCierreMes({ onClose }: Props) {
  const periodo = 'Mayo 2026';
  const [tc, setTc] = useState('450.85');
  const [saltarConc, setSaltarConc] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [dcAplicado, setDcAplicado] = useState(false);

  // El diferencial está pendiente hasta que se aplique
  const dcEstado: EstadoItem = dcAplicado ? 'completado' : 'pendiente';
  const concEstado: EstadoItem = 'advertencia';

  // El cierre se puede ejecutar si:
  // - diferencial aplicado (obligatorio)
  // - conciliaciones: solo ADVIERTE, no bloquea - el usuario puede continuar sin marcar nada
  const puedeEjecutar = dcAplicado;
  const bloqueado = !puedeEjecutar;

  function handleAplicarDC() {
    setAplicando(true);
    setTimeout(() => { setAplicando(false); setDcAplicado(true); }, 1200);
  }

  function BadgeComp({ estado }: { estado: EstadoItem }) {
    const b = BADGE[estado];
    return (
      <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 12px',
        borderRadius:radius.pill, border:`1px solid ${b.border}`, background:b.bg,
        color:b.color, fontSize:12, fontWeight:500, whiteSpace:'nowrap', flexShrink:0 }}>
        {b.label}
      </span>
    );
  }

  return (
    // Overlay
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:400,
        display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:560, maxHeight:'90vh',
        display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>

        {/* ── Header ── */}
        <div style={{ padding:'18px 20px 14px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:15, fontWeight:600, color:C.n900, fontFamily:F, marginBottom:3 }}>
                Cierre de periodo / {periodo}
              </p>
              <p style={{ fontSize:12, color:C.n700, fontFamily:F }}>
                Complete todas las validaciones antes de cerrar el período.
              </p>
            </div>
            <button onClick={onClose}
              style={{ width:28, height:28, border:'none', background:'none', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', color:C.n700, flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 2l10 10M12 2L2 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>

          {/* Info box */}
          <div style={{ display:'flex', gap:10, padding:'10px 12px', background:'#FFF7ED',
            border:'1px solid #FDB97D', borderRadius:radius.md, fontSize:12, color:'#7A4A00',
            lineHeight:1.6, fontFamily:F }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ flexShrink:0, marginTop:1 }}>
              <path d="M9 1.5L16.5 15H1.5L9 1.5Z" fill="#FFF7ED" stroke="#E07B00" strokeWidth="1.2"/>
              <path d="M9 7v3M9 12.5h.01" stroke="#E07B00" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            El sistema verificó las condiciones del período. Complete las validaciones pendientes para habilitar el cierre.
          </div>

          {/* ── Validación 1: Asientos pendientes ── */}
          <div style={{ border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:'12px 14px',
            display:'flex', alignItems:'flex-start', gap:12 }}>
            {IC.check}
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:500, color:C.n900, fontFamily:F }}>Asientos pendientes de contabilizar</p>
              <p style={{ fontSize:12, color:C.n700, fontFamily:F, marginTop:2 }}>
                Todos los asientos contabilizados.
              </p>
            </div>
            <BadgeComp estado="completado"/>
          </div>

          {/* ── Validación 2: Diferencial cambiario ── */}
          <div style={{ border:`1px solid ${dcAplicado ? '#9FE1CB' : C.n500}`,
            borderRadius:radius.md, padding:'12px 14px',
            background: dcAplicado ? '#F0FAF5' : '#FFFFFF',
            transition:'all .2s' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              {dcAplicado ? IC.check : IC.warn}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:500, color:C.n900, fontFamily:F }}>Diferencial cambiario</p>
                <p style={{ fontSize:12, color:C.n700, fontFamily:F, marginTop:2 }}>
                  {dcAplicado
                    ? `Diferencial aplicado al TC ${tc} para el cierre del 31/05/2026.`
                    : '14 documentos en USD sin ajuste al tipo de cambio del 31/05/2026.'}
                </p>
              </div>
              <BadgeComp estado={dcEstado}/>
            </div>
            {/* Inline action si está pendiente */}
            {!dcAplicado && (
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12, paddingTop:10,
                borderTop:`1px dashed ${C.n500}` }}>
                <label style={{ fontSize:12, color:C.n700, fontFamily:F, flexShrink:0 }}>
                  Tipo de cambio:
                </label>
                <input value={tc} onChange={e => setTc(e.target.value)}
                  style={{ height:32, width:100, padding:'0 10px', border:`1px solid ${C.n500}`,
                    borderRadius:radius.md, fontSize:12, fontFamily:F, fontVariantNumeric:'tabular-nums',
                    outline:'none', textAlign:'right' }}/>
                <button onClick={handleAplicarDC} disabled={aplicando}
                  style={{ height:36, padding:'0 16px', border:'none', borderRadius:radius.md,
                    background: aplicando ? '#C49520' : BRAND, color:'#FFFFFF',
                    cursor: aplicando ? 'wait' : 'pointer',
                    fontSize:12, fontWeight:500, fontFamily:F, whiteSpace:'nowrap', flexShrink:0 }}>
                  {aplicando ? 'Aplicando…' : 'Calcular y aplicar'}
                </button>
              </div>
            )}
          </div>

          {/* ── Validación 3: Conciliaciones bancarias ── */}
          <div style={{ border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              {IC.warn}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:500, color:C.n900, fontFamily:F }}>Conciliaciones bancarias</p>
                <p style={{ fontSize:12, color:C.n700, fontFamily:F, marginTop:2 }}>
                  Se detectaron cuentas bancarias sin conciliación creada. Puede continuar con el cierre, pero se recomienda revisarlas.
                </p>
              </div>
              <BadgeComp estado={concEstado}/>
            </div>
            {/* Checkbox para saltarse la advertencia */}
            <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:10,
              paddingTop:10, borderTop:`1px dashed ${C.n500}`, cursor:'pointer',
              fontSize:12, color:C.n700, fontFamily:F }}>
              <input type="checkbox" checked={saltarConc} onChange={e => setSaltarConc(e.target.checked)}
                style={{ width:14, height:14, accentColor:BRAND, cursor:'pointer' }}/>
              Continuar sin conciliarlas
            </label>
          </div>

          {/* ── Validación 4: Asientos de cierre ── */}
          <div style={{ border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:'12px 14px',
            display:'flex', alignItems:'flex-start', gap:12, opacity:.7 }}>
            {IC.num(4)}
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:500, color:C.n900, fontFamily:F }}>Asientos de cierre</p>
              <p style={{ fontSize:12, color:C.n700, fontFamily:F, marginTop:2 }}>
                Se generarán automáticamente al ejecutar el cierre.
              </p>
            </div>
            <BadgeComp estado="espera"/>
          </div>

          {/* ── KPIs del período ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:4 }}>
            {[
              { label:'Asientos del mes', value:'1,204' },
              { label:'Período',          value:periodo },
              { label:'Ejercicio',        value:'2026'  },
            ].map(k => (
              <div key={k.label} style={{ padding:'10px 14px', background:C.n200,
                border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
                <p style={{ fontSize:11, color:C.n700, fontFamily:F, marginBottom:4 }}>{k.label}</p>
                <p style={{ fontSize:14, fontWeight:600, color:C.n900, fontFamily:F }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* ── Bloqueo o aviso ── */}
          {bloqueado ? (
            <div style={{ display:'flex', gap:10, padding:'12px 14px', background:'#FFF7ED',
              border:'1px solid #FDB97D', borderRadius:radius.md, fontFamily:F }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ flexShrink:0, marginTop:1 }}>
                <path d="M9 1.5L16.5 15H1.5L9 1.5Z" fill="#FFF7ED" stroke="#E07B00" strokeWidth="1.2"/>
                <path d="M9 7v3M9 12.5h.01" stroke="#E07B00" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div>
                <p style={{ fontSize:12, fontWeight:600, color:'#9A4E00', marginBottom:4 }}>Cierre bloqueado</p>
                <p style={{ fontSize:12, color:'#9A4E00', lineHeight:1.6 }}>
                  {!dcAplicado && 'Debe completar el diferencial cambiario antes de ejecutar el cierre. '}
                  Una vez cerrado el mes no se podrán registrar asientos con fecha dentro de ese período.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', gap:10, padding:'12px 14px', background:'#F0FAF5',
              border:'1px solid #9FE1CB', borderRadius:radius.md, fontFamily:F }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ flexShrink:0, marginTop:1 }}>
                <circle cx="9" cy="9" r="8" fill="#F0FAF5" stroke="#1D9E75" strokeWidth="1.2"/>
                <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#1D9E75" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{ fontSize:12, color:C.successDk, lineHeight:1.6 }}>
                Todas las validaciones están completas. Puede ejecutar el cierre del mes.
              </p>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.n500}`, flexShrink:0,
          display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose}
            style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md,
              background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700 }}>
            Cancelar
          </button>
          <button disabled={bloqueado} onClick={() => !bloqueado && onClose()}
            style={{ height:34, padding:'0 16px', border:'none', borderRadius:radius.md,
              background: bloqueado ? '#ECECEC' : BRAND,
              color: bloqueado ? '#757575' : '#FFFFFF',
              cursor: bloqueado ? 'not-allowed' : 'pointer',
              fontSize:12, fontWeight:500, fontFamily:F,
              transition:'all .15s' }}>
            Ejecutar cierre
          </button>
        </div>

      </div>
    </div>
  );
}
