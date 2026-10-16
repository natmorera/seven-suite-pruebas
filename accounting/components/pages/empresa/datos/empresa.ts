'use client';
// Datos de la empresa (pestaña Datos de empresa y primer paso del onboarding).
import { crearAlmacen } from './almacen';

export interface DatosEmpresa {
  nombreLegal: string; nombreComercial: string; tipoId: string; numeroId: string;
  pais: string; zonaHoraria: string; numeroLegalizacion: string; citasPresentacion: string;
  direccion: string; telefono: string; email: string; web: string;
}

export const empresaAlmacen = crearAlmacen<DatosEmpresa>({
  nombreLegal: 'Hotel Fortuna S.A.', nombreComercial: 'Hotel Fortuna',
  tipoId: '02', numeroId: '3101654321', pais: 'CR', zonaHoraria: 'America/Costa_Rica',
  numeroLegalizacion: '', citasPresentacion: '',
  direccion: 'La Fortuna, San Carlos, Alajuela', telefono: '+506 2479-0000', email: 'contabilidad@hotelfortuna.com', web: 'www.hotelfortuna.com',
});
