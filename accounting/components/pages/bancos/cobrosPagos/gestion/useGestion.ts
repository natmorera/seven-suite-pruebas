'use client';
import { useState } from 'react';
import { ENLACES_AJUSTE_INIT, NOTA_ADMINISTRATIVA } from '@/components/pages/catalogo/datos/ajustes';
import { BANCOS_CON_CHEQUERA, type LineaAjuste, type Operacion } from '../datos';

export function useGestion({ op, onClose, onSave }: {
  op: Operacion; onClose: () => void; onSave: (updated: Operacion) => void;
}) {
  const isCobro = op.tipo === 'Cobro';
  const [form, setForm] = useState({ ...op });
  const [showSelAux, setShowSelAux] = useState(false);
  const [showFacturas, setShowFacturas] = useState(false);
  const [editingTipoCambio, setEditingTipoCambio] = useState(false);
  const [tipoCambio, setTipoCambio] = useState('10000');
  const [lineasOpen, setLineasOpen] = useState(true);
  const [facturasOpen, setFacturasOpen] = useState(true);
  const [generarCheque, setGenerarCheque] = useState(false);

  // Generar título autopropuesto: "Gestión de cobro/pago - {cliente} - {consecutivo}"
  function autopropuesto(nombre: string) {
    return `${isCobro ? 'Gestión de cobro' : 'Gestión de pago'} - ${nombre} - ${op.consecutivo}`;
  }

  const bancoTieneChequera = BANCOS_CON_CHEQUERA.has(form.banco);

  const sym = form.moneda === 'USD' ? '$' : '₡';
  const totalFacturas = form.facturas.reduce((s,f) => s + (f.abono ?? f.saldoPendiente), 0);
  // Signo automático según el tipo de movimiento: se escribe el monto positivo y el sistema
  // decide si suma o resta (retenciones y ajuste débito restan porque es dinero que no entró al
  // banco; ajuste crédito y nota administrativa suman). Una línea manual, sin tipo, respeta el
  // signo escrito.
  function montoEfectivo(l: LineaAjuste) {
    if (!l.tipoMovimiento) return l.monto;
    if (l.tipoMovimiento === NOTA_ADMINISTRATIVA.value) return Math.abs(l.monto) * NOTA_ADMINISTRATIVA.signo;
    const signo = ENLACES_AJUSTE_INIT.find(e=>e.tipoMovimiento===l.tipoMovimiento)?.signo ?? 1;
    return Math.abs(l.monto) * signo;
  }
  const totalAjuste   = form.lineasAjuste.reduce((s,l) => s + montoEfectivo(l), 0);
  const importe       = form.importe;
  const asignado      = totalFacturas;
  const ajuste        = totalAjuste;
  const diferencia    = importe - asignado - ajuste;
  const hasDiferencia = Math.abs(diferencia) > 0.01;

  function addLinea() {
    setForm(f => ({ ...f, lineasAjuste: [...f.lineasAjuste, { id:Date.now(), cuenta:'', documento:'', moneda:`¢ ${f.moneda}`, monto:0, tipoMovimiento:'', justificacion:'' }] }));
  }
  function removeLinea(id: number) {
    setForm(f => ({ ...f, lineasAjuste: f.lineasAjuste.filter(l => l.id !== id) }));
  }
  function updateLinea(id: number, field: string, value: string | number) {
    setForm(f => ({ ...f, lineasAjuste: f.lineasAjuste.map(l => {
      if (l.id !== id) return l;
      const next = { ...l, [field]: value };
      // Al elegir "Nota administrativa" se fuerza la cuenta del cliente/proveedor
      // de la operación - no admite otra cuenta.
      if (field === 'tipoMovimiento' && value === NOTA_ADMINISTRATIVA.value) {
        next.cuenta = `${f.cuentaContable}: ${f.nombreAux}`;
      }
      // Al cambiar de tipo, si la cuenta ya no aplica (venía de otro tipo), la
      // limpiamos para que se vuelva a elegir entre las cuentas enlazadas.
      if (field === 'tipoMovimiento' && value !== NOTA_ADMINISTRATIVA.value && l.tipoMovimiento !== value) {
        next.cuenta = '';
      }
      return next;
    }) }));
  }

  const auxNombre = isCobro ? 'Cuentas por cobrar' : 'Cuentas por pagar';
  const tipoInfo  = isCobro ? 'INFORMACIÓN DEL CLIENTE' : 'INFORMACIÓN DEL PROVEEDOR';
  return { op, onClose, onSave, isCobro, form, setForm, showSelAux, setShowSelAux, showFacturas, setShowFacturas, editingTipoCambio, setEditingTipoCambio, tipoCambio, setTipoCambio, lineasOpen, setLineasOpen, facturasOpen, setFacturasOpen, generarCheque, setGenerarCheque, autopropuesto, bancoTieneChequera, sym, totalFacturas, montoEfectivo, totalAjuste, importe, asignado, ajuste, diferencia, hasDiferencia, addLinea, removeLinea, updateLinea, auxNombre, tipoInfo };
}

export type EstadoGestion = ReturnType<typeof useGestion>;
