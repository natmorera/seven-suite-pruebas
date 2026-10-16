import { CSSProperties } from "react";
type IconProps = { className?: string; style?: CSSProperties };

// All SVG icons - 14x14 system icons + special sizes
// stroke="currentColor" so color is controlled by parent className

export const Logo = () => (
  <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
    <path d="M0.5 0H13.77C14.16 0 14.4 0.43 14.21 0.78C10.58 7.37 8.37 14.42 7.61 17.58C7.55 17.81 7.35 17.97 7.12 17.97H0.5C0.22 17.97 0 17.74 0 17.46V0.52C0 0.23 0.22 0 0.5 0Z" fill="white"/>
    <path d="M20 17.49V2.65C20 2.13 19.35 1.95 19.11 2.42C16.51 7.55 14.47 14.02 13.58 17.36C13.49 17.68 13.73 18 14.06 18H19.5C19.78 18 20 17.77 20 17.49Z" fill="white"/>
  </svg>
);

export const IcDashboard = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.26 1.66L2.12 4.11C1.59 4.51 1.17 5.38 1.17 6.04V10.37C1.17 11.72 2.27 12.83 3.62 12.83H10.38C11.73 12.83 12.83 11.72 12.83 10.37V6.12C12.83 5.42 12.36 4.51 11.78 4.11L8.18 1.59C7.36 1.01 6.05 1.04 5.26 1.66Z"/>
    <path d="M7 10.49V8.74"/>
  </svg>
);

export const IcRegistro = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.42 1.17H5.25C2.33 1.17 1.17 2.33 1.17 5.25V8.75C1.17 11.67 2.33 12.83 5.25 12.83H8.75C11.67 12.83 12.83 11.67 12.83 8.75V7.58"/>
    <path d="M9.36 1.76L4.76 6.36C4.59 6.53 4.41 6.88 4.38 7.13L4.12 8.88C4.03 9.52 4.48 9.96 5.12 9.88L6.87 9.62C7.12 9.59 7.46 9.41 7.64 9.24L12.24 4.64C13.03 3.85 13.41 2.93 12.24 1.76C11.07 0.59 10.15 0.97 9.36 1.76Z" strokeMiterlimit="10"/>
    <path d="M8.7 2.42C9.09 3.82 10.18 4.91 11.58 5.3"/>
  </svg>
);

export const IcBancos = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.22 1.25L12.47 3.35C12.67 3.44 12.83 3.68 12.83 3.9V5.83C12.83 6.15 12.57 6.42 12.25 6.42H1.75C1.43 6.42 1.17 6.15 1.17 5.83V3.9C1.17 3.68 1.33 3.44 1.53 3.35L6.78 1.25C6.9 1.21 7.1 1.21 7.22 1.25Z"/>
    <path d="M12.83 12.83H1.17V11.08C1.17 10.76 1.43 10.5 1.75 10.5H12.25C12.57 10.5 12.83 10.76 12.83 11.08V12.83Z"/>
    <path d="M2.33 10.5V6.42M4.67 10.5V6.42M7 10.5V6.42M9.33 10.5V6.42M11.67 10.5V6.42"/>
    <path d="M0.58 12.83H13.42"/>
    <circle cx="7" cy="4.08" r="0.88"/>
  </svg>
);

export const IcFunciones = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.44 9.92H10.55C11.66 9.92 12.24 9.33 12.24 8.22V1.17H1.74V8.22C1.75 9.33 2.33 9.92 3.44 9.92Z"/>
    <path d="M1.17 1.17H12.83"/>
    <path d="M4.67 12.83L7 11.67V9.92M9.33 12.83L7 11.67"/>
    <path d="M4.38 6.42L6.21 4.88C6.36 4.76 6.55 4.8 6.65 4.96L7.35 6.12C7.45 6.29 7.64 6.32 7.79 6.2L9.63 4.67"/>
  </svg>
);

