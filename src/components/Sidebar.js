// src/components/Sidebar.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useOrientation } from "../hooks/useOrientation";

const NAV = [
  { icon: "👥", label: "Alumnos",     path: "/instructor/alumnos" },
  { icon: "📋", label: "Rutinas",     path: "/instructor/rutinas" },
  { icon: "🏋️", label: "Ejercicios",  path: "/instructor/ejercicios" },
  { icon: "⭐", label: "Plantillas",  path: "/instructor/plantillas" },
  { icon: "📊", label: "Actividad",   path: "/instructor/actividad" },
  { icon: "⚙️", label: "Config",      path: "/instructor/config" },
];

export default function Sidebar({ config }) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { instructor, logout, isAdmin } = useAuth();
  const landscape   = useOrientation();

  // Portrait → collapsed (solo íconos). Landscape → expanded.
  const collapsed = !landscape;

  const items = isAdmin ? NAV : NAV.filter(n => n.path !== "/instructor/config");

  const initials = instructor?.name
    ? instructor.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "IN";

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {config?.logoUrl
          ? <img src={config.logoUrl} alt="Logo" className="logo-img" />
          : <div className="logo-img" style={{ background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue'", fontSize: 18, color: "var(--red)", fontStyle: "italic" }}>R</div>
        }
        <span className="logo-text">
          {(config?.gymName || "RENDIMIENTO").slice(0, -4) || "RENDI"}
          <span>{(config?.gymName || "RENDIMIENTO").slice(-4) || "MIEN"}</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {items.map(item => (
          <div
            key={item.path}
            className={`nav-item${location.pathname.startsWith(item.path) ? " active" : ""}`}
            onClick={() => navigate(item.path)}
            title={collapsed ? item.label : ""}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="inst-av" style={{ background: "var(--red-bg)", color: "var(--red)" }}>{initials}</div>
        <div className="sidebar-footer-text" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {instructor?.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>{instructor?.role}</div>
        </div>
        <button
          onClick={logout}
          className="sidebar-footer-text"
          style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 16, cursor: "pointer", flexShrink: 0 }}
          title="Salir"
        >⏻</button>
      </div>
    </aside>
  );
}
