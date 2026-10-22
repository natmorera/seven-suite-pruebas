'use client';
// Exportar el listado de la Bandeja de asientos con el documento estándar
import { ExportListModal } from '@/components/ui/exportar';
import { type Asiento, MON_SYM, TIPOS_LABEL, fmt2 } from './datos';

export function ModalExportarListado({ rows, tabLabel, filtrosResumen, onClose }: {
  rows: Asiento[]; tabLabel: string; filtrosResumen: string[]; onClose:()=>void;
}) {
  const total = (m: 'CRC' | 'USD') => rows.filter(a => a.moneda === m).reduce((s, a) => s + a.importe, 0);
  return (
    <ExportListModal title={`Bandeja de asientos · ${tabLabel}`} subtitulo={filtrosResumen.join(' · ')} onClose={onClose}
      filename={`bandeja-asientos-${tabLabel.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`}
      columns={[
        { key: 'tipo', label: 'Tipo' }, { key: 'origen', label: 'Origen' }, { key: 'fecha', label: 'Fecha' }, { key: 'consecutivo', label: 'N.º Asiento' },
        { key: 'titulo', label: 'Título' }, { key: 'moneda', label: 'Moneda' }, { key: 'importe', label: 'Importe', align: 'right' },
        { key: 'usuario', label: 'Usuario' }, { key: 'documento', label: 'Documento' },
      ]}
      rows={[
        ...rows.map(a => ({ tipo: TIPOS_LABEL[a.tipo], origen: a.origen, fecha: a.fecha, consecutivo: a.consecutivo, titulo: a.titulo, moneda: a.moneda,
          importe: `${MON_SYM[a.moneda]} ${fmt2(a.importe)}`, usuario: a.usuario, documento: a.documento })),
        ...(['CRC', 'USD'] as const).filter(m => total(m) > 0).map(m => ({ tipo: `Total ${m}`, origen: '', fecha: '', consecutivo: '', titulo: '', moneda: m,
          importe: `${MON_SYM[m]} ${fmt2(total(m))}`, usuario: '', documento: '' })),
      ]} />
  );
}
