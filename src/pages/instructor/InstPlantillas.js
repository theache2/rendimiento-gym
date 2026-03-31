import React, { useState, useEffect, useMemo } from "react";
import { watchPlantillas, savePlantilla, watchEjercicios, logActivity } from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import Toast from "../../components/Toast";

const ETAPAS = ["Movilidad / Core", "Fuerza / Aeróbico", "Vuelta a la calma"];
const ETAPA_COLORS = {
  "Movilidad / Core":  { color:"var(--blue)",  bg:"var(--blue-bg)"  },
  "Fuerza / Aeróbico": { color:"var(--red)",   bg:"var(--red-bg)"   },
  "Vuelta a la calma": { color:"var(--green)", bg:"var(--green-bg)" },
};
const EMPTY = { name:"", label:"", exercises:[] };
const EMPTY_EX = { ejId:"", name:"", etapa:"Fuerza / Aeróbico", sets:"", reps:"", weight:"", notes:"" };

function sortByEtapa(exercises) {
  return [...exercises].sort((a, b) => ETAPAS.indexOf(a.etapa) - ETAPAS.indexOf(b.etapa));
}

export default function InstPlantillas() {
  const [plantillas, setPlantillas]   = useState([]);
  const [ejercicios, setEjercicios]   = useState([]);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY);
  const [exForm, setExForm]           = useState(EMPTY_EX);
  const [editExIdx, setEditExIdx]     = useState(null);
  const [showExForm, setShowExForm]   = useState(false);
  const [toast, setToast]             = useState("");
  const [searchPlantilla, setSearchPlantilla] = useState("");
  const [searchEj, setSearchEj]       = useState("");
  const { instructor }                = useAuth();

  useEffect(() => watchPlantillas(setPlantillas), []);
  useEffect(() => watchEjercicios(setEjercicios), []);

  const filteredPlantillas = useMemo(() =>
    plantillas.filter(p => p.name.toLowerCase().includes(searchPlantilla.toLowerCase())),
    [plantillas, searchPlantilla]
  );
  const filteredEjercicios = useMemo(() =>
    ejercicios.filter(e => e.name.toLowerCase().includes(searchEj.toLowerCase())),
    [ejercicios, searchEj]
  );

  const save = async () => {
    if (!form.name.trim()) return;
    const sorted = { ...form, exercises: sortByEtapa(form.exercises) };
    await savePlantilla(sorted, editing === "new" ? null : editing);
    await logActivity({ type:"change", message:`Plantilla "${form.name}" ${editing==="new"?"creada":"actualizada"}`, instructorId: instructor.id, instructorName: instructor.name });
    setEditing(null);
    setShowExForm(false);
    setToast("Plantilla guardada");
  };

  const agregarEjercicio = () => {
    if (!exForm.ejId && !exForm.name) return;

    // Detectar duplicado
    if (editExIdx === null) {
      const yaExiste = form.exercises.find(e => e.ejId === exForm.ejId && exForm.ejId);
      if (yaExiste) {
        const confirmar = window.confirm(`⚠️ Estás seleccionando "${exForm.name}" 2 veces. ¿Querés agregarlo igual?`);
        if (!confirmar) return;
      }
    }

    const exercises = [...form.exercises];
    if (editExIdx !== null) exercises[editExIdx] = exForm;
    else exercises.push(exForm);

    setForm(f => ({ ...f, exercises: sortByEtapa(exercises) }));
    setExForm(EMPTY_EX);
    setShowExForm(false);
    setEditExIdx(null);
    setSearchEj("");
  };

  const editarEj = (idx) => {
    setExForm(form.exercises[idx]);
    setEditExIdx(idx);
    setShowExForm(true);
    setSearchEj(form.exercises[idx].name);
  };

  const eliminarEj = (idx) => {
    setForm(f => ({ ...f, exercises: f.exercises.filter((_, i) => i !== idx) }));
  };

  const grupos = (exercises) => ETAPAS.reduce((acc, et) => {
    acc[et] = exercises.filter(e => e.etapa === et);
    return acc;
  }, {});

  // VISTA: editar plantilla
  if (editing) return (
    <div className="page">
      <button className="btn btn-ghost btn-sm mb24" onClick={() => { setEditing(null); setShowExForm(false); setSearchEj(""); }}>← Volver</button>
      <h2 style={{ fontSize:36, marginBottom:8 }}>{editing==="new" ? "NUEVA PLANTILLA" : "EDITAR PLANTILLA"}</h2>
      <p className="text-muted text-sm mb24">Las plantillas son reutilizables para cualquier alumno</p>

      <div className="field-row">
        <div>
          <label className="label">Nombre *</label>
          <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder='Ej: "Fuerza tren superior"' autoFocus />
        </div>
        <div>
          <label className="label">Etiqueta corta</label>
          <input value={form.label} onChange={e => setForm(f=>({...f,label:e.target.value}))} placeholder='Ej: "Empuje"' maxLength={12} />
        </div>
      </div>

      {/* Ejercicios agrupados */}
      {form.exercises.length > 0 && ETAPAS.map(et => {
        const exs = grupos(form.exercises)[et];
        if (!exs?.length) return null;
        const style = ETAPA_COLORS[et];
        return (
          <div key={et} className="mb16">
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0 5px" }}>
              <span style={{ padding:"3px 12px", borderRadius:999, fontSize:11, fontWeight:700, background:style.bg, color:style.color, whiteSpace:"nowrap" }}>{et.toUpperCase()}</span>
              <div style={{ flex:1, height:1, background:style.bg }} />
            </div>
            {exs.map((ex) => {
              const idx = form.exercises.indexOf(ex);
              return (
                <div key={idx} className="card card-sm flex-between mb8">
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{ex.name}</div>
                    <div className="flex gap8" style={{ flexWrap:"wrap" }}>
                      {ex.sets   && <span className="badge badge-red"  style={{ fontSize:10 }}>{ex.sets} series</span>}
                      {ex.reps   && <span className="badge badge-blue" style={{ fontSize:10 }}>{ex.reps} reps</span>}
                      {ex.weight && <span className="badge badge-green" style={{ fontSize:10 }}>{ex.weight}</span>}
                    </div>
                  </div>
                  <div className="flex gap4">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => editarEj(idx)}>✏️</button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => eliminarEj(idx)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Form ejercicio */}
      {showExForm
        ? (
          <div className="card card-red mt8">
            <div className="flex-between mb16">
              <h3 style={{ fontSize:16 }}>{editExIdx !== null ? "Editar ejercicio" : "Agregar ejercicio"}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowExForm(false); setExForm(EMPTY_EX); setEditExIdx(null); setSearchEj(""); }}>Cancelar</button>
            </div>

            <div className="field">
              <label className="label">Buscar en biblioteca</label>
              <input value={searchEj} onChange={e => setSearchEj(e.target.value)} placeholder="🔍 Nombre del ejercicio..." autoFocus />
            </div>

            {filteredEjercicios.length === 0
              ? <p className="text-sm text-muted mb12">{ejercicios.length === 0 ? "No hay ejercicios en la biblioteca." : "Sin resultados."}</p>
              : (
                <div style={{ maxHeight:180, overflowY:"auto", marginBottom:14, border:"1px solid var(--border-md)", borderRadius:"var(--r-sm)" }}>
                  {ETAPAS.map(et => {
                    const exsEt = filteredEjercicios.filter(e => e.etapa === et);
                    if (!exsEt.length) return null;
                    return (
                      <div key={et}>
                        <div style={{ padding:"6px 12px", background:"var(--bg3)", fontSize:10, fontWeight:700, color:ETAPA_COLORS[et].color }}>{et.toUpperCase()}</div>
                        {exsEt.map(ej => (
                          <div key={ej.id}
                            onClick={() => { setExForm(f=>({...f,ejId:ej.id,name:ej.name,etapa:ej.etapa||"Fuerza / Aeróbico"})); setSearchEj(ej.name); }}
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

            <div className="field-row3">
              <div><label className="label">Series</label><input value={exForm.sets} onChange={e=>setExForm(f=>({...f,sets:e.target.value}))} placeholder="4" /></div>
              <div><label className="label">Reps</label><input value={exForm.reps} onChange={e=>setExForm(f=>({...f,reps:e.target.value}))} placeholder="10-12" /></div>
              <div><label className="label">Peso</label><input value={exForm.weight} onChange={e=>setExForm(f=>({...f,weight:e.target.value}))} placeholder="60 kg" /></div>
            </div>

            <button className="btn btn-primary btn-full" onClick={agregarEjercicio} disabled={!exForm.ejId&&!exForm.name}>
              {editExIdx!==null?"Actualizar":"Agregar al bloque"}
            </button>
          </div>
        )
        : <button className="btn btn-ghost btn-full mt8" onClick={() => { setExForm(EMPTY_EX); setShowExForm(true); setSearchEj(""); }}>+ Agregar ejercicio</button>
      }

      <div className="divider" />
      <button className="btn btn-primary btn-full" style={{ padding:14 }} onClick={save} disabled={!form.name.trim()}>
        Guardar plantilla
      </button>
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );

  // VISTA: lista de plantillas
  return (
    <div className="page">
      <div className="flex-between mb24">
        <div>
          <h2 style={{ fontSize:36 }}>PLANTILLAS</h2>
          <p className="text-muted text-sm">Rutinas predeterminadas reutilizables</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditing("new"); setShowExForm(false); }}>+ Nueva</button>
      </div>

      {plantillas.length > 3 && (
        <div className="field mb16">
          <input value={searchPlantilla} onChange={e => setSearchPlantilla(e.target.value)} placeholder="🔍 Buscar plantilla..." />
        </div>
      )}

      {!filteredPlantillas.length
        ? <div className="empty"><div className="empty-icon">⭐</div>{plantillas.length === 0 ? "Sin plantillas. Creá una para reutilizarla con varios alumnos." : "Sin resultados."}</div>
        : filteredPlantillas.map(p => (
            <div key={p.id} className="card">
              <div className="flex-between mb8">
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>⭐ {p.name}</div>
                  <div className="text-sm text-muted">{p.exercises?.length||0} ejercicios</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ name:p.name, label:p.label||"", exercises:p.exercises||[] }); setEditing(p.id); setShowExForm(false); }}>
                  ✏️ Editar
                </button>
              </div>
              <div className="flex gap8" style={{ flexWrap:"wrap" }}>
                {ETAPAS.map(et => {
                  const n = (p.exercises||[]).filter(e=>e.etapa===et).length;
                  if (!n) return null;
                  return <span key={et} className="badge" style={{ fontSize:10, background:ETAPA_COLORS[et].bg, color:ETAPA_COLORS[et].color }}>{n} {et}</span>;
                })}
              </div>
            </div>
          ))
      }
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
