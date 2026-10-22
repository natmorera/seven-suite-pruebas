'use client';
import { useState } from 'react';
import { fmt } from '../datos/arbol';
import { EJERCICIOS_VIGENTES, type Props, todayISO, yearBounds } from '../modalTrasladoSaldo/datos';

export function useTrasladoSaldo({ cuentaDestino, cuentas, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [origenId, setOrigenId] = useState('');
  const [ejercicio, setEjercicio] = useState(EJERCICIOS_VIGENTES[0].value);
  const [fecha, setFecha] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Al cambiar de ejercicio, la fecha se ajusta a los límites del año elegido
  const [ejercicioPrevio, setEjercicioPrevio] = useState(ejercicio);
  if (ejercicio !== ejercicioPrevio) {
    setEjercicioPrevio(ejercicio);
    const { min, max } = yearBounds(ejercicio);
    if (fecha < min) setFecha(min);
    if (fecha > max) setFecha(max);
  }

  // Orígenes posibles: cuentas posteables (detalle/auxiliar) distintas del destino,
  // con saldo y con la misma naturaleza que el destino
  const origenOpts = [
    { value: '', label: '- Seleccionar cuenta de origen -' },
    ...cuentas
      .filter(c =>
        c.posteable &&
        c.id !== cuentaDestino.id &&
        c.saldo !== 0 &&
        c.naturaleza === cuentaDestino.naturaleza
      )
      .map(c => ({
        value: c.id,
        label: `${c.codigo} - ${c.nombre} (saldo: ${c.moneda === 'USD' ? '$' : '₡'} ${fmt(Math.abs(c.saldo))})`,
      })),
  ];

  const cuentaOrigen = cuentas.find(c => c.id === origenId) ?? null;
  const { min: minFecha, max: maxFecha } = yearBounds(ejercicio);

  function validate() {
    const e: Record<string, string> = {};
    if (!origenId) e.origen = 'Debe seleccionar la cuenta de origen.';
    if (!fecha) e.fecha = 'La fecha es requerida.';
    else if (fecha < minFecha || fecha > maxFecha) e.fecha = `La fecha debe estar dentro del ejercicio ${ejercicio}.`;
    if (cuentaOrigen && cuentaOrigen.moneda !== cuentaDestino.moneda)
      e.moneda = 'La moneda de la cuenta origen (CRC) y destino (USD) deben coincidir para realizar el traslado.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validate()) setStep(2);
  }

  function handleConfirm() {
    if (!cuentaOrigen) return;
    const ref = `TRK-${Date.now().toString().slice(-6)}`;
    onConfirm({
      origenId: cuentaOrigen.id,
      origenCodigo: cuentaOrigen.code || cuentaOrigen.codigo || '',
      origenNombre: cuentaOrigen.nombre,
      origenSaldo: cuentaOrigen.saldo,
      destinoCodigo: cuentaDestino.code || cuentaDestino.codigo || '',
      destinoNombre: cuentaDestino.nombre,
      fecha,
      ejercicio,
      asientoRef: ref,
    });
    setStep(3);
  }
  return { cuentaDestino, cuentas, onConfirm, onCancel, step, setStep, origenId, setOrigenId, ejercicio, setEjercicio, fecha, setFecha, errors, setErrors, origenOpts, cuentaOrigen, minFecha, maxFecha, validate, handleNext, handleConfirm };
}

export type EstadoTrasladoSaldo = ReturnType<typeof useTrasladoSaldo>;