export const IcReportes = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.9 6.5H4.35C3.98 6.5 3.69 6.8 3.69 7.17V10.16H5.9V6.5Z"/>
    <path d="M7.44 3.85H6.56C6.19 3.85 5.89 4.15 5.89 4.52V10.15H8.1V4.52C8.1 4.15 7.81 3.85 7.44 3.85Z"/>
    <path d="M9.65 7.5H8.11V10.15H10.32V8.16C10.31 7.79 10.01 7.5 9.65 7.5Z"/>
    <path d="M5.25 12.83H8.75C11.67 12.83 12.83 11.67 12.83 8.75V5.25C12.83 2.33 11.67 1.17 8.75 1.17H5.25C2.33 1.17 1.17 2.33 1.17 5.25V8.75C1.17 11.67 2.33 12.83 5.25 12.83Z"/>
  </svg>
);

export const IcEstados = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.25 12.83H8.75C11.67 12.83 12.83 11.67 12.83 8.75V5.25C12.83 2.33 11.67 1.17 8.75 1.17H5.25C2.33 1.17 1.17 2.33 1.17 5.25V8.75C1.17 11.67 2.33 12.83 5.25 12.83Z"/>
    <path d="M4.52 7L6.17 8.65L9.48 5.35"/>
  </svg>
);

// Billetera con moneda - Presupuesto
export const IcPresupuesto = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.17 4.08C1.17 3.12 1.95 2.33 2.92 2.33H10.5C11.14 2.33 11.67 2.86 11.67 3.5V4.08"/>
    <path d="M1.17 4.08V10.5C1.17 11.14 1.7 11.67 2.33 11.67H11.67C12.31 11.67 12.83 11.14 12.83 10.5V5.83C12.83 5.19 12.31 4.67 11.67 4.67H2.33C1.7 4.67 1.17 4.6 1.17 4.08Z"/>
    <circle cx="9.63" cy="8.17" r="1.17"/>
  </svg>
);

export const IcConfig = ({ className = "w-[16px] h-[16px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2"/>
    <path d="M1.33 8.59V7.41C1.33 6.72 1.9 6.15 2.6 6.15C3.81 6.15 4.3 5.29 3.69 4.25C3.35 3.65 3.55 2.87 4.16 2.52L5.31 1.86C5.84 1.55 6.52 1.73 6.83 2.26L6.91 2.39C7.51 3.43 8.49 3.43 9.1 2.39L9.17 2.26C9.49 1.73 10.17 1.55 10.69 1.86L11.85 2.52C12.45 2.87 12.66 3.65 12.31 4.25C11.71 5.29 12.2 6.15 13.41 6.15C14.1 6.15 14.67 6.71 14.67 7.41V8.59C14.67 9.28 14.11 9.85 13.41 9.85C12.2 9.85 11.71 10.71 12.31 11.75C12.66 12.36 12.45 13.13 11.85 13.48L10.69 14.14C10.17 14.45 9.49 14.27 9.17 13.74L9.1 13.61C8.5 12.57 7.51 12.57 6.91 13.61L6.83 13.74C6.52 14.27 5.84 14.45 5.31 14.14L4.16 13.48C3.55 13.13 3.35 12.35 3.69 11.75C4.3 10.71 3.81 9.85 2.6 9.85C1.9 9.85 1.33 9.28 1.33 8.59Z"/>
  </svg>
);

export const IcLogout = ({ className = "w-[16px] h-[16px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.93 5.04C6.14 2.64 7.37 1.66 10.07 1.66H10.16C13.14 1.66 14.33 2.85 14.33 5.83V10.18C14.33 13.16 13.14 14.35 10.16 14.35H10.07C7.39 14.35 6.16 13.39 5.94 11.03"/>
    <path d="M10 8H2.41"/>
    <path d="M3.9 5.77L1.67 8L3.9 10.23"/>
  </svg>
);

export const IcBell = ({ className = "w-[16px] h-[16px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round">
    <path d="M8.01 1.94C5.81 1.94 4.01 3.73 4.01 5.94V7.87C4.01 8.27 3.84 8.89 3.63 9.24L2.87 10.51C2.39 11.3 2.72 12.17 3.59 12.47C6.46 13.43 9.56 13.43 12.43 12.47C13.24 12.2 13.59 11.25 13.15 10.51L12.39 9.24C12.19 8.89 12.01 8.27 12.01 7.87V5.94C12.01 3.74 10.21 1.94 8.01 1.94Z"/>
    <path d="M9.25 2.13C9.04 2.07 8.83 2.03 8.61 2C7.97 1.92 7.35 1.97 6.78 2.13C6.97 1.64 7.45 1.29 8.01 1.29C8.57 1.29 9.05 1.64 9.25 2.13Z"/>
    <path d="M10.01 12.71C10.01 13.81 9.11 14.71 8.01 14.71C7.47 14.71 6.96 14.48 6.6 14.12C6.24 13.76 6.01 13.25 6.01 12.71"/>
  </svg>
);

export const IcChevronDown = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.62 5.22L7.82 9.02C7.37 9.47 6.63 9.47 6.18 9.02L2.38 5.22"/>
  </svg>
);

export const IcChevronRight = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.22 11.62L9.02 7.82C9.47 7.37 9.47 6.63 9.02 6.18L5.22 2.38"/>
  </svg>
);

export const IcArrowLeft = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.75 2.33L4.08 7L8.75 11.67"/>
  </svg>
);

