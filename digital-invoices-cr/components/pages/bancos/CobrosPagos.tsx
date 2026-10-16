'use client';
import React, { useState } from 'react';
import { C, fmtNum, Pagination, PAGE_PAD, BotonExportarUnico, ExportListModal, BulkActionBar, PresenciaOperacion, FONT, radius, shadow, PageHeader, SearchInput, FilterDropdown } from '../../ui/primitives';
import { ENLACES_AJUSTE_INIT, enlacesPara, NOTA_ADMINISTRATIVA, TipoMovimientoAjuste } from '../catalogo/catalogoData';

const F = FONT;
const BRAND = C.brand;
function fmt2(n: number) { return fmtNum(n, 2); }

// ── Types ─────────────────────────────────────────────────────────────────────
type TipoOp = 'Cobro' | 'Pago';
type EstadoOp = 'Pendiente' | 'Aplicado' | 'Borrador' | 'Anulado' | 'Contabilizado';

interface Factura {
  id: string;
  documento: string;
  fecha: string;
  descripcion: string;
  importeOriginal: number;
  saldoPendiente: number;
  abono?: number;
}

interface LineaAjuste {
  id: number;
  cuenta: string;
  documento: string;
  moneda: string;
  monto: number;
  tipoMovimiento: TipoMovimientoAjuste | '';
  justificacion: string;
}

interface Operacion {
  id: number;
  tipo: TipoOp;
  estado: EstadoOp;
  consecutivo: number;
  cuenta: string;
  nombreAux: string;
  auxId: string;
  cuentaContable: string;
  titulo: string;
  flujo: string;
  fecha: string;
  moneda: 'CRC' | 'USD';
  importe: number;
  banco: string;
  referencia: string;
  facturas: Factura[];
  lineasAjuste: LineaAjuste[];
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const BANCOS = ['BAC ¢ - Cta. 4646545466888', 'BNCR ¢ - Cta. 5565545547777', 'BAC $ - Cta. 4563212454587'];

const FACTURAS_MOCK: Factura[] = [
  { id:'f1', documento:'FE00000001', fecha:'10/04/2026', descripcion:'Servicio hospedaje abril',  importeOriginal:380000, saldoPendiente:380000 },
  { id:'f2', documento:'FE00000002', fecha:'18/04/2026', descripcion:'Hospedaje - grupo',          importeOriginal:215000, saldoPendiente:215000 },
  { id:'f3', documento:'FE00000003', fecha:'02/05/2026', descripcion:'Eventos y banquetes',        importeOriginal:490000, saldoPendiente:490000 },
  { id:'f4', documento:'FE00000004', fecha:'01/03/2026', descripcion:'Alquiler sala de conferencias',importeOriginal:120000,saldoPendiente:120000 },
];

const FACTURAS_PAGO_MOCK: Factura[] = [
  { id:'p1', documento:'FE00000001', fecha:'00/00/0000', descripcion:'Compra insumos cocina', importeOriginal:276000, saldoPendiente:276000, abono:276000 },
];

const CUENTAS_CLIENTES = [
  { code:'100-002-0001-0001', nombre:'Distribuidora La Florida S.A.', tipo:'Cliente',    auxId:'CLI-0001' },
  { code:'100-002-0001-0002', nombre:'Hotel Las Palmas S.A.',          tipo:'Cliente',    auxId:'CLI-0002' },
  { code:'100-002-0001-0003', nombre:'AuraTours S.A.',                 tipo:'Cliente',    auxId:'CLI-0003' },
  { code:'100-002-0001-0004', nombre:'Corporación Selva Verde Ltda.',  tipo:'Cliente',    auxId:'CLI-0004' },
];

const CUENTAS_PROVEEDORES = [
  { code:'200-001-0002-0001', nombre:'Materiales Occidente S.A.',   tipo:'Proveedor', auxId:'PRO-0001' },
  { code:'200-001-0002-0002', nombre:'Ferretero Monteverde S.A.',    tipo:'Proveedor', auxId:'PRO-0002' },
  { code:'200-001-0002-0003', nombre:'Insumos del Norte Ltda.',      tipo:'Proveedor', auxId:'PRO-0003' },
  { code:'200-001-0002-0004', nombre:'Proveedor General CR S.A.',    tipo:'Proveedor', auxId:'PRO-0004' },
];

const OPS_INIT: Operacion[] = [
  { id:1,  tipo:'Cobro', estado:'Pendiente', consecutivo:356, cuenta:'100-001-0001-CLI0001', nombreAux:'Distribuidora ABC S.A.',  auxId:'CLI-0001', cuentaContable:'100-001-0001', titulo:'Gestión de cobro - Distribuidora ABC S.A. - 356', flujo:'Cobro de clientes - según catálogo', fecha:'', moneda:'CRC', importe:450000, banco:'BAC ¢ - Cta. 4646545466888', referencia:'', facturas: FACTURAS_MOCK.slice(0,3).map((f,i)=>({ ...f, abono: [390000,45000,25000][i] })), lineasAjuste:[{ id:1, cuenta:'650001001-1001: Diferencia en operaciones-Administrativo', documento:'FE00000003', moneda:'¢ CRC', monto:9000, tipoMovimiento:'ajuste_credito', justificacion:'Diferencia a favor por redondeo del banco.' },{ id:2, cuenta:'', documento:'', moneda:'¢ CRC', monto:0, tipoMovimiento:'', justificacion:'' }] },
  { id:2,  tipo:'Cobro', estado:'Aplicado',  consecutivo:355, cuenta:'100-001-0001-CLI0002', nombreAux:'AuraTours S.A.',          auxId:'CLI-0002', cuentaContable:'100-001-0001', titulo:'Gestión de cobro - AuraTours - 355',              flujo:'Cobro de clientes',                fecha:'2026-04-20', moneda:'USD', importe:1250,   banco:'BAC $ - Cta. 4563212454587',    referencia:'TXN-002', facturas:[], lineasAjuste:[] },
  { id:3,  tipo:'Pago',  estado:'Pendiente', consecutivo:67,  cuenta:'100-001-0001-CLI0001', nombreAux:'Materiales Occidente S.A.',auxId:'PRO-0012', cuentaContable:'100-001-0001', titulo:'Gestión de pago - Materiales Occidente S.A. - 67',flujo:'Pago de proveedores - según catálogo',fecha:'', moneda:'CRC', importe:276000, banco:'BAC ¢ - Cta. 4646545466888', referencia:'', facturas: FACTURAS_PAGO_MOCK, lineasAjuste:[{ id:1, cuenta:'200-001-0001: Retención compra de bienes y servicios', documento:'FE00000003', moneda:'¢ CRC', monto:552, tipoMovimiento:'retencion_fuente', justificacion:'Retención en la fuente 2% según legislación vigente.' }] },
  { id:4,  tipo:'Pago',  estado:'Aplicado',  consecutivo:66,  cuenta:'100-001-0001-CLI0002', nombreAux:'Ferretero Monteverde',    auxId:'PRO-0013', cuentaContable:'100-001-0001', titulo:'Gestión de pago - Ferretero Monteverde - 66',    flujo:'Pago de proveedores',              fecha:'2026-04-18', moneda:'CRC', importe:185000, banco:'BNCR ¢ - Cta. 5565545547777', referencia:'REF-044', facturas:[], lineasAjuste:[] },
  { id:5,  tipo:'Cobro', estado:'Aplicado',  consecutivo:354, cuenta:'100-001-0001-CLI0003', nombreAux:'Hotel Bougainvillea',      auxId:'CLI-0003', cuentaContable:'100-001-0001', titulo:'Gestión de cobro - Hotel Bougainvillea - 354',   flujo:'Cobro de clientes', fecha:'2026-05-10', moneda:'USD', importe:3200,   banco:'BAC $ - Cta. 4563212454587',    referencia:'TXN-081', facturas:[], lineasAjuste:[] },
  { id:7,  tipo:'Cobro', estado:'Pendiente', consecutivo:48,  cuenta:'100-001-0001-CLI0003', nombreAux:'AuraTours S.A.',          auxId:'CLI-0003', cuentaContable:'100-001-0001', titulo:'Anticipo de cliente - AuraTours - 48',   flujo:'Anticipo de clientes', fecha:'', moneda:'CRC', importe:150000, banco:'BAC ¢ - Cta. 4646545466888', referencia:'', facturas:[], lineasAjuste:[] },
  { id:6,  tipo:'Pago',  estado:'Pendiente', consecutivo:68,  cuenta:'100-001-0001-CLI0002', nombreAux:'Insumos del Norte Ltda.',  auxId:'PRO-0015', cuentaContable:'100-001-0001', titulo:'Gestión de pago - Insumos del Norte - 68',      flujo:'Pago de proveedores', fecha:'', moneda:'CRC', importe:94500,  banco:'BNCR ¢ - Cta. 5565545547777', referencia:'', facturas:[], lineasAjuste:[{ id:1, cuenta:'', documento:'', moneda:'¢ CRC', monto:0, tipoMovimiento:'', justificacion:'' }] },
];

const ESTADO_STYLE: Record<EstadoOp, [string,string]> = {
  Pendiente:  ['#EF9F27','rgba(239,159,39,.12)'],
  Aplicado:   [C.success,'rgba(29,158,117,.12)'],
  Borrador:   ['#757575','rgba(117,117,117,.12)'],
  Anulado:    [C.error,'rgba(226,75,74,.12)'],
  Contabilizado: ['#2196F3','rgba(33,150,243,.12)'],
};

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span style={{ fontSize:11, padding:'2px 9px', borderRadius:radius.pill, fontWeight:500, color, background:bg, whiteSpace:'nowrap', fontFamily:F }}>{children}</span>;
}

