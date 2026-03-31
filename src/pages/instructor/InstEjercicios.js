import React, { useState, useEffect, useRef } from "react";
import { watchEjercicios, saveEjercicio, deleteEjercicio, logActivity } from "../../lib/db";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import Toast from "../../components/Toast";

const ETAPAS = ["Movilidad / Core", "Fuerza / Aeróbico", "Vuelta a la calma"];

function getYoutubeEmbed(url) {
  const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

const EMPTY = { name:"", etapa:"Fuerza / Aeróbico", description:"", videoType:"youtube", videoUrl:"" };

export default function InstEjercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [search, setSearch]         = useState("");
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [uploadPct, setUploadPct]   = useState(null);
  const [toast, setToast]           = useState("");
  const fileRef = useRef();
  const { instructor } = useAuth();

  useEffect(() => watchEjercicios(setEjercicios), []);

  const filtered = ejercicios.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  const openNew   = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit  = (e) => { setForm({ name:e.name, etapa:e.etapa||"Fuerza / Aeróbico", description:e.description||"", videoType:e.videoType||"youtube", videoUrl:e.videoUrl||"" }); setEditing(e.id); };

  const save = async () => {
    if (!form.name.trim()) return;
    const id = await saveEjercicio(form, editing === "new" ? null : editing);
    await logActivity({ type:"change", message:`Ejercicio "${form.name}" ${editing==="new"?"creado":"actualizado"}`, instructorId: instructor.id, instructorName: instructor.name });
    setEditing(null); setToast("Ejercicio guardado");
  };

  const remove = async (e) => {
    if (!window.confirm(`¿Eliminar "${e.name}"?`)) return;
    await deleteEjercicio(e.id);
    setToast("Ejercicio eliminado");
  };

  const uploadVideo = (file) => new Promise((res, rej) => {
    const r2 = ref(storage, `videos/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(r2, file);
    task.on("state_changed",
      s => setUploadPct(Math.round(s.bytesTransferred/s.totalBytes*100)),
      rej,
      async () => { res(await getDownloadURL(task.snapshot.ref)); setUploadPct(null); }
    );
  });

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadVideo(file);
      setForm(f => ({ ...f, videoUrl: url }));
      setToast("Video subido ✓");
    } catch { setToast("Error al subir el video"); setUploadPct(null); }
  };

  const etapaColor = { "Movilidad / Core":"var(--blue)", "Fuerza / Aeróbico":"var(--red)", "Vuelta a la calma":"var(--green)" };

  return (
    <div className="page">
      <div className="flex-between mb24">
        <div>
          <h2 style={{ fontSize:36 }}>EJERCICIOS</h2>
          <p className="text-muted text-sm">Biblioteca global · {ejercicios.length} ejercicios</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo</button>
      </div>

      <div className="field mb16">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar ejercicio..." />
      </div>

      {/* Form */}
      {editing && (
        <div className="card card-red mb24">
          <div className="flex-between mb16">
            <h3 style={{ fontSize:18 }}>{editing==="new" ? "Nuevo ejercicio" : "Editar ejercicio"}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
          <div className="field">
            <label className="label">Nombre *</label>
            <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ej: Peso muerto" autoFocus />
          </div>
          <div className="field">
            <label className="label">Etapa</label>
            <div className="flex gap8" style={{ flexWrap:"wrap" }}>
              {ETAPAS.map(et => (
                <span key={et} className={`tag${form.etapa===et?" active":""}`} onClick={() => setForm(f=>({...f,etapa:et}))}>{et}</span>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="label">Descripción general (visible para todos)</label>
            <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Técnica, postura, instrucciones..." rows={3} />
          </div>
          <div className="field">
            <label className="label">Video demostrativo</label>
            <div className="flex gap8 mb8">
              <span className={`tag${form.videoType==="youtube"?" active":""}`} onClick={() => setForm(f=>({...f,videoType:"youtube",videoUrl:""}))}>YouTube</span>
              <span className={`tag${form.videoType==="file"?" active":""}`} onClick={() => setForm(f=>({...f,videoType:"file",videoUrl:""}))}>Subir archivo</span>
            </div>
            {form.videoType==="youtube"
              ? <input value={form.videoUrl} onChange={e => setForm(f=>({...f,videoUrl:e.target.value}))} placeholder="https://youtube.com/watch?v=..." />
              : <div>
                  <input type="file" accept="video/*" ref={fileRef} style={{ display:"none" }} onChange={handleFile} />
                  <button className="btn btn-ghost btn-full" onClick={() => fileRef.current.click()} disabled={uploadPct!==null}>
                    {uploadPct!==null ? `Subiendo... ${uploadPct}%` : "📁 Seleccionar video (MP4)"}
                  </button>
                  {uploadPct!==null && <div className="progress mt8"><div className="progress-fill" style={{ width:`${uploadPct}%` }} /></div>}
                  {form.videoUrl && form.videoType==="file" && <p className="text-xs mt8" style={{ color:"var(--green)" }}>✓ Video subido</p>}
                </div>
            }
            {form.videoType==="youtube" && form.videoUrl && getYoutubeEmbed(form.videoUrl) && (
              <div className="video-wrap mt8">
                <iframe src={getYoutubeEmbed(form.videoUrl)} allowFullScreen title="preview" />
              </div>
            )}
          </div>
          <button className="btn btn-primary btn-full" onClick={save}>Guardar ejercicio</button>
        </div>
      )}

      {/* Lista */}
      {!filtered.length
        ? <div className="empty"><div className="empty-icon">🏋️</div>Sin ejercicios en la biblioteca</div>
        : filtered.map(e => (
            <div key={e.id} className="card flex-between">
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{e.name}</div>
                <div className="flex gap8" style={{ flexWrap:"wrap" }}>
                  <span className="badge" style={{ background:"transparent", border:"1px solid", borderColor: etapaColor[e.etapa]||"var(--border-md)", color: etapaColor[e.etapa]||"var(--text2)", fontSize:10 }}>
                    {e.etapa || "Sin categoría"}
                  </span>
                  {e.videoUrl && <span className="badge badge-gray" style={{ fontSize:10 }}>🎬 Video</span>}
                  {e.description && <span className="badge badge-gray" style={{ fontSize:10 }}>📝 Descripción</span>}
                </div>
              </div>
              <div className="flex gap8">
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(e)}>✏️</button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(e)}>✕</button>
              </div>
            </div>
          ))
      }
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
