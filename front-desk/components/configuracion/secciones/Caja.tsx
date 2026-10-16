'use client';
import { TabsEnBarra } from '@/components/layout/Pantalla';
import { useState } from 'react';
import { C, FONT, fmtNum, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Radio, Select, Switch } from '@/components/suite/ui';
import { usePatch } from '../store';
import { Aviso, Celda, ConfigCard, Fila, Grid, IcTrash, IconButton, InputAfijo, LinkButton, SubCard, Tabla, uid } from '../kit';
import type { Denominacion } from '../datos';
import CierreDiario from './CierreDiario';
import { StatusBadge } from '@/components/suite/ui';
import { CAJEROS } from '@/components/hotel/finanzas';

const TABS = ['Fondo de caja', 'Cajeros', 'Seguridad', 'Cierre diario'] as const;
const SIM = { USD: '$', CRC: '₡' } as const;
const fmt = (m: 'USD' | 'CRC', n: number) => `${SIM[m]}${fmtNum(n, m === 'CRC' ? 0 : 2)}`;

export default function Caja() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Fondo de caja');
  return (
    <>
      <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
      {tab === 'Cajeros' ? <Cajeros /> : tab === 'Cierre diario' ? <CierreDiario /> : <ConfigCard title={tab}>{tab === 'Fondo de caja' ? <Fondo /> : <Seguridad />}</ConfigCard>}
    </>
  );
}

function Opcion({ on, onClick, titulo, texto, extra, name }: { on: boolean; onClick: () => void; titulo: string; texto: string; extra?: React.ReactNode; name: string }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '4px 0' }}>
      <div style={{ paddingTop: 1 }}><Radio name={name} checked={on} onChange={onClick} /></div>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>{titulo}{extra}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: C.n700 }}>{texto}</p>
      </div>
    </div>
  );
}

function Fondo() {
  const [caja, patch] = usePatch('caja');
  const [nueva, setNueva] = useState<{ moneda: 'USD' | 'CRC'; valor: string } | null>(null);
  const totales = { USD: 0, CRC: 0 };
  caja.denominaciones.forEach(d => { totales[d.moneda] += d.valor * d.cantidad; });
  const setD = (id: string, p: Partial<Denominacion>) => patch({ denominaciones: caja.denominaciones.map(d => (d.id === id ? { ...d, ...p } : d)) });
  const agregar = () => {
    if (!nueva) return;
    const v = Number(nueva.valor);
    if (!(v > 0) || caja.denominaciones.some(d => d.moneda === nueva.moneda && d.valor === v)) return;
    patch({ denominaciones: [...caja.denominaciones, { id: uid(), moneda: nueva.moneda, valor: v, cantidad: 0 }] });
    setNueva(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SubCard title="Modalidad de fondo de caja">
        <Opcion name="modalidad" on={caja.modalidad === 'fijo'} onClick={() => patch({ modalidad: 'fijo' })} titulo="Fondo fijo"
          texto="El fondo se mantiene en el mismo monto después de cada cierre. El excedente se deposita a Bóveda al final del turno." />
        <Opcion name="modalidad" on={caja.modalidad === 'variable'} onClick={() => patch({ modalidad: 'variable' })} titulo="Fondo variable"
          extra={<span style={{ fontSize: 11, color: C.n700, background: C.n500, borderRadius: radius.pill, padding: '1px 8px', fontWeight: 400 }}>Por defecto</span>}
          texto="El saldo final de cada turno se convierte en el saldo inicial del siguiente. No se requiere reposición manual." />
      </SubCard>

      {caja.modalidad === 'fijo' && (
        <SubCard title="Configuración del fondo fijo">
          <span style={{ fontSize: 11, color: C.n700, letterSpacing: 0.3 }}>Monto total por moneda</span>
          <Grid cols={2}>
            <InputAfijo prefijo="USD $" type="number" value={caja.montoUSD} onChange={v => patch({ montoUSD: Number(v) || 0 })} />
            <InputAfijo prefijo="CRC ₡" type="number" value={caja.montoCRC} onChange={v => patch({ montoCRC: Number(v) || 0 })} />
          </Grid>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Detallar por denominaciones</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: C.n700 }}>Permite especificar la distribución de billetes y monedas de cada tipo que componen el fondo.</p>
            </div>
            <Switch checked={caja.detallar} onChange={b => patch({ detallar: b })} />
          </div>
          {caja.detallar && (['USD', 'CRC'] as const).map(m => {
            const filas = caja.denominaciones.filter(d => d.moneda === m).sort((a, b) => b.valor - a.valor);
            const monto = m === 'USD' ? caja.montoUSD : caja.montoCRC;
            const cuadra = totales[m] === monto;
            return (
              <div key={m} style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
                <Tabla headers={['Moneda', 'Denominación', 'Cantidad', 'Subtotal', '']} alinearDerecha={[3]} anchos={{ 0: 90, 1: 130, 2: 110, 4: 40 }}>
                  {filas.map(d => (
                    <Fila key={d.id}>
                      <Celda>{m}</Celda><Celda>{fmt(m, d.valor)}</Celda>
                      <Celda><Input type="number" value={d.cantidad} onChange={v => setD(d.id, { cantidad: Math.max(0, Math.floor(Number(v) || 0)) })} aria-label={`Cantidad de ${fmt(m, d.valor)}`} style={{ width: 70, textAlign: 'center' }} /></Celda>
                      <Celda derecha>{fmt(m, d.valor * d.cantidad)}</Celda>
                      <Celda><IconButton label="Quitar denominación" tono="peligro" onClick={() => patch({ denominaciones: caja.denominaciones.filter(x => x.id !== d.id) })}><IcTrash /></IconButton></Celda>
                    </Fila>
                  ))}
                  <tr style={{ background: C.n200 }}>
                    <Celda colSpan={3}><b style={{ fontWeight: 500 }}>Total {m}</b>
                      {!cuadra && <span style={{ marginLeft: 10, fontSize: 11, color: '#7A5C00' }}>No coincide con el monto total ({fmt(m, monto)})</span>}
                    </Celda>
                    <Celda derecha><b style={{ fontWeight: 600 }}>{fmt(m, totales[m])}</b></Celda>
                    <Celda>{!cuadra && <LinkButton onClick={() => patch(m === 'USD' ? { montoUSD: totales.USD } : { montoCRC: totales.CRC })} style={{ fontSize: 11 }}>Usar</LinkButton>}</Celda>
                  </tr>
                </Tabla>
              </div>
            );
          })}
          {caja.detallar && (nueva ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: FONT }}>
              <div style={{ width: 100 }}><Select value={nueva.moneda} onChange={v => setNueva({ ...nueva, moneda: v as 'USD' | 'CRC' })} options={[{ value: 'USD', label: 'USD' }, { value: 'CRC', label: 'CRC' }]} /></div>
              <div style={{ width: 150 }}><Input type="number" value={nueva.valor} onChange={v => setNueva({ ...nueva, valor: v })} placeholder="Valor" autoFocus /></div>
              <Button onClick={agregar}>Agregar</Button><Button variant="secondary" onClick={() => setNueva(null)}>Cancelar</Button>
            </div>
          ) : <div><LinkButton onClick={() => setNueva({ moneda: 'USD', valor: '' })} style={{ textDecoration: 'none' }}>+ Agregar denominación</LinkButton></div>)}
        </SubCard>
      )}
    </div>
  );
}

