'use client';
// Conectar el buzón de facturas (IMAP) para que los XML de los proveedores
// lleguen solos a Documentos Recibidos. También permite subir correos .eml.
import { useEffect, useRef, useState } from 'react';
import { C, FONT, Button, FormField, Input, Select, Modal, Switch, radius } from '@/components/ui/primitives';
import { autoridad } from '@/lib/paisActual';

interface Config { host: string; puerto: number; seguro: boolean; usuario: string; clave: string; carpeta: string; dias: number; tieneClave?: boolean; ultima_sync?: string; ultimo_error?: string; auto: boolean; intervalo: number; correoCm?: string; correoCliente?: string }
const PROVEEDORES = [
  { value: '', label: 'Otro servidor…' },
  { value: 'imap.gmail.com', label: 'Gmail / Google Workspace' },
  { value: 'outlook.office365.com', label: 'Outlook / Microsoft 365' },
  { value: 'imap.mail.yahoo.com', label: 'Yahoo' },
  { value: 'imap.zoho.com', label: 'Zoho' },
];

export default function BuzonModal({ open, onClose, onNuevos }: { open: boolean; onClose: () => void; onNuevos: (mensaje: string) => void }) {
  const [c, setC] = useState<Config | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string; detalle?: string[] } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const emlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    fetch('/api/buzon').then(r => r.json()).then(d => { if (vivo) setC({ ...d, clave: '' }); });
    return () => { vivo = false; };
  }, [open]);
  if (!open) return null;

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setC(x => x && ({ ...x, [k]: v }));
  const configurado = Boolean(c?.host && c?.usuario && (c?.clave || c?.tieneClave));

  async function probar() {
    setOcupado('probar'); setMsg(null);
    const d = await fetch('/api/buzon/probar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).then(r => r.json());
    setOcupado(null); setMsg({ ok: d.ok, texto: d.mensaje });
  }
  async function guardar(): Promise<boolean> {
    const r = await fetch('/api/buzon', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    if (r.ok) setC(x => x && ({ ...x, tieneClave: x.tieneClave || Boolean(x.clave), clave: '' }));
    return r.ok;
  }
  async function sincronizar() {
    setOcupado('sync'); setMsg(null);
    await guardar();
    const d = await fetch('/api/buzon/sincronizar', { method: 'POST' }).then(r => r.json());
    setOcupado(null);
    setMsg({ ok: d.ok, texto: d.ok ? `${d.mensaje} Se revisaron ${d.revisados} correo${d.revisados === 1 ? '' : 's'}.` : d.mensaje,
      detalle: (d.omitidos ?? []).slice(0, 8).map((o: { asunto: string; motivo: string }) => `${o.asunto}: ${o.motivo}`) });
    if (d.nuevos) onNuevos(d.mensaje);
  }
  async function subirEml(files: FileList) {
    setOcupado('eml'); setMsg(null);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('archivos', f));
    const d = await fetch('/api/buzon/eml', { method: 'POST', body: fd }).then(r => r.json());
    setOcupado(null);
    const omit = (d.resultados ?? []).filter((x: { guardado: boolean }) => !x.guardado).map((x: { archivo: string; motivo: string }) => `${x.archivo}: ${x.motivo}`);
    setMsg({ ok: d.nuevos > 0, texto: d.nuevos ? `${d.nuevos} comprobante${d.nuevos === 1 ? '' : 's'} nuevo${d.nuevos === 1 ? '' : 's'}${d.automaticos ? `: ${d.automaticos} importado${d.automaticos === 1 ? '' : 's'} automáticamente, listo${d.automaticos === 1 ? '' : 's'} para el acuse` : ''}.` : 'Ningún correo traía un comprobante nuevo.', detalle: omit });
    if (d.nuevos) onNuevos(`${d.nuevos} comprobante${d.nuevos === 1 ? '' : 's'} desde .eml.`);
  }

  return (
    <Modal open title="Buzón de facturas de proveedores" onClose={onClose} wide
      footer={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => emlRef.current?.click()} disabled={Boolean(ocupado)}>{ocupado === 'eml' ? 'Leyendo…' : 'Subir correos .eml'}</Button>
          <input ref={emlRef} type="file" accept=".eml,message/rfc822" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) subirEml(e.target.files); e.target.value = ''; }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={probar} disabled={!configurado || Boolean(ocupado)}>{ocupado === 'probar' ? 'Probando…' : 'Probar conexión'}</Button>
          <Button variant="secondary" onClick={async () => { if (await guardar()) setMsg({ ok: true, texto: 'Guardado.' }); }} disabled={!c || Boolean(ocupado)}>Guardar</Button>
          <Button onClick={sincronizar} disabled={!configurado || Boolean(ocupado)}>{ocupado === 'sync' ? 'Revisando…' : 'Guardar y revisar ahora'}</Button>
        </div>
      </div>}>
      {!c ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
          <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>
            Conecta el correo donde los proveedores mandan las facturas. Se leen los XML adjuntos (comprobante y respuesta de {autoridad()}).
            No se borra ni se marca nada en el buzón.
          </p>
          {c.correoCm && <ReglaRedireccion correoCliente={c.usuario || c.correoCliente || ''} correoCm={c.correoCm} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '10px 12px', fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Proveedor nuevo</div>
              <div style={{ color: C.n700 }}>La factura queda en «Por importar». La importas una vez y eliges sus cuentas.</div>
            </div>
            <div style={{ border: `1px solid ${C.brandBd}`, background: C.brandBg, borderRadius: radius.md, padding: '10px 12px', fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Proveedor que ya importaste</div>
              <div style={{ color: C.n700 }}>Se importa sola con las mismas cuentas y queda en «Sin emitir». Se apaga por proveedor en Clientes y proveedores.</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 110px', gap: 10 }}>
            <FormField label="Proveedor de correo">
              <Select value={PROVEEDORES.some(p => p.value === c.host) ? c.host : ''} onChange={v => { if (v) { set('host', v); set('puerto', 993); set('seguro', true); } }} options={PROVEEDORES} />
            </FormField>
            <FormField label="Servidor IMAP" required><Input value={c.host} onChange={v => set('host', v)} placeholder="imap.midominio.com" /></FormField>
            <FormField label="Puerto"><Input value={String(c.puerto)} onChange={v => set('puerto', Number(v.replace(/\D/g, '')) || 0)} /></FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Usuario (correo)" required><Input value={c.usuario} onChange={v => set('usuario', v)} placeholder="facturas@mihotel.cr" /></FormField>
            <FormField label="Contraseña" required hint={c.tieneClave && !c.clave ? 'Guardada. Escribe otra solo para cambiarla.' : 'En Gmail y Outlook: contraseña de aplicación.'}>
              <Input value={c.clave} onChange={v => set('clave', v)} type="password" placeholder={c.tieneClave ? '••••••••' : ''} />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
            <FormField label="Carpeta"><Input value={c.carpeta} onChange={v => set('carpeta', v)} placeholder="INBOX" /></FormField>
            <FormField label="La primera vez, traer los últimos"><Select value={String(c.dias)} onChange={v => set('dias', Number(v))} options={[7, 15, 30, 60, 90].map(n => ({ value: String(n), label: `${n} días` }))} /></FormField>
            <div style={{ paddingBottom: 6 }}><Switch checked={c.seguro} onChange={v => set('seguro', v)} label="Conexión segura (SSL)" /></div>
          </div>
          <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Switch checked={c.auto} onChange={v => set('auto', v)} label="Revisar el buzón automáticamente" />
            {c.auto && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                cada
                <div style={{ width: 130 }}><Select value={String(c.intervalo)} onChange={v => set('intervalo', Number(v))} options={[5, 15, 30, 60].map(n => ({ value: String(n), label: n === 60 ? '1 hora' : `${n} minutos` }))} /></div>
              </div>
            )}
            <span style={{ fontSize: 11.5, color: C.n700, flex: '1 1 220px' }}>{c.auto ? 'No hace falta tocar «Revisar ahora»: las facturas nuevas van apareciendo solas.' : 'Solo se revisa cuando tocas «Revisar ahora».'}</span>
          </div>
          {(c.ultima_sync || c.ultimo_error) && !msg && (
            <div style={{ fontSize: 11.5, color: c.ultimo_error ? C.error : C.n700 }}>
              {c.ultima_sync ? `Última revisión: ${new Date(c.ultima_sync).toLocaleString('es-CR')}. ` : ''}{c.ultimo_error}
            </div>
          )}
          {msg && (
            <div style={{ padding: '10px 12px', borderRadius: radius.md, fontSize: 12, background: msg.ok ? '#EAF7EE' : '#FDECEC', color: msg.ok ? '#1E6B35' : C.error }}>
              {msg.texto}
              {msg.detalle && msg.detalle.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: C.n700 }}>{msg.detalle.map((d, i) => <li key={i}>{d}</li>)}</ul>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// Correo del cliente → correo de CM: el cliente crea una regla en su correo
// para reenviar las facturas de proveedores a la dirección de CM.
function ReglaRedireccion({ correoCliente, correoCm }: { correoCliente: string; correoCm: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14, fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Redirige las facturas a CM</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ background: C.n200, borderRadius: radius.md, padding: '8px 10px' }}>
          <div style={{ fontSize: 10.5, color: C.n700 }}>Tu correo (donde llegan las facturas)</div>
          <div style={{ fontWeight: 500, wordBreak: 'break-all' }}>{correoCliente || 'El correo de tu empresa'}</div>
        </div>
        <span aria-hidden style={{ color: C.n700, fontSize: 16 }}>→</span>
        <div style={{ background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.md, padding: '8px 10px' }}>
          <div style={{ fontSize: 10.5, color: C.n700 }}>Correo de CM</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, wordBreak: 'break-all', flex: 1 }}>{correoCm}</span>
            <button onClick={() => { navigator.clipboard?.writeText(correoCm); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
              style={{ background: 'none', border: 'none', color: C.brand, cursor: 'pointer', fontFamily: FONT, fontSize: 11.5, textDecoration: 'underline' }}>{copiado ? 'Copiado' : 'Copiar'}</button>
          </div>
        </div>
      </div>
      <ol style={{ margin: '10px 0 0', paddingLeft: 18, color: C.n700, lineHeight: 1.55 }}>
        <li>En tu correo, crea una regla (Gmail: Configuración › Filtros; Outlook: Reglas) para los mensajes que traen archivos .xml.</li>
        <li>Elige «Reenviar a» y pega el correo de CM. Gmail te pide confirmar el reenvío con un código.</li>
        <li>Las facturas que lleguen se leen solas y aparecen en Compras.</li>
      </ol>
    </div>
  );
}
