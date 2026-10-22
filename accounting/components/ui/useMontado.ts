'use client';
// true solo en el navegador, después de hidratar (en el servidor, false)
import { useSyncExternalStore } from 'react';

const sinCambios = () => () => {};
export const useMontado = () => useSyncExternalStore(sinCambios, () => true, () => false);
