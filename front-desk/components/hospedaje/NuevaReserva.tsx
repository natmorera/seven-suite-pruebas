'use client';
import { useState } from 'react';
import { C } from '@/components/suite/tokens';
import { Button, Input, Modal, Select } from '@/components/suite/ui';
import { Campo, Grid } from '@/components/configuracion/kit';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, NACIONALIDADES, REGIMENES, TARIFAS_NOMBRES, TIPOS, contratoDeTarifa, noches, sumarDias, type Reserva } from '@/components/hotel/datos';
import { money } from '@/components/hotel/ui';
import { habitacionLibre } from '@/components/hotel/reservas';

/** Alta rápida de reserva (desde el Mapa, un Perfil o el Dashboard). */
export function NuevaReservaModal({ hab: habInicial, perfilId, entrada: entradaInicial, onClose, onListo }: { hab?: string; perfilId?: string; entrada?: string; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const pf0 = h.perfiles.find(p => p.id === perfilId);
  const nacDe = (pais?: string) => Object.entries(NACIONALIDADES).find(([, v]) => v === pais)?.[0] ?? 'CRI';
  const [f, setF] = useState({
    hab: habInicial ?? '', perfilId: pf0?.tipo === 'cliente' ? pf0.id : '', nombre: pf0?.tipo === 'cliente' ? pf0.nombre : '', email: pf0?.tipo === 'cliente' ? pf0.email : '',
    entrada: entradaInicial ?? HOY, salida: sumarDias(entradaInicial ?? HOY, 1), adultos: 2, ninos: 0, tarifa: pf0?.tipo === 'empresa' ? 'CORP' : 'DIR', precio: 0, regimen: '1.BB', nacionalidad: nacDe(pf0?.nacionalidad),
  });
  const [error, setError] = useState('');
  const solapa = (num: string) => !habitacionLibre(h.reservas, num, f.entrada, f.salida);
  const disponibles = h.habitaciones.filter(x => x.estado !== 'bloqueada' && !solapa(x.numero));
  const habSel = h.habitaciones.find(x => x.numero === f.hab);
  const precio = f.precio || (habSel ? TIPOS.find(t => t.id === habSel.tipo)!.tarifa : 0);
  const guardar = () => {
    if (!f.hab) return setError('Selecciona la habitación.');
    if (!f.nombre.trim()) return setError('El nombre del huésped es obligatorio.');
    if (f.salida <= f.entrada) return setError('La salida debe ser posterior a la entrada.');
    if (solapa(f.hab)) return setError(`La ${f.hab} ya tiene una reserva en esas fechas.`);
    if (habSel!.estado === 'bloqueada') return setError(`La ${f.hab} está bloqueada.`);
    const pf = h.perfiles.find(p => p.id === f.perfilId);
    const id = nuevoId('r');
    const empresa = pf0?.tipo === 'empresa' ? pf0.nombre : contratoDeTarifa(f.tarifa) === 'Directo' ? '' : contratoDeTarifa(f.tarifa);
    const r: Reserva = {
      id, numero: `RD-${4300 + h.reservas.length}`, rooming: false, perfilId: f.perfilId || null, nombre: f.nombre.trim().toUpperCase(), empresa,
      cliente: f.tarifa === 'DIR' ? 'Huésped Individual' : f.tarifa === 'CORP' ? 'Tarifa Corporativa' : 'Agencia de Viajes', habitacion: f.hab, tipo: habSel!.tipo, entrada: f.entrada, salida: f.salida,
      adultos: f.adultos, ninos: f.ninos, tarifa: f.tarifa, precio, regimen: f.regimen, moneda: 'USD', estado: 'Confirmada', pagado: 0, depGarantia: 0, credito: false, condiciones: [], observaciones: '', observacionesInternas: '',
      nacionalidad: f.nacionalidad, identificacion: pf?.numeroId ?? '', email: f.email || pf?.email || '', telefono: pf?.telefono ?? '', vip: pf?.extra.vip ?? false, tarjetaLista: false, checkinEn: null, checkoutEn: null,
      cuentas: [{ id: id + 'c1', nombre: 'Cuenta 1', saldo: 0, consumos: 0 }], cargos: [], adicionales: [], descuento: 0,
    };
    h.crearReserva(r);
    onListo(`Reserva ${r.numero} creada · habitación ${f.hab}`);
  };
  return (
    <Modal open onClose={onClose} title={habInicial ? `Nueva reserva · Habitación ${habInicial}` : 'Nueva reserva'} width={580}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={guardar}>Crear reserva</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pf0?.tipo === 'empresa' && <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Reserva a nombre de la empresa <b style={{ color: C.n900 }}>{pf0.nombre}</b>.</p>}
        <Campo label="Perfil del huésped (opcional)">
          <Select value={f.perfilId} onChange={v => { const p = h.perfiles.find(x => x.id === v); setF({ ...f, perfilId: v, nombre: p?.nombre ?? f.nombre, email: p?.email ?? f.email, nacionalidad: p ? nacDe(p.nacionalidad) : f.nacionalidad }); }}
            options={[{ value: '', label: 'Sin perfil' }, ...h.perfiles.filter(p => p.tipo === 'cliente').map(p => ({ value: p.id, label: `${p.nombre} · ${p.numeroId}` }))]} />
        </Campo>
        <Grid cols={2}>
          <Campo label="Nombre del huésped" required><Input value={f.nombre} onChange={v => setF({ ...f, nombre: v })} /></Campo>
          <Campo label="Email"><Input type="email" value={f.email} onChange={v => setF({ ...f, email: v })} /></Campo>
          <Campo label="Entrada"><Input type="date" value={f.entrada} min={HOY} onChange={v => setF({ ...f, entrada: v, salida: v >= f.salida ? sumarDias(v, 1) : f.salida })} /></Campo>
          <Campo label="Salida" hint={`${noches(f.entrada, f.salida)} noches`}><Input type="date" value={f.salida} min={sumarDias(f.entrada, 1)} onChange={v => setF({ ...f, salida: v })} /></Campo>
          <Campo label="Habitación" required hint={habInicial ? undefined : `${disponibles.length} disponibles en esas fechas`}>
            <Select value={f.hab} onChange={v => setF({ ...f, hab: v, precio: 0 })} disabled={!!habInicial}
              options={[{ value: '', label: 'Selecciona una habitación' }, ...(habInicial ? h.habitaciones.filter(x => x.numero === habInicial) : disponibles).map(x => ({ value: x.numero, label: `${x.numero} · ${TIPOS.find(t => t.id === x.tipo)?.nombre}` }))]} />
          </Campo>
          <Campo label="Tarifa"><Select value={f.tarifa} onChange={v => setF({ ...f, tarifa: v })} options={TARIFAS_NOMBRES.map(t => ({ value: t, label: t }))} /></Campo>
          <Campo label="Adultos"><Input type="number" value={f.adultos} onChange={v => setF({ ...f, adultos: Math.max(1, Number(v) || 1) })} /></Campo>
          <Campo label="Niños"><Input type="number" value={f.ninos} onChange={v => setF({ ...f, ninos: Math.max(0, Number(v) || 0) })} /></Campo>
          <Campo label="Precio por noche (USD)"><Input type="number" value={precio} onChange={v => setF({ ...f, precio: Math.max(0, Number(v) || 0) })} /></Campo>
          <Campo label="Régimen"><Select value={f.regimen} onChange={v => setF({ ...f, regimen: v })} options={Object.entries(REGIMENES).map(([k, v]) => ({ value: k, label: `${k} · ${v}` }))} /></Campo>
          <Campo label="Nacionalidad"><Select value={f.nacionalidad} onChange={v => setF({ ...f, nacionalidad: v })} options={Object.entries(NACIONALIDADES).map(([k, v]) => ({ value: k, label: v }))} /></Campo>
        </Grid>
        <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Total estimado: <b style={{ color: C.n900 }}>{money(precio * noches(f.entrada, f.salida))}</b></p>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
}