export const IcPlus = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M7 2.33V11.67M2.33 7H11.67"/>
  </svg>
);

export const IcCheck = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.33 7L5.25 9.92L11.67 4.08"/>
  </svg>
);

export const IcEdit = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.42 1.17H5.25C2.33 1.17 1.17 2.33 1.17 5.25V8.75C1.17 11.67 2.33 12.83 5.25 12.83H8.75C11.67 12.83 12.83 11.67 12.83 8.75V7.58"/>
    <path d="M9.36 1.76L4.76 6.36C4.59 6.53 4.41 6.88 4.38 7.13L4.12 8.88C4.03 9.52 4.48 9.96 5.12 9.88L6.87 9.62C7.12 9.59 7.46 9.41 7.64 9.24L12.24 4.64C13.03 3.85 13.41 2.93 12.24 1.76C11.07 0.59 10.15 0.97 9.36 1.76Z" strokeMiterlimit="10"/>
  </svg>
);

export const IcTrash = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.75 3.5H12.25"/>
    <path d="M5.25 3.5V2.33C5.25 1.96 5.54 1.75 5.83 1.75H8.17C8.46 1.75 8.75 1.96 8.75 2.33V3.5"/>
    <path d="M11.08 3.5L10.5 10.79C10.46 11.36 9.99 11.83 9.42 11.83H4.58C4.01 11.83 3.54 11.36 3.5 10.79L2.92 3.5"/>
    <path d="M5.83 6.42V9.33M8.17 6.42V9.33"/>
  </svg>
);

export const IcSearch = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6.42" cy="6.42" r="4.67"/>
    <path d="M12.83 12.83L9.97 9.97"/>
  </svg>
);

export const IcInfo = ({ className = "w-[14px] h-[14px]", style }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="7" r="5.83"/>
    <path d="M7 9.33V7M7 4.67H7.01"/>
  </svg>
);

export const IcUser = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="4.67" r="2.33"/>
    <path d="M1.75 12.25C1.75 10.04 4.14 8.17 7 8.17C9.86 8.17 12.25 10.04 12.25 12.25"/>
  </svg>
);

export const IcWarning = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.13 2.18L1.38 10.21C1.01 10.85 1.46 11.67 2.25 11.67H11.75C12.54 11.67 12.99 10.85 12.62 10.21L7.87 2.18C7.49 1.54 6.51 1.54 6.13 2.18Z"/>
    <path d="M7 5.83V7.58M7 9.33H7.01"/>
  </svg>
);

export const IcClose = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"/>
  </svg>
);

