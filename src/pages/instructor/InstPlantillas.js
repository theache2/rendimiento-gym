import React, { useState, useEffect } from "react";
import { watchPlantillas, savePlantilla, watchEjercicios, logActivity } from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import Toast from "../../components/Toast";

const ETAPAS = ["Movilidad / Core", "Fuerza / Aeróbico", "Vuelta a la calma"];
const EMPTY  = { name:"", label:"", exercises:[] };
const ETAPA_COLORS = { "Movilidad / Core":"var(--blue)", "Fuerza / Aeróbico":"var(--red)", "Vuelta a la calma":"var(--green)" };
const etapaColor = (et) => ETAPA_COLORS[et] || "var(--text2)";

export default function InstPlantillas() {
  const [plantillas, setPlantillas]   = useState([]);
  const [ejercicios, setEjercicios]   = useState([]);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY);
  const [selEjercicio, setSelEjercicio] = useState("");
  const [exConfig, setExConfig]       = useState({ sets:"", reps:"", weight:"", notes:"" });
  const [toast, setToast]             = useState("");
  const { instructor } = useAuth();

  useEffect(() => watchPlantillas(setPlantillas), []);
  useEffect(() => watchEjercicios(setEjercicios), []);

  const save = async () => {
    if (!form.name.trim()) return;
    await savePlantilla(form, editing === "new" ? null : editing);
    await logActivity({ type:"change", message:`Plantilla "${form.name}" guardada`, instructorId: instructor.id, instructorName: instructor.name });
    setEditing(null); setToast("Plantilla guardada");
  };

  const addExToPlantilla = () => {
    const ej = ejercicios.find(e => e.id === selEjercicio);
    if (!ej) return;
    setForm(f => ({ ...f, exercises: [...f.exercises, { ejId: ej.id, name: ej.name, etapa: ej.etapa, ...exConfig }] }));
    setSelEjercicio(""); setExConfig({ sets:"", reps:"", weight:"", notes:"" });
  };

  const removeExFromPlantilla = (idx) => {
    setForm(f => ({ ...f, exercises: f.exercises.filter((_,i) => i !== idx) }));
  };

  const etapaColor = { "Movilidad / Core":"var(--blue)", "Fuerza / Aeróbico":"var(--red)", "Vuelta a la calma":"var(--green)" };

  return (
    <div className="page">
      <div className="flex-between mb24">
        <div>
          <h2 style={{ fontSize:36 }}>PLANTILLAS</h2>
          <p className="text-muted text-sm">Rutinas predeterminadas reutilizables</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditing("new"); }}>+ Nueva</button>
      </div>

      {/* Form */}
      {editing && (
        <div className="card card-red mb24">
          <div className="flex-between mb16">
            <h3 style={{ fontSize:18 }}>{editing==="new" ? "Nueva plantilla" : "Editar plantilla"}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
          </div>

          <div className="field-row">
            <div>
              <label className="label">Nombre de la plantilla *</label>
              <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder='Ej: "Fuerza tren superior"' autoFocus />
            </div>
            <div>
              <label className="label">Etiqueta corta</label>
              <input value={form.label} onChange={e => setForm(f=>({...f,label:e.target.value}))} placeholder='Ej: "Fuerza"' maxLength={12} />
            </div>
          </div>

          {/* Ejercicios en la plantilla */}
          <label className="label">Ejercicios ({form.exercises.length})</label>
          {form.exercises.length === 0
            ? <p className="text-sm text-muted mb12">Sin ejercicios aún</p>
            : <div className="mb12">
                {ETAPAS.map(et => {
                  const exs = form.exercises.filter(e => e.etapa === et);
                  if (!exs.length) return null;
                  return (
                    <div key={et} className="mb8">
                      <div className="etapa-header" style={{ padding:"6px 0 4px" }}>
                        <span className="etapa-label" style={{ background:"transparent", border:`1px solid ${etapaColor[et]}`, color:etapaColor[et], padding:"2px 10px", fontSize:10 }}>{et}</span>
                        <div className="etapa-line" style={{ background:"var(--border)" }}></div>
                      </div>
                      {exs.map((ex, i) => (
                        <div key={i} className="card card-sm flex-between" style={{ padding:"8px 12px" }}>
                          <div>
                            <span style={{ fontWeight:600, fontSize:13 }}>{ex.name}</span>
                            <div className="flex gap8 mt4" style={{ flexWrap:"wrap" }}>
                              {ex.sets && <span className="badge badge-red" style={{ fontSize:10 }}>{ex.sets} series</span>}
                              {ex.reps && <span className="badge badge-blue" style={{ fontSize:10 }}>{ex.reps} reps</span>}
                              {ex.weight && <span className="badge badge-green" style={{ fontSize:10 }}>{ex.weight}</span>}
                            </div>
                          </div>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeExFromPlantilla(form.exercises.indexOf(ex))}>✕</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
          }

          {/* Agregar ejercicio */}
          <div className="card card-sm" style={{ background:"var(--bg3)" }}>
            <label className="label">Agregar ejercicio</label>
            <div className="field">
              <select value={selEjercicio} onChange={e => setSelEjercicio(e.target.value)}>
                <option value="">Seleccioná de la biblioteca...</option>
                {ejercicios.map(e => <option key={e.id} value={e.id}>{e.name} ({e.etapa})</option>)}
              </select>
            </div>
            <div className="field-row3">
              <div><label className="label">Series</label><input value={exConfig.sets} onChange={e=>setExConfig(f=>({...f,sets:e.target.value}))} placeholder="4" /></div>
              <div><label className="label">Reps</label><input value={exConfig.reps} onChange={e=>setExConfig(f=>({...f,reps:e.target.value}))} placeholder="10-12" /></div>
              <div><label className="label">Peso</label><input value={exConfig.weight} onChange={e=>setExConfig(f=>({...f,weight:e.target.value}))} placeholder="60 kg" /></div>
            </div>
            <button className="btn btn-ghost btn-full" onClick={addExToPlantilla} disabled={!selEjercicio}>+ Agregar al bloque</button>
          </div>

          <button className="btn btn-primary btn-full mt12" onClick={save}>Guardar plantilla</button>
        </div>
      )}

      {/* Lista plantillas */}
      {!plantillas.length
        ? <div className="empty"><div className="empty-icon">⭐</div>Sin plantillas. Creá una para reutilizarla con varios alumnos.</div>
        : plantillas.map(p => (
            <div key={p.id} className="card">
              <div className="flex-between mb8">
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>⭐ {p.name}</div>
                  <div className="text-sm text-muted">{p.exercises?.length || 0} ejercicios</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ name:p.name, label:p.label||"", exercises:p.exercises||[] }); setEditing(p.id); }}>✏️ Editar</button>
              </div>
              <div className="flex gap8" style={{ flexWrap:"wrap" }}>
                {ETAPAS.map(et => {
                  const n = (p.exercises||[]).filter(e=>e.etapa===et).length;
                  if (!n) return null;
                  return <span key={et} className="badge" style={{ fontSize:10, border:`1px solid ${etapaColor[et]}`, color:etapaColor[et], background:"transparent" }}>{n} {et}</span>;
                })}
              </div>
            </div>
          ))
      }
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