function Btn({ children, onClick, variant='primary', disabled=false, size='md', icon }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: 'primary'|'secondary'|'ghost'|'danger'; disabled?: boolean; size?: 'sm'|'md'; icon?: React.ReactNode;
}) {
  const h = size === 'sm' ? 30 : 36;
  const px = size === 'sm' ? 12 : 18;
  const fs = size === 'sm' ? 11 : 13;
  const vs: Record<string,React.CSSProperties> = {
    primary:   { background:BRAND,   color:'#fff',    border:`1px solid ${BRAND}` },
    secondary: { background:'#fff',  color:'#0F0F0F', border:`1px solid ${C.n500}` },
    ghost:     { background:'transparent', color:BRAND, border:`1px solid ${C.brandBd}` },
    danger:    { background:'transparent', color:C.error, border:'none' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ height:h, padding:`0 ${px}px`, borderRadius:radius.md,
      cursor:disabled?'default':'pointer', fontSize:fs, fontFamily:F, fontWeight:500,
      display:'flex', alignItems:'center', gap:6, opacity:disabled?.5:1, ...vs[variant] }}>
      {icon}{children}
    </button>
  );
}

// ── Seleccionar cuenta auxiliar modal ─────────────────────────────────────────
function SelAuxModal({ tipo, onSelect, onClose }: {
  tipo: 'Cliente' | 'Proveedor'; onSelect: (c: typeof CUENTAS_CLIENTES[0]) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const lista = tipo === 'Cliente' ? CUENTAS_CLIENTES : CUENTAS_PROVEEDORES;
  const filtered = lista.filter(c => !q || c.nombre.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:560, maxHeight:'70vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Seleccionar cuenta auxiliar</p>
          <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Seleccionar todas</button>
        </div>
        <div style={{ padding:'10px 18px', borderBottom:`1px solid ${C.n500}` }}>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar…" width="100%" />
          {/* Filtro tipo */}
          <div style={{ display:'flex', gap:6, marginTop:8 }}>
            {[tipo, 'Auxiliar'].map(t=>(
              <span key={t} style={{ height:22, padding:'0 10px', borderRadius:radius.pill, background:t===tipo?BRAND:C.n200, color:t===tipo?'#fff':'#0F0F0F', fontSize:11, display:'flex', alignItems:'center', cursor:'pointer', fontFamily:F }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
            <thead><tr style={{ borderBottom:`1px solid ${C.n500}`, background:'#F9F9F9' }}>
              <th style={{ width:28 }}/>
              {['Mayor','Submayor','Detalle','Auxiliar',tipo].map(h=>(
                <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding:'24px', textAlign:'center', color:C.n700, fontSize:12 }}>Sin resultados.</td></tr>
              )}
              {filtered.map(item=>(
                <tr key={item.code}
                  style={{ borderBottom:`1px solid #F5F5F5`, cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                  onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                  <td style={{ padding:'8px 10px' }}>
                    <input type="checkbox" style={{ accentColor:BRAND, width:14, height:14 }}/>
                  </td>
                  <td style={{ padding:'8px 10px', color:BRAND, fontFamily:F }}>100</td>
                  <td style={{ padding:'8px 10px', color:'#0F0F0F' }}>001</td>
                  <td style={{ padding:'8px 10px', color:'#0F0F0F' }}>0001</td>
                  <td style={{ padding:'8px 10px', color:'#0F0F0F' }}>{item.auxId}</td>
                  <td style={{ padding:'8px 10px', fontWeight:500, color:'#0F0F0F' }}>
                    {item.nombre}
                    {item.tipo==='Cliente' && item.code.includes('CLI0002') && (
                      <span style={{ marginLeft:6, fontSize:10, padding:'1px 6px', borderRadius:4, background:C.successBg, color:C.success, fontWeight:600 }}>Con datos bancarios</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'10px 18px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>filtered[0]&&onSelect(filtered[0])} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Seleccionar</button>
        </div>
      </div>
    </div>
  );
}


function GestionModal({ op, onClose, onSave }: {
  op: Operacion; onClose: () => void; onSave: (updated: Operacion) => void;
}) {
  const isCobro = op.tipo === 'Cobro';
  const [form, setForm] = useState({ ...op });
  const [showSelAux, setShowSelAux] = useState(false);
  const [showFacturas, setShowFacturas] = useState(false);
  const [editingTipoCambio, setEditingTipoCambio] = useState(false);
  const [tipoCambio, setTipoCambio] = useState('10000');
  const [lineasOpen, setLineasOpen] = useState(true);
  const [facturasOpen, setFacturasOpen] = useState(true);
  const [generarCheque, setGenerarCheque] = useState(false);

  // Generar título autopropuesto: "Gestión de cobro/pago - {cliente} - {consecutivo}"
  function autopropuesto(nombre: string) {
    return `${isCobro ? 'Gestión de cobro' : 'Gestión de pago'} - ${nombre} - ${op.consecutivo}`;
  }

  const bancoTieneChequera = BANCOS_CON_CHEQUERA.has(form.banco);

  const sym = form.moneda === 'USD' ? '$' : '₡';
  const totalFacturas = form.facturas.reduce((s,f) => s + (f.abono ?? f.saldoPendiente), 0);
  function montoEfectivo(l: LineaAjuste) {
    if (!l.tipoMovimiento) return l.monto;
    if (l.tipoMovimiento === NOTA_ADMINISTRATIVA.value) return Math.abs(l.monto) * NOTA_ADMINISTRATIVA.signo;
    const signo = ENLACES_AJUSTE_INIT.find(e=>e.tipoMovimiento===l.tipoMovimiento)?.signo ?? 1;
    return Math.abs(l.monto) * signo;
  }
  const totalAjuste   = form.lineasAjuste.reduce((s,l) => s + montoEfectivo(l), 0);
  const importe       = form.importe;
  const asignado      = totalFacturas;
  const ajuste        = totalAjuste;
  const diferencia    = importe - asignado - ajuste;
  const hasDiferencia = Math.abs(diferencia) > 0.01;

  function addLinea() {
    setForm(f => ({ ...f, lineasAjuste: [...f.lineasAjuste, { id:Date.now(), cuenta:'', documento:'', moneda:`¢ ${f.moneda}`, monto:0, tipoMovimiento:'', justificacion:'' }] }));
  }
  function removeLinea(id: number) {
    setForm(f => ({ ...f, lineasAjuste: f.lineasAjuste.filter(l => l.id !== id) }));
  }
  function updateLinea(id: number, field: string, value: string | number) {
    setForm(f => ({ ...f, lineasAjuste: f.lineasAjuste.map(l => {
      if (l.id !== id) return l;
      const next = { ...l, [field]: value };
      // Al elegir "Nota administrativa" se fuerza la cuenta del cliente/proveedor
      // de la operación - no admite otra cuenta.
      if (field === 'tipoMovimiento' && value === NOTA_ADMINISTRATIVA.value) {
        next.cuenta = `${f.cuentaContable}: ${f.nombreAux}`;
      }
      if (field === 'tipoMovimiento' && value !== NOTA_ADMINISTRATIVA.value && l.tipoMovimiento !== value) {
        next.cuenta = '';
      }
      return next;
    }) }));
  }

  const auxNombre = isCobro ? 'Cuentas por cobrar' : 'Cuentas por pagar';
  const tipoInfo  = isCobro ? 'INFORMACIÓN DEL CLIENTE' : 'INFORMACIÓN DEL PROVEEDOR';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:'100%', maxWidth:1180, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Title bar */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>Gestión de {isCobro?'cobro':'pago'}</span>
          <span style={{ fontSize:13, color:C.n700 }}>{form.consecutivo}</span>
          <Pill color={ESTADO_STYLE[form.estado][0]} bg={ESTADO_STYLE[form.estado][1]}>{form.estado}</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20, padding:4 }}>×</button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1, minHeight:0 }}>
          {/* Left - main form */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px 24px', display:'flex', flexDirection:'column', gap:18 }}>

            {/* Sección cliente/proveedor */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>{tipoInfo}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px' }}>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, margin:'0 0 4px', display:'block' }}>
                    Cuenta contable <span style={{ color:C.error }}>*</span>
                  </label>
                  <div style={{ position:'relative' }}>
                    <select
                      value={form.cuenta}
                      onChange={e => {
                        const lista = isCobro ? CUENTAS_CLIENTES : CUENTAS_PROVEEDORES;
                        const sel = lista.find(c => c.code === e.target.value);
                        if (sel) setForm(f => ({
                          ...f,
                          cuenta: sel.code,
                          nombreAux: sel.nombre,
                          auxId: sel.auxId,
                          cuentaContable: sel.code.split('-CLI')[0].split('-PRO')[0],
                          titulo: autopropuesto(sel.nombre),
                        }));
                      }}
                      style={{ width:'100%', height:36, paddingLeft:10, paddingRight:28, border:`1px solid ${form.cuenta?BRAND:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none', background:'#fff' }}>
                      <option value="">- {isCobro?'Seleccionar cliente':'Seleccionar proveedor'} -</option>
                      {(isCobro ? CUENTAS_CLIENTES : CUENTAS_PROVEEDORES).map(ct=>(
                        <option key={ct.code} value={ct.code}>{ct.code} · {ct.nombre}</option>
                      ))}
                    </select>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"
                      style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                      <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
                    </svg>
                  </div>
                  <button onClick={() => setShowSelAux(true)} style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F, padding:0, marginTop:4 }}>
                    {auxNombre}
                  </button>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Título / Leyenda</label>
                  <input value={form.titulo || (form.nombreAux ? autopropuesto(form.nombreAux) : '')}
                    onChange={e => setForm(f => ({ ...f, titulo:e.target.value }))}
                    placeholder={form.nombreAux ? autopropuesto(form.nombreAux) : 'Auto-propuesto al seleccionar cliente'}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0', cursor:'pointer' }}>Auto-propuesto. Editable.</p>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Flujo (opcional)</label>
                  <input value={form.flujo} onChange={e => setForm(f => ({ ...f, flujo:e.target.value }))} placeholder={`${isCobro?'Cobro':'Pago'} de ${isCobro?'clientes':'proveedores'} - según catálogo`}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
            </div>

            {/* Detalle del pago */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>DETALLE DEL PAGO</p>
              <div style={{ display:'grid', gridTemplateColumns:'160px 180px 160px 1fr 1fr', gap:'8px 14px', alignItems:'flex-start' }}>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Fecha <span style={{ color:C.error }}>*</span></label>
                  <input type="date" value={form.fecha || ''} onChange={e => setForm(f => ({ ...f, fecha:e.target.value }))}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Moneda <span style={{ color:C.error }}>*</span></label>
                  <div style={{ display:'flex', gap:6 }}>
                    {(['CRC','USD'] as const).map(m => (
                      <button key={m} onClick={() => setForm(f => ({ ...f, moneda:m }))} style={{
                        flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500,
                        background: form.moneda===m ? BRAND : C.n200, color: form.moneda===m ? '#fff' : '#0F0F0F',
                      }}>{m === 'CRC' ? '¢ CRC' : '$ USD'}</button>
                    ))}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                    {!editingTipoCambio ? (
                      <button onClick={() => setEditingTipoCambio(true)} style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0 }}>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.3"><path d="M9 2l3 3-9 9H2v-3l9-9z"/></svg>
                        Tipo de cambio: {tipoCambio}
                      </button>
                    ) : (
                      <>
                        <input value={tipoCambio} onChange={e => setTipoCambio(e.target.value)} onBlur={() => setEditingTipoCambio(false)}
                          style={{ height:26, width:90, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }} autoFocus/>
                        <button onClick={() => { setTipoCambio('10000'); setEditingTipoCambio(false); }}
                          style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                          ↺ Restaurar tipo de cambio
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {/* Importe - solo cobro */}
                {isCobro && (
                  <div>
                    <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Importe</label>
                    <div style={{ display:'flex', alignItems:'center', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, gap:6 }}>
                      <span style={{ color:C.n700, fontSize:12 }}>{sym}</span>
                      <input type="number" value={form.importe||''} onChange={e => setForm(f => ({ ...f, importe:+e.target.value }))}
                        style={{ flex:1, border:'none', outline:'none', fontSize:12, fontFamily:F }}/>
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Banco <span style={{ color:C.error }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <select style={{ width:'100%', height:36, paddingLeft:10, paddingRight:28, border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none', background:'#fff' }}>
                      {BANCOS.map(b => <option key={b}>{b}</option>)}
                    </select>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"
                      style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                      <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
                    </svg>
                  </div>
                  <span style={{ fontSize:11, color:BRAND, marginTop:3, display:'block' }}>Filtrado por moneda {form.moneda}</span>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>
                    Referencia bancaria {!isCobro && <span style={{ color:C.error }}>*</span>}
                  </label>
                  <input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia:e.target.value }))}
                    placeholder="Nro. transacción del banco"
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                  {!isCobro && (
                    <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', marginTop:3, display:'flex', alignItems:'center', gap:4, padding:0 }}>
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M11 6l-3 4-3-4M8 10V2"/></svg>
                      Exportar archivo bancario
                    </button>
                  )}
                </div>
              </div>
              {!isCobro && (
                <div style={{ marginTop:8, padding:'8px 12px', background:C.brandBg, borderRadius:radius.sm, fontSize:11, color:'#0F0F0F', border:`1px solid ${C.brandBd}` }}>
                  </div>
              )}
              {/* Toggle generar cheque - visible cuando banco tiene chequera */}
              {!isCobro && bancoTieneChequera && (
                <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                  border:`1px solid ${generarCheque ? C.brandBd : C.n500}`,
                  borderRadius:radius.md, background: generarCheque ? C.brandBg : '#fff', cursor:'pointer' }}
                  onClick={() => setGenerarCheque(v => !v)}>
                  <span style={{ position:'relative', width:16, height:16, flexShrink:0 }}>
                    <input type="checkbox" checked={generarCheque} onChange={e => setGenerarCheque(e.target.checked)}
                      onClick={e => e.stopPropagation()}
                      style={{ position:'absolute', opacity:0, width:16, height:16, margin:0, cursor:'pointer' }}/>
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:5,
                      border:`1.5px solid ${generarCheque ? BRAND : C.n500}`,
                      background: generarCheque ? BRAND : '#fff', transition:'all .12s' }}>
                      {generarCheque && (
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.33 7L5.25 9.92L11.67 4.08"/>
                        </svg>
                      )}
                    </span>
                  </span>
                  <div>
                    <p style={{ fontSize:12, fontWeight:600, margin:0, color: generarCheque ? BRAND : '#0F0F0F' }}>Generar cheque</p>
                    <p style={{ fontSize:11, color:C.n700, margin:0 }}>Este banco tiene chequera habilitada. Se generará un cheque al aplicar.</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={generarCheque ? BRAND : C.n700} strokeWidth="1.4" style={{ marginLeft:'auto', flexShrink:0 }}>
                    <rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M4 6h4M4 8.5h2" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              {/* Datos del cheque */}
              {!isCobro && generarCheque && (
                <div style={{ marginTop:10, padding:'12px 14px', border:`1px solid ${C.brandBd}`, borderRadius:radius.md, background:'#FFFDF5' }}>
                  <p style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', margin:'0 0 10px', display:'flex', alignItems:'center', gap:6 }}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.4"><rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M4 6h4M4 8.5h2" strokeLinecap="round"/></svg>
                    Datos del cheque
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'160px 1fr 1fr', gap:'8px 14px' }}>
                    <div>
                      <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>N° cheque <span style={{ color:C.error }}>*</span></label>
                      <input placeholder="Ej. 0001234"
                        style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>A nombre de</label>
                      <input defaultValue={form.nombreAux || ''}
                        style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha del cheque</label>
                      <input type="date"
                        style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Facturas */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F0F0F' }}>Facturas a {isCobro?'cobrar':'pagar'}</span>
                  <span style={{ fontSize:11, color:C.n700 }}>({form.facturas.length} documento{form.facturas.length!==1?'s':''} seleccionado{form.facturas.length!==1?'s':''})</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => setShowFacturas(true)} style={{ height:30, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
                    Seleccionar facturas
                  </button>
                  <button onClick={() => setFacturasOpen(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4 }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      {facturasOpen ? <path d="M3.5 8.75L7 5.25L10.5 8.75"/> : <path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                    </svg>
                  </button>
                </div>
              </div>
              {facturasOpen && (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, border:`1px solid ${C.n500}`, borderRadius:radius.md, overflow:'hidden' }}>
                  <thead>
                    <tr style={{ background:C.n200, borderBottom:`1px solid ${C.n500}` }}>
                      {['Documento','Fecha','Descripción','Importe pendiente', isCobro?'Abono':'Pago',''].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign:h.includes('Importe')||h.includes('Abono')||h.includes('Pago')?'right':'left', fontWeight:500, color:C.n700, fontSize:11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.facturas.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding:'16px', textAlign:'center', color:C.n700, fontSize:12 }}>Sin facturas seleccionadas</td></tr>
                    ) : (
                      form.facturas.map(f => (
                        <tr key={f.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                          <td style={{ padding:'8px 10px', color:BRAND, fontFamily:F, fontWeight:500 }}>{f.documento}</td>
                          <td style={{ padding:'8px 10px', color:'#0F0F0F' }}>{f.fecha}</td>
                          <td style={{ padding:'8px 10px', color:'#0F0F0F', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={f.descripcion}>{f.descripcion}</td>
                          <td style={{ padding:'8px 10px', textAlign:'right' }}>₡ {fmt2(f.saldoPendiente)}</td>
                          <td style={{ padding:'8px 10px', textAlign:'right' }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4 }}>
                              <span style={{ color:C.n700 }}>₡</span>
                              <input type="number" defaultValue={f.abono ?? f.saldoPendiente}
                                style={{ width:90, height:26, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', textAlign:'right' }}/>
                            </div>
                          </td>
                          <td style={{ padding:'8px 8px' }}>
                            <button onClick={() => setForm(p => ({ ...p, facturas: p.facturas.filter(x => x.id!==f.id) }))}
                              style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:16, padding:0 }}>×</button>
                          </td>
                        </tr>
                      ))
                    )}
                    <tr style={{ borderTop:`2px solid ${C.n500}`, background:C.n200 }}>
                      <td colSpan={3} style={{ padding:'8px 10px', fontWeight:600 }}>Total</td>
                      <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:600 }}>₡ {fmt2(form.facturas.reduce((s,f)=>s+f.saldoPendiente,0))}</td>
                      <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:600 }}>₡ {fmt2(totalFacturas)}</td>
                      <td/>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Líneas de ajuste */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F0F0F' }}>Líneas de ajuste</span>
                  <span style={{ fontSize:11, color:C.n700 }}>({form.lineasAjuste.length} línea{form.lineasAjuste.length!==1?'s':''})</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={addLinea} style={{ height:30, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                    + Agregar línea
                  </button>
                  <button onClick={() => setLineasOpen(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4 }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      {lineasOpen ? <path d="M3.5 8.75L7 5.25L10.5 8.75"/> : <path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                    </svg>
                  </button>
                </div>
              </div>
              {lineasOpen && (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, border:`1px solid ${C.n500}`, borderRadius:radius.md, overflow:'hidden' }}>
                  <thead>
                    <tr style={{ background:C.n200, borderBottom:`1px solid ${C.n500}` }}>
                      {['Tipo de movimiento','Cuenta / Centro de costos','Documento','Justificación','Monto',''].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineasAjuste.map(l => {
                      const operacionActual = isCobro ? 'cobros' : 'pagos';
                      const esNotaAdmin = l.tipoMovimiento === NOTA_ADMINISTRATIVA.value;
                      const opcionesCuenta = l.tipoMovimiento && l.tipoMovimiento !== NOTA_ADMINISTRATIVA.value
                        ? enlacesPara(l.tipoMovimiento, operacionActual)
                        : [];
                      // Tipos de movimiento disponibles: los que la persona configuró en
                      // Catálogo > Movimientos de ajuste para esta operación (cobros/pagos).
                      const tiposDisponibles = Array.from(new Set(
                        ENLACES_AJUSTE_INIT.filter(e => e.activo && e.aplicaA.includes(operacionActual)).map(e => e.tipoMovimiento)
                      ));
                      return (
                      <tr key={l.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                        <td style={{ padding:'6px 8px' }}>
                          <select value={l.tipoMovimiento} onChange={e => updateLinea(l.id,'tipoMovimiento',e.target.value)}
                            style={{ width:170, height:30, padding:'0 6px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}>
                            <option value="">Sin tipo (manual)</option>
                            <option value={NOTA_ADMINISTRATIVA.value}>{NOTA_ADMINISTRATIVA.label}</option>
                            {tiposDisponibles.map((t:string)=>(
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding:'6px 8px' }}>
                          {esNotaAdmin ? (
                            <span style={{ display:'inline-flex', alignItems:'center', height:30, fontSize:11, color:C.n700, fontStyle:'italic' }}>
                              {l.cuenta} (cuenta del {isCobro?'cliente':'proveedor'})
                            </span>
                          ) : opcionesCuenta.length > 0 ? (
                            <select value={l.cuenta} onChange={e => updateLinea(l.id,'cuenta',e.target.value)}
                              style={{ width:'100%', height:30, padding:'0 6px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}>
                              <option value="">Seleccioná una cuenta…</option>
                              {opcionesCuenta.map(o=>(
                                <option key={o.id} value={`${o.cuentaCode}: ${o.cuentaNombre}`}>{o.cuentaCode} - {o.cuentaNombre}</option>
                              ))}
                            </select>
                          ) : (
                            <input value={l.cuenta} onChange={e => updateLinea(l.id,'cuenta',e.target.value)} placeholder="Cuenta / centro de costos"
                              style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                          )}
                        </td>
                        <td style={{ padding:'6px 8px' }}>
                          <input value={l.documento} onChange={e => updateLinea(l.id,'documento',e.target.value)} placeholder="N° Documento"
                            style={{ width:110, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                        </td>
                        <td style={{ padding:'6px 8px' }}>
                          <input value={l.justificacion} onChange={e => updateLinea(l.id,'justificacion',e.target.value)} placeholder="Motivo del ajuste"
                            style={{ width:160, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                        </td>
                        <td style={{ padding:'6px 8px' }}>
                          <input type="number" min={0} value={l.monto||''} onChange={e => updateLinea(l.id,'monto',+e.target.value)}
                            style={{ width:90, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', textAlign:'right', boxSizing:'border-box' }}/>
                        </td>
                        <td style={{ padding:'6px 8px', textAlign:'center' }}>
                          <button onClick={() => removeLinea(l.id)} style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:16, padding:0 }}>×</button>
                        </td>
                      </tr>
                      );
                    })}
                    {form.lineasAjuste.length === 0 && (
                      <tr><td colSpan={6} style={{ padding:'12px', textAlign:'center', color:C.n700, fontSize:11 }}>Sin líneas de ajuste - agregá la primera.</td></tr>
                    )}
                    <tr style={{ borderTop:`2px solid ${C.n500}`, background:C.n200 }}>
                      <td colSpan={4} style={{ padding:'8px 10px', fontWeight:600, fontSize:12 }}>Total</td>
                      <td colSpan={2} style={{ padding:'8px 10px', fontSize:12 }}>
                        <span style={{ fontWeight:600 }}>{fmt2(totalAjuste)}</span>
                        <span style={{ color:C.n700, marginLeft:4 }}>₡</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
              {/* Con tipo de movimiento el monto siempre se escribe positivo -
                  el sistema aplica el signo correcto solo (retenciones y
                  ajuste débito restan, ajuste crédito y nota administrativa suman). */}
              {form.lineasAjuste.some(l=>l.tipoMovimiento) && (
                <p style={{ fontSize:10, color:C.n700, margin:'6px 0 0' }}>
                  Con "Tipo de movimiento" seleccionado no hace falta escribir el monto en negativo - el sistema aplica el efecto contable correcto.
                </p>
              )}
              {hasDiferencia && (
                <p style={{ fontSize:11, color:C.error, margin:'6px 0 0' }}>
                  No puedes finalizar esta operación con una diferencia.
                </p>
              )}
            </div>
          </div>

          {/* Right sidebar - info auxiliar + resumen */}
          <div style={{ width:220, borderLeft:`1px solid ${C.n500}`, padding:'18px 16px', flexShrink:0, display:'flex', flexDirection:'column', gap:16 }}>
            {form.cuenta ? (
              <div>
                <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 8px' }}>
                  {isCobro ? 'AUXILIAR SELECCIONADO' : 'PROVEEDOR SELECCIONADO'}
                </p>
                <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:'0 0 3px' }}>{form.nombreAux}</p>
                <p style={{ fontSize:11, color:C.n700, margin:'0 0 3px', fontFamily:F }}>
                  {form.auxId} · {form.cuentaContable}
                </p>
                <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  4 documentos pendientes
                </button>
              </div>
            ) : (
              <div style={{ padding:'20px 0', textAlign:'center' }}>
                <p style={{ fontSize:12, color:C.n700, margin:0 }}>Selecciona un {isCobro?'cliente':'proveedor'}</p>
              </div>
            )}

            {/* Resumen */}
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:'0 0 10px' }}>Resumen</p>
              {[
                ['Importe',   importe,   false],
                ['Asignado',  asignado,  false],
                ['Ajuste',    ajuste !== 0 ? -ajuste : 0, ajuste !== 0],
                ['Diferencia',diferencia, hasDiferencia],
              ].map(([label, valor, isNeg]) => (
                <div key={label as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, fontSize:12 }}>
                  <span style={{ color:C.n700 }}>{label as string}</span>
                  <span style={{ fontWeight:500, color: isNeg ? C.error : label === 'Diferencia' && (valor as number) === 0 ? C.n700 : '#0F0F0F' }}>
                    {(valor as number) === 0 && label === 'Diferencia' ? '-' : `₡ ${fmt2(valor as number)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          {form.estado === 'Pendiente' && (
            <Btn variant="secondary" onClick={() => { onSave({ ...form, estado:'Borrador' }); onClose(); }}>Guardar como borrador</Btn>
          )}
          {!isCobro && (
            <Btn variant="secondary" onClick={() => {}}>Visualizar asiento</Btn>
          )}
          {form.estado === 'Aplicado' ? (
            <Btn onClick={() => { onSave({ ...form, estado:'Contabilizado' as any }); onClose(); }}>
              Contabilizar
            </Btn>
          ) : (
            <Btn onClick={() => { onSave({ ...form, estado:'Aplicado' }); onClose(); }}
              disabled={hasDiferencia}>
              Aplicar operación
            </Btn>
          )}
        </div>
      </div>

      {/* Sub-modales */}
      {showSelAux && (
        <SelAuxModal tipo={isCobro ? 'Cliente' : 'Proveedor'}
          onSelect={c => setForm(f => ({ ...f, cuenta:c.code, nombreAux:c.nombre, auxId:c.auxId }))}
          onClose={() => setShowSelAux(false)}/>
      )}
      {showFacturas && (
        <FacturasModal
          facturas={isCobro ? FACTURAS_MOCK : FACTURAS_PAGO_MOCK}
          onApply={selected => setForm(f => ({ ...f, facturas: selected }))}
          onClose={() => setShowFacturas(false)}/>
      )}
    </div>
  );
}

// ── Modal: Seleccionar facturas ───────────────────────────────────────────────
function FacturasModal({ facturas, onApply, onClose }: {
  facturas: Factura[];
  onApply: (selected: Factura[]) => void;
  onClose: () => void;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set(facturas.filter(f => f.abono).map(f => f.id)));
  const [abonos, setAbonos] = useState<Record<string, number>>(
    Object.fromEntries(facturas.map(f => [f.id, f.abono ?? f.saldoPendiente]))
  );

  const toggleAll = (checked: boolean) => setSel(checked ? new Set(facturas.map(f => f.id)) : new Set());
  const toggle = (id: string) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalSel = facturas.filter(f => sel.has(f.id)).reduce((s, f) => s + (abonos[f.id] ?? 0), 0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:700,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:'100%', maxWidth:720,
        boxShadow:'0 16px 48px rgba(0,0,0,.22)', fontFamily:F, display:'flex', flexDirection:'column', maxHeight:'80vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Seleccionar facturas</p>
            <p style={{ fontSize:11, color:C.n700, margin:'2px 0 0' }}>Seleccioná los documentos a aplicar en esta operación</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20, padding:'0 4px' }}>×</button>
        </div>

        {/* Table */}
        <div style={{ flex:1, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
            <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:2 }}>
              <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
                <th style={{ width:36, padding:'10px 12px' }}>
                  <input type="checkbox"
                    checked={sel.size === facturas.length}
                    onChange={e => toggleAll(e.target.checked)}
                    style={{ width:14, height:14, accentColor:BRAND }}/>
                </th>
                {['Documento','Fecha','Descripción','Importe original','Saldo pendiente','Abono'].map((h,i) => (
                  <th key={h} style={{ padding:'10px 10px', textAlign: i >= 3 ? 'right' : 'left',
                    fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => {
                const isSel = sel.has(f.id);
                return (
                  <tr key={f.id} onClick={() => toggle(f.id)}
                    style={{ borderBottom:`1px solid #F5F5F5`, cursor:'pointer',
                      background: isSel ? C.brandBg : '#fff' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = C.n200; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? C.brandBg : '#fff'; }}>
                    <td style={{ padding:'10px 12px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggle(f.id)}
                        style={{ width:14, height:14, accentColor:BRAND }}/>
                    </td>
                    <td style={{ padding:'10px 10px', color:BRAND, fontWeight:600, fontFamily:F }}>{f.documento}</td>
                    <td style={{ padding:'10px 10px', color:C.n700, whiteSpace:'nowrap' }}>{f.fecha}</td>
                    <td style={{ padding:'10px 10px', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={f.descripcion}>{f.descripcion}</td>
                    <td style={{ padding:'10px 10px', textAlign:'right', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:100 }}>
                        <span style={{ color:C.n700 }}>₡</span>
                        <span style={{ fontWeight:500 }}>{fmtNum(f.importeOriginal, 2)}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 10px', textAlign:'right', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:100 }}>
                        <span style={{ color:C.n700 }}>₡</span>
                        <span style={{ fontWeight:500 }}>{fmtNum(f.saldoPendiente, 2)}</span>
                      </div>
                    </td>
                    <td style={{ padding:'8px 10px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', alignItems:'center', gap:4, minWidth:110 }}>
                        <span style={{ color:C.n700, fontSize:11 }}>₡</span>
                        <input
                          type="number"
                          value={abonos[f.id] ?? ''}
                          onChange={e => { setAbonos(p => ({ ...p, [f.id]: +e.target.value || 0 })); if (!sel.has(f.id)) toggle(f.id); }}
                          style={{ width:100, height:28, padding:'0 7px', border:`1px solid ${isSel ? BRAND : C.n500}`,
                            borderRadius:5, fontSize:11, fontFamily:F, outline:'none', textAlign:'right', boxSizing:'border-box' }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:12, color:C.n700 }}>
            <span style={{ marginRight:16 }}>{sel.size} documento{sel.size !== 1 ? 's' : ''} seleccionado{sel.size !== 1 ? 's' : ''}</span>
            <span>Total abono: <strong style={{ color:BRAND }}>₡ {fmtNum(totalSel, 2)}</strong></span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`,
              borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
            <button
              onClick={() => { onApply(facturas.filter(f => sel.has(f.id)).map(f => ({ ...f, abono: abonos[f.id] }))); onClose(); }}
              style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none',
                borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
              Aplicar selección
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProveedorLote {
  id: string;
  nombre: string;
  cuentaContable: string;
  auxId: string;
  tieneDatosBancarios: boolean;
  documentos: Factura[];
}

const PROVEEDORES_LOTE: ProveedorLote[] = [
  { id:'p1', nombre:'Materiales Occidente S.A.', cuentaContable:'210-001-0001-PRO0012', auxId:'PRO0012', tieneDatosBancarios:true,
    documentos:[
      { id:'d1', documento:'FE00000001', fecha:'10/05/26', descripcion:'Compra insumos cocina',     importeOriginal:276000, saldoPendiente:276000, abono:276000 },
      { id:'d2', documento:'FE00000004', fecha:'18/05/26', descripcion:'Mantenimiento equipos',     importeOriginal:98500,  saldoPendiente:98500,  abono:98500  },
      { id:'d3', documento:'FE00000007', fecha:'19/05/26', descripcion:'Suministros restaurante',   importeOriginal:45200,  saldoPendiente:45200,  abono:45200  },
    ],
  },
  { id:'p2', nombre:'Insumos del Norte Ltda.', cuentaContable:'210-001-0002-PRO0015', auxId:'PRO0015', tieneDatosBancarios:false,
    documentos:[
      { id:'d4', documento:'FE00000009', fecha:'05/05/26', descripcion:'Compra bebidas',            importeOriginal:55000,  saldoPendiente:55000,  abono:55000  },
    ],
  },
];

function PagoMasivoModal({ onClose }: { onClose: () => void }) {
  const [proveedores, setProveedores] = useState<ProveedorLote[]>(PROVEEDORES_LOTE);
  const [expandedP, setExpandedP] = useState<Set<string>>(new Set(['p1','p2']));
  const [lineasAjuste, setLineasAjuste] = useState([
    { id:1, cuenta:'650001001-1001: Retención en la fuente 2%', documento:'FE00000003', moneda:'¢ CRC', monto:12069 },
    { id:2, cuenta:'650001002-1001: Retención IMI 1%',          documento:'FE00000003', moneda:'¢ CRC', monto:5035  },
  ]);
  const [detallado, setDetallado] = useState(false);

  const totalPagado = proveedores.reduce((s,p) => s + p.documentos.reduce((ss,d) => ss + (d.abono??0), 0), 0);

  function toggleP(id: string) {
    setExpandedP(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:'100%', maxWidth: detallado ? 1280 : 1080, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Title */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>Gestión de pago masivos</span>
          <span style={{ fontSize:13, color:C.n700 }}>67</span>
          <Pill color={ESTADO_STYLE['Pendiente'][0]} bg={ESTADO_STYLE['Pendiente'][1]}>Pendiente</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20 }}>×</button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1 }}>
          {/* Main */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Header info */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>INFORMACIÓN DEL PROVEEDOR</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, whiteSpace:'nowrap', margin:'0 0 3px', display:'block' }}>Cuenta contable <span style={{ color:C.error }}>*</span></label>
                  <select style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}>
                    <option>2 cuentas seleccionadas</option>
                  </select>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0', fontFamily:F }}>Cuentas por pagar</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Título / Leyenda</label>
                  <input defaultValue="Gestión de pago masivos - 67"
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Auto-propuesto. Editable.</p>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Flujo</label>
                  <input placeholder="Pago de proveedores - según catálogo" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
            </div>

            {/* Detalle del pago */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>DETALLE DEL PAGO</p>
              <div style={{ display:'grid', gridTemplateColumns:'160px 140px 180px 1fr', gap:'8px 16px', alignItems:'flex-start' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha <span style={{ color:C.error }}>*</span></label>
                  <input type="date" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Moneda <span style={{ color:C.error }}>*</span></label>
                  <div style={{ display:'flex', gap:5 }}>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:BRAND, color:'#fff' }}>¢ CRC</button>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, background:C.n200, color:'#0F0F0F' }}>$ USD</button>
                  </div>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0', fontFamily:F }}>Tipo de cambio: 10000</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Banco <span style={{ color:C.error }}>*</span></label>
                  <select style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}>
                    {BANCOS.map(b => <option key={b}>{b}</option>)}
                  </select>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0', display:'flex', alignItems:'center', gap:4 }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M11 6l-3 4-3-4M8 10V2"/></svg>
                    Exportar archivo bancario
                  </button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria <span style={{ color:C.error }}>*</span></label>
                  <input placeholder="Nro. transacción del banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
              <div style={{ marginTop:8, padding:'7px 12px', background:C.brandBg, borderRadius:radius.sm, fontSize:11, border:`1px solid ${C.brandBd}` }}>
              </div>
            </div>

            {/* Proveedores */}
            {proveedores.map(p => (
              <div key={p.id} style={{ border:`1px solid ${C.n500}`, borderRadius:10, overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:C.n200 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'#0F0F0F' }}>{p.nombre}</span>
                    <span style={{ fontSize:10, color:C.n700, fontFamily:F }}>{p.cuentaContable}</span>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:radius.lg, fontWeight:500,
                      background: p.tieneDatosBancarios ? 'rgba(29,158,117,.15)' : 'rgba(226,75,74,.12)',
                      color: p.tieneDatosBancarios ? C.success : C.error }}>
                      {p.tieneDatosBancarios ? 'Con datos bancarios' : 'Sin datos bancarios'}
                    </span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
                      Seleccionar facturas
                    </button>
                    <button onClick={() => toggleP(p.id)} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4 }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        {expandedP.has(p.id) ? <path d="M3.5 8.75L7 5.25L10.5 8.75"/> : <path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                      </svg>
                    </button>
                  </div>
                </div>
                {expandedP.has(p.id) && (
                  <div>
                    {detallado ? (
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
                        <thead>
                          <tr style={{ borderBottom:`1px solid ${C.n500}`, background:'#FAFAFA' }}>
                            {['Fecha','Documento','Saldo pendiente','Abono','Retención IR','Retención IMI','Ajuste','Valor neto',''].map(h => (
                              <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {p.documentos.map(d => (
                            <tr key={d.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                              <td style={{ padding:'7px 10px', fontSize:11, color:'#0F0F0F' }}>{d.fecha}</td>
                              <td style={{ padding:'7px 10px', color:BRAND, fontFamily:F, fontSize:11 }}>{d.documento}</td>
                              <td style={{ padding:'7px 10px', fontSize:11 }}>₡ {fmt2(d.saldoPendiente)}</td>
                              <td style={{ padding:'7px 10px', fontSize:11 }}>₡ {fmt2(d.abono ?? d.saldoPendiente)}</td>
                              <td style={{ padding:'7px 10px', fontSize:11, color:C.error }}>-₡ {fmt2((d.abono ?? d.saldoPendiente) * 0.02)}</td>
                              <td style={{ padding:'7px 10px', fontSize:11, color:C.error }}>-₡ {fmt2((d.abono ?? d.saldoPendiente) * 0.01)}</td>
                              <td style={{ padding:'7px 10px', fontSize:11 }}>₡ 0.00</td>
                              <td style={{ padding:'7px 10px', fontSize:11, fontWeight:600 }}>₡ {fmt2((d.abono ?? d.saldoPendiente) * 0.97)}</td>
                              <td style={{ padding:'7px 10px' }}>
                                <button style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:14 }}>×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    <div style={{ padding:'8px 14px', borderTop: detallado ? `1px solid ${C.n500}` : 'none', fontSize:11, color:C.n700, display:'flex', justifyContent:'flex-end' }}>
                      {p.documentos.length} documentos seleccionados &nbsp;·&nbsp; Subtotal ₡ {fmt2(p.documentos.reduce((s,d) => s+(d.abono??d.saldoPendiente),0))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Agregar otro proveedor */}
            <button style={{ fontSize:12, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F, textAlign:'left', padding:0 }}>
              + Agregar otro proveedor
            </button>

            {/* Líneas de ajuste */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Líneas de ajuste</span>
                <button style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>+ Agregar línea</button>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, border:`1px solid ${C.n500}`, borderRadius:radius.md, overflow:'hidden' }}>
                <thead><tr style={{ background:C.n200, borderBottom:`1px solid ${C.n500}` }}>
                  {['Cuenta / Centro de costos','Documento','Moneda','Monto',''].map(h => (
                    <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {lineasAjuste.map(l => (
                    <tr key={l.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                      <td style={{ padding:'6px 8px' }}><span style={{ fontSize:11 }}>{l.cuenta}</span></td>
                      <td style={{ padding:'6px 8px', fontFamily:F, fontSize:11 }}>{l.documento}</td>
                      <td style={{ padding:'6px 8px' }}><span style={{ fontSize:11, padding:'2px 8px', background:C.n200, borderRadius:4 }}>{l.moneda}</span></td>
                      <td style={{ padding:'6px 8px', fontSize:11 }}>{fmt2(l.monto)}</td>
                      <td style={{ padding:'6px 8px' }}><button style={{ background:'none', border:'none', cursor:'pointer', color:C.error }}>×</button></td>
                    </tr>
                  ))}
                  <tr style={{ background:C.n200, borderTop:`2px solid ${C.n500}` }}>
                    <td colSpan={3} style={{ padding:'7px 10px', fontWeight:600, fontSize:12 }}>Total</td>
                    <td style={{ padding:'7px 10px', fontSize:12 }}>₡ {fmt2(lineasAjuste.reduce((s,l)=>s+l.monto,0))}</td>
                    <td/>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width:200, borderLeft:`1px solid ${C.n500}`, padding:'16px 14px', flexShrink:0 }}>
            <p style={{ fontSize:12, fontWeight:600, margin:'0 0 12px' }}>RESUMEN DEL LOTE</p>
            <p style={{ fontSize:11, fontWeight:600, color:BRAND, margin:'0 0 8px' }}>ARCHIVO BANCARIO</p>
            {proveedores.map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                <span style={{ color:'#0F0F0F' }}>{p.nombre.split(' ').slice(0,2).join(' ')}</span>
                <span>₡ {fmt2(p.documentos.reduce((s,d)=>s+(d.abono??d.saldoPendiente),0))}</span>
              </div>
            ))}
            <div style={{ borderTop:`1px solid ${C.n500}`, paddingTop:6, marginTop:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:600 }}>
                <span>Total pagado</span><span>₡ {fmt2(totalPagado)}</span>
              </div>
            </div>
            <div style={{ marginTop:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, cursor:'pointer' }}>
                <input type="checkbox" checked={detallado} onChange={e => setDetallado(e.target.checked)} style={{ accentColor:BRAND }}/>
                Vista detallada (retenciones)
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          <Btn onClick={onClose}>Aplicar operación</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Anticipo ───────────────────────────────────────────────────────────
function AnticipoModal({ onClose }: { onClose: () => void }) {
  const [tipoDetectado, setTipo] = useState<'Cliente' | 'Proveedor'>('Cliente');
  const [cuenta, setCuenta] = useState('100-001-0001-CLI0001 - Arara Tours');
  const [lineas, setLineas] = useState([{ id:1, descripcion:'', documento:'', moneda:'¢ CRC', monto:55000 }]);
  const [showRecibo, setShowRecibo] = useState(false);

  const totalAnticipo = lineas.reduce((s,l) => s+l.monto, 0);

  if (showRecibo) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
        onClick={onClose}>
        <div style={{ background:'#fff', borderRadius:radius.lg, width:480, boxShadow:shadow.modal, fontFamily:F, padding:28 }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <p style={{ fontSize:14, fontWeight:700, margin:0 }}>Hotel Fortuna S.A.</p>
              <p style={{ fontSize:11, color:C.n700, margin:'2px 0 0' }}>Cédula jurídica: 3-101-XXXXXX</p>
              <p style={{ fontSize:11, color:C.n700, margin:0 }}>Tel: (506) 2XXX-XXXX</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:12, color:C.n700, margin:0 }}>Recibo de anticipo</p>
              <p style={{ fontSize:14, fontWeight:700, color:BRAND, margin:'2px 0 0' }}>567</p>
              <p style={{ fontSize:11, color:C.n700, margin:0 }}>00/00/0000</p>
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${C.n500}`, paddingTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', fontSize:11 }}>
            {[
              ['Recibimos anticipo de','Distribuidora ABC S.A.'],['Código auxiliar','0001'],
              ['Referencia bancaria','20260520-888'],['Banco / Cuenta','BAC $ - Cta. 4646545466888'],
              ['Moneda','Dólar estadounidense (USD)'],['Fecha contable','00/00/0000'],
              ['Título / Leyenda','Anticipo de cliente - Arara Tours - 567',],
            ].map(([l,v]) => (
              <div key={l} style={{ gridColumn: l==='Título / Leyenda' ? 'span 2' : undefined }}>
                <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px' }}>{l}</p>
                <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0 }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ borderTop:`1px solid ${C.n500}`, marginTop:14, paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:600 }}>Total anticipo recibido</span>
            <span style={{ fontSize:15, fontWeight:700, color:BRAND }}>$ 2.500,00</span>
          </div>
          <div style={{ marginTop:20, borderTop:`1px solid ${C.n500}`, paddingTop:12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, fontSize:10, color:C.n700 }}>
            <span>Firma del cliente</span>
            <div style={{ textAlign:'center' }}>
              <p style={{ margin:0 }}>Emitido por: jperez</p>
              <p style={{ margin:0 }}>00/00/0000 · 11:02 AM</p>
              <p style={{ margin:0 }}>Asiento No. 567</p>
            </div>
            <span style={{ textAlign:'right' }}>P/ Hotel Fortuna S.A.</span>
          </div>
          <div style={{ marginTop:14, display:'flex', justifyContent:'flex-end' }}>
            <Btn onClick={onClose}>Cerrar</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:'100%', maxWidth:1100, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Title */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>Anticipo de clientes/proveedores</span>
          <span style={{ fontSize:13, color:C.n700 }}>48</span>
          <Pill color={ESTADO_STYLE['Pendiente'][0]} bg={ESTADO_STYLE['Pendiente'][1]}>Pendiente</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20 }}>×</button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1 }}>
          <div style={{ flex:1, padding:'16px 20px', display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>
            {/* Info banner */}
            <div style={{ padding:'8px 12px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:radius.md, fontSize:12, color:'#1E40AF' }}>
              {tipoDetectado === 'Cliente'
                ? 'Seleccione la cuenta contable para identificar si es un anticipo de cliente o de proveedor.'
                : 'El proveedor realiza un pago sin que exista una factura específica aún. El sistema registra el ingreso y genera el asiento contable.'}
            </div>

            <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:0 }}>¿DE QUIÉN ES EL ANTICIPO?</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, whiteSpace:'nowrap', margin:'0 0 3px', display:'block' }}>Cuenta contable <span style={{ color:C.error }}>*</span></label>
                <select value={cuenta} onChange={e => setCuenta(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
                  <option>100-001-0001-CLI0001 - Arara Tours</option>
                  <option>100-001-0001-CLI0002 - Distribuidora ABC S.A.</option>
                </select>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer' }}>Cliente</button>
                  <button style={{ fontSize:11, color:C.n700, background:'none', border:'none', cursor:'pointer' }}>Proveedor</button>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Título / Leyenda</label>
                <input defaultValue={`Anticipo de ${tipoDetectado==='Cliente'?'cliente':'proveedor'} - ${tipoDetectado==='Cliente'?'AuraTours S.A.':'Materiales occidente S.A.'} - 90`}
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Auto-propuesto.</p>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Flujo (opcional)</label>
                <input placeholder="Anticipo de clientes" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
              </div>
            </div>

            <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:0 }}>DETALLE DE ANTICIPO</p>
            <div style={{ display:'grid', gridTemplateColumns:'160px 170px 1fr 1fr', gap:'8px 14px', alignItems:'flex-start' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha <span style={{ color:C.error }}>*</span></label>
                <input type="date" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Moneda <span style={{ color:C.error }}>*</span></label>
                <div style={{ display:'flex', gap:5 }}>
                  <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:BRAND, color:'#fff' }}>¢ CRC</button>
                  <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, background:C.n200, color:'#0F0F0F' }}>$ USD</button>
                </div>
                <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0' }}>Tipo de cambio: 1.0000</button>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Banco <span style={{ color:C.error }}>*</span></label>
                <select style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}>
                  {BANCOS.map(b => <option key={b}>{b}</option>)}
                </select>
                <span style={{ fontSize:11, color:BRAND }}>Filtrado por moneda CRC</span>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria</label>
                <input placeholder="Nro. transacción del banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
              </div>
            </div>

            {/* Facturas anticipadas */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Facturas anticipadas <span style={{ fontSize:11, color:C.n700 }}>({lineas.length} documentos agregado{lineas.length!==1?'s':''})</span></span>
                <button style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>+ Agregar línea</button>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, border:`1px solid ${C.n500}`, borderRadius:radius.md, overflow:'hidden' }}>
                <thead><tr style={{ background:C.n200, borderBottom:`1px solid ${C.n500}` }}>
                  {['Descripción','Documento','Moneda','Importe anticipado',''].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {lineas.map(l => (
                    <tr key={l.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                      <td style={{ padding:'6px 8px' }}><input defaultValue={l.descripcion} placeholder="Ingrese la descripción del anticipo" style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/></td>
                      <td style={{ padding:'6px 8px' }}><input placeholder="Ingrese el documento" style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/></td>
                      <td style={{ padding:'6px 8px' }}><span style={{ fontSize:11, padding:'2px 8px', background:C.n200, borderRadius:4 }}>{l.moneda}</span></td>
                      <td style={{ padding:'6px 8px' }}>
                        <input type="number" defaultValue={l.monto} style={{ width:100, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', textAlign:'right' }}/>
                      </td>
                      <td style={{ padding:'6px 8px' }}><button style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:14 }}>×</button></td>
                    </tr>
                  ))}
                  <tr style={{ background:C.n200, borderTop:`2px solid ${C.n500}` }}>
                    <td colSpan={3} style={{ padding:'8px 10px', fontWeight:600, fontSize:12 }}>Total</td>
                    <td style={{ padding:'8px 10px' }}><span style={{ color:C.n700, marginRight:4 }}>₡</span><span style={{ fontWeight:600 }}>{fmt2(totalAnticipo)}</span></td>
                    <td/>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width:210, borderLeft:`1px solid ${C.n500}`, padding:'16px 14px', flexShrink:0 }}>
            <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>
              {tipoDetectado === 'Cliente' ? 'CLIENTE SELECCIONADO' : 'PROVEEDOR SELECCIONADO'}
            </p>
            <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:'0 0 3px' }}>Arara Tours</p>
            <p style={{ fontSize:11, color:C.n700, margin:'0 0 3px', fontFamily:F }}>0012 · 200-001-001</p>
            <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:0 }}>1 documento anticipado</button>
            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:13, fontWeight:600, margin:'0 0 8px' }}>Resumen</p>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:C.n700 }}>Anticipo</span>
                <span style={{ fontWeight:500 }}>₡ {fmt2(totalAnticipo)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          <Btn onClick={() => setShowRecibo(true)}>Aplicar operación</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Bancos con chequera (para opción generar cheque) ─────────────────────────
const BANCOS_CON_CHEQUERA = new Set(['BNCR ¢ - Cta. 5565545547777']);

// ── Main page ─────────────────────────────────────────────────────────────────
// Tipos de operación para los chips de filtro rápido

// ── Icono acción con tooltip ───────────────────────────────────────────────
function ActIcon({ label, children, color, hoverBg, onClick }: {
  label:string; children:React.ReactNode; color?:string; hoverBg?:string; onClick?:()=>void;
}) {
  const [hov, setHov] = React.useState(false);
  return (
    <div style={{ position:'relative', display:'inline-flex' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <button onClick={onClick}
        style={{ width:26, height:26, borderRadius:5, border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          background: hov ? (hoverBg||'rgba(167,118,0,.08)') : 'transparent',
          color: hov ? (color||BRAND) : C.n700, transition:'all .1s' }}>
        {children}
      </button>
      {hov && (
        <div style={{ position:'absolute', bottom:'calc(100% + 4px)', left:'50%', transform:'translateX(-50%)',
          background:'#1A1A1A', color:'#fff', fontSize:10, padding:'3px 7px', borderRadius:4,
          whiteSpace:'nowrap', pointerEvents:'none', zIndex:500 }}>
          {label}
        </div>
      )}
    </div>
  );
}


function CobrosFechasFilter({ value, onChange, onClear }: { value:{from:string;to:string}; onChange:(v:{from:string;to:string})=>void; onClear:()=>void; }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const active = !!(value.from||value.to);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{ function h(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);} if(open)document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[open]);
  function fmtD(d:string){ if(!d)return''; const[y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocal(value); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        {active?`${fmtD(value.from)} - ${fmtD(value.to)}`:'Fechas'}
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100%+4px)', left:0, zIndex:300, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:10, width:260, boxShadow:shadow.panel, fontFamily:F, padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Período de fecha</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); onClear(); }} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Limpiar</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:10 }}>
            {[{label:'Hoy',f:()=>{const h=new Date().toISOString().slice(0,10);return{from:h,to:h};}},{label:'Esta semana',f:()=>({from:'2026-06-01',to:'2026-06-07'})},{label:'Este mes',f:()=>({from:'2026-06-01',to:'2026-06-30'})},{label:'Mes anterior',f:()=>({from:'2026-05-01',to:'2026-05-31'})},{label:'Este trimestre',f:()=>({from:'2026-04-01',to:'2026-06-30'})},{label:'Este año',f:()=>({from:'2026-01-01',to:'2026-12-31'})}].map(p=>(
              <button key={p.label} onClick={()=>setLocal(p.f())} style={{ height:28, border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>{p.label}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'4px 8px', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:11, color:C.n700 }}>Desde</span>
            <input type="date" value={local.from} onChange={e=>setLocal(p=>({...p,from:e.target.value}))} style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}/>
            <span style={{ fontSize:11, color:C.n700 }}>Hasta</span>
            <input type="date" value={local.to} onChange={e=>setLocal(p=>({...p,to:e.target.value}))} style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:30, border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:30, border:'none', borderRadius:7, background:BRAND, color:'#fff', cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CobrosPagos() {
  const [ops, setOps] = useState<Operacion[]>(OPS_INIT);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  function toggleSel(id:number) { setSelected(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleSelAll(ids:number[]) { setSelected(p=> p.size===ids.length && ids.length>0 ? new Set() : new Set(ids)); }
  const [modalOp, setModalOp] = useState<Operacion | null>(null);
  const [modalMasivo, setModalMasivo] = useState(false);
  const [modalAnticipo, setModalAnticipo] = useState(false);
  const [newTipo, setNewTipo] = useState<'cobro'|'pago'|'masivo'|'anticipo'|null>(null);
  const [searchQ, setSearch] = useState('');

  const [filtTipo,      setFiltTipo]      = useState<Set<string>>(new Set());
  const [filtEstado,    setFiltEstado]    = useState<Set<string>>(new Set());
  const [filtBanco,     setFiltBanco]     = useState<Set<string>>(new Set());
  const [filtMoneda,    setFiltMonedaC]   = useState<Set<string>>(new Set());
  const [filtUsuarioC,  setFiltUsuarioC]  = useState<Set<string>>(new Set());
  const [filtFechaC,    setFiltFechaC]    = useState({ from:'', to:'' });

  const filtered = ops.filter(o => {
    if (filtTipo.size > 0   && !filtTipo.has(o.tipo))    return false;
    if (searchQ && !o.nombreAux.toLowerCase().includes(searchQ.toLowerCase()) &&
        !String(o.consecutivo).includes(searchQ)) return false;
    if (filtEstado.size > 0 && !filtEstado.has(o.estado))  return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(o.moneda))  return false;
    if (filtBanco.size  > 0 && !filtBanco.has(o.banco))    return false;
    return true;
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  function openNew(tipo: 'cobro'|'pago'|'masivo'|'anticipo') {
    if (tipo === 'masivo')   { setModalMasivo(true); return; }
    if (tipo === 'anticipo') { setModalAnticipo(true); return; }
    const id = Date.now();
    const base: Operacion = {
      id, tipo: tipo === 'cobro' ? 'Cobro' : 'Pago',
      estado: 'Pendiente', consecutivo: id % 1000,
      cuenta: '', nombreAux: '', auxId: '', cuentaContable: '',
      titulo: '', flujo: '', fecha: '', moneda: 'CRC', importe: 0,
      banco: BANCOS[0], referencia: '', facturas: [],
      lineasAjuste: [{ id:1, cuenta:'', documento:'', moneda:'¢ CRC', monto:0, tipoMovimiento:'', justificacion:'' }],
    };
    setModalOp(base);
    setNewTipo(null);
  }

  const [dropNueva, setDropNueva] = useState(false);
  const [showExportar, setShowExportar] = useState(false);

  const totalCRC = filtered.filter(o=>o.moneda==='CRC').reduce((s,o)=>s+o.importe,0);
  const totalUSD = filtered.filter(o=>o.moneda==='USD').reduce((s,o)=>s+o.importe,0);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>

      {/* Header */}
      <PageHeader title="Cobros / Pagos">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <div style={{ position:'relative' }}>
        <div style={{ display:'flex', borderRadius:radius.md, overflow:'hidden', border:`1px solid ${BRAND}` }}>
            <button onClick={() => setDropNueva(v=>!v)}
              style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none',
                cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
              Nueva operación
            </button>
            <button onClick={() => setDropNueva(v=>!v)}
              style={{ height:34, padding:'0 10px', background:BRAND, color:'#fff', border:'none',
                borderLeft:'1px solid rgba(255,255,255,.3)', cursor:'pointer' }}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
              </svg>
            </button>
          </div>
          {dropNueva && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:300, background:'#fff',
              border:`1px solid ${C.n500}`, borderRadius:10, minWidth:260, boxShadow:shadow.panel, fontFamily:F }}
              onMouseLeave={() => setDropNueva(false)}>
              {([
                ['cobro',    'GC', 'Gestión de cobro',              'Recuperación de cartera de clientes'],
                ['pago',     'GP', 'Gestión de pago',               'Pago a proveedores con o sin archivo bancario'],
                ['anticipo', 'AC AP', 'Anticipo clientes / proveedores','Anticipos emitidos y recibidos'],
              ] as [string, string, string, string][]).map(([tipo, sigla, nombre, desc]) => (
                <button key={tipo} onClick={() => { setDropNueva(false); openNew(tipo as any); }}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'12px 16px',
                    background:'none', border:'none', cursor:'pointer', borderBottom:`1px solid ${C.n500}` }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.brandBg)}
                  onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{nombre}</span>
                  </div>
                  <p style={{ fontSize:11, color:C.n700, margin:0 }}>{desc}</p>
                </button>
              ))}
            </div>
          )}
          </div>
      </PageHeader>
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px',
        display:'flex', alignItems:'center', gap:10, flexShrink:0, flexWrap:'wrap' }}>
        {/* Buscador */}
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar…" width={200} />
        <CobrosFechasFilter value={filtFechaC} onChange={setFiltFechaC} onClear={()=>setFiltFechaC({from:'',to:''})}/>
        <FilterDropdown label="Tipo de operación" options={['Cobro','Pago','Anticipo']} selected={filtTipo}  onApply={setFiltTipo}  onClear={()=>setFiltTipo(new Set())}/>
        <FilterDropdown label="Estado"            options={['Pendiente','Aplicado','Borrador','Anulado']}    selected={filtEstado} onApply={setFiltEstado} onClear={()=>setFiltEstado(new Set())}/>
        <FilterDropdown label="Banco"             options={BANCOS}                                           selected={filtBanco}  onApply={setFiltBanco}  onClear={()=>setFiltBanco(new Set())}/>
        <FilterDropdown label="Moneda"            options={['CRC','USD']}                                    selected={filtMoneda} onApply={setFiltMonedaC} onClear={()=>setFiltMonedaC(new Set())}/>
        <FilterDropdown label="Usuario"           options={['jperez','sblandon','yader','glopez']}           selected={filtUsuarioC} onApply={setFiltUsuarioC} onClear={()=>setFiltUsuarioC(new Set())}/>
        {(filtTipo.size + filtEstado.size + filtMoneda.size + filtBanco.size) > 0 && (
          <button onClick={()=>{ setFiltTipo(new Set()); setFiltEstado(new Set()); setFiltMonedaC(new Set()); setFiltBanco(new Set()); }}
            style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error,
              borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
            × Limpiar todo
          </button>
        )}

      </div>

      {/* Barra de acciones masivas */}
      <BulkActionBar count={selected.size} onClose={()=>setSelected(new Set())} actions={[
        { label:'Anular', variant:'outline', onClick:()=>{ setOps(p=>p.map(o=>selected.has(o.id)?{...o,estado:'Anulado'}:o)); setSelected(new Set()); } },
        { label:'Aplicar', onClick:()=>{ setOps(p=>p.map(o=>selected.has(o.id)?{...o,estado:'Aplicado'}:o)); setSelected(new Set()); } },
      ]}/>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', background:'#fff', padding:`0 ${PAGE_PAD-12}px` }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
          <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:2 }}>
            <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              <th style={{ width:36, padding:'10px 14px' }}>
                <input type="checkbox" checked={selected.size>0 && selected.size===paginated.length} onChange={()=>toggleSelAll(paginated.map(o=>o.id))} style={{ width:13, height:13, accentColor:BRAND, cursor:'pointer' }}/>
              </th>
              {['Consecutivo','Cliente / Proveedor','Fecha','Moneda','Importe','Banco','Estado','Acciones'].map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:h==='Importe'?'right':'left',
                  fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding:40, textAlign:'center', color:C.n700, fontSize:12 }}>
                Sin registros.
              </td></tr>
            ) : paginated.map(op => {
              const [stColor, stBg] = ESTADO_STYLE[op.estado];
              const sym = op.moneda === 'USD' ? '$' : '₡';
              const tipoBg  = op.tipo==='Cobro' ? 'rgba(29,158,117,.12)'  : 'rgba(167,118,0,.12)';
              const tipoCl  = op.tipo==='Cobro' ? C.success                : BRAND;
              const tipoSig = op.tipo==='Cobro' ? 'GC' : 'GP';
              return (
                <tr key={op.id} style={{ borderBottom:`1px solid #F5F5F5`, cursor:'pointer', background:selected.has(op.id)?'#FFFBF0':'#fff' }}
                  onClick={() => setModalOp(op)}
                  onMouseEnter={e => { if(!selected.has(op.id)) e.currentTarget.style.background=C.n200; }}
                  onMouseLeave={e => { e.currentTarget.style.background=selected.has(op.id)?'#FFFBF0':'#fff'; }}>
                  <td onClick={e=>e.stopPropagation()} style={{ padding:'10px 14px' }}>
                    <input type="checkbox" checked={selected.has(op.id)} onChange={()=>toggleSel(op.id)} style={{ width:13, height:13, accentColor:BRAND, cursor:'pointer' }}/>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <button onClick={e=>{e.stopPropagation(); setModalOp(op);}}
                      style={{ color:BRAND, fontWeight:500, fontFamily:F, fontSize:12, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                      {op.tipo==='Cobro'?'GC':op.tipo==='Pago'?'GP':'AC'}-{op.consecutivo}
                    </button>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0 }}>{op.nombreAux}</p>
                    <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>{op.cuentaContable}</p>
                  </td>
                  <td style={{ padding:'10px 12px', color:C.n700, whiteSpace:'nowrap' }}>
                    {op.fecha ? op.fecha.split('-').reverse().join('/') : '00/00/0000'}
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:C.n200 }}>{op.moneda} {sym}</span>
                  </td>
                  <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:3, width:'100%' }}>
                      <span style={{ color:C.n700, fontSize:11 }}>{sym}</span>
                      <span style={{ fontWeight:500, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(op.importe)}</span>
                    </div>
                  </td>
                  <td style={{ padding:'10px 12px', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11, color:C.n700 }} title={op.banco}>{op.banco}</td>
                  <td style={{ padding:'10px 12px' }}><Pill color={stColor} bg={stBg}>{op.estado}</Pill></td>
                  <td onClick={e=>e.stopPropagation()} style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', gap:1 }}>
                      {/* Pendiente */}
                      {op.estado === 'Pendiente' && (<>
                        <ActIcon label="Contabilizar"         onClick={()=>{ setOps(p=>p.map(o=>o.id===op.id?{...o,estado:'Aplicado'}:o)); }}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7l3.5 3.5L12 3"/></svg>
                        </ActIcon>
                        <ActIcon label="Editar"            onClick={()=>setModalOp(op)}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z"/></svg>
                        </ActIcon>
                        <ActIcon label="Adjuntos">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M11.5 6.5L6 12a3.5 3.5 0 01-5-5l5.5-5.5a2 2 0 012.8 2.8L4 9.5a.5.5 0 01-.7-.7L8.5 3.5"/></svg>
                        </ActIcon>
                        <ActIcon label="Reenviar correo">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M1 3l6 5 6-5"/></svg>
                        </ActIcon>
                        <ActIcon label="Anular" color="'#E24B4A'" hoverBg="'rgba(226,75,74,.08)'">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M4.5 4.5l5 5"/></svg>
                        </ActIcon>
                      </>)}
                      {/* Aplicado */}
                      {op.estado === 'Aplicado' && (<>
                        <ActIcon label="Archivos adjuntos">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M11.5 6.5L6 12a3.5 3.5 0 01-5-5l5.5-5.5a2 2 0 012.8 2.8L4 9.5a.5.5 0 01-.7-.7L8.5 3.5"/></svg>
                        </ActIcon>
                        <ActIcon label="Vista previa">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="2" y="2" width="10" height="10" rx="1.5"/><path d="M5 6h4M5 8.5h2" strokeLinecap="round"/></svg>
                        </ActIcon>
                        <ActIcon label="Imprimir">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="1" width="8" height="4" rx="0.5"/><path d="M3 5H2a1 1 0 00-1 1v4a1 1 0 001 1h1"/><path d="M11 5h1a1 1 0 011 1v4a1 1 0 01-1 1h-1"/><rect x="3" y="8" width="8" height="4" rx="0.5"/></svg>
                        </ActIcon>
                        <ActIcon label="Ver asiento">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 7s2.2-4.5 6-4.5S13 7 13 7s-2.2 4.5-6 4.5S1 7 1 7z"/><circle cx="7" cy="7" r="1.5"/></svg>
                        </ActIcon>
                        <ActIcon label="Reenviar correo">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M1 3l6 5 6-5"/></svg>
                        </ActIcon>
                        <ActIcon label="Anular" color="'#E24B4A'" hoverBg="'rgba(226,75,74,.08)'">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M4.5 4.5l5 5"/></svg>
                        </ActIcon>
                      </>)}
                      {/* Anulado */}
                      {op.estado === 'Anulado' && (
                        <ActIcon label="Recuperar" color="'#1D9E75'" hoverBg="'rgba(29,158,117,.08)'">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12 2v4H8"/><path d="M2 12v-4h4"/><path d="M11.6 8A5 5 0 1 0 10.5 4.5"/></svg>
                        </ActIcon>
                      )}
                      {/* Contabilizado */}
                      {(op.estado === 'Contabilizado' || op.estado === 'Borrador') && (
                        <ActIcon label="Ver" onClick={()=>setModalOp(op)}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 7s2.2-4.5 6-4.5S13 7 13 7s-2.2 4.5-6 4.5S1 7 1 7z"/><circle cx="7" cy="7" r="1.5"/></svg>
                        </ActIcon>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
            {(totalCRC > 0 || totalUSD > 0) && (
              <tfoot>
                <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
                  <td colSpan={4} style={{ padding:'9px 12px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Totales</td>
                  <td/>
                  <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {totalCRC > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>₡</span><span style={{ fontWeight:700, fontSize:12, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalCRC)}</span></div>}
                      {totalUSD > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>$</span><span style={{ fontWeight:700, fontSize:12, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalUSD)}</span></div>}
                    </div>
                  </td>
                  <td/><td/><td/>
                </tr>
              </tfoot>
            )}
        </table>
      </div>

      {/* Footer */}
      <div style={{ background:'#fff', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {modalOp      && <GestionModal op={modalOp} onClose={() => setModalOp(null)} onSave={updated => { setOps(p => p.some(o=>o.id===updated.id) ? p.map(o=>o.id===updated.id?updated:o) : [...p,updated]); setModalOp(null); }}/>}
      {modalMasivo  && <PagoMasivoModal  onClose={() => setModalMasivo(false)}/>}
      {modalAnticipo && <AnticipoModal   onClose={() => setModalAnticipo(false)}/>}
      {showExportar && (
        <ExportListModal
          title="Cobros / Pagos"
          subtitulo={`${filtered.length} operación${filtered.length===1?'':'es'}`}
          filename="cobros-pagos"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'cliente', label:'Cliente / Proveedor' }, { key:'fecha', label:'Fecha' },
            { key:'moneda', label:'Moneda' }, { key:'importe', label:'Importe', align:'right' }, { key:'banco', label:'Banco' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(op=>({
            consecutivo:`${op.tipo==='Cobro'?'GC':op.tipo==='Pago'?'GP':'AC'}-${op.consecutivo}`, cliente:op.nombreAux,
            fecha:op.fecha?op.fecha.split('-').reverse().join('/'):'00/00/0000', moneda:op.moneda,
            importe:`${op.moneda==='USD'?'$':'₡'} ${fmtNum(op.importe,2)}`, banco:op.banco, estado:op.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
    </div>
  );
}
