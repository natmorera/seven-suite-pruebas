"use client";

import { useState, useRef, useEffect } from "react";
import { useDashboard } from "@/lib/dashboard-context";

const F = "var(--font-montserrat), sans-serif";
// Morado claro (lavanda) para el estado activo/acento sobre fondo negro. El
// morado de marca (#5900D9) es demasiado oscuro y no pasa contraste sobre
// #0D0D0D (falla WCAG AA). Este tono sí pasa (~10:1).
const ACCENT = "#DDD6FE";
const ACCENT_BG = "rgba(221,214,254,.18)";

// Íconos calcados 1:1 del kit de Seven Suite (14px, stroke=currentColor)
function IcDashboard({ className = "w-[14px] h-[14px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.26 1.66L2.12 4.11C1.59 4.51 1.17 5.38 1.17 6.04V10.37C1.17 11.72 2.27 12.83 3.62 12.83H10.38C11.73 12.83 12.83 11.72 12.83 10.37V6.12C12.83 5.42 12.36 4.51 11.78 4.11L8.18 1.59C7.36 1.01 6.05 1.04 5.26 1.66Z" />
      <path d="M7 10.49V8.74" />
    </svg>
  );
}
function IcBell({ className = "w-[14px] h-[14px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round">
      <path d="M8.01 1.94C5.81 1.94 4.01 3.73 4.01 5.94V7.87C4.01 8.27 3.84 8.89 3.63 9.24L2.87 10.51C2.39 11.3 2.72 12.17 3.59 12.47C6.46 13.43 9.56 13.43 12.43 12.47C13.24 12.2 13.59 11.25 13.15 10.51L12.39 9.24C12.19 8.89 12.01 8.27 12.01 7.87V5.94C12.01 3.74 10.21 1.94 8.01 1.94Z" />
      <path d="M9.25 2.13C9.04 2.07 8.83 2.03 8.61 2C7.97 1.92 7.35 1.97 6.78 2.13C6.97 1.64 7.45 1.29 8.01 1.29C8.57 1.29 9.05 1.64 9.25 2.13Z" />
      <path d="M10.01 12.71C10.01 13.81 9.11 14.71 8.01 14.71C7.47 14.71 6.96 14.48 6.6 14.12C6.24 13.76 6.01 13.25 6.01 12.71" />
    </svg>
  );
}
function IcLogout({ className = "w-[14px] h-[14px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.93 5.04C6.14 2.64 7.37 1.66 10.07 1.66H10.16C13.14 1.66 14.33 2.85 14.33 5.83V10.18C14.33 13.16 13.14 14.35 10.16 14.35H10.07C7.39 14.35 6.16 13.39 5.94 11.03" />
      <path d="M10 8H2.41" />
      <path d="M3.9 5.77L1.67 8L3.9 10.23" />
    </svg>
  );
}
function IcChevronDown({ className = "w-3 h-3", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.62 5.22L7.82 9.02C7.37 9.47 6.63 9.47 6.18 9.02L2.38 5.22" />
    </svg>
  );
}
function CollapseArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M8.75 2.33L4.08 7L8.75 11.67" stroke="#909090" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5.83" />
      <path d="M1.17 7h11.66M7 1.17C5.54 3.09 4.67 5 4.67 7s.87 3.91 2.33 5.83M7 1.17C8.46 3.09 9.33 5 9.33 7s-.87 3.91-2.33 5.83" />
    </svg>
  );
}
function Logo() {
  return (
    <svg width="14" height="13" viewBox="0 0 20 18" fill="none">
      <path d="M0.5 0H13.77C14.16 0 14.4 0.43 14.21 0.78C10.58 7.37 8.37 14.42 7.61 17.58C7.55 17.81 7.35 17.97 7.12 17.97H0.5C0.22 17.97 0 17.74 0 17.46V0.52C0 0.23 0.22 0 0.5 0Z" fill="white" />
      <path d="M20 17.49V2.65C20 2.13 19.35 1.95 19.11 2.42C16.51 7.55 14.47 14.02 13.58 17.36C13.49 17.68 13.73 18 14.06 18H19.5C19.78 18 20 17.77 20 17.49Z" fill="white" />
    </svg>
  );
}

const SIDEBAR_OPEN = 220;
const SIDEBAR_CLOSED = 48;
const HEADER_H = 52;

function row(active: boolean, collapsed: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: collapsed ? 0 : 10,
    height: 32,
    paddingRight: collapsed ? 0 : 16,
    justifyContent: collapsed ? "center" : "flex-start",
    color: active ? ACCENT : "#C0C0C0",
    background: active && !collapsed ? ACCENT_BG : "transparent",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    borderRadius: 4,
    borderLeft: active && !collapsed ? `3px solid ${ACCENT}` : "3px solid transparent",
    paddingLeft: active && !collapsed ? 13 : collapsed ? 0 : 16,
    margin: collapsed ? "1px auto" : "1px 4px",
    width: collapsed ? 32 : "calc(100% - 8px)",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    fontFamily: F,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flexShrink: 0,
  };
}

// Botón del selector de empresa (solo el trigger; el panel se renderiza en
// SidebarBody para poder ocupar el ancho completo del sidebar, ver #15.3).
function CompanySwitcherButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { data } = useDashboard();
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        flex: 1,
        minWidth: 0,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#E0E0E0",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          textAlign: "left",
        }}
      >
        {data.name}
      </span>
      <IcChevronDown className="w-3 h-3" style={{ transform: open ? "rotate(180deg)" : undefined, flexShrink: 0 }} />
    </button>
  );
}

