'use client';
// Piezas del formulario de Nueva factura: selector de cliente con alta
// rápida, buscador CABYS, y los modales propios de Descuento e Impuesto.
import { ReactNode, useLayoutEffect, useMemo, useState } from 'react';
import { conContabilidad } from '@/lib/modulosCliente';
import { createPortal } from 'react-dom';
import { C, FONT, Modal, FormField, Input, Select, Button, Checkbox, radius, shadow } from '@/components/ui/primitives';
import { tarifasIva, tarifasPermitidas, tarifaPorcentaje, TIPOS_DOCUMENTO_EXONERACION, INSTITUCIONES_EXONERACION, reglaExoneracion } from '@/data/catalogosHacienda';
import { coincideCabys } from '@/data/cabysData';
import { useCabys } from '@/lib/useCabys';
import { ACTIVIDADES_ECONOMICAS } from '@/data/actividadesEconomicas';
import { CODIGOS_DESCUENTO, codigosImpuesto, tiposIdentificacion, type DescuentoLinea, type ExoneracionLinea, type OtroImpuestoLinea } from '@/lib/calculoFactura';
import { CuentaCampo } from './CuentaPicker';
import { autoridad, esGuatemalaActual, simboloLocal } from '@/lib/paisActual';
import { errorReceptorGT } from '@/lib/perfilPais';
import { useUnidadesGravablesActivas } from './useUnidadesGravables';

// ── Tipos compartidos ────────────────────────────────────────────────────────
export interface ClienteRow {
  id: string; nombre: string; tipo: string; tipo_identificacion: string; numero_identificacion: string;
  email: string | null; telefono: string | null; direccion_fiscal: string | null; actividad_economica?: string | null;
  dias_credito?: number | null; exonerado?: number | null; es_receptor?: number | null; con_cuenta?: number | null; genera_recibo_pago?: number | null;
  exoneracion_codigo?: string | null;
  actividades_json?: string | null; actividad_empresa?: string | null;
  provincia?: string | null; canton?: string | null; distrito?: string | null; otras_senas?: string | null;
}
export interface Receptor {
  clienteId: string | null; nombre: string; tipoIdentificacion: string; numeroIdentificacion: string;
  email: string; telefono: string; direccion: string; actividad: string; diasCredito: number; generaRecibo?: boolean;
  conCuenta?: boolean;        // tiene cuenta auxiliar (cliente contable) o es solo receptor
  actividades?: string[];     // sus actividades inscritas (puede tener varias)
  actividadEmpresa?: string;  // nuestra actividad asociada a este tercero
  ubicacion?: { provincia: string; canton: string; distrito: string; otrasSenas: string } | null;  // códigos de Hacienda (obligatoria en la factura de compra)
}
export const RECEPTOR_VACIO: Receptor = { clienteId: null, nombre: '', tipoIdentificacion: '02', numeroIdentificacion: '', email: '', telefono: '', direccion: '', actividad: '', diasCredito: 0 };
export function receptorDesdeCliente(c: ClienteRow): Receptor {
  return {
    clienteId: c.id, nombre: c.nombre, tipoIdentificacion: c.tipo_identificacion || '02', numeroIdentificacion: c.numero_identificacion ?? '',
    email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion_fiscal ?? '', actividad: c.actividad_economica ?? '', diasCredito: Number(c.dias_credito ?? 0), generaRecibo: Number(c.genera_recibo_pago ?? 0) === 1,
    conCuenta: Number(c.con_cuenta ?? 1) === 1,
    actividades: (() => { try { const l = c.actividades_json ? JSON.parse(c.actividades_json) : null; return Array.isArray(l) && l.length ? l.map(String) : (c.actividad_economica ? [c.actividad_economica] : []); } catch { return c.actividad_economica ? [c.actividad_economica] : []; } })(),
    actividadEmpresa: c.actividad_empresa ?? '',
    ubicacion: c.provincia && c.canton && c.distrito ? { provincia: String(c.provincia), canton: String(c.canton), distrito: String(c.distrito), otrasSenas: c.otras_senas ?? '' } : null,
  };
}
export const labelTipoId = (v: string) => tiposIdentificacion().find(t => t.value === v)?.label ?? v;

export function Flotante({ anchor, open, children, width }: { anchor: HTMLElement | null; open: boolean; children: ReactNode; width?: number }) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number; arriba: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    function medir() {
      const r = anchor!.getBoundingClientRect();
      const espacioAbajo = window.innerHeight - r.bottom;
      const w = Math.min(Math.max(width ?? 0, r.width), window.innerWidth - 16);
      // Si no cabe a la derecha (ej. el menú "⋯" en la última columna), se
      // alinea al borde derecho del botón para que no se salga de la ventana.
      const left = Math.max(8, r.left + w > window.innerWidth - 8 ? r.right - w : r.left);
      setPos({ top: espacioAbajo < 260 ? r.top - 4 : r.bottom + 4, left, width: w, arriba: espacioAbajo < 260 && r.top > espacioAbajo });
    }
    const raf = requestAnimationFrame(medir);
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', medir, true); window.removeEventListener('resize', medir); };
  }, [open, anchor, width]);
  if (!open || !pos || typeof document === 'undefined') return null;
  return createPortal(
    <div data-flotante onMouseDown={e => e.preventDefault()}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, transform: pos.arriba ? 'translateY(-100%)' : undefined, zIndex: 1500,
        background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.md, boxShadow: shadow.panel, maxHeight: 280, overflowY: 'auto', fontFamily: FONT }}>
      {children}
    </div>, document.body);
}

