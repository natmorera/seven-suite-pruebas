'use client';
// Carga masiva de compras desde Excel (se abre desde «Importar XML»):
// se descarga la plantilla, se llena y se sube; las filas con el mismo número
// de factura y proveedor forman una compra. El proveedor queda con su cuenta
// nivel 4 (sugerida por cédula o nombre, o una cuenta nueva) y cada línea con
// su cuenta de gasto/costo.
import { useMemo, useRef, useState } from 'react';
import { conContabilidad } from '@/lib/modulosCliente';
import { C, FONT, Button, radius, shadow, StatusBadge } from '@/components/ui/primitives';
import { IcExport, IcImport } from '@/components/ui/icons';
import CuentaSelect from './CuentaSelect';
import { useCuentasCompra, MOTIVO_TXT } from './useCuentasCompra';
import { type CreditoFiscal, monto } from './comprasComun';
import { siguienteAuxiliar, DETALLE_PROVEEDORES, soloDigitos, type CuentaOpcion } from '@/lib/cuentasContables';
import { descargarPlantilla, leerExcel, celda, numero } from '@/lib/excel';

const TIPOS = ['Factura electrónica', 'Tiquete electrónico', 'Nota de crédito', 'Nota de débito', 'Recibo / comprobante sin XML'];
const r2 = (n: number) => Math.round(n * 100) / 100;

interface DocMasivo {
  key: string; fila: number; fecha: string; tipo: string; numero: string; cedula: string; proveedor: string; moneda: string; tipoCambio: number;
  credito: CreditoFiscal; lineas: { detalle: string; subtotal: number; tarifa: number; cuenta: string; motivo: string }[];
  cuentaProveedor: string; cuentaNueva: CuentaOpcion | null; motivo: string; errores: string[];
}