// Panel del selector de empresa: ancho completo del sidebar, pegado justo
// debajo de la línea que separa el header del resto del menú.
function CompanyDropdownPanel({ onClose }: { onClose: () => void }) {
  const { companies, companyId, setCompanyId } = useDashboard();
  return (
    <div
      style={{
        position: "absolute",
        top: HEADER_H,
        left: 0,
        right: 0,
        background: "#1A1A1A",
        borderBottom: "1px solid rgba(255,255,255,.1)",
        zIndex: 100,
        boxShadow: "0 8px 16px rgba(0,0,0,.5)",
        overflow: "hidden",
      }}
    >
      {companies.map((c) => (
        <button
          key={c.id}
          onClick={() => {
            setCompanyId(c.id);
            onClose();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            width: "100%",
            textAlign: "left",
            padding: "10px 16px",
            fontSize: 12,
            color: c.id === companyId ? ACCENT : "#C0C0C0",
            background: c.id === companyId ? ACCENT_BG : "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: F,
            fontWeight: c.id === companyId ? 500 : 400,
          }}
        >
          <span>{c.name}</span>
          {!c.hasData && (
            <span style={{ fontSize: 9, color: "#757575", border: "1px solid #3a3a3a", borderRadius: 4, padding: "1px 5px" }}>
              Sin datos
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SidebarBody({
  open,
  setOpen,
  onCloseMobile,
}: {
  open: boolean;
  setOpen?: (v: boolean) => void;
  onCloseMobile?: () => void;
}) {
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("Español");
  const [companyOpen, setCompanyOpen] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setCompanyOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: F, position: "relative" }} ref={companyRef}>
      {/* Header: logo + empresa + colapsar */}
      <div
        style={{
          height: HEADER_H,
          minHeight: HEADER_H,
          padding: open ? "0 12px" : 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid rgba(255,255,255,.06)",
          flexShrink: 0,
        }}
      >
        {open ? (
          <>
            <div style={{ width: 28, height: 28, background: "var(--color-primary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Logo />
            </div>
            <CompanySwitcherButton open={companyOpen} onToggle={() => setCompanyOpen((v) => !v)} />
            {setOpen && (
              <button
                onClick={() => setOpen(false)}
                aria-label="Colapsar menú"
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CollapseArrow />
              </button>
            )}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                aria-label="Cerrar menú"
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#E0E0E0",
                  fontSize: 14,
                }}
              >
                ×
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => setOpen?.(true)}
            title="Abrir menú"
            style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div style={{ width: 28, height: 28, background: "var(--color-primary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Logo />
            </div>
          </button>
        )}
      </div>

      {open && companyOpen && <CompanyDropdownPanel onClose={() => setCompanyOpen(false)} />}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 4px" }}>
        <div style={row(true, !open)} title={!open ? "Dashboard" : undefined}>
          <IcDashboard className="w-[14px] h-[14px]" />
          {open && "Dashboard"}
        </div>
      </nav>

      {/* Footer: idioma + notificaciones + cerrar sesión. Misma función row()
          para los tres, así quedan perfectamente alineados y con el mismo
          color cuando no están seleccionados (#15.2). */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: 4, flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <button onClick={() => setLangOpen((v) => !v)} style={row(false, !open)} title={!open ? lang : undefined}>
            <GlobeIcon />
            {open && (
              <>
                <span style={{ flex: 1, textAlign: "left" }}>{lang}</span>
                <IcChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
          {langOpen && open && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 4,
                right: 4,
                background: "#1A1A1A",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 8,
                zIndex: 100,
                boxShadow: "0 4px 16px rgba(0,0,0,.5)",
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              {["Español", "English"].map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLang(l);
                    setLangOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 16px",
                    fontSize: 12,
                    color: l === lang ? ACCENT : "#C0C0C0",
                    background: l === lang ? ACCENT_BG : "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: F,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
        <button style={row(false, !open)} title={!open ? "Notificaciones" : undefined}>
          <IcBell className="w-[14px] h-[14px]" />
          {open && "Notificaciones"}
        </button>
        <button style={row(false, !open)} title={!open ? "Cerrar sesión" : undefined}>
          <IcLogout className="w-[14px] h-[14px]" />
          {open && "Cerrar sesión"}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  // Cerrado por defecto (#14).
  const [open, setOpen] = useState(false);
  const width = open ? SIDEBAR_OPEN : SIDEBAR_CLOSED;

  return (
    <>
      {/* Desktop, fijo al hacer scroll */}
      <aside
        className="hidden md:flex"
        style={{
          width,
          minWidth: width,
          background: "#0D0D0D",
          borderRight: "1px solid rgba(255,255,255,.06)",
          flexDirection: "column",
          transition: "width .18s, min-width .18s",
          overflow: "hidden",
          flexShrink: 0,
          height: "100%",
        }}
      >
        <SidebarBody open={open} setOpen={setOpen} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="relative h-full flex flex-col" style={{ width: 240, maxWidth: "80vw", background: "#0D0D0D" }}>
            <SidebarBody open={true} onCloseMobile={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