const opcionEstilo = { padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: `1px solid ${C.n200}` } as const;

// ── Selector de cliente (base única de Contabilidad + Facturación) ───────────
export function ClienteCombobox({ clientes, valor, onElegir, onNuevo, etiqueta, opcional }: {
  clientes: ClienteRow[]; valor: Receptor; onElegir: (c: ClienteRow | null) => void; onNuevo?: (nombre: string) => void;   // sin permiso de crear receptores: no se ofrece
  etiqueta: string; opcional?: boolean;
}) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return clientes.filter(c => !t || c.nombre.toLowerCase().includes(t) || (c.numero_identificacion ?? '').replace(/\D/g, '').includes(t.replace(/\D/g, '') || '§')).slice(0, 30);
  }, [clientes, q]);

  return (
    <div ref={setAncla} style={{ position: 'relative' }}>
      <div onClick={() => setAbierto(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, border: `1px solid ${abierto ? C.brand : C.n500}`, borderRadius: radius.md, padding: '0 12px', background: '#fff', cursor: 'text' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.n700} strokeWidth="1.3"><circle cx="8" cy="5.5" r="2.8" /><path d="M2.5 14c.8-2.6 3-4 5.5-4s4.7 1.4 5.5 4" strokeLinecap="round" /></svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          {valor.nombre && !abierto && <div style={{ fontSize: 10, color: C.brand }}>{etiqueta}</div>}
          <input value={abierto ? q : valor.nombre} onChange={e => setQ(e.target.value)} onFocus={() => { setAbierto(true); setQ(''); }}
            onBlur={() => setTimeout(() => setAbierto(false), 120)}
            placeholder={valor.nombre || `Buscar ${etiqueta.toLowerCase()} por nombre o ${esGuatemalaActual() ? 'NIT' : 'cédula'}${opcional ? ' (opcional)' : ''}`}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13, fontFamily: FONT, background: 'transparent', color: C.n900 }} />
        </div>
        {valor.nombre && (
          <button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); onElegir(null); }} title="Quitar"
            style={{ background: 'none', border: 'none', color: C.n700, cursor: 'pointer', fontSize: 16 }}>×</button>
        )}
      </div>
      <Flotante anchor={ancla} open={abierto}>
        {lista.map(c => (
          <div key={c.id} style={opcionEstilo} onClick={() => { onElegir(c); setAbierto(false); }}>
            <div style={{ fontWeight: 500, color: C.n900 }}>{c.nombre}</div>
            <div style={{ fontSize: 11, color: C.n700 }}>{labelTipoId(c.tipo_identificacion)} {c.numero_identificacion}{c.email ? ` · ${c.email}` : ''}{Number(c.con_cuenta ?? 1) === 1 ? '' : ' · solo receptor'}</div>
          </div>
        ))}
        {lista.length === 0 && <div style={{ ...opcionEstilo, color: C.n700, cursor: 'default' }}>Sin coincidencias en clientes.</div>}
        {onNuevo && <div style={{ ...opcionEstilo, color: C.brand, fontWeight: 500, borderBottom: 'none' }} onClick={() => { onNuevo?.(q); setAbierto(false); }}>
          + Crear {etiqueta.toLowerCase()} nuevo{q ? ` "${q}"` : ''}
        </div>}
      </Flotante>
    </div>
  );
}

