import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { watchAlumnos, saveAlumno, deleteAlumno, logActivity } from "../../lib/db";
import { useAuth } from "../../contexts/AuthContext";
import Toast from "../../components/Toast";

const COLORS = [
  ["var(--red-bg)","var(--red)"],
  ["var(--blue-bg)","var(--blue)"],
  ["var(--green-bg)","var(--green)"],
  ["var(--gold-bg)","var(--gold)"],
];

function initials(name) {
  return name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
}

export default function InstAlumnos() {
  const [alumnos, setAlumnos]           = useState([]);
  const [search, setSearch]             = useState("");
  const [newName, setNewName]           = useState("");
  const [toast, setToast]               = useState("");
  const [uploadingId, setUploadingId]   = useState(null);
  const [editandoFotoId, setEditandoFotoId] = useState(null);
  const globalFileRef                   = useRef();
  const { instructor }                  = useAuth();
  const navigate                        = useNavigate();

  useEffect(() => watchAlumnos(setAlumnos), []);

  const filtered = alumnos.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await saveAlumno({ name, photoUrl: null });
      await logActivity({ type:"create", message:`Alumno "${name}" creado`, instructorId: instructor.id, instructorName: instructor.name });
      setNewName("");
      setToast(`${name} agregado`);
    } catch(err) {
      setToast("Error: " + err.message);
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`¿Eliminar a ${a.name}?`)) return;
    await deleteAlumno(a.id);
    await logActivity({ type:"delete", message:`Alumno "${a.name}" eliminado`, instructorId: instructor.id, instructorName: instructor.name });
    setToast(`${a.name} eliminado`);
  };

  const abrirSelectorFoto = (e, alumnoId) => {
    e.stopPropagation(); // evita navegar a rutinas
    setEditandoFotoId(alumnoId);
    setTimeout(() => globalFileRef.current?.click(), 50);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !editandoFotoId) return;
    const alumnoId = editandoFotoId;
    setEditandoFotoId(null);
    setUploadingId(alumnoId);
    try {
      const storageRef = ref(storage, `fotos/${alumnoId}_${Date.now()}`);
      const task = uploadBytesResumable(storageRef, file);
      await new Promise((res, rej) => task.on("state_changed", null, rej, res));
      const url = await getDownloadURL(task.snapshot.ref);
      await saveAlumno({ photoUrl: url }, alumnoId);
      setToast("Foto actualizada ✓");
    } catch(err) {
      setToast("Error al subir la foto: " + err.message);
    }
    setUploadingId(null);
    // Reset file input
    if (globalFileRef.current) globalFileRef.current.value = "";
  };

  return (
    <div className="page">
      {/* Input de archivo global — único en el DOM */}
      <input
        type="file"
        accept="image/*"
        ref={globalFileRef}
        style={{ display:"none" }}
        onChange={handleFileChange}
      />

      <div className="flex-between mb24">
        <div>
          <h2 style={{ fontSize:36 }}>ALUMNOS</h2>
          <p className="text-muted text-sm">{alumnos.length} registrados</p>
        </div>
      </div>

      {/* Agregar */}
      <div className="card mb24">
        <label className="label">Nuevo alumno</label>
        <div className="flex gap8">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key==="Enter" && add()} placeholder="Nombre completo" />
          <button className="btn btn-primary" style={{ whiteSpace:"nowrap" }} onClick={add}>+ Agregar</button>
        </div>
      </div>

      {/* Buscador */}
      {alumnos.length > 4 && (
        <div className="field mb16">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar alumno..." />
        </div>
      )}

      {!filtered.length
        ? <div className="empty"><div className="empty-icon">👥</div>{search ? "Sin resultados" : "No hay alumnos aún"}</div>
        : <div className="alumno-grid">
            {filtered.map((a,i) => {
              const [bg,fg] = COLORS[i % COLORS.length];
              const isUploading = uploadingId === a.id;
              return (
                <div key={a.id} style={{ position:"relative" }}>
                  <div className="alumno-card" onClick={() => navigate(`/instructor/rutinas?alumno=${a.id}`)}>
                    {/* Avatar */}
                    <div style={{ position:"relative", display:"inline-block" }}>
                      {a.photoUrl
                        ? <img src={a.photoUrl} alt={a.name} style={{ width:52, height:52, borderRadius:"50%", objectFit:"cover" }} />
                        : <div className="alumno-avatar" style={{ background:bg, color:fg }}>{initials(a.name)}</div>
                      }
                    </div>

                    <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", lineHeight:1.3, textAlign:"center" }}>{a.name}</div>

                    {a.lastSession && (
                      <div style={{ fontSize:11, color:"var(--text2)", textAlign:"center" }}>
                        Última: {a.lastSession.rutinaNombre}
                      </div>
                    )}

                    {/* Botón foto — separado del click de rutinas */}
                    <button
                      onClick={e => abrirSelectorFoto(e, a.id)}
                      disabled={isUploading}
                      style={{ background:"var(--bg3)", border:"1px solid var(--border-md)", borderRadius:999, padding:"4px 10px", fontSize:11, color:"var(--text2)", cursor:"pointer", marginTop:2 }}
                    >
                      {isUploading ? "Subiendo..." : a.photoUrl ? "📷 Cambiar foto" : "📷 Subir foto"}
                    </button>
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
