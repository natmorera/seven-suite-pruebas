import { Suspense } from 'react';
import ProductoPantalla from '@/components/pages/facturacion/ProductoPantalla';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductoPantalla />
    </Suspense>
  );
}
