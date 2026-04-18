import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { watchBloques, registrarSesion, watchConfig } from "../lib/db";
import { useOnline } from "../hooks/useOnline";
import { useAuth } from "../contexts/AuthContext";

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

function proxyImg(url) {
  if (!url) return '';
  if (url.includes('firebasestorage') || url.includes('youtube') || !url.includes('cloudfront')) return url;
return '/api/img?url=' + encodeURIComponent(url);}

const ETAPA_STYLE = {
  "Movilidad / Core":  { label:"MOVILIDAD / CORE",  color:"var(--blue)",  bg:"var(--blue-bg)"  },
  "Fuerza / Aeróbico": { label:"FUERZA / AERÓBICO", color:"var(--red)",   bg:"var(--red-bg)"   },
  "Vuelta a la calma": { label:"VUELTA A LA CALMA",  color:"var(--green)", bg:"var(--green-bg)" },
};

export default function AlumnoRutina() {
  const { alumnoId }   = useParams();
  const navigate       = useNavigate();
  const online         = useOnline();
  const { alumnoAuth, logoutAlumno } = useAuth();

  const [alumno, setAlumno]           = useState(null);
  const [config, setConfig]           = useState({ gymName:"RENDIMIENTO", logoUrl:null });
  const [bloques, setBloques]         = useState([]);
  const [selBloqueId, setSelBloqueId] = useState(null);
  const [selBloqueIdx, setSelBloqueIdx] = useState(null);
  const [ejercicios, setEjercicios]   = useState({});
  const [openTabs, setOpenTabs]       = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("openTabs")||"[]"); } catch { return []; }
  });
  const [openEx, setOpenEx]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Verificar acceso: alumno solo puede ver su propia rutina
  useEffect(() => {
    if (!alumnoAuth) { navigate("/login-alumno", { replace:true }); return; }
    if (!alumnoAuth.isTablet && alumnoAuth.id !== alumnoId) {
      navigate(`/alumnos/${alumnoAuth.id}`, { replace:true });
    }
  }, [alumnoAuth, alumnoId]);

  useEffect(() => watchConfig(setConfig), []);

  useEffect(() => {
    getDoc(doc(db, "alumnos", alumnoId)).then(snap => {
      if (snap.exists()) setAlumno({ id:snap.id, ...snap.data() });
      else navigate("/alumnos");
    });
  }, [alumnoId]);

  useEffect(() => {
    return watchBloques(alumnoId, data => {
      setBloques(data);
      setLoading(false);
      if (data.length > 0 && !selBloqueId) {
        getDoc(doc(db, "alumnos", alumnoId)).then(snap => {
          const lastRutinaId = snap.data()?.lastSession?.rutinaId;
          const lastIdx = data.findIndex(b => b.id === lastRutinaId);
          const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % data.length;
          setSelBloqueId(data[nextIdx].id);
          setSelBloqueIdx(nextIdx);
        });
      }
    });
  }, [alumnoId]);

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
    await registrarSesion({ alumnoId, alumnoName:alumno?.name||alumnoId, rutinaId:bloque.id, rutinaNombre:bloque.name });
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

  const handleLogout = () => {
    // Si es tablet vuelve a la grilla, si es alumno propio vuelve al login
    if (alumnoAuth?.isTablet) navigate("/alumnos");
    else { logoutAlumno(); navigate("/"); }
  };

  const exByEtapa = bloque?.exercises?.reduce((acc, ex) => {
    const et = ex.etapa || "Fuerza / Aeróbico";
    if (!acc[et]) acc[et] = [];
    acc[et].push(ex);
    return acc;
  }, {}) || {};

  const alumnoIdx = openTabs.findIndex(t => t.id === alumnoId);
  const [avatarBg, avatarFg] = COLORS[Math.max(alumnoIdx,0) % COLORS.length];
  const gymName = config.gymName || "RENDIMIENTO";
  const lastBloqueId = alumno?.lastSession?.rutinaId;
  const isTablet = alumnoAuth?.isTablet;

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"var(--bg)" }}>
      <div className="topbar">
        <div className="flex gap12">
          {isTablet
            ? <button onClick={() => navigate("/alumnos")} style={{ background:"none", border:"none", color:"var(--text2)", fontSize:20, cursor:"pointer", lineHeight:1 }}>←</button>
            : null
          }
          {config.logoUrl
            ? <img src={config.logoUrl} alt="" style={{ height:26, objectFit:"contain" }} />
            : <span style={{ fontFamily:"'Bebas Neue'", fontSize:18, color:"var(--red)", letterSpacing:2 }}>{gymName}</span>
          }
        </div>
        <div className="flex gap12">
          <div className="flex gap8">
            <span className={`online-dot ${online?"on":"off"}`} />
            <span className="text-xs text-muted">{online?"Online":"Offline"}</span>
          </div>
          {!isTablet && (
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ fontSize:12 }}>Salir</button>
          )}
        </div>
      </div>

      <div style={{ flex:1, padding:"20px 20px 16px", overflowY:"auto" }}>
        <div className="flex gap12 mb20">
          {alumno?.photoUrl
            ? <img src={alumno.photoUrl} alt="" style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
            : <div className="alumno-avatar" style={{ background:avatarBg, color:avatarFg, width:48, height:48, fontSize:18, flexShrink:0 }}>{alumno ? initials(alumno.name) : "?"}</div>
          }
          <div>
            <h1 style={{ fontSize:36, lineHeight:1 }}>{alumno?.name?.split(" ")[0]?.toUpperCase() || "..."}</h1>
            <p className="text-muted text-sm">Tu ciclo de rutinas</p>
          </div>
        </div>

        {loading
          ? <div className="spinner-center"><div className="spinner" /></div>
          : bloques.length === 0
            ? <div className="empty"><div className="empty-icon">📋</div>Tu instructor aún no cargó rutinas.</div>
            : <>
                <div className="mb16">
                  {alumno?.lastSession?.rutinaNombre && (
                    <div style={{ fontSize:12, color:"var(--text3)", marginBottom:10 }}>
                      Última vez: <span style={{ color:"var(--text2)" }}>{alumno.lastSession.rutinaNombre}</span>
                    </div>
                  )}
                  {bloques.map((b, i) => {
                    const isSel  = b.id === selBloqueId;
                    const isLast = b.id === lastBloqueId;
                    const isNext = !sessionStarted && i === selBloqueIdx;
                    return (
                      <div key={b.id}
                        style={{ background:isSel?"var(--bg3)":"var(--bg2)", border:`1px solid ${isSel?"var(--red-bd)":"var(--border)"}`, borderRadius:12, marginBottom:8, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                        onClick={() => selectBloque(b, i)}
                      >
                        <div style={{ width:36, height:36, borderRadius:9, background:isSel?"var(--red)":"var(--red-bg)", color:isSel?"white":"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, flexShrink:0 }}>
                          {LETTERS[i]}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:14 }}>{b.name}</div>
                          <div style={{ fontSize:12, color:"var(--text2)", marginTop:2 }}>{b.exercises?.length||0} ejercicios</div>
                        </div>
                        {isNext && !isLast && <span style={{ fontSize:11, background:"var(--gold-bg)", color:"var(--gold)", border:"1px solid rgba(255,190,50,0.25)", borderRadius:999, padding:"3px 10px", fontWeight:700 }}>▶ Hoy</span>}
                        {isLast && <span style={{ fontSize:11, color:"var(--text3)", background:"var(--bg4)", borderRadius:999, padding:"3px 8px" }}>✓ última</span>}
                      </div>
                    );
                  })}
                </div>

                {bloque && !sessionStarted && (
                  <button className="btn btn-primary btn-full mb16" style={{ padding:14, fontSize:15 }} onClick={startSession}>
                    Empezar {bloque.name} →
                  </button>
                )}
                {sessionStarted && (
                  <div style={{ background:"var(--green-bg)", border:"1px solid rgba(120,180,120,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"var(--green)" }}>
                    ✓ Sesión registrada. ¡A entrenar!
                  </div>
                )}

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
                            const hasDetail = global.videoUrl || ex.notes || global.description;
                            return (
                              <div key={i} style={{ borderBottom:"1px solid var(--border)" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", cursor:hasDetail?"pointer":"default", background:isOpen?"var(--bg3)":"transparent" }}
                                  onClick={() => hasDetail && setOpenEx(isOpen ? null : `${et}-${i}`)}>
                                  <div style={{ width:28, height:28, borderRadius:7, background:isOpen?style.color:style.bg, color:isOpen?"white":style.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontWeight:600, fontSize:14 }}>{ex.name}</div>
                                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
                                      {ex.sets   && <span className="badge badge-red"   style={{ fontSize:10 }}>{ex.sets} series</span>}
                                      {ex.reps   && <span className="badge badge-blue"  style={{ fontSize:10 }}>{ex.reps} reps</span>}
                                      {ex.weight && <span className="badge badge-green" style={{ fontSize:10 }}>{ex.weight}</span>}
                                    </div>
                                  </div>
                                  {hasDetail && <span style={{ color:isOpen?style.color:"var(--text3)", fontSize:12, transition:"transform 0.2s", display:"inline-block", transform:isOpen?"rotate(180deg)":"none" }}>▼</span>}
                                </div>
                                {isOpen && (
                                  <div style={{ padding:"0 16px 14px", borderTop:"1px solid var(--border)", background:"var(--bg3)" }}>
                                    <div style={{ paddingTop:12 }}>
                                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                                        {["sets","reps","weight"].map(k => (
                                          <div key={k} style={{ background:"var(--bg2)", borderRadius:"var(--r-sm)", padding:"10px 8px", textAlign:"center" }}>
                                            <div style={{ fontSize:20, fontWeight:800, color:"var(--red)", lineHeight:1 }}>{ex[k]||"—"}</div>
                                            <div style={{ fontSize:10, color:"var(--text3)", marginTop:3 }}>{k==="sets"?"series":k==="reps"?"reps":"peso"}</div>
                                          </div>
                                        ))}
                                      </div>
                                      {global.description && (
                                        <div className="mb12">
                                          <div className="label">Descripción</div>
                                          <p className="text-sm" style={{ color:"var(--text2)", lineHeight:1.6 }}>{global.description}</p>
                                        </div>
                                      )}
                                      {global.videoUrl && (
                                        <div className="mb12">
                                          <div className="label">{global.videoType==="image" ? "Animación" : "Video"}</div>
                                          {global.videoType==="image" || (!global.videoType && global.videoUrl.includes("cloudfront"))
                                            ? <img src={proxyImg(global.videoUrl)} alt={ex.name} style={{ width:"100%", borderRadius:"var(--r-sm)", display:"block" }} />
                                            : <div className="video-wrap">
                                                {global.videoType==="youtube" && getYoutubeEmbed(global.videoUrl)
                                                  ? <iframe src={getYoutubeEmbed(global.videoUrl)} allowFullScreen title={ex.name} />
                                                  : <video src={global.videoUrl} controls playsInline />
                                                }
                                              </div>
                                          }
                                        </div>
                                      )}
                                      {ex.notes && (
                                        <div>
                                          <div className="label">Indicación personal</div>
                                          <div style={{ background:"var(--red-bg)", border:"1px solid var(--red-bd)", borderRadius:"var(--r-sm)", padding:"10px 12px" }}>
                                            <p style={{ fontSize:13, color:"#d8888a", lineHeight:1.5 }}>{ex.notes}</p>
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

      {isTablet && openTabs.length > 0 && (
        <div className="tab-strip">
          {openTabs.map(t => (
            <div key={t.id} className={`tab-pill${t.id===alumnoId?" active":""}`} onClick={() => navigate(`/alumnos/${t.id}`)}>
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
