import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { watchAlumnos, watchConfig } from "../lib/db";
import { useOnline } from "../hooks/useOnline";

const COLORS = [
  ["var(--red-bg)","var(--red)"],     ["var(--blue-bg)","var(--blue)"],
  ["var(--green-bg)","var(--green)"], ["var(--gold-bg)","var(--gold)"],
];

function initials(name) {
  return name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
}

export default function AlumnoSelect() {
  const navigate = useNavigate();
  const online   = useOnline();
  const [alumnos, setAlumnos]       = useState([]);
  const [config, setConfig]         = useState({ gymName:"RENDIMIENTO", logoUrl:null });
  const [search, setSearch]         = useState("");
  const [openTabs, setOpenTabs]     = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("openTabs")||"[]"); } catch { return []; }
  });
  const [activeTab, setActiveTab]   = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => watchAlumnos(a => { setAlumnos(a); setLoading(false); }), []);
  useEffect(() => watchConfig(setConfig), []);

  const filtered = alumnos.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const openAlumno = (a) => {
    // Si ya está abierto, activarlo
    if (openTabs.find(t => t.id === a.id)) { setActiveTab(a.id); navigate(`/alumnos/${a.id}`); return; }
    const newTabs = [...openTabs, { id: a.id, name: a.name }];
    setOpenTabs(newTabs);
    sessionStorage.setItem("openTabs", JSON.stringify(newTabs));
    setActiveTab(a.id);
    setSearch("");
    navigate(`/alumnos/${a.id}`);
  };

  const closeTab = (e, id) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t.id !== id);
    setOpenTabs(newTabs);
    sessionStorage.setItem("openTabs", JSON.stringify(newTabs));
    if (activeTab === id) {
      if (newTabs.length > 0) navigate(`/alumnos/${newTabs[newTabs.length-1].id}`);
      else navigate("/alumnos");
    }
  };

  const gymName = config.gymName || "RENDIMIENTO";

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"var(--bg)" }}>
      {/* Topbar */}
      <div className="topbar">
        <div className="flex gap12">
          <button onClick={() => navigate("/")} style={{ background:"none", border:"none", color:"var(--text2)", fontSize:20, cursor:"pointer", lineHeight:1 }}>←</button>
          {config.logoUrl
            ? <img src={config.logoUrl} alt="" style={{ height:28, objectFit:"contain" }} />
            : <span style={{ fontFamily:"'Bebas Neue'", fontSize:20, color:"var(--red)", letterSpacing:2 }}>{gymName}</span>
          }
        </div>
        <div className="flex gap8">
          <span className={`online-dot ${online?"on":"off"}`} />
          <span className="text-xs text-muted">{online?"Conectado":"Offline"}</span>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex:1, padding:"20px 20px 0" }}>
        <h2 style={{ fontSize:36, marginBottom:4 }}>¿QUIÉN SOS?</h2>
        <p className="text-muted text-sm mb16">Tocá tu nombre para ver tu rutina</p>

        <div className="field">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar tu nombre..." style={{ fontSize:16 }} autoFocus={false} />
        </div>

        {loading
          ? <div className="spinner-center"><div className="spinner" /></div>
          : !filtered.length
            ? <div className="empty"><div className="empty-icon">🔍</div>{search ? "No se encontró ese nombre" : "No hay alumnos registrados"}</div>
            : <div className="alumno-grid">
                {filtered.map((a,i) => {
                  const [bg,fg] = COLORS[i%COLORS.length];
                  const yaAbierto = openTabs.find(t => t.id === a.id);
                  return (
                    <div
                      key={a.id}
                      className="alumno-card"
                      style={{ opacity: yaAbierto ? 0.4 : 1 }}
                      onClick={() => openAlumno(a)}
                    >
                      <div className="alumno-avatar" style={{ background:bg, color:fg }}>{initials(a.name)}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", lineHeight:1.3 }}>{a.name}</div>
                      {yaAbierto && <span className="badge badge-gray" style={{ fontSize:10 }}>Ya abierto</span>}
                    </div>
                  );
                })}
              </div>
        }
      </div>

      {/* Tab strip */}
      {openTabs.length > 0 && (
        <div className="tab-strip">
          {openTabs.map(t => (
            <div
              key={t.id}
              className={`tab-pill${activeTab===t.id?" active":""}`}
              onClick={() => { setActiveTab(t.id); navigate(`/alumnos/${t.id}`); }}
            >
              <span>{t.name.split(" ")[0]}</span>
              <span className="x" onClick={e => closeTab(e, t.id)}>✕</span>
            </div>
          ))}
          <span className="tab-add" onClick={() => { setActiveTab(null); navigate("/alumnos"); }}>+</span>
        </div>
      )}
    </div>
  );
}
