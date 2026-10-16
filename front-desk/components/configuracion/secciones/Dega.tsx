'use client';
import { useState } from 'react';
import { C, radius } from '@/components/suite/tokens';
import { Button, Input, Switch } from '@/components/suite/ui';
import { usePatch } from '../store';
import { Aviso, Campo, ConfigCard, Grid, IcCheckLine, SubCard } from '../kit';

export default function Dega() {
  const [d, patch] = usePatch('dega');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const probar = () => {
    const falta = [!/^https:\/\//.test(d.url) && 'URL https', !d.usuario && 'usuario', !d.clave && 'clave', !d.sucursal && 'sucursal'].filter(Boolean);
    setMsg(falta.length ? { ok: false, t: `Completa: ${falta.join(', ')}.` } : { ok: true, t: 'Datos completos. La conexión se probará contra el servicio de DEGA al guardar.' });
  };
  return (
    <ConfigCard title="Seven DEGA" actions={<Switch checked={d.activo} onChange={b => patch({ activo: b })} label={d.activo ? 'Integración activa' : 'Integración inactiva'} />}>
      <Aviso tono="warning">Esta pantalla no está en el diseño entregado: es una propuesta base con los datos típicos de conexión. Ajustar cuando exista el diseño de DEGA.</Aviso>
      <SubCard title="Conexión" actions={<Button variant="secondary" icon={<IcCheckLine />} onClick={probar} disabled={!d.activo}>Probar conexión</Button>}>
        <Grid cols={2}>
          <Campo label="URL del servicio"><Input value={d.url} onChange={v => patch({ url: v })} placeholder="https://" disabled={!d.activo} /></Campo>
          <Campo label="Usuario"><Input value={d.usuario} onChange={v => patch({ usuario: v })} disabled={!d.activo} /></Campo>
          <Campo label="Clave"><Input type="password" value={d.clave} onChange={v => patch({ clave: v })} disabled={!d.activo} autoComplete="new-password" /></Campo>
          <Campo label="Sucursal"><Input value={d.sucursal} onChange={v => patch({ sucursal: v })} disabled={!d.activo} /></Campo>
          <Campo label="Terminal"><Input value={d.terminal} onChange={v => patch({ terminal: v })} disabled={!d.activo} /></Campo>
        </Grid>
        {msg && <div role="status" style={{ fontSize: 12, padding: '8px 12px', borderRadius: radius.control, background: msg.ok ? 'rgba(76,175,80,.08)' : 'rgba(244,67,54,.06)', color: msg.ok ? '#2E7D32' : C.error }}>{msg.t}</div>}
      </SubCard>
    </ConfigCard>
  );
}