// ── Alta / modificación de cliente ──────────────────────────────────────────
export function ClienteModal({ open, inicial, modo, tipoPorDefecto, onClose, onGuardar }: {
  open: boolean; inicial: Receptor; modo: 'nuevo' | 'modificar'; tipoPorDefecto?: string;
  onClose: () => void;
  onGuardar: (r: Receptor, destino: 'base' | 'solo-aqui', crearCuenta?: boolean, tipoTercero?: 'cliente' | 'proveedor') => Promise<void> | void;
}) {
  // Al guardar un receptor nuevo se pregunta si se le crea cuenta contable y
  // de qué tipo: cliente (110-001-0001-XXXX) o proveedor (300-001-0001-XXXX),
  // o si queda solo como receptor de facturas.
  // Solo facturación: no hay cuentas contables, no se pregunta
  const [cuentaComo, setCuentaComo] = useState<'cliente' | 'proveedor' | 'ninguna' | null>(modo === 'nuevo' && conContabilidad() ? null : 'ninguna');
  const crearCuenta = cuentaComo === null ? null : cuentaComo !== 'ninguna';
  // El padre monta este modal solo cuando se abre, así que arranca con los datos recibidos.
  const [r, setR] = useState<Receptor>(() => ({ ...inicial, tipoIdentificacion: inicial.tipoIdentificacion || tipoPorDefecto || '02' }));
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<Receptor>) => setR(x => ({ ...x, ...p }));
  const extranjero = r.tipoIdentificacion === '05';
  const gt = esGuatemalaActual();

  function validar(): boolean {
    if (!r.nombre.trim()) { setError('El nombre es obligatorio.'); return false; }
    if (gt) {
      // Guatemala: NIT con dígito verificador, CUI, CF o documento del extranjero
      if (r.tipoIdentificacion !== '06' && !r.numeroIdentificacion.trim()) { setError('Indica la identificación del receptor.'); return false; }
      const err = errorReceptorGT(r.tipoIdentificacion, r.tipoIdentificacion === '06' ? 'CF' : r.numeroIdentificacion, 0, 'FACT');
      if (err) { setError(err); return false; }
      if (r.email && !/^\S+@\S+\.\S+$/.test(r.email)) { setError('El correo no es válido.'); return false; }
      setError(null); return true;
    }
    const dig = r.numeroIdentificacion.replace(/\D/g, '');
    const largo: Record<string, number[]> = { '01': [9], '02': [10], '03': [11, 12], '04': [10] };
    if (!extranjero && largo[r.tipoIdentificacion] && !largo[r.tipoIdentificacion].includes(dig.length)) {
      setError(`La ${labelTipoId(r.tipoIdentificacion).toLowerCase()} debe tener ${largo[r.tipoIdentificacion].join(' u ')} dígitos.`); return false;
    }
    if (extranjero && !r.numeroIdentificacion.trim()) { setError('Indica el pasaporte o identificación del extranjero.'); return false; }
    if (r.email && !/^\S+@\S+\.\S+$/.test(r.email)) { setError('El correo no es válido.'); return false; }
    setError(null); return true;
  }

  return (
    <Modal open={open} title={modo === 'nuevo' ? 'Nuevo receptor' : 'Modificar datos del receptor'} onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          {modo === 'modificar' && <Button variant="secondary" onClick={() => validar() && onGuardar(r, 'solo-aqui')}>Usar solo en este comprobante</Button>}
          <Button disabled={modo === 'nuevo' && cuentaComo === null} onClick={() => validar() && onGuardar(r, 'base', Boolean(crearCuenta), cuentaComo === 'proveedor' ? 'proveedor' : 'cliente')}>{modo === 'nuevo' ? 'Guardar receptor' : 'Guardar en el cliente'}</Button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}
        <FormField label="Nombre o razón social" required><Input value={r.nombre} onChange={v => set({ nombre: v })} autoFocus /></FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Tipo de identificación"><Select value={r.tipoIdentificacion} onChange={v => set({ tipoIdentificacion: v, ...(gt ? (v === '06' ? { numeroIdentificacion: 'CF', nombre: r.nombre || 'Consumidor final' } : r.numeroIdentificacion === 'CF' ? { numeroIdentificacion: '' } : {}) : {}) })} options={tiposIdentificacion().map(t => ({ value: t.value, label: t.label }))} /></FormField>
          {gt ? <FormField label={r.tipoIdentificacion === '05' ? 'Pasaporte o documento' : r.tipoIdentificacion === '01' ? 'CUI' : r.tipoIdentificacion === '02' ? 'NIT' : 'Número'} required hint={r.tipoIdentificacion === '06' ? 'Hasta Q2,500 por documento.' : undefined}>
            <Input value={r.numeroIdentificacion} onChange={v => set({ numeroIdentificacion: v })} readOnly={r.tipoIdentificacion === '06'} /></FormField>
            : <FormField label={extranjero ? 'Pasaporte / identificación' : 'Número'} required><Input value={r.numeroIdentificacion} onChange={v => set({ numeroIdentificacion: v })} /></FormField>}
          <FormField label="Correo electrónico" hint="Aquí se le envía el comprobante"><Input value={r.email} onChange={v => set({ email: v })} /></FormField>
          <FormField label="Teléfono"><Input value={r.telefono} onChange={v => set({ telefono: v })} /></FormField>
        </div>
        <FormField label="Dirección fiscal"><Input value={r.direccion} onChange={v => set({ direccion: v })} /></FormField>
        {!gt && <FormField label="Actividad económica del receptor" hint="Opcional. Código CIIU del cliente si es contribuyente.">
          <Input value={r.actividad} onChange={v => set({ actividad: v })} list="actividades-ciiu" placeholder="Ej.: 551001" />
        </FormField>}
        {modo === 'nuevo' && conContabilidad() && (
          <div style={{ border: `1px solid ${crearCuenta === null ? C.brandBd : C.n500}`, background: crearCuenta === null ? C.brandBg : '#fff', borderRadius: radius.md, padding: '10px 12px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>¿Crear también su cuenta auxiliar en Contabilidad?</div>
            <div style={{ fontSize: 11, color: C.n700, margin: '2px 0 8px' }}>Elige si la cuenta es de cliente (cuentas por cobrar) o de proveedor (cuentas por pagar). Si no, queda como solo receptor de facturas y se le puede crear la cuenta después.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}><input type="radio" name="crear-cuenta" checked={cuentaComo === 'cliente'} onChange={() => setCuentaComo('cliente')} /> Sí, como <b style={{ fontWeight: 600 }}>cliente</b> <span style={{ color: C.n700 }}>(cuenta 110-001-0001-…, cuentas por cobrar)</span></label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}><input type="radio" name="crear-cuenta" checked={cuentaComo === 'proveedor'} onChange={() => setCuentaComo('proveedor')} /> Sí, como <b style={{ fontWeight: 600 }}>proveedor</b> <span style={{ color: C.n700 }}>(cuenta 300-001-0001-…, cuentas por pagar)</span></label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}><input type="radio" name="crear-cuenta" checked={cuentaComo === 'ninguna'} onChange={() => setCuentaComo('ninguna')} /> No, solo receptor</label>
            </div>
            {cuentaComo === 'cliente' && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.brandBd}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Checkbox label="¿Activar crédito?" checked={r.diasCredito > 0} onChange={v => set({ diasCredito: v ? 30 : 0 })} />
                {r.diasCredito > 0 ? (
                  <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 90 }}><Input type="number" min="1" value={String(r.diasCredito)} onChange={v => set({ diasCredito: Math.max(1, Number(v.replace(/\D/g, '')) || 1) })} /></div>
                    <span style={{ fontSize: 12 }}>días de crédito. Sus facturas se proponen a crédito con ese plazo.</span>
                  </div>
                ) : <div style={{ marginLeft: 24, fontSize: 11, color: C.n700 }}>Sus facturas se proponen de contado.</div>}
              </div>
            )}
            {cuentaComo === 'proveedor' && <div style={{ marginTop: 8, fontSize: 11, color: C.n700 }}>Queda también en Contabilidad › Proveedores, con su cuenta por pagar.</div>}
            {cuentaComo === 'ninguna' && <div style={{ marginTop: 8, fontSize: 11, color: C.n700 }}>Queda en Configuración › Facturación electrónica › Receptores. Solo se le vende de contado hasta que se le cree la cuenta.</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function DatalistActividades() {
  return <datalist id="actividades-ciiu">{ACTIVIDADES_ECONOMICAS.map(a => <option key={a.codigo} value={`${a.codigo} - ${a.nombre}`} />)}</datalist>;
}

// ── Buscador CABYS (Mis CABYS primero, luego catálogo) ──────────────────────
export interface FavoritoCabys { id: string; datos_pais?: string; codigo: string; descripcion: string; nombre?: string; impuesto: number; precio_unitario: number; unidad_medida: string; moneda?: string; categoria?: string; codigo_interno?: string; tipo_codigo?: string; activo?: number }
export function CabysPicker({ valor, favoritos, onElegir, onEscribir, autoFocus }: {
  valor: string; favoritos: FavoritoCabys[];
  onElegir: (x: { codigo: string; descripcion: string; impuesto: number; precio?: number; unidad?: string }) => void;
  onEscribir: (v: string) => void; autoFocus?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null);
  const favs = favoritos.filter(f => coincideCabys(f.codigo, `${f.descripcion} ${f.nombre ?? ''}`, valor)).slice(0, 8);
  const { lista: encontrados } = useCabys(valor, 12);
  const cat = encontrados.filter(c => !favoritos.some(f => f.codigo === c.codigo)).slice(0, 10);
  return (
    <div ref={setAncla}>
      {/* input propio: el Input compartido pisa onFocus/onBlur con su estilo de foco */}
      <input value={valor} autoFocus={autoFocus} onChange={e => { onEscribir(e.target.value); setAbierto(true); }} placeholder="Buscar CABYS…"
        onFocus={e => { setAbierto(true); e.target.style.borderColor = C.brand; }}
        onBlur={e => { setTimeout(() => setAbierto(false), 120); e.target.style.borderColor = C.n500; }}
        style={{ height: 32, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: 4, fontSize: 12, fontFamily: FONT, outline: 'none', width: '100%', boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums' }} />
      <Flotante anchor={ancla} open={abierto && (favs.length + cat.length > 0)} width={380}>
        {favs.length > 0 && <div style={{ padding: '6px 12px', fontSize: 10.5, color: C.n700, background: C.n200 }}>Mis CABYS</div>}
        {favs.map(f => (
          <div key={f.id} style={opcionEstilo} onClick={() => { onElegir({ codigo: f.codigo, descripcion: f.nombre || f.descripcion, impuesto: f.impuesto, precio: f.precio_unitario, unidad: f.unidad_medida }); setAbierto(false); }}>
            <div style={{ fontWeight: 500 }}>{f.nombre || f.descripcion}</div>
            <div style={{ fontSize: 11, color: C.n700, fontVariantNumeric: 'tabular-nums' }}>{f.codigo} · IVA {f.impuesto}%{f.precio_unitario ? ` · ${simboloLocal()}${f.precio_unitario}` : ''}</div>
          </div>
        ))}
        {cat.length > 0 && <div style={{ padding: '6px 12px', fontSize: 10.5, color: C.n700, background: C.n200 }}>Catálogo CABYS</div>}
        {cat.map(c => (
          <div key={c.codigo} style={opcionEstilo} onClick={() => { onElegir({ codigo: c.codigo, descripcion: c.descripcion, impuesto: c.impuesto }); setAbierto(false); }}>
            <div>{c.descripcion}</div>
            <div style={{ fontSize: 11, color: C.n700, fontVariantNumeric: 'tabular-nums' }}>{c.codigo} · IVA {c.impuesto}%</div>
          </div>
        ))}
      </Flotante>
    </div>
  );
}

// ── Modal de descuento (por línea) ──────────────────────────────────────────
export interface DescuentoConfig { id: string; nombre: string; codigo: string; naturaleza: string; tipo: 'porcentaje' | 'monto'; valor: number; activo: number; cuenta?: string; codigo_otro?: string }
export function DescuentoModal({ open, montoLinea, inicial, simbolo, onClose, onAplicar, catalogo = [] }: {
  open: boolean; montoLinea: number; inicial: DescuentoLinea | null | undefined; simbolo: string; catalogo?: DescuentoConfig[];
  onClose: () => void; onAplicar: (d: DescuentoLinea | null) => void;
}) {
  // Montado solo al abrir: el estado inicial sale del descuento actual de la línea.
  const [modo, setModo] = useState<'porcentaje' | 'monto'>(inicial && inicial.porcentaje == null ? 'monto' : 'porcentaje');
  const [valor, setValor] = useState(inicial ? String(inicial.porcentaje ?? inicial.monto) : '');
  const [codigo, setCodigo] = useState(inicial?.codigo ?? '07');
  const [naturaleza, setNaturaleza] = useState(inicial?.naturaleza ?? '');
  const [codigoOtro, setCodigoOtro] = useState(inicial?.codigoOtro ?? '');
  const [cuenta, setCuenta] = useState(inicial?.cuenta ?? '');
  const v = Number(valor) || 0;
  const monto = modo === 'porcentaje' ? montoLinea * v / 100 : v;
  const error = v < 0 ? 'No puede ser negativo.' : monto > montoLinea ? 'El descuento no puede ser mayor al monto de la línea.'
    : (modo === 'porcentaje' && v > 100) ? 'Máximo 100%.' : codigo === '99' && (!naturaleza.trim() || !codigoOtro.trim()) ? 'Indica qué descuento es y su naturaleza.' : null;
  const faltaCuenta = !cuenta && conContabilidad();
  return (
    <Modal open={open} title="Descuento de la línea" onClose={onClose}
      footer={<div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button variant="ghost" onClick={() => onAplicar(null)} style={{ color: C.error }}>Quitar descuento</Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!!error || v === 0 || faltaCuenta} onClick={() => onAplicar({ monto: Math.round(monto * 100000) / 100000, codigo, naturaleza: codigo === '99' ? naturaleza : undefined, codigoOtro: codigo === '99' ? codigoOtro : undefined, cuenta, porcentaje: modo === 'porcentaje' ? v : undefined })}>Aplicar</Button>
        </div>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {catalogo.filter(d => Number(d.activo) === 1).length > 0 && (
          <FormField label="Usar un descuento configurado">
            <Select value="" onChange={id => {
              const d = catalogo.find(x => x.id === id); if (!d) return;
              setModo(d.tipo === 'monto' ? 'monto' : 'porcentaje'); setValor(String(d.valor)); setCodigo(d.codigo); setNaturaleza(d.naturaleza ?? ''); setCodigoOtro(d.codigo_otro ?? ''); if (d.cuenta) setCuenta(d.cuenta);
            }} options={[{ value: '', label: 'Elegir' }, ...catalogo.filter(d => Number(d.activo) === 1).map(d => ({ value: d.id, label: `${d.nombre} (${d.tipo === 'monto' ? `${simbolo}${d.valor}` : `${d.valor}%`})` }))]} />
          </FormField>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['porcentaje', 'monto'] as const).map(m => (
            <button key={m} onClick={() => setModo(m)} style={{ flex: 1, height: 32, borderRadius: 4, cursor: 'pointer', fontFamily: FONT, fontSize: 12,
              border: `1px solid ${modo === m ? C.brand : C.n500}`, background: modo === m ? C.brandBg : '#fff', color: modo === m ? C.brand : C.n900 }}>
              {m === 'porcentaje' ? 'Porcentaje (%)' : `Monto (${simbolo})`}
            </button>
          ))}
        </div>
        <FormField label={modo === 'porcentaje' ? 'Porcentaje de descuento' : 'Monto del descuento'} error={error ?? undefined}>
          <Input value={valor} onChange={setValor} type="number" autoFocus />
        </FormField>
        <FormField label={`Tipo de descuento (código de ${autoridad()})`}>
          <Select value={codigo} onChange={setCodigo} options={CODIGOS_DESCUENTO.map(c => ({ value: c.value, label: `${c.value} - ${c.label}` }))} />
        </FormField>
        {codigo === '99' && <FormField label="¿Qué otro descuento es?" required><Input value={codigoOtro} onChange={setCodigoOtro} placeholder="Ej. Descuento por lealtad" /></FormField>}
        {codigo === '99' && <FormField label="Naturaleza del descuento" required><Input value={naturaleza} onChange={setNaturaleza} /></FormField>}
        <CuentaCampo titulo="Cuenta contable del descuento" value={cuenta} onChange={setCuenta} grupoInicial="4" error={faltaCuenta && v > 0 ? 'Elige la cuenta que afecta el descuento.' : undefined} />
        <div style={{ fontSize: 12, color: C.n700 }}>Monto de la línea {simbolo} {montoLinea.toFixed(2)} → descuento <b style={{ color: C.n900 }}>{simbolo} {monto.toFixed(2)}</b></div>
      </div>
    </Modal>
  );
}

// ── Modal de impuesto (tarifa + exoneración) ────────────────────────────────
// Exoneración de Configuración → la que va en una línea (el % son puntos de tarifa)
export function exoneracionDeConfig(e: ExoneracionConfig, pctTarifa: number): ExoneracionLinea {
  return {
    tipoDocumento: e.tipo_documento, numeroDocumento: e.numero_documento, institucion: e.institucion,
    fechaEmision: e.fecha_emision || new Date().toISOString().slice(0, 10), tarifaExonerada: Math.min(Number(e.porcentaje ?? pctTarifa), pctTarifa), nombre: e.nombre,
    articulo: e.articulo || '', inciso: e.inciso || '', tipoDocumentoOtro: e.tipo_documento_otro || '', nombreInstitucionOtros: e.nombre_institucion_otros || '',
  };
}
export interface ExoneracionConfig { id: string; nombre: string; tipo_documento: string; numero_documento: string; institucion: string; fecha_emision: string; porcentaje: number; activo: number; articulo?: string; inciso?: string; tipo_documento_otro?: string; nombre_institucion_otros?: string }
export interface ImpuestoConfig { id: string; nombre: string; tipo: string; porcentaje: number; activo: number; cuenta?: string; codigo_otro?: string }
export function ImpuestoModal({ open, tipoDocumento, codigoTarifa, exoneracion, otroImpuesto: otroInicial, exoneraciones, impuestosCat = [], subtotal, simbolo, onClose, onAplicar }: {
  open: boolean; tipoDocumento: string; codigoTarifa: string; exoneracion: ExoneracionLinea | null | undefined; otroImpuesto?: OtroImpuestoLinea | null;
  exoneraciones: ExoneracionConfig[]; impuestosCat?: ImpuestoConfig[]; subtotal: number; simbolo: string;
  onClose: () => void; onAplicar: (x: { codigoTarifa: string; exoneracion: ExoneracionLinea | null; otroImpuesto: OtroImpuestoLinea | null; aTodas: boolean }) => void;
}) {
  // Otro impuesto además del IVA (selectivo, específico u «otro»), con su cuenta
  const [conOtro, setConOtro] = useState(Boolean(otroInicial));
  const [otro, setOtro] = useState<OtroImpuestoLinea>(() => otroInicial ?? { codigo: '99', descripcion: '', tarifa: 0, cuenta: '' });
  const otrosCat = impuestosCat.filter(i => Number(i.activo) === 1 && i.tipo !== 'IVA');
  const otroValido = !conOtro || (otro.tarifa > 0 && (otro.codigo !== '99' || (otro.descripcion ?? '').trim()) && (Boolean(otro.cuenta) || !conContabilidad()));
  const montoOtro = conOtro ? subtotal * (otro.tarifa || 0) / 100 : 0;
  // Montado solo al abrir: arranca con la tarifa y exoneración actuales de la línea.
  const [tarifa, setTarifa] = useState(codigoTarifa);
  const [conExo, setConExo] = useState(!!exoneracion);
  const [exo, setExo] = useState<ExoneracionLinea>(() => exoneracion ?? { tipoDocumento: '04', numeroDocumento: '', institucion: '01', fechaEmision: new Date().toISOString().slice(0, 10), tarifaExonerada: tarifaPorcentaje(codigoTarifa) });
  const [aTodas, setATodas] = useState(false);
  const [guardarExo, setGuardarExo] = useState(false);
  const pct = tarifaPorcentaje(tarifa);
  // Guatemala no tiene exoneraciones: una línea sin IVA usa la unidad gravable 2
  const gt = esGuatemalaActual();
  const ugActiva = useUnidadesGravablesActivas();
  const regla = reglaExoneracion(exo.tipoDocumento);
  const exoValida = !conExo || (exo.numeroDocumento.trim() && exo.tarifaExonerada > 0 && exo.tarifaExonerada <= pct
    && (!regla.pideArticulo || (exo.articulo ?? '').trim()) && (!regla.pideDescripcionTipo || (exo.tipoDocumentoOtro ?? '').trim())
    && (exo.institucion !== '99' || (exo.nombreInstitucionOtros ?? '').trim()));
  function cambiarTipoExo(t: string) {
    const r = reglaExoneracion(t);
    setExo(x => ({ ...x, tipoDocumento: t, institucion: r.institucion, nombreInstitucionOtros: r.nombreInstitucionOtros ?? '', ...(r.pideArticulo ? {} : { articulo: '', inciso: '' }) }));
  }
  const impuesto = subtotal * pct / 100;
  const exonerado = conExo ? subtotal * Math.min(exo.tarifaExonerada, pct) / 100 : 0;
  const usar = (e: ExoneracionConfig) => setExo({
    tipoDocumento: e.tipo_documento, numeroDocumento: e.numero_documento, institucion: e.institucion,
    fechaEmision: e.fecha_emision || new Date().toISOString().slice(0, 10), tarifaExonerada: Math.min(Number(e.porcentaje ?? pct), pct), nombre: e.nombre,  // en Configuración el % son puntos de tarifa
    articulo: e.articulo || '', inciso: e.inciso || '', tipoDocumentoOtro: e.tipo_documento_otro || '', nombreInstitucionOtros: e.nombre_institucion_otros || '',
  });
  return (
    <Modal open={open} title="Impuesto de la línea" onClose={onClose}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!exoValida || !otroValido} onClick={async () => {
          // Exoneración nueva escrita aquí: se puede guardar para reutilizarla
          if (conExo && pct > 0 && guardarExo) {
            await fetch('/api/exoneraciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
              nombre: exo.nombre || `Exoneración ${exo.numeroDocumento}`, tipoDocumento: exo.tipoDocumento, numeroDocumento: exo.numeroDocumento,
              institucion: exo.institucion, fechaEmision: exo.fechaEmision, porcentaje: exo.tarifaExonerada,
              articulo: exo.articulo ?? '', inciso: exo.inciso ?? '0', tipoDocumentoOtro: exo.tipoDocumentoOtro ?? '', nombreInstitucionOtros: exo.nombreInstitucionOtros ?? '',
            }) }).catch(() => {});
          }
          onAplicar({ codigoTarifa: tarifa, exoneracion: conExo && pct > 0 ? exo : null, otroImpuesto: conOtro ? otro : null, aTodas });
        }}>Aplicar</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FormField label="Impuesto">
          <Select value="01" onChange={() => {}} options={[{ value: '01', label: '01 - Impuesto al Valor Agregado (IVA)' }]} disabled />
        </FormField>
        <FormField label={gt ? 'Unidad gravable' : 'Tarifa'}>
          <Select value={tarifa} onChange={v => { setTarifa(v); setExo(x => ({ ...x, tarifaExonerada: Math.min(x.tarifaExonerada, tarifaPorcentaje(v)) })); }}
            options={tarifasPermitidas(tipoDocumento).filter(t => !gt || ugActiva(1, t.value === '08' ? 1 : 2) || t.value === codigoTarifa).map(t => ({ value: t.value, label: `${t.value} - ${t.label}` }))} />
        </FormField>
        {pct > 0 && !gt && (
          <>
            <Checkbox label="Aplicar exoneración" checked={conExo} onChange={setConExo} />
            {conExo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: C.n200, borderRadius: radius.md }}>
                {exoneraciones.filter(e => Number(e.activo) === 1).length > 0 && (
                  <FormField label="Usar una exoneración configurada">
                    <Select value="" onChange={id => { const e = exoneraciones.find(x => x.id === id); if (e) usar(e); }}
                      options={[{ value: '', label: 'Elegir' }, ...exoneraciones.filter(e => Number(e.activo) === 1).map(e => ({ value: e.id, label: `${e.nombre} (${e.numero_documento || 's/n'})` }))]} />
                  </FormField>
                )}
                <FormField label="Tipo de documento" hint={regla.ayuda}>
                  <Select value={exo.tipoDocumento} onChange={cambiarTipoExo} options={TIPOS_DOCUMENTO_EXONERACION.map(t => ({ value: t.value, label: `${t.value} - ${t.label}` }))} />
                </FormField>
                {regla.pideDescripcionTipo && (
                  <FormField label="Descripción del tipo de documento" required><Input value={exo.tipoDocumentoOtro ?? ''} onChange={v => setExo(x => ({ ...x, tipoDocumentoOtro: v }))} /></FormField>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FormField label={regla.etiquetaNumero} required><Input value={exo.numeroDocumento} onChange={v => setExo(x => ({ ...x, numeroDocumento: v }))} placeholder={regla.placeholderNumero} /></FormField>
                  <FormField label="Fecha de emisión"><Input type="date" value={exo.fechaEmision.slice(0, 10)} onChange={v => setExo(x => ({ ...x, fechaEmision: v }))} /></FormField>
                  <FormField label="Institución"><Select value={exo.institucion} onChange={v => setExo(x => ({ ...x, institucion: v }))} options={INSTITUCIONES_EXONERACION.map(t => ({ value: t.value, label: t.label }))} /></FormField>
                  {exo.institucion === '99'
                    ? <FormField label="Nombre de la institución" required><Input value={exo.nombreInstitucionOtros ?? ''} onChange={v => setExo(x => ({ ...x, nombreInstitucionOtros: v }))} /></FormField>
                    : <div />}
                  {regla.pideArticulo && <>
                    <FormField label="Artículo" required><Input value={exo.articulo ?? ''} onChange={v => setExo(x => ({ ...x, articulo: v }))} /></FormField>
                    <FormField label="Inciso" hint="0 si no tiene"><Input value={exo.inciso ?? ''} onChange={v => setExo(x => ({ ...x, inciso: v }))} /></FormField>
                  </>}
                  <FormField label={`Tarifa exonerada (máx. ${pct}%)`}><Input type="number" value={exo.tarifaExonerada} onChange={v => setExo(x => ({ ...x, tarifaExonerada: Number(v) || 0 }))} /></FormField>
                </div>
                {!exo.nombre && <Checkbox label="Guardar esta exoneración para usarla en otros comprobantes" checked={guardarExo} onChange={setGuardarExo} />}
              </div>
            )}
          </>
        )}
        {gt ? <Checkbox label="Agregar impuesto de turismo hospedaje u otro impuesto" checked={conOtro} onChange={v => { setConOtro(v); if (v && !otro.tarifa) setOtro(x => ({ ...x, codigo: '03', descripcion: 'Turismo hospedaje', tarifa: 10 })); }} />
          : <Checkbox label="Agregar otro impuesto además del IVA" checked={conOtro} onChange={setConOtro} />}
        {conOtro && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: C.n200, borderRadius: radius.md }}>
            {otrosCat.length > 0 && (
              <FormField label="Usar un impuesto configurado">
                <Select value="" onChange={id => { const i = otrosCat.find(x => x.id === id); if (i) setOtro({ codigo: '99', descripcion: i.codigo_otro || i.nombre, tarifa: Number(i.porcentaje) || 0, cuenta: i.cuenta ?? '' }); }}
                  options={[{ value: '', label: 'Elegir' }, ...otrosCat.map(i => ({ value: i.id, label: `${i.nombre} (${i.porcentaje}%)` }))]} />
              </FormField>
            )}
            <FormField label={`Impuesto (código de ${autoridad()})`}>
              <Select value={otro.codigo} onChange={v => setOtro(x => ({ ...x, codigo: v }))} options={codigosImpuesto().map(c => ({ value: c.value, label: `${c.value} - ${c.label}` }))} />
            </FormField>
            {otro.codigo === '99' && <FormField label="¿Qué otro impuesto es?" required><Input value={otro.descripcion ?? ''} onChange={v => setOtro(x => ({ ...x, descripcion: v }))} placeholder="Ej. Impuesto municipal" /></FormField>}
            <FormField label="Tarifa (%)" required hint={gt && otro.codigo === '03' ? 'Turismo hospedaje: 10 % sobre el monto gravable.' : undefined}><Input type="number" value={otro.tarifa || ''} onChange={v => setOtro(x => ({ ...x, tarifa: Number(v) || 0 }))} /></FormField>
            <CuentaCampo titulo="Cuenta contable del impuesto" value={otro.cuenta ?? ''} onChange={c => setOtro(x => ({ ...x, cuenta: c }))} grupoInicial="2"
              error={conOtro && !otro.cuenta ? 'Elige la cuenta que afecta este impuesto.' : undefined} />
          </div>
        )}
        <Checkbox label={gt ? 'Aplicar estos impuestos a todas las líneas' : 'Aplicar esta tarifa (y exoneración) a todas las líneas'} checked={aTodas} onChange={setATodas} />
        <div style={{ fontSize: 12, color: C.n700 }}>
          {gt ? <>IVA {simbolo} {impuesto.toFixed(2)}{conOtro ? ` + ${otro.codigo === '03' ? 'turismo' : 'otro'} ${simbolo} ${montoOtro.toFixed(2)}` : ''} = <b style={{ color: C.n900 }}>{simbolo} {(impuesto + montoOtro).toFixed(2)}</b></>
            : <>Impuesto {simbolo} {impuesto.toFixed(2)}{conExo && pct > 0 ? ` − exonerado ${simbolo} ${exonerado.toFixed(2)}` : ''}{conOtro ? ` + otro ${simbolo} ${montoOtro.toFixed(2)}` : ''} = <b style={{ color: C.n900 }}>{simbolo} {(impuesto - exonerado + montoOtro).toFixed(2)}</b></>}
        </div>
      </div>
    </Modal>
  );
}

