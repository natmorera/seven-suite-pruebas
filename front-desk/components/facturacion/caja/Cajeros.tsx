'use client';
// Caja: vista del Cajero Responsable con el estado de cada cajero, cierre forzado y revisión de diferencias.
import { useState, type ReactNode } from 'react';
import { C, radius } from '@/components/suite/tokens';
import { Button, Modal } from '@/components/suite/ui';
import { Celda, Fila, Tabla, TextArea } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { HOY } from '@/components/hotel/datos';
import { ADMIN, CAJEROS, ahoraHotel, conteoVacio, fmtDuracion, fmtFH, fmtUSD, minutosEntre, type Turno } from '@/components/hotel/finanzas';
import { turnoAbiertoDe } from '@/components/hotel/accionesFinanzas';
import { Banda, Bloque } from '../comun';
import { diferencias30, resumenTurno } from './calc';
import { Etq, type P } from './piezas';
import { MontoCelda } from '@/components/suite/Monto';

// ── Cajeros (vista del responsable) ─────────────────────────────────────────
export function Cajeros({ toast, ahora, onVerMovs, onVerHist, ir }: P & { ahora: string | null; onVerMovs: (u: string) => void; onVerHist: (u: string) => void }) {
  const h = useHotel();
  const [forzar, setForzar] = useState<Turno | null>(null);
  const [revisar, setRevisar] = useState<string | null>(null);
  // Todos los cajeros de la caja (el responsable incluido: ve lo de todos y lo propio)
  const lista = CAJEROS.filter(c => c.nombre !== ADMIN);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 16 }}>
        {lista.map(c => {
          const abierto = turnoAbiertoDe(h, c.nombre);
          const hoy = h.turnos.filter(t => t.cajero === c.nombre && t.fecha === HOY).sort((a, b) => a.inicio.localeCompare(b.inicio)).at(-1);
          const d30 = diferencias30(h, c.nombre);
          const rol = c.rol === 'Responsable' ? 'Cajero Responsable' : 'Cajero Regular';
          if (abierto) {
            const r = resumenTurno(h, abierto);
            const ult = r.ultima ?? abierto.inicio.slice(11, 16);
            const minSin = ahora ? minutosEntre(`${HOY}T${ult}`, ahora) : 0;
            const inactivo = minSin >= 60;
            const col = inactivo ? '#E0A800' : C.success;
            return (
              <TarjetaCajero key={c.nombre} color={col} nombre={c.nombre} sub={`${rol} · Turno abierto ${abierto.inicio.slice(11, 16)}`} estado={<Etq color={col}>{inactivo ? 'Sin actividad' : abierto.precierre ? 'En precierre' : 'Operando'}</Etq>}
                datos={[['Abierto hace', ahora ? fmtDuracion(minutosEntre(abierto.inicio, ahora)) : '—'], ['Total operado', <span key="i" style={{ color: '#2E7D32' }}>{fmtUSD(r.ingresos, true)}</span>], ['Egresos', <span key="e" style={{ color: C.error }}>{fmtUSD(-r.egresos)}</span>],
                  ['Movimientos', r.movs.length], ['Última transacción', <span key="u" style={{ color: inactivo ? '#E0A800' : undefined }}>{r.ultima ? `hace ${Math.max(0, minSin)} min` : 'sin movimientos'}</span>]]}
                acciones={<>
                  <Button variant="secondary" onClick={() => onVerMovs(c.nombre)}>Ver movimientos</Button>
                  {inactivo && <Button onClick={() => toast(`Alerta enviada a ${c.nombre}: sin transacciones hace ${minSin} min.`)} style={{ background: '#E0A800', borderColor: '#E0A800' }}>Enviar alerta</Button>}
                  {c.nombre === h.sesion ? <Button variant="secondary" onClick={() => ir({ v: 'arqueo', turnoId: abierto.id })}>Cerrar mi turno</Button>
                    : <Button variant="secondary" onClick={() => setForzar(abierto)}>Forzar cierre</Button>}
                </>} />
            );
          }
          if (hoy?.fin) {
            const conDif = Math.abs(hoy.diferencia) >= 0.01;
            const alerta = d30.faltantes.length >= 3;
            const col = conDif ? C.error : C.n700;
            return (
              <TarjetaCajero key={c.nombre} color={col} nombre={c.nombre} sub={<>{rol} · Turno cerrado hoy {hoy.fin.slice(11, 16)}{alerta && <b style={{ color: C.error, fontWeight: 600 }}> · Alerta de desempeño</b>}</>}
                estado={<Etq color={col} fondo={conDif ? 'rgba(244,67,54,.08)' : C.n200}>Turno cerrado</Etq>}
                datos={[['Diferencia hoy', <span key="d" style={{ color: conDif ? C.error : '#2E7D32' }}>{fmtUSD(hoy.diferencia)}</span>], ['Diferencias últimos 30D', <span key="f" style={{ color: d30.faltantes.length ? C.error : '#2E7D32' }}>{d30.faltantes.length} turnos con faltante</span>],
                  ['Total faltante acumulado', <span key="t" style={{ color: d30.total ? C.error : '#2E7D32' }}>{fmtUSD(d30.total)}</span>]]}
                acciones={<><Button variant="secondary" onClick={() => onVerHist(c.nombre)}>Ver historial</Button>{d30.faltantes.length > 0 && <Button onClick={() => setRevisar(c.nombre)} style={{ background: C.error, borderColor: C.error }}>Revisar diferencias</Button>}</>} />
            );
          }
          return (
            <TarjetaCajero key={c.nombre} color={C.n500} gris nombre={c.nombre} sub={`${rol} · Sin turno activo · Horario: ${c.horario}`} estado={<Etq color={C.n700}>Sin turno</Etq>}
              datos={[['Estado', 'Pendiente de apertura'], ['Turno esperado', c.horario.split(' – ')[0]], ['Diferencia últimos 30D', <span key="p" style={{ color: d30.promedio < 0 ? C.error : '#2E7D32' }}>{fmtUSD(d30.promedio)} promedio</span>]]}
              acciones={<><Button variant="secondary" onClick={() => onVerHist(c.nombre)}>Ver historial</Button>{h.cajaDia.estado === 'abierta' && <Button onClick={() => ir({ v: 'abrir', modo: 'turno', cajero: c.nombre })}>Abrir turno manual</Button>}</>} />
          );
        })}
      </div>
      {forzar && <ForzarCierre t={forzar} onClose={() => setForzar(null)} onListo={() => { toast(`Turno de ${forzar.cajero} cerrado de forma forzada.`); setForzar(null); }} />}
      {revisar && <RevisarDiferencias cajero={revisar} onClose={() => setRevisar(null)} />}
    </>
  );
}
function TarjetaCajero({ color, nombre, sub, estado, datos, acciones, gris }: { color: string; nombre: string; sub: ReactNode; estado: ReactNode; datos: [string, ReactNode][]; acciones: ReactNode; gris?: boolean }) {
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderLeft: `4px solid ${color}`, borderRadius: radius.md, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, background: gris ? C.n200 : C.n000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div><div style={{ fontSize: 14, fontWeight: 600 }}>{nombre}</div><div style={{ fontSize: 11.5, color: C.n700, marginTop: 2 }}>{sub}</div></div>{estado}
      </div>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
        {datos.map(([l, v]) => <div key={l}><div style={{ fontSize: 10.5, color: C.n700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{v}</div></div>)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{acciones}</div>
    </div>
  );
}

export function ForzarCierre({ t, onClose, onListo }: { t: Turno; onClose: () => void; onListo: () => void }) {
  const h = useHotel();
  const [motivo, setMotivo] = useState('');
  const r = resumenTurno(h, t);
  const ok = () => {
    if (!motivo.trim()) return;
    const conteo = t.conteoApertura ? { USD: { ...t.conteoApertura.USD }, CRC: { ...t.conteoApertura.CRC } } : conteoVacio();
    h.forzarCierre(t.id, ahoraHotel(), h.sesion, motivo.trim(), r.esperado, conteo, r.sistema);
    onListo();
  };
  return (
    <Modal open title={`Forzar cierre · ${t.cajero}`} onClose={onClose} width={480} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={ok} disabled={!motivo.trim()} style={{ background: C.error, borderColor: C.error }}>Forzar cierre</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
        <Banda tono="warn">El turno se cerrará sin arqueo del cajero: se toma como declarado el saldo esperado del sistema ({fmtUSD(r.esperado)}). Queda marcado como «cierre forzado» en auditoría y el cajero deberá conciliar luego.</Banda>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Bloque label="Inicio" valor={t.inicio.slice(11, 16)} /><Bloque label="Movimientos" valor={r.movs.length} /><Bloque label="Saldo esperado" valor={fmtUSD(r.esperado)} />
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span style={{ color: C.n700 }}>Motivo <span style={{ color: C.error }}>*</span></span><TextArea value={motivo} onChange={setMotivo} rows={3} placeholder="Ej.: el cajero no se presentó al cierre" /></label>
      </div>
    </Modal>
  );
}
function RevisarDiferencias({ cajero, onClose }: { cajero: string; onClose: () => void }) {
  const h = useHotel();
  const d = diferencias30(h, cajero);
  return (
    <Modal open title={`Diferencias últimos 30 días · ${cajero}`} onClose={onClose} width={640} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      <Tabla headers={['Turno', 'Saldo esperado', 'Declarado', 'Diferencia', 'Motivo']} alinearDerecha={[1, 2, 3]}>
        {d.faltantes.map(t => <Fila key={t.id}><Celda>{fmtFH(t.inicio)} – {t.fin?.slice(11, 16)}</Celda><Celda derecha><MontoCelda texto={fmtUSD(t.esperado ?? 0)} /></Celda><Celda derecha><MontoCelda texto={fmtUSD(t.declarado ?? 0)} /></Celda>
          <Celda derecha style={{ color: C.error, fontWeight: 600 }}><MontoCelda texto={fmtUSD(t.diferencia)} /></Celda><Celda muted>{t.motivo ?? '—'}</Celda></Fila>)}
        <Fila><Celda><b>Total</b></Celda><Celda /><Celda /><Celda derecha style={{ color: C.error, fontWeight: 700 }}><MontoCelda texto={fmtUSD(d.total)} /></Celda><Celda muted>{d.faltantes.length} turnos con faltante</Celda></Fila>
      </Tabla>
    </Modal>
  );
}
