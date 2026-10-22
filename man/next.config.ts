import type { NextConfig } from 'next';

// Rutas del MAN anterior y de la primera versión de este proyecto que siguen funcionando en la estructura actual.
const anteriores: [string, string][] = [
  ['/parametros/:tab(monedas|nacionalidades|impuestos|tipo-de-cambio)', '/parametros?tab=:tab'],
  ['/configuracion-general/:tab(monedas|nacionalidades|impuestos|tipo-de-cambio)', '/parametros?tab=:tab'],
  ['/configuracion-general', '/parametros'],
  ['/usuarios/bitacora', '/usuarios?tab=bitacora'],
  ['/usuarios/politica', '/usuarios'],
  ['/seguridad', '/usuarios'],
  ['/seguridad/colaboradores', '/usuarios'],
  ['/seguridad/bitacora', '/usuarios?tab=bitacora'],
  ['/bitacora-seguridad', '/usuarios?tab=bitacora'],
  ['/modulos/conexion', '/modulos?tab=conexion'],
  ['/modulos/enlaces', '/modulos?tab=enlaces'],
  ['/modulos/contabilidad', '/modulos?modulo=FDK'],
  ['/enlace-modulos', '/modulos?tab=enlaces'],
  ['/empresa-estructura', '/empresa'],
  ['/empresa-estructura/empresa', '/empresa'],
  ['/empresa-estructura/modulos', '/modulos'],
  ['/empresa-estructura/enlaces', '/modulos?tab=enlaces'],
  ['/empresa-estructura/entidades', '/modulos/entidades'],
  ['/entidades-datos', '/modulos/entidades'],
  ['/infraestructura', '/estructura/terminales'],
  ['/infraestructura/servicios-programados', '/estructura/servicios'],
  ['/infraestructura/:ruta*', '/estructura/:ruta*'],
  ['/estructura', '/estructura/terminales'],
  ['/integraciones', '/empresa'],
  ['/notificaciones', '/empresa'],
  ['/servidores-servicios', '/estructura/servidores'],
  ['/terminales', '/estructura/terminales'],
  ['/terminales-pinpad', '/estructura/pinpad'],
  ['/servicios', '/estructura/servicios'],
];

const nextConfig: NextConfig = {
  // Enlaces de Front Desk y Accounting para el botón «Módulos» del menú (se reemplazan con las variables en el despliegue).
  env: {
    NEXT_PUBLIC_URL_FDK: process.env.NEXT_PUBLIC_URL_FDK || 'https://front-desk-cyan.vercel.app/',
    NEXT_PUBLIC_URL_ACC: process.env.NEXT_PUBLIC_URL_ACC || 'https://accounting-rho-five.vercel.app/',
  },
  async redirects() {
    return anteriores.map(([source, destination]) => ({ source, destination, permanent: false }));
  },
};

export default nextConfig;
