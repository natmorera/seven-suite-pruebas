import { Suspense } from 'react';
import CambioSabanas from '@/components/ama-de-llaves/CambioSabanas';

export default function Page() {
  return (
    <Suspense>
      <CambioSabanas />
    </Suspense>
  );
}