// ── New icons from uploaded SVGs ──────────────────────────────────────────────
export const IcLink = ({ className = "w-[13px] h-[13px]" }: IconProps) => (
  <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="0.8125">
    <path d="M10.205 6.635L11.137 5.709C11.63 5.198 11.903 4.514 11.897 3.804C11.891 3.094 11.606 2.415 11.104 1.913C10.602 1.41 9.922 1.126 9.212 1.119C8.502 1.113 7.818 1.386 7.307 1.88L6.375 2.806M2.8 6.365L1.874 7.291C1.381 7.802 1.108 8.486 1.114 9.196C1.12 9.906 1.405 10.585 1.907 11.087C2.409 11.59 3.089 11.874 3.799 11.881C4.509 11.887 5.193 11.614 5.704 11.12L6.63 10.194"/>
  </svg>
);

export const IcCopy = ({ className = "w-[13px] h-[13px]" }: IconProps) => (
  <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="0.867" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.833 4.875H5.958C5.36 4.875 4.875 5.36 4.875 5.958V10.833C4.875 11.432 5.36 11.917 5.958 11.917H10.833C11.432 11.917 11.917 11.432 11.917 10.833V5.958C11.917 5.36 11.432 4.875 10.833 4.875Z"/>
    <path d="M2.708 8.125H2.167C1.879 8.125 1.604 8.011 1.401 7.808C1.197 7.605 1.083 7.329 1.083 7.042V2.167C1.083 1.879 1.197 1.604 1.401 1.401C1.604 1.197 1.879 1.083 2.167 1.083H7.042C7.329 1.083 7.605 1.197 7.808 1.401C8.011 1.604 8.125 1.879 8.125 2.167V2.708"/>
  </svg>
);

export const IcNoCircle = ({ className = "w-[13px] h-[13px]" }: IconProps) => (
  <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="0.867" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 11.917C9.491 11.917 11.917 9.492 11.917 6.5C11.917 3.508 9.491 1.083 6.5 1.083C3.508 1.083 1.083 3.508 1.083 6.5C1.083 9.492 3.508 11.917 6.5 11.917Z"/>
    <path d="M2.67 2.67L10.33 10.33"/>
  </svg>
);

export const IcEye = ({ className = "w-[13px] h-[13px]" }: IconProps) => (
  <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="0.8125">
    <path d="M1.083 6.5C1.083 6.5 2.708 2.708 6.5 2.708C10.292 2.708 11.917 6.5 11.917 6.5C11.917 6.5 10.292 10.292 6.5 10.292C2.708 10.292 1.083 6.5 1.083 6.5Z"/>
    <path d="M6.5 8.125C7.397 8.125 8.125 7.397 8.125 6.5C8.125 5.603 7.397 4.875 6.5 4.875C5.603 4.875 4.875 5.603 4.875 6.5C4.875 7.397 5.603 8.125 6.5 8.125Z"/>
  </svg>
);

export const IcEyeOff = ({ className = "w-[13px] h-[13px]" }: IconProps) => (
  <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="0.8125" strokeLinecap="round">
    <path d="M1.6 1.6L11.4 11.4"/>
    <path d="M5.1 3.05C5.55 2.9 6.02 2.83 6.5 2.83C10.29 2.83 11.92 6.5 11.92 6.5C11.63 7.14 11.18 7.85 10.56 8.48M3.35 3.86C2.05 4.72 1.08 6.5 1.08 6.5C1.08 6.5 2.71 10.29 6.5 10.29C7.44 10.29 8.24 10.06 8.91 9.7"/>
    <path d="M5.28 6.28C5.1 6.63 5.1 7.03 5.28 7.38C5.6 7.98 6.32 8.19 6.9 7.86C7.07 7.77 7.2 7.64 7.3 7.48"/>
  </svg>
);

export const IcPrinter = ({ className = "w-[13px] h-[13px]" }: IconProps) => (
  <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="0.867" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.927 3.792H9.073V2.708C9.073 1.625 8.667 1.083 7.448 1.083H5.552C4.333 1.083 3.927 1.625 3.927 2.708V3.792Z"/>
    <path d="M8.667 8.125V10.292C8.667 11.375 8.125 11.917 7.042 11.917H5.958C4.875 11.917 4.333 11.375 4.333 10.292V8.125H8.667Z"/>
    <path d="M11.375 5.417V8.125C11.375 9.208 10.833 9.75 9.75 9.75H8.667V8.125H4.333V9.75H3.25C2.167 9.75 1.625 9.208 1.625 8.125V5.417C1.625 4.333 2.167 3.792 3.25 3.792H9.75C10.833 3.792 11.375 4.333 11.375 5.417Z"/>
    <path d="M9.208 8.125H3.792M3.792 5.958H5.417"/>
  </svg>
);

