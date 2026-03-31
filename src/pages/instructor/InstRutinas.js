import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { watchAlumnos, watchBloques, saveBloque, deleteBloque, watchPlantillas, logActivity } from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import Toast from "../../components/Toast";

const ETAPAS = ["Movilidad / Core", "Fuerza / Aeróbico", "Vuelta a la calma"];

export default function InstRutinas() {
  const [params] = useSearchParams();
  const [alumnos, setAlumnos]       = useState([]);
  const [selAlumno, setSelAlumno]   = useState(params.get("alumno") || "");
  const [bloques, setBloques]       = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [selBloque, setSelBloque]   = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [bloqueForm, setBloqueForm] = useState({ name: "", label: "", exercises: [] });
  const [toast, setToast]           = useState("");
  const { instructor } = useAuth();

  useEffect(() => watchAlumnos(setAlumnos), []);
  useEffect(() => watchPlantillas(setPlantillas), []);
  useEffect(() => {
    if (!selAlumno) { setBloques([]); return; }
    return watchBloques(selAlumno, data => {
      setBloques(data);
      if (!selBloque && data.length > 0) setSelBloque(data[0].id);
    });
  }, [selAlumno]);

  const alumno = alumnos.find(a => a.id === selAlumno);
  const bloque = bloques.find(b => b.id === selBloque);

  const saveB = async () => {
    if (!bloqueForm.name.trim() || !selAlumno) return;
    const order = bloques.length;
    const id = await saveBloque(selAlumno, { ...bloqueForm, order });
    await logActivity({ type:"change", message:`Bloque "${bloqueForm.name}" guardado para ${alumno?.name}`, instructorId: instructor.id, instructorName: instructor.name, alumnoId: selAlumno, alumnoName: alumno?.name });
    setSelBloque(id); setShowForm(false); setToast("Bloque guardado");
  };

  const deleteB = async (id, name) => {
    if (!window.confirm(`¿Eliminar el bloque "${name}"?`)) return;
    await deleteBloque(selAlumno, id);
    setSelBloque(bloques.filter(b => b.id !== id)[0]?.id || null);
    setToast("Bloque eliminado");
  };

  const copyFromAlumno = (srcAlumnoId) => {
    // Traer los bloques del alumno fuente y copiarlos al actual
    // Simplificado: abrís modal, elegís el alumno, y se copian sus bloques
    setToast("Función disponible en la versión completa");
  };

  const assignPlantilla = async (p) => {
    const order = bloques.length;
    const id = await saveBloque(selAlumno, { name: p.name, label: p.label || p.name.slice(0,6), exercises: p.exercises || [], order });
    await logActivity({ type:"change", message:`Plantilla "${p.name}" asignada a ${alumno?.name}`, instructorId: instructor.id, instructorName: instructor.name, alumnoId: selAlumno, alumnoName: alumno?.name });
    setSelBloque(id); setToast(`Plantilla "${p.name}" asignada`);
  };

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    <div className="page">
      <h2 style={{ fontSize:36, marginBottom:20 }}>RUTINAS</h2>

      {/* Selector alumno */}
      <div className="field mb24">
        <label className="label">Alumno</label>
        <select value={selAlumno} onChange={e => { setSelAlumno(e.target.value); setSelBloque(null); }}>
          <option value="">Seleccioná un alumno...</option>
          {alumnos.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {!selAlumno
        ? <div className="empty"><div className="empty-icon">👆</div>Seleccioná un alumno para gestionar su ciclo</div>
        : <>
          {/* Ciclo actual */}
          <div className="flex-between mb12">
            <div>
              <h3 style={{ fontSize:20 }}>Ciclo de {alumno?.name}</h3>
              <p className="text-sm text-muted">{bloques.length} bloques · rota A → B → C...</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setBloqueForm({ name:"", label:"", exercises:[] }); setShowForm(true); }}>
              + Nuevo bloque
            </button>
          </div>

          {/* Lista bloques */}
          {bloques.length === 0
            ? <div className="card" style={{ textAlign:"center", padding:"32px 20px", marginBottom:16 }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
                <p className="text-muted text-sm">Sin bloques. Creá uno o asigná una plantilla.</p>
              </div>
            : bloques.map((b, i) => (
                <div
                  key={b.id}
                  className={`card${selBloque===b.id ? " card-red" : ""}`}
                  style={{ cursor:"pointer" }}
                  onClick={() => setSelBloque(b.id)}
                >
                  <div className="flex-between">
                    <div className="flex gap12">
                      <div style={{ width:32, height:32, borderRadius:8, background: selBloque===b.id ? "var(--red)" : "var(--red-bg)", color: selBloque===b.id ? "white" : "var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, flexShrink:0 }}>
                        {letters[i]}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14 }}>{b.name}</div>
                        <div className="text-sm text-muted">{b.exercises?.length || 0} ejercicios</div>
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm" style={{ padding:"4px 8px", fontSize:11 }} onClick={e => { e.stopPropagation(); deleteB(b.id, b.name); }}>✕</button>
                  </div>
                </div>
              ))
          }

          {/* Formulario nuevo bloque */}
          {showForm && (
            <div className="card card-red mt16">
              <div className="flex-between mb16">
                <h3 style={{ fontSize:18 }}>Nuevo bloque</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
              <div className="field">
                <label className="label">Nombre de la rutina *</label>
                <input value={bloqueForm.name} onChange={e => setBloqueForm(f => ({...f, name: e.target.value}))} placeholder='Ej: "Empuje + Core — Lucas"' autoFocus />
                <p className="text-xs text-muted mt8">Este nombre lo ve el alumno al elegir qué rutina hacer</p>
              </div>
              <div className="field">
                <label className="label">Etiqueta corta (pestaña del ciclo)</label>
                <input value={bloqueForm.label} onChange={e => setBloqueForm(f => ({...f, label: e.target.value}))} placeholder='Ej: "Empuje"' maxLength={12} />
              </div>
              <button className="btn btn-primary btn-full" onClick={saveB}>Crear bloque</button>
              <p className="text-xs text-muted mt8" style={{ textAlign:"center" }}>Después de crear, podrás agregar ejercicios al bloque</p>
            </div>
          )}

          <div className="divider" />

          {/* Copiar de otro alumno */}
          <div className="mb16">
            <label className="label">Copiar ciclo de otro alumno</label>
            <select onChange={e => e.target.value && copyFromAlumno(e.target.value)} defaultValue="">
              <option value="">Seleccioná el alumno a copiar...</option>
              {alumnos.filter(a => a.id !== selAlumno).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Plantillas */}
          {plantillas.length > 0 && (
            <div>
              <label className="label">Asignar plantilla predeterminada</label>
              {plantillas.map(p => (
                <div key={p.id} className="card card-sm flex-between">
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>⭐ {p.name}</div>
                    <div className="text-xs text-muted">{p.exercises?.length || 0} ejercicios</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => assignPlantilla(p)}>Asignar</button>
                </div>
              ))}
            </div>
          )}
        </>
      }
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
