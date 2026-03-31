import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { watchBloques, registrarSesion, watchConfig } from "../lib/db";
import { useOnline } from "../hooks/useOnline";

const COLORS = [
  ["var(--red-bg)","var(--red)"],["var(--blue-bg)","var(--blue)"],
  ["var(--green-bg)","var(--green)"],["var(--gold-bg)","var(--gold)"],
];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function initials(name) {
  return name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
}

function getYoutubeEmbed(url) {
  const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

const ETAPA_STYLE = {
  "Movilidad / Core":  { label:"MOVILIDAD / CORE",  color:"var(--blue)",  bg:"var(--blue-bg)" },
  "Fuerza / Aeróbico": { label:"FUERZA / AERÓBICO", color:"var(--red)",   bg:"var(--red-bg)" },
  "Vuelta a la calma": { label:"VUELTA A LA CALMA",  color:"var(--green)", bg:"var(--green-bg)" },
};

export default function AlumnoRutina() {
  const { alumnoId } = useParams();
  const navigate     = useNavigate();
  const online       = useOnline();

  const [alumno, setAlumno]         = useState(null);
  const [config, setConfig]         = useState({ gymName:"RENDIMIENTO", logoUrl:null });
  const [bloques, setBloques]       = useState([]);
  const [selBloqueId, setSelBloqueId] = useState(null);
  const [selBloqueIdx, setSelBloqueIdx] = useState(null);
  const [ejercicios, setEjercicios] = useState({});  // mapa ejId → ejercicio global
  const [openTabs, setOpenTabs]     = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("openTabs")||"[]"); } catch { return []; }
  });
  const [openEx, setOpenEx]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);

  useEffect(() => watchConfig(setConfig), []);

  useEffect(() => {
    getDoc(doc(db, "alumnos", alumnoId)).then(snap => {
      if (snap.exists()) setAlumno({ id: snap.id, ...snap.data() });
      else navigate("/alumnos");
    });
  }, [alumnoId]);

  useEffect(() => {
    return watchBloques(alumnoId, data => {
      setBloques(data);
      setLoading(false);
      // Determinar cuál bloque va hoy (el siguiente al último hecho)
      if (data.length > 0 && !selBloqueId) {
        const alumnoSnap = doc(db, "alumnos", alumnoId);
        getDoc(alumnoSnap).then(snap => {
          const lastRutinaId = snap.data()?.lastSession?.rutinaId;
          const lastIdx = data.findIndex(b => b.id === lastRutinaId);
          const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % data.length;
          setSelBloqueId(data[nextIdx].id);
          setSelBloqueIdx(nextIdx);
        });
      }
    });
  }, [alumnoId]);

  // Cargar ejercicios globales referenciados
  useEffect(() => {
    const bloque = bloques.find(b => b.id === selBloqueId);
    if (!bloque?.exercises?.length) return;
    bloque.exercises.forEach(async ex => {
      if (ex.ejId && !ejercicios[ex.ejId]) {
        const snap = await getDoc(doc(db, "ejercicios", ex.ejId));
        if (snap.exists()) setEjercicios(prev => ({ ...prev, [ex.ejId]: snap.data() }));
      }
    });
  }, [selBloqueId, bloques]);

  const bloque = bloques.find(b => b.id === selBloqueId);

  const startSession = async () => {
    if (!bloque || sessionStarted) return;
    await registrarSesion({ alumnoId, alumnoName: alumno?.name || alumnoId, rutinaId: bloque.id, rutinaNombre: bloque.name });
    setSessionStarted(true);
  };

  const selectBloque = (b, idx) => {
    setSelBloqueId(b.id);
    setSelBloqueIdx(idx);
    setOpenEx(null);
    setSessionStarted(false);
  };

  const closeTab = (e, id) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t.id !== id);
    setOpenTabs(newTabs);
    sessionStorage.setItem("openTabs", JSON.stringify(newTabs));
    if (id === alumnoId) {
      if (newTabs.length) navigate(`/alumnos/${newTabs[newTabs.length-1].id}`);
      else navigate("/alumnos");
    }
  };

  // Agrupar ejercicios del bloque por etapa
  const exByEtapa = bloque?.exercises?.reduce((acc, ex) => {
    const et = ex.etapa || "Fuerza / Aeróbico";
    if (!acc[et]) acc[et] = [];
    acc[et].push(ex);
    return acc;
  }, {}) || {};

  const alumnoIdx = openTabs.findIndex(t => t.id === alumnoId);
  const [avatarBg, avatarFg] = COLORS[alumnoIdx % COLORS.length] || COLORS[0];

  const gymName = config.gymName || "RENDIMIENTO";
  const lastBloqueId = alumno?.lastSession?.rutinaId;
  const lastBloqueName = alumno?.lastSession?.rutinaNombre;

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"var(--bg)" }}>
      {/* Topbar */}
      <div className="topbar">
        <div className="flex gap12">
          <button onClick={() => navigate("/alumnos")} style={{ background:"none", border:"none", color:"var(--text2)", fontSize:20, cursor:"pointer", lineHeight:1 }}>←</button>
          {config.logoUrl
            ? <img src={config.logoUrl} alt="" style={{ height:26, objectFit:"contain" }} />
            : <span style={{ fontFamily:"'Bebas Neue'", fontSize:18, color:"var(--red)", letterSpacing:2 }}>{gymName}</span>
          }
        </div>
        <div className="flex gap8">
          <span className={`online-dot ${online?"on":"off"}`} />
          <span className="text-xs text-muted">{online?"Online":"Offline"}</span>
        </div>
      </div>

      <div style={{ flex:1, padding:"20px 20px 16px", overflowY:"auto" }}>
        {/* Header alumno */}
        <div className="flex gap12 mb20">
          <div className="alumno-avatar" style={{ background:avatarBg, color:avatarFg, width:48, height:48, fontSize:18 }}>
            {alumno ? initials(alumno.name) : "?"}
          </div>
          <div>
            <h1 style={{ fontSize:36, lineHeight:1 }}>{alumno?.name?.split(" ")[0]?.toUpperCase() || "..."}</h1>
            <p className="text-muted text-sm">Tu ciclo de rutinas</p>
          </div>
        </div>

        {loading
          ? <div className="spinner-center"><div className="spinner" /></div>
          : bloques.length === 0
            ? <div className="empty"><div className="empty-icon">📋</div>Tu instructor aún no cargó rutinas. Consultale.</div>
            : <>
                {/* Selección de bloque */}
                <div className="mb16">
                  {lastBloqueName && (
                    <div style={{ fontSize:12, color:"var(--text3)", marginBottom:10 }}>
                      Última vez: <span style={{ color:"var(--text2)" }}>{lastBloqueName}</span>
                    </div>
                  )}
                  {bloques.map((b, i) => {
                    const isSel     = b.id === selBloqueId;
                    const isLast    = b.id === lastBloqueId;
                    const isNext    = !sessionStarted && i === selBloqueIdx;
                    return (
                      <div
                        key={b.id}
                        className={`bloque-row${isSel?" active":""}`}
                        style={{ background: isSel ? "var(--bg3)" : "var(--bg2)", border: isSel ? "1px solid var(--red-bd)" : "1px solid var(--border)", borderRadius:12, marginBottom:8 }}
                        onClick={() => selectBloque(b, i)}
                      >
                        <div style={{ width:36, height:36, borderRadius:9, background: isSel ? "var(--red)" : "var(--red-bg)", color: isSel ? "white" : "var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, flexShrink:0 }}>
                          {LETTERS[i]}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:14 }}>{b.name}</div>
                          <div style={{ fontSize:12, color:"var(--text2)", marginTop:2 }}>{b.exercises?.length||0} ejercicios</div>
                        </div>
                        {isNext && !isLast && (
                          <span style={{ fontSize:11, background:"var(--gold-bg)", color:"var(--gold)", border:"1px solid rgba(255,190,50,0.25)", borderRadius:999, padding:"3px 10px", fontWeight:700 }}>
                            ▶ Hoy
                          </span>
                        )}
                        {isLast && (
                          <span style={{ fontSize:11, color:"var(--text3)", background:"var(--bg4)", borderRadius:999, padding:"3px 8px" }}>
                            ✓ última
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Botón empezar sesión */}
                {bloque && !sessionStarted && (
                  <button className="btn btn-primary btn-full mb16" style={{ padding:"14px", fontSize:15 }} onClick={startSession}>
                    Empezar {bloque.name} →
                  </button>
                )}
                {sessionStarted && (
                  <div style={{ background:"var(--green-bg)", border:"1px solid rgba(120,180,120,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"var(--green)" }}>
                    ✓ Sesión registrada. ¡A entrenar!
                  </div>
                )}

                {/* Ejercicios del bloque seleccionado */}
                {bloque && (
                  <div className="card" style={{ padding:0, overflow:"hidden" }}>
                    {["Movilidad / Core","Fuerza / Aeróbico","Vuelta a la calma"].map(et => {
                      const exs = exByEtapa[et];
                      if (!exs?.length) return null;
                      const style = ETAPA_STYLE[et];
                      return (
                        <div key={et}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px 6px", background:"var(--bg3)" }}>
                            <span style={{ padding:"2px 12px", borderRadius:999, fontSize:11, fontWeight:700, background:style.bg, color:style.color }}>{style.label}</span>
                            <div style={{ flex:1, height:1, background:style.bg }} />
                          </div>
                          {exs.map((ex, i) => {
                            const global = ejercicios[ex.ejId] || {};
                            const isOpen = openEx === `${et}-${i}`;
                            return (
                              <div key={i} className="ex-item">
                                <div className={`ex-header${isOpen?" open":""}`} onClick={() => setOpenEx(isOpen ? null : `${et}-${i}`)}>
                                  <div className="ex-num" style={{ background: isOpen ? style.color : style.bg, color: isOpen ? "white" : style.color }}>{i+1}</div>
                                  <div style={{ flex:1 }}>
                                    <div className="ex-name" style={{ color: isOpen ? "var(--text)" : "var(--text)" }}>{ex.name}</div>
                                    <div className="flex gap8 mt4" style={{ flexWrap:"wrap" }}>
                                      {ex.sets   && <span className="badge badge-red"   style={{ fontSize:10 }}>{ex.sets} series</span>}
                                      {ex.reps   && <span className="badge badge-blue"  style={{ fontSize:10 }}>{ex.reps} reps</span>}
                                      {ex.weight && <span className="badge badge-green" style={{ fontSize:10 }}>{ex.weight}</span>}
                                    </div>
                                  </div>
                                  {(global.videoUrl || ex.notes || global.description) && (
                                    <span className={`ex-chevron${isOpen?" open":""}`}>▼</span>
                                  )}
                                </div>

                                {isOpen && (
                                  <div className="ex-detail">
                                    <div className="ex-detail-inner">
                                      {/* Stats */}
                                      <div className="ex-stat-row">
                                        <div className="ex-stat"><div className="ex-stat-val">{ex.sets||"—"}</div><div className="ex-stat-lbl">series</div></div>
                                        <div className="ex-stat"><div className="ex-stat-val">{ex.reps||"—"}</div><div className="ex-stat-lbl">reps</div></div>
                                        <div className="ex-stat"><div className="ex-stat-val" style={{ fontSize: ex.weight&&ex.weight.length>4 ? 14:20 }}>{ex.weight||"—"}</div><div className="ex-stat-lbl">peso</div></div>
                                      </div>

                                      {/* Descripción general */}
                                      {global.description && (
                                        <div className="mb12">
                                          <div className="label">Descripción</div>
                                          <p className="text-sm" style={{ color:"var(--text2)", lineHeight:1.6 }}>{global.description}</p>
                                        </div>
                                      )}

                                      {/* Video */}
                                      {global.videoUrl && (
                                        <div className="mb12">
                                          <div className="label">Video</div>
                                          {global.videoType==="youtube" && getYoutubeEmbed(global.videoUrl)
                                            ? <div className="video-wrap">
                                                <iframe src={getYoutubeEmbed(global.videoUrl)} allowFullScreen title={ex.name} />
                                              </div>
                                            : <div className="video-wrap">
                                                <video src={global.videoUrl} controls playsInline />
                                              </div>
                                          }
                                        </div>
                                      )}

                                      {/* Indicación personal */}
                                      {ex.notes && (
                                        <div>
                                          <div className="label">Indicación personal</div>
                                          <div className="personal-note">
                                            <p>{ex.notes}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
        }
      </div>

      {/* Tab strip */}
      {openTabs.length > 0 && (
        <div className="tab-strip">
          {openTabs.map(t => (
            <div
              key={t.id}
              className={`tab-pill${t.id===alumnoId?" active":""}`}
              onClick={() => navigate(`/alumnos/${t.id}`)}
            >
              <span>{t.name.split(" ")[0]}</span>
              <span className="x" onClick={e => closeTab(e, t.id)}>✕</span>
            </div>
          ))}
          <span className="tab-add" onClick={() => navigate("/alumnos")}>+</span>
        </div>
      )}
    </div>
  );
}