export const IcImport = ({ className = "w-[16px] h-[16px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 7.333V11.333L7.333 10M6 11.333L4.667 10M14.667 6.667V10C14.667 13.333 13.333 14.667 10 14.667H6C2.667 14.667 1.333 13.333 1.333 10V6C1.333 2.667 2.667 1.333 6 1.333H9.333"/>
    <path d="M14.667 6.667H12C10 6.667 9.333 6 9.333 4V1.333L14.667 6.667Z"/>
  </svg>
);

export const IcExport = ({ className = "w-[16px] h-[16px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 11.333V7.333L4.667 8.667M6 7.333L7.333 8.667M14.667 6.667V10C14.667 13.333 13.333 14.667 10 14.667H6C2.667 14.667 1.333 13.333 1.333 10V6C1.333 2.667 2.667 1.333 6 1.333H9.333"/>
    <path d="M14.667 6.667H12C10 6.667 9.333 6 9.333 4V1.333L14.667 6.667Z"/>
  </svg>
);

export const IcInvoice = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 1.75h5.25L11.08 4.2v7.63a.42.42 0 01-.42.42H3.5a.42.42 0 01-.42-.42V2.17c0-.23.19-.42.42-.42z"/>
    <path d="M8.75 1.75v2.1c0 .23.19.42.42.42h1.9"/>
    <path d="M5 7h4M5 8.75h2.5"/>
  </svg>
);

export const IcCompras = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.15 4.2h7.7l-.7 7a.7.7 0 01-.7.63H4.55a.7.7 0 01-.7-.63l-.7-7z"/>
    <path d="M5.25 4.2V3.15a1.75 1.75 0 013.5 0V4.2"/>
  </svg>
);

export const IcMail = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.17" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.17" y="2.92" width="11.67" height="8.17" rx="1.5"/>
    <path d="M1.75 3.5L7 7.58L12.25 3.5"/>
  </svg>
);

export const IcRefresh = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.25 4.08V6.42H9.92"/>
    <path d="M1.75 9.92V7.58H4.08"/>
    <path d="M2.73 5.83C3.02 5.01 3.52 4.27 4.18 3.69C5.78 2.28 8.22 2.28 9.82 3.69L12.25 6.42M1.75 7.58L4.18 10.31C5.78 11.72 8.22 11.72 9.82 10.31C10.48 9.73 10.98 8.99 11.27 8.17"/>
  </svg>
);

export const IcLock = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.92" y="6.42" width="8.17" height="6.42" rx="1.5"/>
    <path d="M4.67 6.42V4.67C4.67 3.38 5.71 2.33 7 2.33C8.29 2.33 9.33 3.38 9.33 4.67V6.42"/>
    <path d="M7 9.04V10.21"/>
  </svg>
);

export const IcGlobe = ({ className = "w-[14px] h-[14px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="7" r="5.83"/>
    <path d="M1.17 7h11.66M7 1.17C5.54 3.09 4.67 5 4.67 7s.87 3.91 2.33 5.83M7 1.17C8.46 3.09 9.33 5 9.33 7s-.87 3.91-2.33 5.83"/>
  </svg>
);

export const IcCalendar = ({ className = "w-[16px] h-[16px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.333 1.333V3.333M10.667 1.333V3.333M2.333 6.06H13.667M14 5.667V11.333C14 13.333 13 14.667 10.667 14.667H5.333C3 14.667 2 13.333 2 11.333V5.667C2 3.667 3 2.333 5.333 2.333H10.667C13 2.333 14 3.667 14 5.667Z"/>
    <path d="M10.463 9.133H10.469M10.463 11.133H10.469M8 9.133H8.003M8 11.133H8.003M5.53 9.133H5.535M5.53 11.133H5.535"/>
  </svg>
);