export const TARIFA_LABEL_CORTA = (codigo: string) => {
  const t = tarifasIva().find(x => x.value === codigo);
  if (!t) return codigo;
  if (codigo === '10') return 'Exento';
  if (codigo === '11') return 'No sujeto';
  return `${t.tarifa}%`;
};

// ── Bien o servicio: primero lo que ya está en Inventario; si no, texto libre ──
export function ItemPicker({ valor, favoritos, onEscribir, onElegir, autoFocus, onCrear }: {
  valor: string; favoritos: FavoritoCabys[]; autoFocus?: boolean;
  onEscribir: (v: string) => void; onElegir: (f: FavoritoCabys) => void;
  onCrear?: (nombre: string) => void;     // "+ Crear en Productos/Servicios"
}) {
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null);
  const q = valor.trim().toLowerCase();
  const lista = favoritos.filter(f => f.activo !== 0 && (!q || (f.nombre || f.descripcion).toLowerCase().includes(q) || f.codigo.includes(q) || (f.codigo_interno ?? '').toLowerCase().includes(q) || (f.categoria ?? '').toLowerCase().includes(q))).slice(0, 12);
  return (
    <div ref={setAncla}>
      <input value={valor} autoFocus={autoFocus} placeholder="Buscar en Productos/Servicios o escribir…"
        onChange={e => { onEscribir(e.target.value); setAbierto(true); }}
        onFocus={e => { setAbierto(true); e.target.style.borderColor = C.brand; }}
        onBlur={e => { setTimeout(() => setAbierto(false), 120); e.target.style.borderColor = C.n500; }}
        style={{ height: 32, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: 4, fontSize: 12, fontFamily: FONT, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
      <Flotante anchor={ancla} open={abierto && (lista.length > 0 || Boolean(onCrear))} width={360}>
        <div style={{ padding: '6px 12px', fontSize: 10.5, color: C.n700, background: C.n200 }}>Productos/Servicios</div>
        {lista.map(f => (
          <div key={f.id} style={opcionEstilo} onClick={() => { onElegir(f); setAbierto(false); }}>
            <div style={{ fontWeight: 500 }}>{f.nombre || f.descripcion}</div>
            <div style={{ fontSize: 11, color: C.n700, fontVariantNumeric: 'tabular-nums' }}>{f.categoria ? `${f.categoria} · ` : ''}{esGuatemalaActual() ? (f.codigo === 'B' ? 'Bien' : 'Servicio') : `CABYS ${f.codigo}`} · IVA {esGuatemalaActual() ? Math.min(Number(f.impuesto), 12) : f.impuesto}%{f.precio_unitario ? ` · ${f.moneda === 'USD' ? '$' : simboloLocal()}${Number(f.precio_unitario).toLocaleString('en-US')}` : ''}</div>
          </div>
        ))}
        {onCrear && (
          <div style={{ ...opcionEstilo, color: C.brand, fontWeight: 500, borderBottom: 'none' }} onClick={() => { onCrear(valor.trim()); setAbierto(false); }}>
            + Crear {valor.trim() ? `«${valor.trim()}»` : 'producto o servicio'} en Productos/Servicios
          </div>
        )}
      </Flotante>
    </div>
  );
}
