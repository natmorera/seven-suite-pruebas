import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function Setting2Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7 8.75C7.9665 8.75 8.75 7.9665 8.75 7C8.75 6.0335 7.9665 5.25 7 5.25C6.0335 5.25 5.25 6.0335 5.25 7C5.25 7.9665 6.0335 8.75 7 8.75Z" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.16667 7.51333V6.48667C1.16667 5.88 1.6625 5.37833 2.275 5.37833C3.33083 5.37833 3.7625 4.63167 3.23167 3.71583C2.92833 3.19083 3.10917 2.50833 3.64 2.205L4.64917 1.6275C5.11 1.35333 5.705 1.51667 5.97917 1.9775L6.04333 2.08833C6.56833 3.00417 7.43167 3.00417 7.9625 2.08833L8.02667 1.9775C8.30083 1.51667 8.89583 1.35333 9.35667 1.6275L10.3658 2.205C10.8967 2.50833 11.0775 3.19083 10.7742 3.71583C10.2433 4.63167 10.675 5.37833 11.7308 5.37833C12.3375 5.37833 12.8392 5.87417 12.8392 6.48667V7.51333C12.8392 8.12 12.3433 8.62167 11.7308 8.62167C10.675 8.62167 10.2433 9.36833 10.7742 10.2842C11.0775 10.815 10.8967 11.4917 10.3658 11.795L9.35667 12.3725C8.89583 12.6467 8.30083 12.4833 8.02667 12.0225L7.9625 11.9117C7.4375 10.9958 6.57417 10.9958 6.04333 11.9117L5.97917 12.0225C5.705 12.4833 5.11 12.6467 4.64917 12.3725L3.64 11.795C3.10917 11.4917 2.92833 10.8092 3.23167 10.2842C3.7625 9.36833 3.33083 8.62167 2.275 8.62167C1.6625 8.62167 1.16667 8.12 1.16667 7.51333Z" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const trazo = { stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function BuildingIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M1.75 12.25h10.5M2.917 12.25V2.917c0-.645.522-1.167 1.166-1.167h3.5c.645 0 1.167.522 1.167 1.167v9.333M8.75 5.25h1.75c.644 0 1.167.522 1.167 1.167v5.833" {...trazo} />
      <path d="M4.958 4.083h1.75M4.958 6.125h1.75M4.958 8.167h1.75M5.833 12.25v-1.75" {...trazo} />
    </svg>
  );
}
export function ServerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="1.75" y="1.75" width="10.5" height="4.083" rx="1.17" {...trazo} />
      <rect x="1.75" y="8.167" width="10.5" height="4.083" rx="1.17" {...trazo} />
      <path d="M3.79 3.79h.58M3.79 10.21h.58M7 3.79h3.21M7 10.21h3.21" {...trazo} />
    </svg>
  );
}
export function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="7" cy="4.4" r="2.4" {...trazo} />
      <path d="M2.3 12.25c0-2.03 2.1-3.67 4.7-3.67s4.7 1.64 4.7 3.67" {...trazo} />
    </svg>
  );
}
export function GridIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="1.75" y="1.75" width="4.2" height="4.2" rx="1" {...trazo} />
      <rect x="8.05" y="1.75" width="4.2" height="4.2" rx="1" {...trazo} />
      <rect x="1.75" y="8.05" width="4.2" height="4.2" rx="1" {...trazo} />
      <rect x="8.05" y="8.05" width="4.2" height="4.2" rx="1" {...trazo} />
    </svg>
  );
}
export function ContactsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="1.75" y="2.33" width="10.5" height="9.33" rx="1.4" {...trazo} />
      <circle cx="5.25" cy="6.1" r="1.25" {...trazo} />
      <path d="M3.4 9.6c.3-.9 1-1.4 1.85-1.4s1.55.5 1.85 1.4M8.4 5.6h2.1M8.4 7.6h2.1" {...trazo} />
    </svg>
  );
}
