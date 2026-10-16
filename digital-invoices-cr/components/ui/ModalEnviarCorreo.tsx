'use client';
// Modal único para enviar por correo (asientos, documentos emitidos y
// cualquier otra sección). Para: uno o varios correos; mensaje opcional; y
// qué archivos van adjuntos, si la sección los ofrece.
import { useState } from 'react';
import { C, FONT, Button, radius } from './primitives';
import { IcMail } from './icons';

export interface AdjuntoCorreo { id: string; label: string; marcado?: boolean; bloqueado?: boolean }

const correoValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const separar = (s: string) => s.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);

export default function ModalEnviarCorreo({ titulo = 'Enviar por correo', subtitulo, para = '', adjuntos, enviando, onEnviar, onClose }: {
  titulo?: string; subtitulo?: string; para?: string;
  adjuntos?: AdjuntoCorreo[];
  enviando?: boolean;
  onEnviar: (datos: { para: string[]; mensaje: string; adjuntos: string[] }) => void;
  onClose: () => void;
}) {
  const [destino, setDestino] = useState(para);
  const [mensaje, setMensaje] = useState('');
  const [marcados, setMarcados] = useState<Set<string>>(new Set((adjuntos ?? []).filter(a => a.marcado !== false).map(a => a.id)));
  const correos = separar(destino);
  const invalidos = correos.filter(c => !correoValido(c));
  const valido = correos.length > 0 && invalidos.length === 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: C.n000, borderRadius: radius.lg, width: 480, maxWidth: '100%', boxShadow: '0 8px 40px rgba(0,0,0,.18)', fontFamily: FONT }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{titulo}</p>
            {subtitulo && <p style={{ fontSize: 11.5, color: C.n700, margin: '3px 0 0' }}>{subtitulo}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 5 }}>Para <span style={{ color: C.error }}>*</span></label>
            <input type="email" autoFocus value={destino} onChange={e => setDestino(e.target.value)} placeholder="nombre@empresa.com"
              style={{ width: '100%', height: 34, padding: '0 10px', border: `1px solid ${destino && !valido ? C.error : C.n500}`, borderRadius: radius.md, fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 11, color: invalidos.length ? C.error : C.n700, marginTop: 4 }}>
              {invalidos.length ? `Revisa: ${invalidos.join(', ')}` : 'Para varios destinatarios, sepáralos con coma.'}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 5 }}>Mensaje (opcional)</label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={3} placeholder="Escribe un mensaje para el destinatario"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.n500}`, borderRadius: radius.md, fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          {adjuntos && adjuntos.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Archivos adjuntos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {adjuntos.map(a => (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: a.bloqueado ? 'default' : 'pointer', color: a.bloqueado ? C.n700 : C.n900 }}>
                    <input type="checkbox" checked={marcados.has(a.id)} disabled={a.bloqueado} style={{ accentColor: C.brand }}
                      onChange={e => setMarcados(s => { const n = new Set(s); if (e.target.checked) n.add(a.id); else n.delete(a.id); return n; })} />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.n500}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => valido && onEnviar({ para: correos, mensaje: mensaje.trim(), adjuntos: [...marcados] })} disabled={!valido || enviando} icon={<IcMail />}>
            {enviando ? 'Enviando…' : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
