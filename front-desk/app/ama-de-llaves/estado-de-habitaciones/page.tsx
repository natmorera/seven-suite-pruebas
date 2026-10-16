import { Suspense } from 'react';
import EstadoHabitaciones from '@/components/ama-de-llaves/EstadoHabitaciones';

export default function Page() {
  return (
    <Suspense>
      <EstadoHabitaciones />
    </Suspense>
  );
}
