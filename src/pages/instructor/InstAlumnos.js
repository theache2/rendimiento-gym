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
  const [alumnos, setAlumnos]               = useState([]);
  const [search, setSearch]                 = useState("");
  const [newName, setNewName]               = useState("");
  const [newPin, setNewPin]                 = useState("");
  const [toast, setToast]                   = useState("");
  const [uploadingId, setUploadingId]       = useState(null);
  const [editandoFotoId, setEditandoFotoId] = useState(null);
  const [editandoPinId, setEditandoPinId]   = useState(null);
  const [pinEditing, setPinEditing]         = useState("");
  const globalFileRef                       = useRef();
  const { instructor }                      = useAuth();
  const navigate                            = useNavigate();

  useEffect(() => watchAlumnos(setAlumnos), []);

  const filtered = alumnos.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const add = async () => {
    const name = newName.trim();
    const pin  = newPin.trim();
    if (!name) return;
    if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
      setToast("El PIN debe ser de 4 dígitos numéricos");
      return;
    }
    // Verificar PIN duplicado
    if (pin && alumnos.find(a => a.pin === pin)) {
      setToast("Ese PIN ya está en uso por otro alumno");
      return;
    }
    try {
      await saveAlumno({ name, photoUrl:null, pin: pin || null });
      await logActivity({ type:"create", message:`Alumno "${name}" creado${pin?" con PIN":""}`, instructorId:instructor.id, instructorName:instructor.name });
      setNewName(""); setNewPin("");
      setToast(`${name} agregado`);
    } catch(err) { setToast("Error: " + err.message); }
  };

  const remove = async (a) => {
    if (!window.confirm(`¿Eliminar a ${a.name}?`)) return;
    await deleteAlumno(a.id);
    await logActivity({ type:"delete", message:`Alumno "${a.name}" eliminado`, instructorId:instructor.id, instructorName:instructor.name });
    setToast(`${a.name} eliminado`);
  };

  const savePin = async (a) => {
    const pin = pinEditing.trim();
    if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
      setToast("El PIN debe ser de 4 dígitos"); return;
    }
    if (pin && alumnos.find(other => other.id !== a.id && other.pin === pin)) {
      setToast("Ese PIN ya está en uso por otro alumno"); return;
    }
    await saveAlumno({ pin: pin || null }, a.id);
    await logActivity({ type:"change", message:`PIN de "${a.name}" ${pin?"actualizado":"eliminado"}`, instructorId:instructor.id, instructorName:instructor.name });
    setEditandoPinId(null); setPinEditing("");
    setToast("PIN actualizado ✓");
  };

  const abrirSelectorFoto = (e, alumnoId) => {
    e.stopPropagation();
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
    } catch(err) { setToast("Error al subir la foto: " + err.message); }
    setUploadingId(null);
    if (globalFileRef.current) globalFileRef.current.value = "";
  };

  return (
    <div className="page">
      <input type="file" accept="image/*" ref={globalFileRef} style={{ display:"none" }} onChange={handleFileChange} />

      <div className="flex-between mb24">
        <div>
          <h2 style={{ fontSize:36 }}>ALUMNOS</h2>
          <p className="text-muted text-sm">{alumnos.length} registrados</p>
        </div>
      </div>

      {/* Agregar */}
      <div className="card mb24">
        <label className="label">Nuevo alumno</label>
        <div className="flex gap8 mb8">
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key==="Enter" && add()} placeholder="Nombre completo" />
          <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="PIN (4 dígitos)" style={{ maxWidth:140 }} type="password" maxLength={4} />
          <button className="btn btn-primary" style={{ whiteSpace:"nowrap" }} onClick={add}>+ Agregar</button>
        </div>
        <p className="text-xs text-muted">El PIN permite al alumno acceder a su rutina desde su propio celular. Podés asignarlo ahora o después.</p>
      </div>

      {/* Buscador */}
      {alumnos.length > 4 && (
        <div className="field mb16">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar alumno..." />
        </div>
      )}

      {!filtered.length
        ? <div className="empty"><div className="empty-icon">👥</div>{search ? "Sin resultados" : "No hay alumnos aún"}</div>
        : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map((a,i) => {
              const [bg,fg] = COLORS[i % COLORS.length];
              const isUploading = uploadingId === a.id;
              const editandoPin = editandoPinId === a.id;
              return (
                <div key={a.id} className="card" style={{ padding:"14px 16px" }}>
                  <div className="flex-between">
                    <div className="flex gap12" style={{ cursor:"pointer" }} onClick={() => navigate(`/instructor/rutinas?alumno=${a.id}`)}>
                      {/* Avatar */}
                      <div style={{ position:"relative", flexShrink:0 }}>
                        {a.photoUrl
                          ? <img src={a.photoUrl} alt={a.name} style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover" }} />
                          : <div style={{ width:48, height:48, borderRadius:"50%", background:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue'", fontSize:20, letterSpacing:1 }}>{initials(a.name)}</div>
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15 }}>{a.name}</div>
                        <div className="flex gap8 mt4">
                          {a.pin
                            ? <span className="badge badge-green" style={{ fontSize:10 }}>🔑 PIN asignado</span>
                            : <span className="badge badge-gray"  style={{ fontSize:10 }}>Sin PIN</span>
                          }
                          {a.lastSession && <span className="badge badge-gray" style={{ fontSize:10 }}>Última: {a.lastSession.rutinaNombre}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap8">
                      <button className="btn btn-danger btn-sm btn-icon" style={{ padding:"4px 8px" }} onClick={e => { e.stopPropagation(); remove(a); }}>✕</button>
                    </div>
                  </div>

                  {/* Acciones secundarias */}
                  <div className="flex gap8 mt12" style={{ flexWrap:"wrap" }}>
                    <button
                      onClick={e => abrirSelectorFoto(e, a.id)}
                      disabled={isUploading}
                      className="btn btn-ghost btn-sm"
                    >
                      {isUploading ? "Subiendo..." : a.photoUrl ? "📷 Cambiar foto" : "📷 Subir foto"}
                    </button>

                    <button
                      onClick={() => { setEditandoPinId(a.id); setPinEditing(a.pin||""); }}
                      className="btn btn-ghost btn-sm"
                    >
                      🔑 {a.pin ? "Cambiar PIN" : "Asignar PIN"}
                    </button>

                    <button
                      onClick={() => navigate(`/instructor/rutinas?alumno=${a.id}`)}
                      className="btn btn-ghost btn-sm"
                    >
                      📋 Ver rutinas
                    </button>
                  </div>

                  {/* Editor de PIN inline */}
                  {editandoPin && (
                    <div style={{ marginTop:12, padding:"12px 14px", background:"var(--bg3)", borderRadius:"var(--r-sm)", display:"flex", alignItems:"center", gap:10 }}>
                      <input
                        value={pinEditing}
                        onChange={e => setPinEditing(e.target.value.replace(/\D/g,"").slice(0,4))}
                        placeholder="Nuevo PIN (4 dígitos)"
                        type="password"
                        maxLength={4}
                        style={{ flex:1 }}
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => savePin(a)} disabled={pinEditing.length !== 4 && pinEditing.length !== 0}>
                        Guardar
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditandoPinId(null); setPinEditing(""); }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }

      {/* Info sobre acceso tablet */}
      <div style={{ marginTop:24, padding:"14px 16px", background:"var(--bg3)", borderRadius:"var(--r)", border:"1px solid var(--border)" }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>🖥️ Acceso tablet del gym</div>
        <p className="text-xs text-muted">La tablet usa el PIN <strong style={{ color:"var(--text)" }}>0000</strong> — muestra la grilla de todos los alumnos. No lo asignes a ningún alumno.</p>
      </div>

      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
