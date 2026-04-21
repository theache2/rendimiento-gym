import React, { useState, useMemo } from "react";

const ETAPA_STYLE = {
  "Movilidad / Core":  { color:"var(--blue)",  bg:"var(--blue-bg)"  },
  "Fuerza / Aeróbico": { color:"var(--red)",   bg:"var(--red-bg)"   },
  "Vuelta a la calma": { color:"var(--green)", bg:"var(--green-bg)" },
};

const ETAPAS = ["Movilidad / Core", "Fuerza / Aeróbico", "Vuelta a la calma"];

function isFirebaseUrl(url) {
  return url && url.includes('firebasestorage');
}

export default function EjercicioSelector({ ejercicios, onSelect, selectedEjId }) {
  const [search, setSearch]               = useState("");
  const [filtroEtapa, setFiltroEtapa]     = useState("");
  const [filtroMusculo, setFiltroMusculo] = useState("");
  const [filtroEquipo, setFiltroEquipo]   = useState("");
  const [showFilters, setShowFilters]     = useState(false);

  const allMusculos = useMemo(() => {
    const set = new Set();
    ejercicios.forEach(e => (e.mainMuscles || []).forEach(m => m && set.add(m)));
    return [...set].sort();
  }, [ejercicios]);

  const allEquipos = useMemo(() => {
    const set = new Set();
    ejercicios.forEach(e => (e.equipment || []).forEach(eq => eq && set.add(eq)));
    return [...set].sort();
  }, [ejercicios]);

  const filtered = useMemo(() => ejercicios.filter(e => {
    const matchSearch  = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchEtapa   = !filtroEtapa || e.etapa === filtroEtapa;
    const matchMusculo = !filtroMusculo || (e.mainMuscles || []).includes(filtroMusculo);
    const matchEquipo  = !filtroEquipo || (e.equipment || []).includes(filtroEquipo);
    return matchSearch && matchEtapa && matchMusculo && matchEquipo;
  }), [ejercicios, search, filtroEtapa, filtroMusculo, filtroEquipo]);

  const hasFilters = filtroEtapa || filtroMusculo || filtroEquipo;
  const activeCount = [filtroEtapa, filtroMusculo, filtroEquipo].filter(Boolean).length;

  const grupos = ETAPAS.reduce((acc, et) => {
    acc[et] = filtered.filter(e => e.etapa === et);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ marginBottom:8 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar ejercicio..."
          autoFocus
        />
      </div>

      <div className="flex-between mb8">
        <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(s => !s)} style={{ fontSize:12 }}>
          🎯 Filtros{activeCount > 0 ? ` (${activeCount})` : ""} {showFilters ? "▲" : "▼"}
        </button>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:"var(--red)" }}
            onClick={() => { setFiltroEtapa(""); setFiltroMusculo(""); setFiltroEquipo(""); }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {showFilters && (
        <div style={{ background:"var(--bg3)", borderRadius:"var(--r)", padding:"12px 14px", marginBottom:12 }}>
          <div className="field" style={{ marginBottom:10 }}>
            <label className="label">Etapa</label>
            <div className="flex gap8" style={{ flexWrap:"wrap" }}>
              {ETAPAS.map(et => (
                <span key={et} onClick={() => setFiltroEtapa(filtroEtapa===et ? "" : et)}
                  style={{ padding:"4px 12px", borderRadius:999, fontSize:11, fontWeight:600, cursor:"pointer",
                    background: filtroEtapa===et ? ETAPA_STYLE[et].bg : "var(--bg2)",
                    color: filtroEtapa===et ? ETAPA_STYLE[et].color : "var(--text2)",
                    border: `1px solid ${filtroEtapa===et ? ETAPA_STYLE[et].color : "var(--border-md)"}` }}>
                  {filtroEtapa===et ? "✓ " : ""}{et}
                </span>
              ))}
            </div>
          </div>

          {allMusculos.length > 0 && (
            <div className="field" style={{ marginBottom:10 }}>
              <label className="label">Músculo principal</label>
              <select value={filtroMusculo} onChange={e => setFiltroMusculo(e.target.value)}>
                <option value="">Todos los músculos</option>
                {allMusculos.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {allEquipos.length > 0 && (
            <div>
              <label className="label">Material</label>
              <select value={filtroEquipo} onChange={e => setFiltroEquipo(e.target.value)}>
                <option value="">Todo el equipamiento</option>
                {allEquipos.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize:11, color:"var(--text3)", marginBottom:8 }}>
        {filtered.length} ejercicio{filtered.length !== 1 ? "s" : ""}
        {hasFilters ? " con filtros aplicados" : ""}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"20px", color:"var(--text2)", fontSize:13 }}>
          {ejercicios.length === 0
            ? "No hay ejercicios en la biblioteca. Agregá ejercicios primero."
            : "Sin resultados. Probá con otros filtros."}
        </div>
      ) : (
        <div style={{ maxHeight:320, overflowY:"auto", border:"1px solid var(--border-md)", borderRadius:"var(--r-sm)" }}>
          {ETAPAS.map(et => {
            const exs = grupos[et];
            if (!exs?.length) return null;
            const style = ETAPA_STYLE[et];
            return (
              <div key={et}>
                <div style={{ padding:"7px 12px", background:"var(--bg3)", fontSize:10, fontWeight:700, letterSpacing:"0.06em", color:style.color, position:"sticky", top:0, zIndex:1 }}>
                  {et.toUpperCase()} · {exs.length}
                </div>
                {exs.map(ej => (
                  <div key={ej.id} onClick={() => onSelect(ej)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", cursor:"pointer",
                      borderBottom:"1px solid var(--border)",
                      background: selectedEjId===ej.id ? style.bg : "transparent",
                      color: selectedEjId===ej.id ? style.color : "var(--text)" }}>
                    {/* Icono de etapa en lugar de imagen */}
                    <div style={{ width:36, height:36, borderRadius:8, background:style.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                      {et === "Movilidad / Core" ? "🔵" : et === "Fuerza / Aeróbico" ? "🔴" : "🟢"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:selectedEjId===ej.id ? 700 : 500, lineHeight:1.3, marginBottom:3 }}>{ej.name}</div>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {(ej.mainMuscles||[]).slice(0,2).map(m => (
                          <span key={m} style={{ fontSize:10, padding:"1px 6px", borderRadius:999, background:"var(--bg4)", color:"var(--text2)" }}>{m}</span>
                        ))}
                        {(ej.equipment||[]).slice(0,1).map(eq => (
                          <span key={eq} style={{ fontSize:10, padding:"1px 6px", borderRadius:999, background:"var(--bg4)", color:"var(--text2)" }}>{eq}</span>
                        ))}
                        {isFirebaseUrl(ej.videoUrl) && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:999, background:"var(--green-bg)", color:"var(--green)" }}>🎬</span>}
                        {ej.videoType==="youtube" && ej.videoUrl && !ej.videoUrl.includes("cloudfront") && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:999, background:"var(--red-bg)", color:"var(--red)" }}>▶</span>}
                      </div>
                    </div>
                    {selectedEjId===ej.id && <span style={{ color:style.color, fontSize:16, flexShrink:0 }}>✓</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
