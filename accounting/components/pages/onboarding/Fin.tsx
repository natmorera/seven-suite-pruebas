'use client';
import { C, FONT, radius } from '@/components/ui/tokens';
import { Button } from '@/components/ui/formulario';
import { IcUser, IcBancos, IcGlobe, IcChevronRight } from '@/components/ui/icons';
import { MONEDAS_CONTABLES, paisPorCodigo } from '@/components/pages/empresa/datos/paises';
import { type EstadoOnboarding } from './datos/estado';
import { fmtFecha, periodos } from './piezas';

const RECOMENDADOS = [
  { titulo: 'Clientes y proveedores', texto: 'Para registrar cobros, pagos y anticipos.', ruta: '/clientes', Icono: IcUser, siSecundarias: false },
  { titulo: 'Cuentas bancarias y afiliados', texto: 'Para transferencias, depósitos y liquidaciones de tarjeta.', ruta: '/config-actividad-bancaria', Icono: IcBancos, siSecundarias: false },
  { titulo: 'Usuarios y permisos', texto: 'Invita a tu equipo y define qué puede hacer cada uno.', ruta: '/usuarios-permisos', Icono: IcUser, siSecundarias: false },
  { titulo: 'Tipo de cambio', texto: 'Para registrar en tus monedas secundarias.', ruta: '/parametros', Icono: IcGlobe, siSecundarias: true },
];

export default function Fin({ estado, onEmpezar }: { estado: EstadoOnboarding; onEmpezar: (ruta: string) => void }) {
  const d = estado.datos;
  const n = d.nomenclatura;
  const pais = paisPorCodigo(estado.empresa.pais);
  const ejercicio = d.ejercicio;
  const ej = ejercicio ? (() => {
    const [a, m] = ejercicio.inicio.split('-').map(Number); const inicio = new Date(a, m - 1, 1);
    return `${fmtFecha(inicio)} al ${fmtFecha(new Date(a, 11, 31))} · ${periodos(inicio).length} períodos abiertos`;
  })() : '';
  const filas: [string, string][] = [
    ['Empresa', `${estado.empresa.nombreLegal} · ${pais?.label ?? estado.empresa.pais}`],
    ['Monedas', [d.monedaFuncional, ...(d.monedasSecundarias ?? [])].map(m => MONEDAS_CONTABLES.find(x => x.value === m)?.label ?? m).join(' · ')],
    ['Código de cuenta', n ? ['1'.padEnd(n.longitudes.mayor, '0'), '1'.padStart(n.longitudes.submajor, '0'), '1'.padStart(n.longitudes.detalle, '0')].join(n.separador) : ''],
    ['Plan de cuentas', `${d.catalogo === 'base' ? 'Plan base' : 'Plan propio'} · ${estado.cuentasPosteables} cuentas posteables en cero`],
    ['Ejercicio fiscal', ej],
    ['Consecutivos', 'Formatos de los documentos revisados'],
    ['Creado automáticamente', 'Clase de asiento GENERAL y libros GEN, AJU y CIE'],
  ];
  return (
    <>
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.n900 }}>Tu contabilidad está lista</h2>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: C.n700 }}>Ya puedes registrar asientos.</p>
      </div>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(150px, 200px) 1fr', border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
        {filas.map(([k, v], i) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt style={{ padding: '10px 14px', fontSize: 12, color: C.n700, background: C.n200, borderTop: i ? `1px solid ${C.n500}` : 'none' }}>{k}</dt>
            <dd style={{ margin: 0, padding: '10px 14px', fontSize: 12.5, color: C.n900, borderTop: i ? `1px solid ${C.n500}` : 'none' }}>{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: C.n900 }}>Siguientes pasos recomendados</p>
        <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
          {RECOMENDADOS.filter(r => !r.siSecundarias || (d.monedasSecundarias ?? []).length > 0).map((r, i) => (
            <button key={r.titulo} onClick={() => onEmpezar(r.ruta)} className="onb-reco"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: 'none', borderTop: i ? `1px solid ${C.n500}` : 'none', background: C.n000, cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}>
              <span aria-hidden style={{ width: 28, height: 28, borderRadius: 14, background: C.brandBg, color: C.brand, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><r.Icono className="w-3.5 h-3.5" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: C.n900 }}>{r.titulo}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 1 }}>{r.texto}</span>
              </span>
              <span aria-hidden style={{ color: C.n700, display: 'inline-flex' }}><IcChevronRight className="w-3.5 h-3.5" /></span>
            </button>
          ))}
        </div>
      </div>
    </div>
    <style>{`.onb-reco:hover { background: ${C.n200} !important; }`}</style>
    {/* Mismo pie que los pasos: el botón principal queda en el mismo lugar */}
    <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
      <Button variant="secondary" onClick={() => onEmpezar('/asientos')}>Crear el primer asiento</Button>
      <Button onClick={() => onEmpezar('/dashboard')}>Empezar a usar</Button>
    </div>
    </>
  );
}
