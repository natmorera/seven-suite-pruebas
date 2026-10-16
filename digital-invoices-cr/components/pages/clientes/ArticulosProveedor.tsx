'use client';
// Artículos que compra un proveedor: para cada código o descripción que trae
// en sus facturas, en qué cuenta contable se registra, cuánto IVA es
// acreditable y si va a gasto, servicio o inventario. Lo usa la importación
// de compras (y lo va aprendiendo cuando se clasifica una compra).
import { useEffect, useState } from 'react';
import { C, FONT, Button, Select, StatusBadge, radius } from '@/components/ui/primitives';
import { CuentaCampo, nombreDeCuenta } from '@/components/pages/facturacion/CuentaPicker';

interface Fila { clave: string; codigo: string; descripcion: string; cuenta: string; credito: string; destino: string; articuloId: string | null; veces: number; ultima: string; tarifa: number | null; configurado: boolean }
interface Articulo { id: string; nombre: string; descripcion: string; inventariable?: number; cuenta_inventario?: string; cuenta_costo?: string }

const CREDITOS = [{ value: 'pleno', label: 'IVA acreditable completo' }, { value: 'parcial', label: 'IVA acreditable parcial' }, { value: 'sin_derecho', label: 'Sin IVA acreditable' }];
const DESTINOS = [{ value: 'gasto', label: 'Gasto' }, { value: 'servicio', label: 'Servicio' }, { value: 'inventario', label: 'Inventario' }];

export default function ArticulosProveedor({ identificacion, onGuardado }: { identificacion: string; onGuardado: (m: string) => void }) {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [editando, setEditando] = useState<Fila | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let vivo = true;
    if (!identificacion) return;
    fetch(`/api/compras-mapeo?proveedor=${encodeURIComponent(identificacion)}`).then(r => r.json()).then((d: Fila[]) => { if (vivo) setFilas(Array.isArray(d) ? d : []); }).catch(() => { if (vivo) setFilas([]); });
    fetch('/api/cabys-favoritos').then(r => r.json()).then((d: Articulo[]) => { if (vivo && Array.isArray(d)) setArticulos(d.filter(a => Number(a.inventariable ?? 0) === 1)); }).catch(() => {});
    return () => { vivo = false; };
  }, [identificacion, version]);

  async function guardar() {
    if (!editando) return;
    setError(null);
    const r = await fetch('/api/compras-mapeo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editando, proveedor: identificacion }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error ?? 'No se pudo guardar.'); return; }
    setEditando(null); setVersion(v => v + 1); onGuardado('Artículo configurado. Las próximas compras de este proveedor lo usan.');
  }

  if (!identificacion) return <p style={{ fontSize: 12, color: C.n700 }}>Agrega la cédula del proveedor en Información básica para configurar sus artículos.</p>;
  if (!filas) return <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p>;
  const th = { padding: '10px 12px', fontSize: 11, fontWeight: 500, color: C.n700, textAlign: 'left' as const, whiteSpace: 'nowrap' as const };
  const td = { padding: '10px 12px', fontSize: 12, borderTop: `1px solid ${C.n500}`, verticalAlign: 'top' as const };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
      <p style={{ fontSize: 12, color: C.n700, margin: 0, lineHeight: 1.5 }}>
        Lo que este proveedor te factura. Para cada artículo elige la cuenta contable, el IVA acreditable y si va a gasto, servicio o inventario. Al importar sus facturas se aplica solo.
      </p>
      {filas.length === 0 ? (
        <p style={{ fontSize: 12, color: C.n700, border: `1px dashed ${C.n500}`, borderRadius: 8, padding: 14, textAlign: 'center' }}>Todavía no hay compras de este proveedor. Los artículos aparecen aquí con su primera factura.</p>
      ) : (
        <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: C.n200 }}>
              <th style={th}>Artículo</th><th style={th}>Cuenta contable</th><th style={th}>IVA acreditable</th><th style={th}>Destino</th><th style={th} />
            </tr></thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.clave}>
                  <td style={td}>
                    <div>{f.descripcion || f.codigo}</div>
                    <div style={{ fontSize: 11, color: C.n700 }}>{f.codigo ? `Código ${f.codigo}` : 'Sin código'}{f.veces ? ` · ${f.veces} compra${f.veces === 1 ? '' : 's'}` : ''}</div>
                  </td>
                  <td style={td}>{f.cuenta ? <><span style={{ fontVariantNumeric: 'tabular-nums' }}>{f.cuenta}</span><div style={{ fontSize: 11, color: C.n700 }}>{nombreDeCuenta(f.cuenta)}</div></> : <StatusBadge label="Sin configurar" color="yellow" />}</td>
                  <td style={td}>{CREDITOS.find(c => c.value === f.credito)?.label ?? <span style={{ color: C.n700 }}>El del proveedor</span>}</td>
                  <td style={td}>{f.destino === 'inventario' ? `Inventario · ${articulos.find(a => a.id === f.articuloId)?.nombre ?? 'artículo'}` : DESTINOS.find(d => d.value === f.destino)?.label ?? <span style={{ color: C.n700 }}>Gasto</span>}</td>
                  <td style={{ ...td, textAlign: 'right' }}><Button variant="secondary" onClick={() => { setError(null); setEditando({ ...f, credito: f.credito || 'pleno', destino: f.destino || 'gasto' }); }} style={{ height: 28 }}>{f.configurado ? 'Editar' : 'Configurar'}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editando && (
        <div style={{ border: `1px solid ${C.brandBd}`, background: C.brandBg, borderRadius: radius.md, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{editando.descripcion || editando.codigo}</div>
          {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'start' }}>
            <CuentaCampo titulo="Cuenta contable" value={editando.cuenta} onChange={c => setEditando(x => x && ({ ...x, cuenta: c }))} grupoInicial={editando.destino === 'inventario' ? '1' : '6'} />
            <div><div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>IVA acreditable</div>
              <Select value={editando.credito} onChange={v => setEditando(x => x && ({ ...x, credito: v }))} options={CREDITOS} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Destino</div>
              <Select value={editando.destino} onChange={v => setEditando(x => x && ({ ...x, destino: v }))} options={DESTINOS} /></div>
            {editando.destino === 'inventario' && (
              <div><div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Artículo de inventario</div>
                <Select value={editando.articuloId ?? ''} onChange={v => { const a = articulos.find(x => x.id === v); setEditando(x => x && ({ ...x, articuloId: v || null, cuenta: a?.cuenta_inventario || x.cuenta })); }}
                  options={[{ value: '', label: articulos.length ? 'Elegir' : 'No hay artículos inventariables' }, ...articulos.map(a => ({ value: a.id, label: a.nombre || a.descripcion }))]} />
                <div style={{ fontSize: 11, color: C.n700, marginTop: 4 }}>La compra suma existencias a este artículo; la cuenta se toma de su cuenta de inventario.</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
