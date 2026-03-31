import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { watchAlumnos, saveAlumno, deleteAlumno, logActivity } from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import Toast from "../../components/Toast";

const COLORS = [
  ["var(--red-bg)","var(--red)"],["var(--blue-bg)","var(--blue)"],
  ["var(--green-bg)","var(--green)"],["var(--gold-bg)","var(--gold)"],
];

function initials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
}

export default function InstAlumnos() {
  const [alumnos, setAlumnos] = useState([]);
  const [search, setSearch]   = useState("");
  const [newName, setNewName] = useState("");
  const [toast, setToast]     = useState("");
  const { instructor } = useAuth();
  const navigate = useNavigate();

  useEffect(() => watchAlumnos(setAlumnos), []);

  const filtered = alumnos.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = await saveAlumno({ name });
    await logActivity({ type:"create", message:`Alumno "${name}" creado`, instructorId: instructor.id, instructorName: instructor.name });
    setNewName(""); setToast(`${name} agregado`);
  };

  const remove = async (a) => {
    if (!window.confirm(`¿Eliminar a ${a.name}?`)) return;
    await deleteAlumno(a.id);
    await logActivity({ type:"delete", message:`Alumno "${a.name}" eliminado`, instructorId: instructor.id, instructorName: instructor.name });
    setToast(`${a.name} eliminado`);
  };

  return (
    <div className="page">
      <div className="flex-between mb24">
        <div>
          <h2 style={{ fontSize: 36 }}>ALUMNOS</h2>
          <p className="text-muted text-sm">{alumnos.length} registrados</p>
        </div>
      </div>

      {/* Agregar */}
      <div className="card mb24">
        <label className="label">Nuevo alumno</label>
        <div className="flex gap8">
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key==="Enter" && add()} placeholder="Nombre completo" />
          <button className="btn btn-primary" style={{ whiteSpace:"nowrap" }} onClick={add}>+ Agregar</button>
        </div>
      </div>

      {/* Buscador */}
      {alumnos.length > 6 && (
        <div className="field">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar alumno..." />
        </div>
      )}

      {/* Grilla */}
      {!filtered.length
        ? <div className="empty"><div className="empty-icon">👥</div>No hay alumnos aún</div>
        : <div className="alumno-grid">
            {filtered.map((a,i) => {
              const [bg,fg] = COLORS[i % COLORS.length];
              return (
                <div key={a.id} style={{ position:"relative" }}>
                  <div className="alumno-card" onClick={() => navigate(`/instructor/rutinas?alumno=${a.id}`)}>
                    <div className="alumno-avatar" style={{ background: bg, color: fg }}>{initials(a.name)}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", lineHeight:1.3, textAlign:"center" }}>{a.name}</div>
                    {a.lastSession && (
                      <div style={{ fontSize:11, color:"var(--text2)" }}>Última: {a.lastSession.rutinaNombre}</div>
                    )}
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ position:"absolute", top:8, right:8, padding:"3px 8px", fontSize:11 }}
                    onClick={e => { e.stopPropagation(); remove(a); }}
                  >✕</button>
                </div>
              );
            })}
          </div>
      }
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