export default function RegistrarCompraManualModal({ open, onClose, onCreado }: {
  open: boolean; onClose: () => void; onCreado: (msg?: string) => void;
}) {
  const cx = useCuentasCompra();
  // Solo facturación: sin cuentas contables
  const contab = conContabilidad();
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function limpiarYcerrar() {
    setError(null); setMasivo([]); setArchivo('');
    onClose();
  }

  function docPayload(d: { proveedor: string; cedula: string; tipo: string; numero: string; fecha: string; moneda: string; tipoCambio: number; credito: CreditoFiscal;
    lineas: { detalle: string; subtotal: number; tarifa: number; cuenta: string }[]; cuentaProveedor: string; cuentaNueva: CuentaOpcion | null }) {
    const ls = d.lineas.map((l, i) => {
      const imp = r2(l.subtotal * l.tarifa / 100);
      return { numero: i + 1, cabys: '', detalle: l.detalle, cantidad: 1, unidad: 'Sp', precioUnitario: l.subtotal, descuento: 0, subtotal: l.subtotal, tarifa: l.tarifa, impuesto: imp, total: r2(l.subtotal + imp), cuenta: l.cuenta };
    });
    const sub = r2(ls.reduce((a, l) => a + l.subtotal, 0));
    const iv = r2(ls.reduce((a, l) => a + l.impuesto, 0));
    const tarifaPrincipal = ls.slice().sort((a, b) => b.subtotal - a.subtotal)[0]?.tarifa ?? 13;
    return {
      clave: '', tipo: d.tipo, consecutivo: d.numero, fechaEmision: d.fecha ? `${d.fecha}T12:00:00` : new Date().toISOString(),
      proveedor: d.proveedor, proveedorIdentificacion: d.cedula, moneda: d.moneda, tipoCambio: d.moneda === 'USD' ? d.tipoCambio : 1,
      subtotal: sub, iva: iv, total: r2(sub + iv), totalExento: r2(ls.filter(l => l.tarifa === 0).reduce((a, l) => a + l.subtotal, 0)), tarifa: tarifaPrincipal,
      lineas: ls, tipoCreditoFiscal: d.tipo === 'Tiquete electrónico' || d.tipo.startsWith('Recibo') ? 'sin_derecho' : d.credito, origen: 'manual',
      cuentaProveedor: d.cuentaProveedor, crearProveedor: Boolean(d.cuentaNueva && d.cuentaNueva.code === d.cuentaProveedor),
      cuentaProveedorNombre: (cx.proveedores.find(p => p.code === d.cuentaProveedor) ?? d.cuentaNueva)?.nombre ?? d.proveedor,
    };
  }

  async function enviar(documentos: unknown[]) {
    const res = await fetch('/api/recepcion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentos }) });
    const data = await res.json();
    return (data.resultados ?? []) as { ok: boolean; consecutivo: string; error?: string }[];
  }

  // ── Carga masiva ──────────────────────────────────────────────────────────
  const [masivo, setMasivo] = useState<DocMasivo[]>([]);
  const [archivo, setArchivo] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function plantilla() {
    descargarPlantilla('plantilla-compras.xlsx', [{
      nombre: 'Compras',
      columnas: [
        { titulo: 'Fecha*', ancho: 12, nota: 'AAAA-MM-DD o DD/MM/AAAA.' },
        { titulo: 'Tipo de comprobante', ancho: 22, nota: TIPOS.join(', ') + '. Vacío = Factura electrónica.' },
        { titulo: 'Número de factura*', ancho: 24, nota: 'Consecutivo del proveedor. Varias filas con el mismo número y cédula = varias líneas de la misma compra.' },
        { titulo: 'Cédula proveedor', ancho: 16, nota: contab ? 'Con o sin guiones. Sirve para encontrar su cuenta contable.' : 'Con o sin guiones.' },
        { titulo: 'Proveedor*', ancho: 32 },
        { titulo: 'Moneda', ancho: 8, nota: 'CRC o USD. Vacío = CRC.' },
        { titulo: 'Tipo de cambio', ancho: 12, nota: 'Obligatorio si la moneda es USD.' },
        { titulo: 'Detalle*', ancho: 36, nota: 'Qué se compró. Se usa para sugerir la cuenta.' },
        { titulo: 'Subtotal sin IVA*', ancho: 16 },
        { titulo: 'IVA %', ancho: 8, nota: '13, 4, 2, 1 o 0. Vacío = 13.' },
        { titulo: 'Condición IVA', ancho: 14, nota: 'pleno, parcial o sin_derecho. Vacío = pleno.' },
        ...(contab ? [
          { titulo: 'Cuenta contable', ancho: 18, nota: 'Opcional. Código de la cuenta de gasto/costo/inventario (ej. 800-001-0004). Vacío = se sugiere.' },
          { titulo: 'Cuenta proveedor', ancho: 20, nota: 'Opcional. Cuenta nivel 4 del proveedor (ej. 300-001-0001-0002). Vacío = se busca por cédula o nombre.' },
        ] : []),
      ],
      ejemplos: [
        ['2026-09-15', 'Factura electrónica', '00100001010000004521', '3-101-222333', 'Comercial Ferretero Monteverde', 'CRC', '', 'Llave de control 1/2"', 12500, 13, 'pleno', '', ''],
        ['2026-09-15', 'Factura electrónica', '00100001010000004521', '3-101-222333', 'Comercial Ferretero Monteverde', 'CRC', '', 'Pintura blanca galón', 18000, 13, 'pleno', '', ''],
        ['2026-09-16', 'Factura electrónica', '00100001010000000877', '3-101-777888', 'Distribuidora de Alimentos del Norte', 'CRC', '', 'Frutas y verduras', 45000, 1, 'pleno', '700-001-0001', ''],
        ['2026-09-17', 'Recibo / comprobante sin XML', 'R-2231', '', 'Lavandería La Fortuna', 'USD', 520, 'Lavado de blancos septiembre', 180, 0, 'sin_derecho', '', ''],
      ].map(f => contab ? f : f.slice(0, 11)),
    }], [
      'Una fila por línea de compra. Las columnas con * son obligatorias.',
      'Si una factura tiene varias líneas, repite fecha, número y proveedor en cada fila.',
      'No cambies los títulos. Borra las filas de ejemplo antes de subir.',
      contab ? 'Al subir el archivo vas a poder revisar y cambiar la cuenta del proveedor antes de crear las compras.' : 'Al subir el archivo vas a poder revisar las compras antes de crearlas.',
    ]);
  }

  function fechaISO(s: string) {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
  }

  async function leer(file: File) {
    setError(null); setArchivo(file.name);
    try {
      const filas = await leerExcel(file, 'Compras');
      const grupos = new Map<string, DocMasivo>();
      const usadas: CuentaOpcion[] = [...cx.proveedores];
      const nuevas = new Map<string, CuentaOpcion>();
      filas.forEach((f, i) => {
        const numeroF = celda(f, 'Número de factura', 'Numero de factura', 'Número');
        const ced = celda(f, 'Cédula proveedor', 'Cedula proveedor', 'Cédula');
        const prov = celda(f, 'Proveedor');
        const key = `${numeroF}|${soloDigitos(ced) || prov.toLowerCase()}`;
        let d = grupos.get(key);
        if (!d) {
          const mon = celda(f, 'Moneda').toUpperCase() === 'USD' ? 'USD' : 'CRC';
          const cred = celda(f, 'Condición IVA', 'Condicion IVA').toLowerCase().replace(/\s/g, '_');
          const tipoF = celda(f, 'Tipo de comprobante');
          d = {
            key, fila: i + 2, fecha: fechaISO(celda(f, 'Fecha')), tipo: TIPOS.find(t => t.toLowerCase() === tipoF.toLowerCase()) ?? TIPOS[0],
            numero: numeroF, cedula: ced, proveedor: prov, moneda: mon, tipoCambio: numero(celda(f, 'Tipo de cambio')),
            credito: (['pleno', 'parcial', 'sin_derecho'].includes(cred) ? cred : 'pleno') as CreditoFiscal,
            lineas: [], cuentaProveedor: '', cuentaNueva: null, motivo: '', errores: [],
          };
          // Cuenta del proveedor: la del Excel, la aprendida/por cédula/por nombre, o una nueva
          const ctaExcel = celda(f, 'Cuenta proveedor');
          const s = cx.sugerirProveedor(prov, ced);
          if (ctaExcel && cx.proveedores.some(p => p.code === ctaExcel)) { d.cuentaProveedor = ctaExcel; d.motivo = 'excel'; }
          else if (s.cuenta) { d.cuentaProveedor = s.cuenta.code; d.motivo = s.aprendida ? 'aprendida' : s.motivo; }
          else {
            const k = soloDigitos(ced) || prov.toLowerCase();
            const n = nuevas.get(k) ?? { ...s.nueva!, code: siguienteAuxiliar(DETALLE_PROVEEDORES.code, usadas), nombre: prov || 'Proveedor nuevo' };
            if (!nuevas.has(k)) { nuevas.set(k, n); usadas.push(n); }
            d.cuentaNueva = n; d.cuentaProveedor = n.code; d.motivo = 'nueva';
          }
          if (!d.fecha) d.errores.push('fecha');
          if (!numeroF) d.errores.push('número de factura');
          if (!prov) d.errores.push('proveedor');
          if (mon === 'USD' && !(d.tipoCambio > 0)) d.errores.push('tipo de cambio');
          grupos.set(key, d);
        }
        const detalle = celda(f, 'Detalle');
        const sub = numero(celda(f, 'Subtotal sin IVA', 'Subtotal'));
        const ivaTxt = celda(f, 'IVA %', 'IVA');
        const ctaLinea = celda(f, 'Cuenta contable');
        const sug = cx.sugerirLinea(ced, { detalle });
        const valida = ctaLinea && cx.cuentasLinea.some(c => c.code === ctaLinea);
        if (!detalle || !(sub > 0)) d.errores.push(`fila ${i + 2}: detalle o subtotal`);
        d.lineas.push({ detalle, subtotal: sub, tarifa: ivaTxt ? numero(ivaTxt) : 13, cuenta: valida ? ctaLinea : sug.cuenta, motivo: valida ? 'excel' : sug.motivo });
      });
      setMasivo([...grupos.values()]);
      if (!grupos.size) setError('El archivo no tiene filas. Usa la hoja «Compras» de la plantilla.');
    } catch {
      setError('No se pudo leer el archivo. Usa la plantilla de Excel.');
    }
  }

  const masivoOk = masivo.filter(d => !d.errores.length);
  async function crearMasivo() {
    if (!masivoOk.length) return;
    setGuardando(true); setError(null);
    const r = await enviar(masivoOk.map(d => docPayload({ ...d, numero: d.numero, lineas: d.lineas.filter(l => l.detalle && l.subtotal > 0) })));
    setGuardando(false);
    const ok = r.filter(x => x.ok).length;
    const fallidas = r.filter(x => !x.ok);
    onCreado(fallidas.length ? `${ok} compras creadas; ${fallidas.length} no: ${fallidas.slice(0, 3).map(f => `${f.consecutivo} (${f.error})`).join('; ')}` : `${ok} compras creadas desde Excel.`);
    limpiarYcerrar();
  }

  const totalMasivo = useMemo(() => masivoOk.reduce((a, d) => a + d.lineas.reduce((b, l) => b + l.subtotal * (1 + l.tarifa / 100), 0) * (d.moneda === 'USD' ? d.tipoCambio : 1), 0), [masivoOk]);

  if (!open) return null;
  const th = { padding: '7px 8px', fontSize: 11, fontWeight: 500, color: C.n700, textAlign: 'left' as const, background: C.n200, whiteSpace: 'nowrap' as const };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT }}
      onClick={() => !guardando && limpiarYcerrar()}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: radius.lg, width: 'min(1040px, 96vw)', maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: shadow.modal, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Importar compras desde Excel</p>
          </div>
          <button onClick={limpiarYcerrar} aria-label="Cerrar" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.n700 }}>×</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px', border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>1. Descarga la plantilla</div>
                <p style={{ fontSize: 11.5, color: C.n700, margin: '4px 0 10px' }}>Una fila por línea de compra. Trae ejemplos y una hoja de instrucciones.</p>
                <Button variant="secondary" icon={<IcExport />} onClick={plantilla}>Descargar plantilla de Excel</Button>
              </div>
              <div style={{ flex: '1 1 300px', border: `1.5px dashed ${archivo ? C.brand : C.n500}`, background: archivo ? C.brandBg : '#fff', borderRadius: radius.md, padding: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>2. Sube el archivo lleno</div>
                <p style={{ fontSize: 11.5, color: C.n700, margin: '4px 0 10px' }}>{archivo ? `Archivo: ${archivo}` : 'Formato .xlsx. Vas a poder revisar antes de crear.'}</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) leer(f); e.target.value = ''; }} />
                <Button icon={<IcImport />} onClick={() => fileRef.current?.click()} disabled={!cx.listo}>{archivo ? 'Elegir otro archivo' : 'Subir Excel'}</Button>
              </div>
            </div>

            {masivo.length > 0 && (
              <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr>
                    <th style={th}>Proveedor</th>{contab && <th style={{ ...th, width: 260 }}>Cuenta del proveedor</th>}<th style={th}>Comprobante</th><th style={th}>Líneas</th>
                    <th style={{ ...th, textAlign: 'right' }}>Total</th><th style={th}>Revisión</th>
                  </tr></thead>
                  <tbody>
                    {masivo.map(d => {
                      const tot = d.lineas.reduce((a, l) => a + l.subtotal * (1 + l.tarifa / 100), 0);
                      return (
                        <tr key={d.key} style={{ borderTop: `1px solid ${C.n500}`, verticalAlign: 'top' }}>
                          <td style={{ padding: 8 }}><div style={{ fontWeight: 500 }}>{d.proveedor || '-'}</div><div style={{ fontSize: 11, color: C.n700 }}>{d.cedula ? `Céd. ${d.cedula}` : 'Sin cédula'}</div></td>
                          {contab && <td style={{ padding: 6 }}>
                            <CuentaSelect compacto value={d.cuentaProveedor} opciones={cx.proveedores} nueva={d.cuentaNueva} sugerencia={d.motivo === 'excel' ? 'Del Excel' : MOTIVO_TXT[d.motivo] ?? ''}
                              onChange={code => setMasivo(ms => ms.map(x => x.key === d.key ? { ...x, cuentaProveedor: code, motivo: 'manual' } : x))} />
                          </td>}
                          <td style={{ padding: 8 }}><div>{d.tipo}</div><div style={{ fontSize: 11, color: C.n700, fontVariantNumeric: 'tabular-nums' }}>{d.numero} · {d.fecha}</div></td>
                          <td style={{ padding: 8, fontSize: 11.5 }}>
                            {d.lineas.map((l, i) => <div key={i} style={{ color: C.n700 }}>{l.detalle || '-'}{contab && <> → <span style={{ color: C.n900, fontVariantNumeric: 'tabular-nums' }}>{l.cuenta}</span></>}</div>)}
                          </td>
                          <td style={{ padding: 8, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 500 }}>{monto(tot, d.moneda)}</td>
                          <td style={{ padding: 8 }}>
                            {d.errores.length ? <><StatusBadge label="Falta" color="red" /><div style={{ fontSize: 11, color: C.error, marginTop: 4 }}>{d.errores.join(', ')}</div></> : <StatusBadge label="Listo" color="green" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
          {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.n700 }}>
            {masivo.length > 0 ? <><b style={{ color: C.n900 }}>{masivoOk.length}</b> de {masivo.length} compras listas · Total {monto(totalMasivo)}</> : 'Las compras quedan «Sin acuse»; el asiento se genera al emitir el acuse.'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={limpiarYcerrar} disabled={guardando}>Cancelar</Button>
            <Button onClick={crearMasivo} disabled={guardando || !masivoOk.length}>{guardando ? 'Importando…' : `Importar ${masivoOk.length || ''} compra${masivoOk.length === 1 ? '' : 's'}`}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
