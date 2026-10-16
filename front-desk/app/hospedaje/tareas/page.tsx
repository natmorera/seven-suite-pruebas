import { Suspense } from 'react';
import Tareas from '@/components/hospedaje/Tareas';

export default function Page() {
  return (
    <Suspense>
      <Tareas />
    </Suspense>
  );
}
