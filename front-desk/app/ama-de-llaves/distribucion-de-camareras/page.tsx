import { Suspense } from 'react';
import DistribucionCamareras from '@/components/ama-de-llaves/DistribucionCamareras';

export default function Page() {
  return (
    <Suspense>
      <DistribucionCamareras />
    </Suspense>
  );
}
