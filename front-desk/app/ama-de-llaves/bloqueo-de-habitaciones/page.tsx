import { Suspense } from 'react';
import BloqueoHabitaciones from '@/components/ama-de-llaves/BloqueoHabitaciones';

export default function Page() {
  return (
    <Suspense>
      <BloqueoHabitaciones />
    </Suspense>
  );
}
