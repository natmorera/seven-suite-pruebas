'use client';
// Parámetros generales › Nacionalidades: países e idioma que usan los perfiles y las estadísticas de todos los módulos.
import { useDato } from '../../store';
import { CrudCatalogo } from '@/components/kit/CrudCatalogo';
import { ConfigCard } from '@/components/kit';

const IDIOMAS = ['Español', 'Inglés', 'Portugués', 'Francés', 'Alemán', 'Italiano', 'Neerlandés', 'Árabe', 'Chino', 'Japonés'];

export default function Nacionalidades() {
  const [l, set] = useDato('nacionalidades');
  return (
    <ConfigCard title="Nacionalidades">
      <CrudCatalogo entidad="nacionalidad" femenino filas={[...l].sort((a, b) => a.pais.localeCompare(b.pais))} onChange={set} nombre={n => n.pais}
        buscarEn={['codigo', 'pais']} campoActivo="activo" porPagina={12} placeholderBuscar="Código o país"
        nuevo={() => ({ codigo: '', pais: '', idioma: '', activo: true })}
        columnas={[{ key: 'codigo', label: 'Código', link: true, ancho: 90 }, { key: 'pais', label: 'País' }, { key: 'idioma', label: 'Idioma', ancho: 200 }]}
        contador={false}
        campos={[
          { key: 'codigo', label: 'Código', requerido: true, unico: true, placeholder: 'Ej: CRI' },
          { key: 'pais', label: 'País', requerido: true, unico: true, placeholder: 'Ej: Costa Rica' },
          { key: 'idioma', label: 'Idioma', tipo: 'select', opciones: IDIOMAS, placeholder: 'Selecciona' },
          { key: 'activo', label: 'Activa', tipo: 'checkbox' },
        ]}
        validar={n => (!/^[A-Za-z]{3}$/.test(n.codigo) ? 'El código debe tener 3 letras (ISO 3166).' : undefined)} />
    </ConfigCard>
  );
}

