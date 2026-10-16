import type { NextConfig } from 'next';

// Configuración se reorganizó en 10 secciones: las direcciones anteriores
// llevan a la sección donde quedó cada pantalla.
const anteriores: [string, string][] = [
  ['/configuracion/general', '/configuracion/empresa'],
  ['/configuracion/impresoras', '/configuracion/empresa'],
  ['/configuracion/importar-documentos', '/configuracion/empresa'],
  ['/configuracion/ama-de-llaves', '/configuracion/alojamiento'],
  ['/configuracion/cierre-diario', '/configuracion/caja'],
  ['/configuracion/integraciones/:x+', '/configuracion/integraciones'],
  ['/configuracion/sistema/:x+', '/configuracion/usuarios-permisos'],
  ['/configuracion/sistema', '/configuracion/usuarios-permisos'],
  ['/configuracion/configuracion-contable', '/configuracion/empresa'],
];

const nextConfig: NextConfig = {
  async redirects() {
    return anteriores.map(([source, destination]) => ({ source, destination, permanent: false }));
  },
};

export default nextConfig;
