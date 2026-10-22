'use client';
import { conContabilidad } from '@/lib/modulosCliente';
// Importar comprobantes emitidos con otro sistema (XML o .zip con varios XML)
// para poder hacerles notas de crédito o débito desde aquí.
import { useState } from 'react';
import { C, FONT, Modal, Button, StatusBadge } from '@/components/ui/primitives';
import { parsearCompraXml, type CompraXml } from '@/lib/xmlCompra';
import { leerZip } from '@/lib/leerZip';
import { simboloLocal } from '@/lib/paisActual';

interface Item { nombre: string; doc?: CompraXml; xml?: string; error?: string; estado?: 'listo' | 'importado' | 'error'; mensaje?: string }
const money = (n: number, m: string) => `${m === 'USD' ? '$' : simboloLocal()}${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ImportarExternoModal({ onClose, onHecho }: { onClose: () => void; onHecho: (m: string) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [trabajando, setTrabajando] = useState(false);

  async function leer(files: FileList | null) {
    if (!files) return;
    const archivos: File[] = [];
    for (const f of Array.from(files)) {
      if (/\.zip$/i.test(f.name)) archivos.push(...(await leerZip(f).catch(() => [])).filter(x => /\.xml$/i.test(x.name) && !/respuesta/i.test(x.name)));
      else archivos.push(f);
    }
    const nuevos: Item[] = [];
    for (const f of archivos) {
      const texto = await f.text();
      const r = parsearCompraXml(texto, new DOMParser());
      nuevos.push(r.ok ? { nombre: f.name, doc: r.doc, xml: r.xml, estado: 'listo' } : { nombre: f.name, error: r.error, estado: 'error' });
    }
    setItems(x => [...x, ...nuevos]);
  }

  async function importar() {
    setTrabajando(true);
    let ok = 0;
    const res: Item[] = [];
    for (const it of items) {
      if (it.estado !== 'listo' || !it.doc) { res.push(it); continue; }
      const r = await fetch('/api/documentos/importar-externo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc: it.doc, xml: it.xml }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { ok++; res.push({ ...it, estado: 'importado', mensaje: `Sucursal ${d.sucursal}, terminal ${d.terminal}` }); }
      else res.push({ ...it, estado: 'error', error: d.error ?? 'No se pudo importar.' });
    }
    setItems(res); setTrabajando(false);
    if (ok) onHecho(`Se importaron ${ok} comprobante${ok === 1 ? '' : 's'} de otro sistema. Ya puedes hacerles nota de crédito o débito.`);
  }

  const listos = items.filter(i => i.estado === 'listo').length;
  return (
    <Modal open title="Importar comprobantes de otro sistema" onClose={onClose} width={720}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button onClick={importar} disabled={!listos || trabajando}>{trabajando ? 'Importando…' : `Importar ${listos || ''}`}</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT, fontSize: 12.5 }}>
        <p style={{ margin: 0, color: C.n700, lineHeight: 1.5 }}>
          Sube el XML de facturas o tiquetes que emitiste con otro sistema (o un .zip con varios). Quedan como aceptados para que puedas hacerles nota de crédito o débito desde aquí;
          {conContabilidad() ? 'no generan asiento ni suman en los reportes' : 'no suman en los reportes'}, porque ya los declaró el otro sistema. La nota sale con la misma sucursal y terminal del documento original: necesitas tener esa caja creada.
        </p>
        <label style={{ border: `1px dashed ${C.n500}`, borderRadius: 8, padding: 18, textAlign: 'center', cursor: 'pointer', color: C.brand }}>
          Elegir XML o .zip
          <input type="file" accept=".xml,.zip,text/xml,application/zip" multiple onChange={e => leer(e.target.files)} style={{ display: 'none' }} />
        </label>
        {items.length > 0 && (
          <div style={{ border: `1px solid ${C.n500}`, borderRadius: 8, overflow: 'hidden' }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', gap: 12, padding: '10px 14px', borderTop: i ? `1px solid ${C.n500}` : 'none', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  {it.doc ? <>
                    <div style={{ fontWeight: 500 }}>{it.doc.tipo} {it.doc.consecutivo}</div>
                    <div style={{ fontSize: 11.5, color: C.n700 }}>{it.doc.receptorNombre || 'Consumidor final'} · {new Date(it.doc.fechaEmision).toLocaleDateString('es-CR')} · sucursal {it.doc.consecutivo.slice(0, 3)}, terminal {it.doc.consecutivo.slice(3, 8)}</div>
                  </> : <div style={{ fontWeight: 500 }}>{it.nombre}</div>}
                  {(it.error || it.mensaje) && <div style={{ fontSize: 11.5, color: it.error ? C.error : C.n700, marginTop: 2 }}>{it.error ?? it.mensaje}</div>}
                </div>
                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{it.doc ? money(it.doc.totalComprobante, it.doc.moneda) : ''}</div>
                <div style={{ textAlign: 'right' }}><StatusBadge label={it.estado === 'importado' ? 'Importado' : it.estado === 'error' ? 'No se importa' : 'Listo'} color={it.estado === 'importado' ? 'green' : it.estado === 'error' ? 'red' : 'blue'} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
