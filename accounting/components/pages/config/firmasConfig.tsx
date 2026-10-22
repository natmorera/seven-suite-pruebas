'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

// ── Firmas personalizadas y encabezado alternativo ── Configuración a nivel de empresa. Quién
// firma qué reporte (Analítico, Balance, Resultados, Situación, Patrimonio) y en qué orden se
// define en Parámetros generales › Firmas.

// Reportes que se pueden firmar, agrupados igual que en el menú (Reportes / Estados
// financieros).
export const REPORTES_FIRMABLES: { key:string; label:string; grupo:'reportes'|'estadosfin' }[] = [
  { key:'analitico',   label:'Analítico de cuentas',                grupo:'reportes' },
  { key:'historico',   label:'Histórico clientes / proveedores',    grupo:'reportes' },
  { key:'diferencial', label:'Diferencial cambiario',                grupo:'reportes' },
  { key:'balance',     label:'Balance de comprobación',              grupo:'estadosfin' },
  { key:'resultados',  label:'Estado de resultados',                 grupo:'estadosfin' },
  { key:'situacion',   label:'Estado de situación financiera',       grupo:'estadosfin' },
  { key:'patrimonio',  label:'Estado de cambio en el patrimonio',    grupo:'estadosfin' },
];

export interface FirmaReporte { reporteKey: string; orden: number; }
export type FormatoFirmaLinea = 'nombre' | 'documento' | 'puesto';

export interface Firma {
  id: string;
  nombre: string;
  documento: string; // Número de identificación (DNI, cédula jurídica, etc.)
  puesto: string;
  puestoAlt: string;
  formato: FormatoFirmaLinea[];
  reportes: FirmaReporte[];
  // Imagen de la firma (trazo escaneado o dibujado) en base64 - esto es una
  // firma VISUAL únicamente, para que se vea igual que en papel. No es una
  // firma digital criptográfica con validez legal (eso implica certificados
  // emitidos por una autoridad certificadora costarricense, PKI, token/tarjeta
  // física, sellado de tiempo, etc. - un proyecto legal y técnico aparte).
  imagenFirma?: string;
  // enlaza esta firma a un usuario del sistema (Usuarios y permisos /
  // Mi cuenta). Con esto cada usuario puede configurar su propia firma desde
  // "Mi cuenta" en vez de que un administrador la cargue por él a mano, y un
  // administrador puede ver/asignar esa relación desde Firmas personalizadas.
  usuarioId?: number;
}

const FIRMAS_INIT: Firma[] = [
  // Enlazada al usuario de demo (jperez, id 1001) para que el flujo se vea
  // funcionando de una vez al abrir Parámetros generales > Firmas.
  { id:'f1', nombre:'Yader Bustamante Salmerón', documento:'0010706890025R', puesto:'Representante Legal', puestoAlt:'Legal Representative',
    formato:['nombre','documento','puesto'], usuarioId:1001,
    reportes:[{reporteKey:'analitico',orden:1}] },
];

// Datos legales de la empresa para el encabezado alternativo. Empresa los sincroniza a este
// contexto cada vez que cambian (nombre legal, identificación, legalización y citas de
// presentación).
interface EmpresaLegal {
  nombre: string;
  cedulaJuridica: string;
  noLegalizacion: string;
  citasPresentacion: string;
}
const EMPRESA_LEGAL_INIT: EmpresaLegal = {
  nombre: 'Hotel Fortuna S.A.',
  cedulaJuridica: '3-101-654321',
  noLegalizacion: '',
  citasPresentacion: '',
};

interface FirmasCtx {
  firmas: Firma[]; setFirmas: (f:Firma[] | ((prev:Firma[])=>Firma[]))=>void;
  empresaLegal: EmpresaLegal; setEmpresaLegal: (e:EmpresaLegal | ((prev:EmpresaLegal)=>EmpresaLegal))=>void;
}

const Ctx = createContext<FirmasCtx>({
  firmas:[], setFirmas:()=>{}, empresaLegal:EMPRESA_LEGAL_INIT, setEmpresaLegal:()=>{},
});