function Seguridad() {
  const [caja, patch] = usePatch('caja');
  const opciones = [
    { v: 'trazo', t: 'Trazo en pantalla', d: 'El cajero dibuja la firma con mouse o pantalla táctil.' },
    { v: 'pin', t: 'PIN numérico (4-6 dígitos)', d: 'El cajero ingresa un PIN. Recomendado para flujos rápidos.' },
    { v: 'ambos', t: 'Ambos (PIN + trazo)', d: 'El cajero debe ingresar PIN y además registrar trazo. Mayor nivel de auditoría.' },
  ] as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SubCard title="Método de firma de cierre de turno">
        {opciones.map(o => <Opcion key={o.v} name="firma" on={caja.firma === o.v} onClick={() => patch({ firma: o.v })} titulo={o.t} texto={o.d} />)}
      </SubCard>
      <SubCard title="Operaciones que requieren autorización de supervisor">
        <Grid cols={2} gap={12}>
          {Object.entries(caja.permisos).map(([k, v]) => <Checkbox key={k} checked={v} onChange={b => patch({ permisos: { ...caja.permisos, [k]: b } })} label={k} />)}
        </Grid>
        <Aviso>El supervisor confirma con su usuario y el mismo método de firma configurado arriba.</Aviso>
      </SubCard>
    </div>
  );
}

// ── Cajeros: una sola caja; lo que cambia son los cajeros y su rol ───────────
function Cajeros() {
  const rol = (r: string) => (r === 'Responsable' ? 'Cajero responsable' : r === 'Regular' ? 'Cajero' : 'Administrador');
  return (
    <ConfigCard title="Cajeros" subtitle="El hotel tiene una sola caja. Un Cajero responsable la abre y la cierra cada día y ve los turnos y movimientos de todos los cajeros (y los propios); el resto de cajeros solo ve lo suyo.">
      <Tabla headers={['Cajero', 'Usuario', 'Rol', 'Horario', 'Abre y cierra la caja', 'Qué ve']}>
        {CAJEROS.map(c => (
          <Fila key={c.nombre}>
            <Celda><b style={{ fontWeight: 500 }}>{c.nombre}</b></Celda><Celda muted>{c.usuario}</Celda>
            <Celda><StatusBadge label={rol(c.rol)} color={c.rol === 'Regular' ? 'gray' : 'brand'} /></Celda>
            <Celda muted>{c.horario}</Celda>
            <Celda>{c.rol === 'Regular' ? 'No' : 'Sí'}</Celda>
            <Celda>{c.rol === 'Regular' ? 'Solo sus turnos y movimientos' : 'Todos los cajeros y lo propio'}</Celda>
          </Fila>
        ))}
      </Tabla>
      <Aviso>El rol de cada cajero se asigna en Usuarios y permisos (roles «Cajero responsable» y «Cajero»). Siempre debe haber al menos un Cajero responsable activo.</Aviso>
    </ConfigCard>
  );
}
