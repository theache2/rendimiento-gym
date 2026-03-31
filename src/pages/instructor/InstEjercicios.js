import React, { useState, useEffect, useRef, useMemo } from "react";
import { watchEjercicios, saveEjercicio, deleteEjercicio, logActivity } from "../../lib/db";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import Toast from "../../components/Toast";

const ETAPAS = ["Movilidad / Core", "Fuerza / Aeróbico", "Vuelta a la calma"];
const ETAPA_STYLE = {
  "Movilidad / Core":  { color:"var(--blue)",  bg:"var(--blue-bg)"  },
  "Fuerza / Aeróbico": { color:"var(--red)",   bg:"var(--red-bg)"   },
  "Vuelta a la calma": { color:"var(--green)", bg:"var(--green-bg)" },
};
const EMPTY = { name:"", etapa:"Fuerza / Aeróbico", description:"", videoType:"youtube", videoUrl:"" };

function getYoutubeEmbed(url) {
  const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function InstEjercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [search, setSearch]         = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState(null); // null = todos
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [uploadPct, setUploadPct]   = useState(null);
  const [toast, setToast]           = useState("");
  const fileRef = useRef();
  const { instructor } = useAuth();

  useEffect(() => watchEjercicios(setEjercicios), []);

  const filtered = useMemo(() => ejercicios.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchEtapa  = !filtroEtapa || e.etapa === filtroEtapa;
    return matchSearch && matchEtapa;
  }), [ejercicios, search, filtroEtapa]);

  const openNew  = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit = (e) => { setForm({ name:e.name, etapa:e.etapa||"Fuerza / Aeróbico", description:e.description||"", videoType:e.videoType||"youtube", videoUrl:e.videoUrl||"" }); setEditing(e.id); };

  const save = async () => {
    if (!form.name.trim()) return;
    const id = await saveEjercicio(form, editing === "new" ? null : editing);
    await logActivity({ type:"change", message:`Ejercicio "${form.name}" ${editing==="new"?"creado":"actualizado"}`, instructorId: instructor.id, instructorName: instructor.name });
    setEditing(null);
    setToast("Ejercicio guardado");
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

  // Agrupar ejercicios filtrados por etapa
  const grupos = ETAPAS.reduce((acc, et) => {
    acc[et] = filtered.filter(e => e.etapa === et);
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="flex-between mb24">
        <div>
          <h2 style={{ fontSize:36 }}>EJERCICIOS</h2>
          <p className="text-muted text-sm">Biblioteca global · {ejercicios.length} ejercicios</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo</button>
      </div>

      {/* Buscador */}
      <div className="field mb12">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar ejercicio..." />
      </div>

      {/* Filtro por etapa — toggle */}
      <div className="flex gap8 mb24" style={{ flexWrap:"wrap" }}>
        {ETAPAS.map(et => (
          <span
            key={et}
            onClick={() => setFiltroEtapa(filtroEtapa === et ? null : et)}
            style={{
              padding:"6px 14px", borderRadius:999, fontSize:12, fontWeight:600,
              cursor:"pointer", transition:"all 0.15s",
              background: filtroEtapa===et ? ETAPA_STYLE[et].bg : "var(--bg3)",
              color: filtroEtapa===et ? ETAPA_STYLE[et].color : "var(--text2)",
              border: `1px solid ${filtroEtapa===et ? ETAPA_STYLE[et].color : "var(--border-md)"}`,
            }}
          >
            {filtroEtapa===et ? "✓ " : ""}{et}
          </span>
        ))}
        {filtroEtapa && (
          <span onClick={() => setFiltroEtapa(null)} style={{ padding:"6px 14px", borderRadius:999, fontSize:12, fontWeight:600, cursor:"pointer", background:"var(--bg3)", color:"var(--text2)", border:"1px solid var(--border-md)" }}>
            ✕ Limpiar filtro
          </span>
        )}
      </div>

      {/* Form nuevo/editar */}
      {editing && (
        <div className="card card-red mb24">
          <div className="flex-between mb16">
            <h3 style={{ fontSize:18 }}>{editing==="new" ? "Nuevo ejercicio" : "Editar ejercicio"}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
          <div className="field">
            <label className="label">Nombre *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ej: Peso muerto" autoFocus />
          </div>
          <div className="field">
            <label className="label">Etapa</label>
            <div className="flex gap8" style={{ flexWrap:"wrap" }}>
              {ETAPAS.map(et => (
                <span key={et} className={`tag${form.etapa===et?" active":""}`} onClick={()=>setForm(f=>({...f,etapa:et}))}>{et}</span>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="label">Descripción general (visible para todos los alumnos)</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Técnica, postura, instrucciones..." rows={3} />
          </div>
          <div className="field">
            <label className="label">Video demostrativo</label>
            <div className="flex gap8 mb8">
              <span className={`tag${form.videoType==="youtube"?" active":""}`} onClick={()=>setForm(f=>({...f,videoType:"youtube",videoUrl:""}))}>YouTube</span>
              <span className={`tag${form.videoType==="file"?" active":""}`} onClick={()=>setForm(f=>({...f,videoType:"file",videoUrl:""}))}>Subir archivo</span>
            </div>
            {form.videoType==="youtube"
              ? <input value={form.videoUrl} onChange={e=>setForm(f=>({...f,videoUrl:e.target.value}))} placeholder="https://youtube.com/watch?v=..." />
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

      {/* Lista agrupada por etapa */}
      {filtered.length === 0
        ? <div className="empty"><div className="empty-icon">🏋️</div>{ejercicios.length===0 ? "Sin ejercicios en la biblioteca" : "Sin resultados para ese filtro"}</div>
        : ETAPAS.map(et => {
            const exs = grupos[et];
            if (!exs?.length) return null;
            const style = ETAPA_STYLE[et];
            return (
              <div key={et} className="mb24">
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0 10px" }}>
                  <span style={{ padding:"3px 12px", borderRadius:999, fontSize:11, fontWeight:700, background:style.bg, color:style.color, whiteSpace:"nowrap" }}>{et.toUpperCase()}</span>
                  <div style={{ flex:1, height:1, background:style.bg }} />
                  <span className="text-xs text-muted">{exs.length} ejercicios</span>
                </div>
                {exs.map(e => (
                  <div key={e.id} className="card flex-between mb8">
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{e.name}</div>
                      <div className="flex gap8" style={{ flexWrap:"wrap" }}>
                        {e.videoUrl && <span className="badge badge-gray" style={{ fontSize:10 }}>🎬 Video</span>}
                        {e.description && <span className="badge badge-gray" style={{ fontSize:10 }}>📝 Descripción</span>}
                      </div>
                    </div>
                    <div className="flex gap8">
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(e)}>✏️</button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(e)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
      }
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
