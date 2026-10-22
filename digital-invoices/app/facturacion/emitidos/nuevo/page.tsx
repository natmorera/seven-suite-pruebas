import { Suspense } from 'react';
import NuevaFacturaPage from '@/components/pages/facturacion/NuevaFacturaPage';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NuevaFacturaPage />
    </Suspense>
  );
}
