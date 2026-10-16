import { Suspense } from 'react';
import VistaCamarera from '@/components/ama-de-llaves/VistaCamarera';

export default function Page() {
  return (
    <Suspense>
      <VistaCamarera />
    </Suspense>
  );
}