export function FirmasProvider({ children }: { children: ReactNode }) {
  const [firmas, setFirmas] = useState<Firma[]>(FIRMAS_INIT);
  const [empresaLegal, setEmpresaLegal] = useState<EmpresaLegal>(EMPRESA_LEGAL_INIT);
  return (
    <Ctx.Provider value={{ firmas, setFirmas, empresaLegal, setEmpresaLegal }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFirmasConfig() {
  return useContext(Ctx);
}

export function firmasParaReporte(firmas: Firma[], reporteKey: string) {
  return firmas
    .map(f => ({ firma: f, rel: f.reportes.find(r => r.reporteKey === reporteKey) }))
    .filter((x): x is { firma: Firma; rel: FirmaReporte } => !!x.rel)
    .sort((a, b) => a.rel.orden - b.rel.orden)
    .map(x => x.firma);
}

// ── Piezas de impresión reutilizables ── Encabezado alternativo: en lugar del encabezado
// normal del reporte (nombre de empresa y fecha de generación) muestra el formato legal exigido
// para libros legales y estados financieros en Nicaragua y Guatemala, con los datos de empresa
// del contexto.
export function EncabezadoAlternativoBloque({ titulo, rangoFecha, moneda }: { titulo: string; rangoFecha?: string; moneda?: string }) {
  const { empresaLegal } = useFirmasConfig();
  return (
    <div style={{ textAlign:'center', marginBottom:16, fontFamily:"'Montserrat', sans-serif" }}>
      <p style={{ fontSize:14, fontWeight:700, margin:0 }}>{empresaLegal.nombre.toUpperCase()}</p>
      <p style={{ fontSize:11, margin:'2px 0 0' }}>{empresaLegal.cedulaJuridica}</p>
      {empresaLegal.noLegalizacion && <p style={{ fontSize:11, margin:'2px 0 0' }}>No. Legalización: {empresaLegal.noLegalizacion}</p>}
      {empresaLegal.citasPresentacion && <p style={{ fontSize:11, margin:'2px 0 0' }}>{empresaLegal.citasPresentacion}</p>}
      <p style={{ fontSize:12, fontWeight:700, margin:'6px 0 0', textTransform:'uppercase' }}>{titulo}</p>
      {rangoFecha && <p style={{ fontSize:11, fontWeight:600, margin:'2px 0 0' }}>{rangoFecha}</p>}
      {moneda && <p style={{ fontSize:11, fontWeight:600, margin:'2px 0 0' }}>{moneda}</p>}
    </div>
  );
}

function CajaFirma({ firma, orden }: { firma: Firma; orden: number }) {
  const lineas: string[] = [];
  if (firma.formato.includes('nombre'))    lineas.push(firma.nombre);
  if (firma.formato.includes('documento')) lineas.push(firma.documento);
  if (firma.formato.includes('puesto'))    lineas.push(firma.puesto || firma.puestoAlt || '');
  return (
    <div style={{ width:190, fontFamily:"'Montserrat', sans-serif" }}>
      <p style={{ fontSize:10.5, fontWeight:600, color:'#757575', margin:'0 0 4px', textAlign:'center' }}>Firma Orden {orden}</p>
      <div style={{ height:36, display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen de la firma cargada por el usuario (data URL), no pasa por next/image */}
        {firma.imagenFirma && <img src={firma.imagenFirma} alt="" style={{ maxHeight:36, maxWidth:170, objectFit:'contain' }}/>}
      </div>
      <div style={{ borderBottom:'1px solid #0F0F0F', marginBottom:4 }}/>
      {lineas.map((l,i)=>(
        <p key={i} style={{ fontSize:10.5, fontWeight:600, margin:0, textAlign:'center' }}>{l}</p>
      ))}
    </div>
  );
}

// Layout de firmas al pie del reporte - cambia según la cantidad, tal como
// especifica el documento de referencia: grilla de 3 columnas si hay más de
// 4, una fila de 3 si son exactamente 3, una fila de 2 si son 2.
export function FirmasBloque({ firmas }: { firmas: Firma[] }) {
  if (firmas.length === 0) return null;
  const justify = firmas.length === 2 ? 'space-between' : firmas.length === 3 ? 'space-between' : 'flex-start';
  return (
    <div style={{ marginTop:48, display:'flex', flexWrap:'wrap', gap:24, justifyContent:justify }}>
      {firmas.map((f,i)=>(
        <CajaFirma key={f.id} firma={f} orden={i+1}/>
      ))}
    </div>
  );
}
