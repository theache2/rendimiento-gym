import React, { useState, useEffect } from "react";
import { watchActivity } from "../../lib/db";

const FILTERS = ["Todo", "Sesiones", "Cambios"];

export default function InstActividad() {
  const [logs, setLogs]     = useState([]);
  const [filter, setFilter] = useState("Todo");

  useEffect(() => watchActivity(setLogs, 100), []);

  const filtered = logs.filter(l => {
    if (filter === "Sesiones") return l.type === "session";
    if (filter === "Cambios")  return l.type !== "session";
    return true;
  });

  // Agrupar por fecha
  const grouped = filtered.reduce((acc, log) => {
    const d = log.date || "Sin fecha";
    if (!acc[d]) acc[d] = [];
    acc[d].push(log);
    return acc;
  }, {});

  const dotColor = (type) => ({
    session: "var(--green)",
    change:  "var(--red)",
    create:  "var(--blue)",
    delete:  "#ff9900",
  }[type] || "var(--text3)");

  const formatDate = (d) => {
    if (!d) return "Sin fecha";
    const today = new Date().toISOString().split("T")[0];
    const yest  = new Date(Date.now()-86400000).toISOString().split("T")[0];
    if (d === today) return "Hoy";
    if (d === yest)  return "Ayer";
    return d;
  };

  return (
    <div className="page">
      <h2 style={{ fontSize:36, marginBottom:6 }}>ACTIVIDAD</h2>
      <p className="text-muted text-sm mb24">Registro completo de sesiones y cambios</p>

      {/* Filtros */}
      <div className="flex gap8 mb24" style={{ flexWrap:"wrap" }}>
        {FILTERS.map(f => (
          <span key={f} className={`tag${filter===f?" active":""}`} onClick={() => setFilter(f)}>{f}</span>
        ))}
      </div>

      {!filtered.length
        ? <div className="empty"><div className="empty-icon">📊</div>Sin actividad registrada</div>
        : Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb24">
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", color:"var(--text3)", marginBottom:8, textTransform:"uppercase" }}>
                {formatDate(date)}
              </div>
              <div className="card" style={{ padding:"4px 0" }}>
                {items.map(log => (
                  <div key={log.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:dotColor(log.type), marginTop:5, flexShrink:0 }} />
                    <div style={{ minWidth:44, fontSize:12, color:"var(--text3)", flexShrink:0 }}>{log.time}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.4 }}>{log.message}</div>
                      {log.instructorName && (
                        <div style={{ fontSize:11, color:"var(--red)", marginTop:3 }}>
                          ✏️ {log.instructorName}
                        </div>
                      )}
                      {log.type === "session" && (
                        <div style={{ fontSize:11, color:"var(--text3)", marginTop:3 }}>
                          👤 sesión registrada
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
      }
    </div>
  );
}
