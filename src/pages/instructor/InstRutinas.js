import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  watchAlumnos, watchBloques, saveBloque, deleteBloque,
  watchEjercicios, watchPlantillas, logActivity
} from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import Toast from "../../components/Toast";

const ETAPAS = ["Movilidad / Core", "Fuerza / Aeróbico", "Vuelta a la calma"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ETAPA_STYLE = {
  "Movilidad / Core":  { color:"var(--blue)",  bg:"var(--blue-bg)"  },
  "Fuerza / Aeróbico": { color:"var(--red)",   bg:"var(--red-bg)"   },
  "Vuelta a la calma": { color:"var(--green)", bg:"var(--green-bg)" },
};
const EMPTY_BLOQUE = { name:"", label:"" };
const EMPTY_EX = { ejId:"", name:"", etapa:"Fuerza / Aeróbico", sets:"", reps:"", weight:"", notes:"" };

function sortByEtapa(exercises) {
  return [...exercises].sort((a, b) => ETAPAS.indexOf(a.etapa) - ETAPAS.indexOf(b.etapa));
}

export default function InstRutinas() {
  const [params]                      = useSearchParams();
  const [alumnos, setAlumnos]         = useState([]);
  const [ejercicios, setEjercicios]   = useState([]);
  const [plantillas, setPlantillas]   = useState([]);
  const [selAlumno, setSelAlumno]     = useState(params.get("alumno") || "");
  const [bloques, setBloques]         = useState([]);
  const [selBloqueId, setSelBloqueId] = useState(null);
  const [view, setView]               = useState("bloques");
  const [bloqueForm, setBloqueForm]   = useState(EMPTY_BLOQUE);
  const [exForm, setExForm]           = useState(EMPTY_EX);
  const [showExForm, setShowExForm]   = useState(false);
  const [editExIdx, setEditExIdx]     = useState(null);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState("");
  const [searchAlumno, setSearchAlumno] = useState("");
  const [showAlumnoList, setShowAlumnoList] = useState(false);
  const [searchBloque, setSearchBloque]     = useState("");
  const [searchEj, setSearchEj]             = useState("");
  const { instructor } = useAuth();

  useEffect(() => watchAlumnos(setAlumnos), []);
  useEffect(() => watchEjercicios(setEjercicios), []);
  useEffect(() => watchPlantillas(setPlantillas), []);
  useEffect(() => {
    if (!selAlumno) { setBloques([]); return; }
    return watchBloques(selAlumno, setBloques);
  }, [selAlumno]);

  const alumno    = alumnos.find(a => a.id === selAlumno);
  const selBloque = bloques.find(b => b.id === selBloqueId);

  const filteredAlumnos = useMemo(() =>
    alumnos.filter(a => a.name.toLowerCase().includes(searchAlumno.toLowerCase())),
    [alumnos, searchAlumno]
  );
  const filteredBloques = useMemo(() =>
    bloques.filter(b => b.name.toLowerCase().includes(searchBloque.toLowerCase())),
    [bloques, searchBloque]
  );
  const filteredEjercicios = useMemo(() =>
    ejercicios.filter(e => e.name.toLowerCase().includes(searchEj.toLowerCase())),
    [ejercicios, searchEj]
  );

  const selectAlumno = (a) => {
    setSelAlumno(a.id);
    setSearchAlumno(a.name);
    setShowAlumnoList(false);
    setSelBloqueId(null);
    setSearchBloque("");
  };

  const guardarEjercicios = async (exercises) => {
    const sorted = sortByEtapa(exercises);
    await updateDoc(doc(db, "alumnos", selAlumno, "bloques", selBloqueId), { exercises: sorted });
    await logActivity({ type:"change", message:`Rutina "${selBloque?.name}" actualizada — ${alumno?.name}`, instructorId: instructor.id, instructorName: instructor.name });
    setToast("Guardado ✓");
  };

  const crearBloque = async () => {
    if (!bloqueForm.name.trim()) return;
    setSaving(true);
    const id = await saveBloque(selAlumno, { ...bloqueForm, exercises:[], order: bloques.length });
    await logActivity({ type:"change", message:`Rutina "${bloqueForm.name}" creada — ${alumno?.name}`, instructorId: instructor.id, instructorName: instructor.name });
    setSelBloqueId(id);
    setBloqueForm(EMPTY_BLOQUE);
    setView("editBloque");
    setSaving(false);
    setToast("Rutina creada. Ahora agregá ejercicios.");
  };

  const agregarEjercicio = async () => {
    if (!exForm.ejId && !exForm.name) return;
    const exercises = [...(selBloque?.exercises || [])];
    if (editExIdx === null) {
      const yaExiste = exercises.find(e => e.ejId === exForm.ejId && exForm.ejId);
      if (yaExiste) {
        const ok = window.confirm(`⚠️ Estás seleccionando "${exForm.name}" 2 veces. ¿Querés agregarlo igual?`);
        if (!ok) return;
      }
    }
    if (editExIdx !== null) exercises[editExIdx] = exForm;
    else exercises.push(exForm);
    await guardarEjercicios(exercises);
    setExForm(EMPTY_EX);
    setShowExForm(false);
    setEditExIdx(null);
    setSearchEj("");
  };

  const editarEjercicio = (idx) => {
    setExForm(selBloque.exercises[idx]);
    setEditExIdx(idx);
    setShowExForm(true);
    setSearchEj(selBloque.exercises[idx].name);
  };

  const eliminarEjercicio = async (idx) => {
    await guardarEjercicios(selBloque.exercises.filter((_, i) => i !== idx));
  };

  const eliminarBloque = async (b) => {
    if (!window.confirm(`¿Eliminar la rutina "${b.name}"?`)) return;
    await deleteBloque(selAlumno, b.id);
    if (selBloqueId === b.id) { setSelBloqueId(null); setView("bloques"); }
    setToast("Rutina eliminada");
  };

  const asignarPlantilla = async (p) => {
    const copiaEjercicios = (p.exercises || []).map(ex => ({ ...ex }));
    const id = await saveBloque(selAlumno, {
      name: p.name, label: p.label || "", exercises: sortByEtapa(copiaEjercicios), order: bloques.length
    });
    await logActivity({ type:"change", message:`Plantilla "${p.name}" asignada a ${alumno?.name}`, instructorId: instructor.id, instructorName: instructor.name });
    setSelBloqueId(id);
    setView("editBloque");
    setToast(`Plantilla "${p.name}" asignada. Podés editarla para ${alumno?.name}.`);
  };

  const exPorEtapa = (exercises) => ETAPAS.reduce((acc, et) => {
    acc[et] = (exercises || []).filter(e => e.etapa === et);
    return acc;
  }, {});

  // ── VISTA: Lista de bloques ──────────────────────────────────────────────
  if (view === "bloques") return (
    <div className="page">
      <h2 style={{ fontSize:36, marginBottom:20 }}>RUTINAS</h2>

      {/* Selector alumno — input + dropdown manual */}
      <div className="field mb8" style={{ position:"relative" }}>
        <label className="label">Alumno</label>
        <input
          value={searchAlumno}
          onChange={e => { setSearchAlumno(e.target.value); setShowAlumnoList(true); if(!e.target.value){ setSelAlumno(""); } }}
          onFocus={() => setShowAlumnoList(true)}
          placeholder="🔍 Buscar o seleccionar alumno..."
        />
        {showAlumnoList && filteredAlumnos.length > 0 && (
          <div style={{
            position:"absolute", top:"100%", left:0, right:0, zIndex:100,
            background:"var(--bg2)", border:"1px solid var(--border-md)",
            borderRadius:"var(--r-sm)", boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
            maxHeight:220, overflowY:"auto", marginTop:4
          }}>
            {filteredAlumnos.map(a => (
              <div key={a.id} onClick={() => selectAlumno(a)}
                style={{ padding:"11px 14px", cursor:"pointer", fontSize:14,
                  background: selAlumno===a.id ? "var(--red-bg)" : "transparent",
                  color: selAlumno===a.id ? "var(--red)" : "var(--text)",
                  fontWeight: selAlumno===a.id ? 600 : 400,
                  borderBottom:"1px solid var(--border)"
                }}
              >
                {a.name} {selAlumno===a.id && "✓"}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Cerrar dropdown al clickear afuera */}
      {showAlumnoList && <div style={{ position:"fixed", inset:0, zIndex:50 }} onClick={() => setShowAlumnoList(false)} />}

      {!selAlumno
        ? <div className="empty mt24"><div className="empty-icon">👆</div>Seleccioná un alumno para ver y editar sus rutinas</div>
        : <>
            <div className="flex-between mb12 mt24">
              <div>
                <h3 style={{ fontSize:20 }}>Rutinas de {alumno?.name}</h3>
                <p className="text-sm text-muted">{bloques.length} rutinas · ciclo A → B → C → ...</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setView("addBloque")}>+ Nueva rutina</button>
            </div>

            {bloques.length > 3 && (
              <div className="field mb12">
                <input value={searchBloque} onChange={e => setSearchBloque(e.target.value)} placeholder="🔍 Buscar rutina..." />
              </div>
            )}

            {filteredBloques.length === 0
              ? <div className="card" style={{ textAlign:"center", padding:"32px 20px", marginBottom:16 }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
                  <p className="text-muted text-sm">{bloques.length === 0 ? "Sin rutinas todavía. Creá una o asigná una plantilla." : "No se encontró esa rutina."}</p>
                </div>
              : filteredBloques.map((b) => {
                  const counts = ETAPAS.map(et => ({ et, n:(b.exercises||[]).filter(e=>e.etapa===et).length })).filter(x=>x.n>0);
                  return (
                    <div key={b.id} className="card" style={{ cursor:"pointer" }}
                      onClick={() => { setSelBloqueId(b.id); setView("editBloque"); setShowExForm(false); }}>
                      <div className="flex-between">
                        <div className="flex gap12">
                          <div style={{ width:36, height:36, borderRadius:9, background:"var(--red-bg)", color:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, flexShrink:0 }}>
                            {LETTERS[bloques.indexOf(b)]}
                          </div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{b.name}</div>
                            <div className="flex gap8" style={{ flexWrap:"wrap" }}>
                              {counts.length === 0
                                ? <span className="badge badge-gray" style={{ fontSize:10 }}>Sin ejercicios — tocá para editar</span>
                                : counts.map(({ et, n }) => (
                                    <span key={et} className="badge" style={{ fontSize:10, background:ETAPA_STYLE[et].bg, color:ETAPA_STYLE[et].color }}>{n} {et}</span>
                                  ))
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex gap8">
                          <span className="text-muted text-sm">Editar →</span>
                          <button className="btn btn-danger btn-sm btn-icon" style={{ padding:"4px 8px" }}
                            onClick={e => { e.stopPropagation(); eliminarBloque(b); }}>✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })
            }

            {plantillas.length > 0 && (
              <div className="mt24">
                <label className="label">Asignar plantilla predeterminada</label>
                <p className="text-xs text-muted mb12">La plantilla se copia para {alumno?.name} y podés editarla sin afectar el original.</p>
                {plantillas.map(p => (
                  <div key={p.id} className="card card-sm flex-between mb8">
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>⭐ {p.name}</div>
                      <div className="flex gap8 mt4" style={{ flexWrap:"wrap" }}>
                        {ETAPAS.map(et => {
                          const n = (p.exercises||[]).filter(e=>e.etapa===et).length;
                          if (!n) return null;
                          return <span key={et} className="badge" style={{ fontSize:10, background:ETAPA_STYLE[et].bg, color:ETAPA_STYLE[et].color }}>{n} {et}</span>;
                        })}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => asignarPlantilla(p)}>Asignar</button>
                  </div>
                ))}
              </div>
            )}
          </>
      }
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );

  // ── VISTA: Crear nueva rutina ────────────────────────────────────────────
  if (view === "addBloque") return (
    <div className="page">
      <button className="btn btn-ghost btn-sm mb24" onClick={() => setView("bloques")}>← Volver</button>
      <h2 style={{ fontSize:36, marginBottom:8 }}>NUEVA RUTINA</h2>
      <p className="text-muted text-sm mb24">Para <strong>{alumno?.name}</strong></p>
      <div className="field">
        <label className="label">Nombre de la rutina *</label>
        <input value={bloqueForm.name} onChange={e => setBloqueForm(f=>({...f,name:e.target.value}))} placeholder='Ej: "Fuerza tren superior"' autoFocus />
        <p className="text-xs text-muted mt8">Este nombre lo ve el alumno al elegir qué hacer hoy</p>
      </div>
      <div className="field">
        <label className="label">Etiqueta corta (opcional)</label>
        <input value={bloqueForm.label} onChange={e => setBloqueForm(f=>({...f,label:e.target.value}))} placeholder='Ej: "Empuje"' maxLength={12} />
      </div>
      <button className="btn btn-primary btn-full" style={{ padding:14 }} onClick={crearBloque} disabled={saving || !bloqueForm.name.trim()}>
        {saving ? "Creando..." : "Crear rutina →"}
      </button>
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );

  // ── VISTA: Editar rutina ─────────────────────────────────────────────────
  const exercises = sortByEtapa(selBloque?.exercises || []);
  const grupos    = exPorEtapa(exercises);

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm mb16" onClick={() => { setView("bloques"); setShowExForm(false); setEditExIdx(null); setSearchEj(""); }}>
        ← Volver a rutinas de {alumno?.name}
      </button>
      <div className="flex-between mb4">
        <div>
          <h2 style={{ fontSize:28 }}>{selBloque?.name}</h2>
          <p className="text-sm text-muted">{alumno?.name} · {exercises.length} ejercicios</p>
        </div>
      </div>
      <div className="divider" />

      {exercises.length === 0
        ? <div className="empty mb16"><div className="empty-icon">🏋️</div>Sin ejercicios. Agregá uno abajo.</div>
        : ETAPAS.map(et => {
            const exs = grupos[et];
            if (!exs?.length) return null;
            const style = ETAPA_STYLE[et];
            return (
              <div key={et} className="mb16">
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0 5px" }}>
                  <span style={{ padding:"3px 12px", borderRadius:999, fontSize:11, fontWeight:700, background:style.bg, color:style.color, whiteSpace:"nowrap" }}>{et.toUpperCase()}</span>
                  <div style={{ flex:1, height:1, background:style.bg }} />
                </div>
                {exs.map((ex) => {
                  const globalIdx = selBloque.exercises.indexOf(ex);
                  return (
                    <div key={globalIdx} className="card card-sm flex-between mb8">
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{ex.name}</div>
                        <div className="flex gap8" style={{ flexWrap:"wrap" }}>
                          {ex.sets   && <span className="badge badge-red"   style={{ fontSize:10 }}>{ex.sets} series</span>}
                          {ex.reps   && <span className="badge badge-blue"  style={{ fontSize:10 }}>{ex.reps} reps</span>}
                          {ex.weight && <span className="badge badge-green" style={{ fontSize:10 }}>{ex.weight}</span>}
                          {ex.notes  && <span className="badge badge-gray"  style={{ fontSize:10 }}>📝 Indicación</span>}
                        </div>
                      </div>
                      <div className="flex gap4">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => editarEjercicio(globalIdx)}>✏️</button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => eliminarEjercicio(globalIdx)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
      }

      {showExForm ? (
        <div className="card card-red mt16">
          <div className="flex-between mb16">
            <h3 style={{ fontSize:18 }}>{editExIdx !== null ? "Editar ejercicio" : "Agregar ejercicio"}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowExForm(false); setExForm(EMPTY_EX); setEditExIdx(null); setSearchEj(""); }}>Cancelar</button>
          </div>
          <div className="field">
            <label className="label">Buscar en biblioteca</label>
            <input value={searchEj} onChange={e => setSearchEj(e.target.value)} placeholder="🔍 Nombre del ejercicio..." autoFocus />
          </div>
          {ejercicios.length === 0
            ? <p className="text-sm text-muted mb12">No hay ejercicios. Agregá en la sección "Ejercicios" primero.</p>
            : filteredEjercicios.length === 0
              ? <p className="text-sm text-muted mb12">Sin resultados para "{searchEj}".</p>
              : (
                <div style={{ maxHeight:200, overflowY:"auto", marginBottom:14, border:"1px solid var(--border-md)", borderRadius:"var(--r-sm)" }}>
                  {ETAPAS.map(et => {
                    const exsEt = filteredEjercicios.filter(e => e.etapa === et);
                    if (!exsEt.length) return null;
                    return (
                      <div key={et}>
                        <div style={{ padding:"6px 12px", background:"var(--bg3)", fontSize:10, fontWeight:700, color:ETAPA_STYLE[et].color }}>{et.toUpperCase()}</div>
                        {exsEt.map(ej => (
                          <div key={ej.id}
                            onClick={() => { setExForm(f=>({...f, ejId:ej.id, name:ej.name, etapa:ej.etapa||"Fuerza / Aeróbico"})); setSearchEj(ej.name); }}
                            style={{ padding:"10px 14px", cursor:"pointer", fontSize:14, borderBottom:"1px solid var(--border)", background:exForm.ejId===ej.id?"var(--red-bg)":"transparent", color:exForm.ejId===ej.id?"var(--red)":"var(--text)", fontWeight:exForm.ejId===ej.id?600:400 }}
                          >
                            {ej.name} {exForm.ejId===ej.id && "✓"}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )
          }
          <div className="field">
            <label className="label">Etapa</label>
            <div className="flex gap8" style={{ flexWrap:"wrap" }}>
              {ETAPAS.map(et => <span key={et} className={`tag${exForm.etapa===et?" active":""}`} onClick={()=>setExForm(f=>({...f,etapa:et}))}>{et}</span>)}
            </div>
          </div>
          <div style={{ background:"var(--bg3)", borderRadius:"var(--r)", padding:"12px 14px", marginBottom:14 }}>
            <div className="label mb12" style={{ color:"var(--red)" }}>Carga personalizada para {alumno?.name}</div>
            <div className="field-row3">
              <div><label className="label">Series</label><input value={exForm.sets} onChange={e=>setExForm(f=>({...f,sets:e.target.value}))} placeholder="4" /></div>
              <div><label className="label">Reps</label><input value={exForm.reps} onChange={e=>setExForm(f=>({...f,reps:e.target.value}))} placeholder="10-12" /></div>
              <div><label className="label">Peso</label><input value={exForm.weight} onChange={e=>setExForm(f=>({...f,weight:e.target.value}))} placeholder="60 kg" /></div>
            </div>
            <label className="label">Indicación personal</label>
            <textarea value={exForm.notes} onChange={e=>setExForm(f=>({...f,notes:e.target.value}))} placeholder={`Tip específico para ${alumno?.name}...`} rows={2} />
          </div>
          <button className="btn btn-primary btn-full" onClick={agregarEjercicio} disabled={!exForm.ejId && !exForm.name}>
            {editExIdx !== null ? "Actualizar ejercicio" : "Agregar al bloque"}
          </button>
        </div>
      ) : (
        <button className="btn btn-primary btn-full mt16" style={{ padding:14 }} onClick={() => { setExForm(EMPTY_EX); setShowExForm(true); setSearchEj(""); }}>
          + Agregar ejercicio
        </button>
      )}
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
