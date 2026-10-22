'use client';
// Vista previa de la representación impresa (carta o tiquete). Muestra lo
// mismo que el PDF.
import { C, FONT } from '@/components/ui/primitives';
import { datosImpresion, esAngosto, leyendaFiscal, type DocCompleto, type FormatoImpresion } from './representacion';

export default function VistaImpresa({ doc, formato }: { doc: DocCompleto; formato: FormatoImpresion }) {
  const d = datosImpresion(doc);
  const angosto = esAngosto(doc, formato);
  const hoja = {
    background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,.08)', border: `1px solid ${C.n500}`, margin: '0 auto', color: '#141414',
    width: angosto ? 302 : 'min(816px, 100%)', padding: angosto ? '18px 16px' : '36px 40px',
    fontFamily: angosto ? "'Courier New', monospace" : FONT, fontSize: angosto ? 11 : 12,
  } as const;
  const gris = { color: '#666' };
  const num = { fontVariantNumeric: 'tabular-nums' as const, whiteSpace: 'nowrap' as const };

  if (angosto) return (
    <div style={hoja}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{d.emisor.nombre}</div>
        <div>{d.gt ? 'NIT' : 'Céd.'} {d.emisor.cedula}</div>
        {d.emisor.telefono && <div>Tel. {d.emisor.telefono}</div>}
        <div style={{ fontSize: 10 }}>{d.emisor.direccion}</div>
      </div>
      <hr style={{ border: 'none', borderTop: '1px dashed #999' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700 }}>{d.encabezado.titulo}</div>
        <div>{d.gt ? '' : 'N.º '}{d.encabezado.consecutivo}</div><div>{d.encabezado.fecha}</div>
      </div>
      <div style={{ fontSize: 9, wordBreak: 'break-all', marginTop: 4 }}>{d.gt ? 'Autorización' : 'Clave'}: {d.encabezado.clave}</div>
      <hr style={{ border: 'none', borderTop: '1px dashed #999' }} />
      <div>Cliente: {d.receptor.nombre}</div>
      {d.receptor.identificacion && <div>Id.: {d.receptor.identificacion}</div>}
      <div>{d.encabezado.condicion} · {d.encabezado.medios || '-'}</div>
      <hr style={{ border: 'none', borderTop: '1px dashed #999' }} />
      {d.lineas.map((l, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <div>{l.descripcion}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{l.cantidad} x {d.m(l.precio)} IVA {l.tarifa}%</span><b style={num}>{d.m(l.total)}</b></div>
        </div>
      ))}
      <hr style={{ border: 'none', borderTop: '1px dashed #999' }} />
      {[[d.gt ? 'Monto gravable' : 'Subtotal', d.totales.subtotal], [d.gt ? 'IVA e ITH' : 'Impuestos', d.totales.iva], ...(d.totales.otros ? [['Otros cargos', d.totales.otros]] : [])].map(([l, v]) => (
        <div key={String(l)} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{l}</span><span style={num}>{d.m(Number(v))}</span></div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}><span>TOTAL</span><span style={num}>{d.m(d.totales.total)}</span></div>
      {d.qr && <img src={d.qr} alt="QR de consulta" width={110} height={110} style={{ display: 'block', margin: '10px auto' }} />}
      {d.frases.map(f => <div key={f} style={{ textAlign: 'center', fontSize: 9, ...gris }}>{f}</div>)}
      <div style={{ textAlign: 'center', fontSize: 9, ...gris }}>{leyendaFiscal()}</div>
    </div>
  );

  // Factura electrónica de compra: el emisor es el proveedor (vendedor) y el receptor, la empresa
  const fec = doc.tipo === 'Factura electrónica de compra';
  return (
    <div style={hoja}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        {fec ? (
          <div>
            <div style={{ fontSize: 10.5, ...gris }}>Emisor (proveedor)</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{d.receptor.nombre}</div>
            <div style={gris}>{[d.receptor.identificacion && `Id. ${d.receptor.identificacion}`, d.receptor.correo].filter(Boolean).join(' · ')}</div>
          </div>
        ) : (
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{d.emisor.nombre}</div>
          <div style={gris}>{d.gt ? 'NIT' : 'Cédula'} {d.emisor.cedula}</div>
          <div style={{ ...gris, maxWidth: 360 }}>{d.emisor.direccion}</div>
          <div style={gris}>{[d.emisor.telefono, d.emisor.correo].filter(Boolean).join(' · ')}</div>
        </div>
        )}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{d.encabezado.titulo}</div>
          <div style={num}>{d.gt ? '' : 'N.º '}{d.encabezado.consecutivo}</div>
          <div style={gris}>{d.encabezado.fecha}</div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, ...gris, marginTop: 10, wordBreak: 'break-all' }}>{d.gt ? `Número de autorización: ${d.encabezado.clave || 'lo asigna el certificador'}` : `Clave ${d.encabezado.clave || 'se genera al emitir'}`}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, border: `1px solid ${C.n500}`, borderRadius: 6, padding: 12, margin: '14px 0' }}>
        <div>
          <div style={{ fontSize: 10.5, ...gris }}>{fec ? 'Receptor (mi empresa)' : 'Receptor'}</div>
          <div style={{ fontWeight: 600 }}>{fec ? d.emisor.nombre : d.receptor.nombre}</div>
          <div style={gris}>{(fec ? [`${d.gt ? 'NIT' : 'Cédula'} ${d.emisor.cedula}`, d.emisor.correo] : [d.receptor.identificacion && `Id. ${d.receptor.identificacion}`, d.receptor.correo]).filter(Boolean).join(' · ')}</div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, ...gris }}>Condiciones</div>
          <div>{d.encabezado.condicion} · {d.encabezado.medios || '-'}</div>
          <div style={gris}>Moneda: {d.encabezado.moneda}</div>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#F5F5F5' }}>
          {['Descripción', 'Cant.', 'Precio', 'Desc.', 'IVA', 'Total'].map((h, i) => <th key={h} style={{ padding: '6px 8px', fontSize: 11, textAlign: i ? 'right' : 'left' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {d.lineas.map((l, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #EEE' }}>
              <td style={{ padding: '6px 8px' }}>{l.descripcion}<div style={{ fontSize: 9.5, ...gris }}>{d.gt ? l.codigo : `CABYS ${l.codigo}`}</div></td>
              <td style={{ padding: '6px 8px', textAlign: 'right', ...num }}>{l.cantidad}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', ...num }}>{d.m(l.precio)}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', ...num }}>{l.descuento ? d.m(l.descuento) : '-'}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', ...num }}>{l.tarifa}%</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, ...num }}>{d.m(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 14, gap: 16 }}>
        {d.qr ? <img src={d.qr} alt="QR de consulta" width={96} height={96} /> : <span />}
        <div style={{ width: 240, display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4 }}>
          {d.totales.descuentos > 0 && <><span style={gris}>Descuentos</span><span style={num}>- {d.m(d.totales.descuentos)}</span></>}
          <span style={gris}>{d.gt ? 'Monto gravable' : 'Subtotal'}</span><span style={num}>{d.m(d.totales.subtotal)}</span>
          <span style={gris}>{d.gt ? 'IVA e ITH' : 'Impuestos'}</span><span style={num}>{d.m(d.totales.iva)}</span>
          {d.totales.otros > 0 && <><span style={gris}>Otros cargos</span><span style={num}>{d.m(d.totales.otros)}</span></>}
          <b style={{ fontSize: 14 }}>Total</b><b style={{ fontSize: 14, ...num }}>{d.m(d.totales.total)}</b>
        </div>
      </div>
      {d.referencia && <p style={{ ...gris, margin: '12px 0 0' }}>Referencia: {d.referencia}</p>}
      {d.observaciones && <p style={{ ...gris, margin: '6px 0 0' }}>Observaciones: {d.observaciones}</p>}
      {d.frases.length > 0 && <div style={{ fontSize: 10, ...gris, marginTop: 16 }}>{d.frases.map(f => <div key={f}>{f}</div>)}</div>}
      <p style={{ fontSize: 9.5, ...gris, textAlign: 'center', margin: '20px 0 0' }}>{leyendaFiscal()}</p>
    </div>
  );
}
