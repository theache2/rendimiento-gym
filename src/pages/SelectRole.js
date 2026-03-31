import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnline } from "../hooks/useOnline";
import { watchConfig } from "../lib/db";

export default function SelectRole() {
  const navigate = useNavigate();
  const online   = useOnline();
  const [config, setConfig] = useState({ gymName: "RENDIMIENTO", logoUrl: null });

  useEffect(() => watchConfig(setConfig), []);

  const name = config.gymName || "RENDIMIENTO";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", background: "var(--bg)" }}>

      {/* Online indicator */}
      <div style={{ position: "fixed", top: 16, right: 16, display: "flex", alignItems: "center", gap: 6 }}>
        <span className={`online-dot ${online ? "on" : "off"}`} />
        <span className="text-xs text-muted">{online ? "Conectado" : "Sin conexión"}</span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 320, width: "100%" }}>
        {config.logoUrl
          ? <img src={config.logoUrl} alt="Logo" style={{ height: 90, objectFit: "contain", marginBottom: 20 }} />
          : (
            <div style={{
              width: 90, height: 90, borderRadius: "50%", background: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <span style={{ fontFamily: "'Bebas Neue'", fontSize: 44, color: "var(--red)", fontStyle: "italic", lineHeight: 1 }}>R</span>
            </div>
          )
        }
        <h1 style={{ fontSize: 52, color: "var(--text)", marginBottom: 8 }}>{name}</h1>
        <p className="text-muted" style={{ fontSize: 15 }}>Sistema de rutinas personalizadas</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
        <button
          className="btn btn-primary btn-full"
          style={{ padding: "18px 20px", fontSize: 17, borderRadius: 14 }}
          onClick={() => navigate("/alumnos")}
        >
          💪 Ver mi rutina
        </button>
        <button
          className="btn btn-ghost btn-full"
          style={{ padding: "14px 20px" }}
          onClick={() => navigate("/instructor/login")}
        >
          Acceso instructor
        </button>
      </div>
    </div>
  );
}
