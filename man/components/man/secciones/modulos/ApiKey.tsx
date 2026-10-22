'use client';
// API Key de un módulo: se genera en la configuración del módulo y aquí se pega y se valida. Ya conectado, se ve el
// prefijo y el último bloque, y «Cambiar API Key» permite pegar uno nuevo.
import { useState } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { Button, Input } from '@/components/suite/ui';
import { Campo, LinkButton } from '@/components/kit';
import { fmtFH } from '@/components/kit/fechas';
import { nombreModulo } from '../../catalogo';
import { ejemploApiKey } from '../../datos/conexion';
import { EstadoConexionChip } from '../../piezas';
import type { ModuloId } from '../../tipos';
import type { useIntegracion } from './integracion';

// Se ve el prefijo del módulo y el último bloque, para distinguir un API Key de otro.
const oculta = (k: string) => (/^\w+-\w{4}-\w{4}-MAN$/.test(k) ? k.replace(/^(\w+)-\w{4}-(\w{4})-MAN$/, '$1-••••-$2-MAN') : '••••••••');

export function ApiKey({ m, it }: { m: ModuloId; it: ReturnType<typeof useIntegracion> }) {
  const c = it.conexion(m);
  const [editando, setEditando] = useState(!c.apiKey);
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  const [validando, setValidando] = useState(false);
  const validar = () => {
    setValidando(true); setError('');
    setTimeout(() => {
      setValidando(false);
      const e = it.validar(m, valor);
      if (e) setError(e); else { setEditando(false); setValor(''); }
    }, 600);
  };

  if (editando) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', maxWidth: 460 }}>
          <Campo label={`API Key de ${nombreModulo(m)}`} required error={error || undefined}>
            <Input value={valor} onChange={v => { setValor(v); setError(''); }} placeholder={ejemploApiKey(m)} autoComplete="off" />
          </Campo>
        </div>
        <Button disabled={!valor.trim() || validando} onClick={validar}>{validando ? 'Validando…' : 'Validar'}</Button>
        {c.apiKey && <Button variant="secondary" onClick={() => { setEditando(false); setValor(''); setError(''); }}>Cancelar</Button>}
      </div>
      <span style={{ fontSize: 12, color: C.n700 }}>Se genera en {nombreModulo(m)}, en Configuración › Integraciones.</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', fontFamily: FONT }}>
      <Dato etiqueta="API Key"><code style={{ fontSize: 12.5, color: C.n900 }}>{oculta(c.apiKey)}</code></Dato>
      <Dato etiqueta="Estado"><EstadoConexionChip estado={c.estado} /></Dato>
      <Dato etiqueta="Validado">{c.ultimaPrueba ? fmtFH(c.ultimaPrueba) : '—'}</Dato>
      <span style={{ marginLeft: 'auto' }}><LinkButton onClick={() => setEditando(true)}>Cambiar API Key</LinkButton></span>
    </div>
  );
}

const Dato = ({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) => (
  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: C.n900 }}>
    <span style={{ fontSize: 11.5, color: C.n700 }}>{etiqueta}</span>{children}
  </span>
);
