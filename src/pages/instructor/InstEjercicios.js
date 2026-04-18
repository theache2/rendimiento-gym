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


function proxyImg(url) {
  if (!url) return '';
  if (url.includes('firebasestorage') || url.includes('youtube') || !url.includes('cloudfront')) return url;
return '/api/img?url=' + encodeURIComponent(url);}
function isImage(url) {
  return url && (url.includes("cloudfront.net") || url.match(/\.(png|gif|jpg|jpeg|webp)$/i));
}

export default function InstEjercicios() {
  const [ejercicios, setEjercicios]     = useState([]);
  const [search, setSearch]             = useState("");
  const [filtroEtapa, setFiltroEtapa]   = useState(null);
  const [editing, setEditing]           = useState(null);
  const [form, setForm]                 = useState(EMPTY);
  const [uploadPct, setUploadPct]       = useState(null);
  const [toast, setToast]               = useState("");
  const [previewEx, setPreviewEx]       = useState(null); // ejercicio en preview
  const fileRef = useRef();
  const { instructor } = useAuth();

  useEffect(() => watchEjercicios(setEjercicios), []);

  const filtered = useMemo(() => ejercicios.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchEtapa  = !filtroEtapa || e.etapa === filtroEtapa;
    return matchSearch && matchEtapa;
  }), [ejercicios, search, filtroEtapa]);

  const grupos = useMemo(() => ETAPAS.reduce((acc, et) => {
    acc[et] = filtered.filter(e => e.etapa === et);
    return acc;
  }, {}), [filtered]);

  const openNew  = () => { setForm(EMPTY); setEditing("new"); setPreviewEx(null); };
  const openEdit = (e) => {
    setForm({
      name:        e.name        || "",
      etapa:       e.etapa       || "Fuerza / Aeróbico",
      description: e.description || "",
      videoType:   e.videoType   || (isImage(e.videoUrl) ? "image" : "youtube"),
      videoUrl:    e.videoUrl    || "",
    });
    setEditing(e.id);
    setPreviewEx(null);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    await saveEjercicio(form, editing === "new" ? null : editing);
    await logActivity({ type:"change", message:`Ejercicio "${form.name}" ${editing==="new"?"creado":"actualizado"}`, instructorId:instructor.id, instructorName:instructor.name });
    setEditing(null);
    setToast("Ejercicio guardado ✓");
  };

  const remove = async (e) => {
    if (!window.confirm(`¿Eliminar "${e.name}"?`)) return;
    await deleteEjercicio(e.id);
    setToast("Ejercicio eliminado");
    if (previewEx?.id === e.id) setPreviewEx(null);
  };

  const uploadVideo = (file) => new Promise((res, rej) => {
    const r2 = ref(storage, `videos/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(r2, file);
    task.on("state_changed", s => setUploadPct(Math.round(s.bytesTransferred/s.totalBytes*100)), rej,
      async () => { res(await getDownloadURL(task.snapshot.ref)); setUploadPct(null); });
  });

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadVideo(file);
      setForm(f => ({ ...f, videoUrl: url, videoType: file.type.startsWith("image") ? "image" : "file" }));
      setToast("Archivo subido ✓");
    } catch { setToast("Error al subir"); setUploadPct(null); }
  };

  // Renderizar preview de imagen/video/youtube
  const renderMedia = (ex, height = 180) => {
    const url = ex.videoUrl || form?.videoUrl;
    const type = ex.videoType || form?.videoType;
    if (!url) return null;
    if (type === "image" || isImage(url)) {
      return <img src={proxyImg(url)} alt={ex.name} referrerPolicy="no-referrer" crossOrigin="anonymous" style={{ width:"100%", height, objectFit:"cover", borderRadius:"var(--r-sm)", border:"1px solid var(--border)", display:"block" }} />;
    }
    if (type === "youtube" && getYoutubeEmbed(url)) {
      return <div className="video-wrap" style={{ marginTop:8 }}><iframe src={getYoutubeEmbed(url)} allowFullScreen title={ex.name} /></div>;
    }
    if (type === "file") {
      return <div className="video-wrap" style={{ marginTop:8 }}><video src={url} controls playsInline /></div>;
    }
    return null;
  };

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

      {/* Filtros por etapa */}
      <div className="flex gap8 mb24" style={{ flexWrap:"wrap" }}>
        {ETAPAS.map(et => (
          <span key={et} onClick={() => setFiltroEtapa(filtroEtapa===et ? null : et)}
            style={{ padding:"6px 14px", borderRadius:999, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
              background: filtroEtapa===et ? ETAPA_STYLE[et].bg : "var(--bg3)",
              color: filtroEtapa===et ? ETAPA_STYLE[et].color : "var(--text2)",
              border: `1px solid ${filtroEtapa===et ? ETAPA_STYLE[et].color : "var(--border-md)"}` }}>
            {filtroEtapa===et ? "✓ " : ""}{et}
          </span>
        ))}
        {filtroEtapa && (
          <span onClick={() => setFiltroEtapa(null)} style={{ padding:"6px 14px", borderRadius:999, fontSize:12, fontWeight:600, cursor:"pointer", background:"var(--bg3)", color:"var(--text2)", border:"1px solid var(--border-md)" }}>
            ✕ Limpiar
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
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ej: Sentadilla con barra" autoFocus />
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
            <label className="label">Descripción / técnica (visible para todos los alumnos)</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Instrucciones de técnica, músculos trabajados, consejos..." rows={4} />
          </div>

          <div className="field">
            <label className="label">Animación / video demostrativo</label>
            <div className="flex gap8 mb8" style={{ flexWrap:"wrap" }}>
              {["youtube","file","image","none"].map(t => (
                <span key={t} className={`tag${form.videoType===t?" active":""}`}
                  onClick={()=>setForm(f=>({...f,videoType:t,videoUrl:t==="none"?"":f.videoUrl}))}>
                  {t==="youtube"?"YouTube":t==="file"?"Video propio":t==="image"?"Imagen/GIF":"Sin animación"}
                </span>
              ))}
            </div>

            {form.videoType==="youtube" && (
              <input value={form.videoUrl} onChange={e=>setForm(f=>({...f,videoUrl:e.target.value}))} placeholder="https://youtube.com/watch?v=..." />
            )}

            {(form.videoType==="file" || form.videoType==="image") && (
              <div>
                <input type="file" accept={form.videoType==="image"?"image/*":"video/*"} ref={fileRef} style={{ display:"none" }} onChange={handleFile} />
                <button className="btn btn-ghost btn-full" onClick={() => fileRef.current.click()} disabled={uploadPct!==null}>
                  {uploadPct!==null ? `Subiendo... ${uploadPct}%` : `📁 Seleccionar ${form.videoType==="image"?"imagen/GIF":"video"}`}
                </button>
                {uploadPct!==null && <div className="progress mt8"><div className="progress-fill" style={{ width:`${uploadPct}%` }} /></div>}
                {form.videoUrl && <p className="text-xs mt8" style={{ color:"var(--green)" }}>✓ Archivo subido</p>}
              </div>
            )}

            {form.videoType==="none" && (
              <p className="text-xs text-muted mt4">No se mostrará animación para este ejercicio.</p>
            )}

            {/* Preview en el form */}
            {form.videoUrl && form.videoType !== "none" && (
              <div style={{ marginTop:12 }}>
                <div className="label mb8">Vista previa</div>
                {renderMedia({ videoUrl:form.videoUrl, videoType:form.videoType, name:form.name })}
              </div>
            )}
          </div>

          <div className="flex gap8 mt4">
            <button className="btn btn-primary btn-full" onClick={save}>
              {editing==="new" ? "Crear ejercicio" : "Guardar cambios"}
            </button>
            {editing !== "new" && (
              <button className="btn btn-danger" onClick={() => { remove({ id:editing, name:form.name }); setEditing(null); }}>
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview lateral al hacer clic en un ejercicio */}
      {previewEx && !editing && (
        <div className="card card-red mb16" style={{ position:"sticky", top:70, zIndex:10 }}>
          <div className="flex-between mb12">
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>{previewEx.name}</div>
              <span className="badge" style={{ fontSize:10, background:ETAPA_STYLE[previewEx.etapa]?.bg, color:ETAPA_STYLE[previewEx.etapa]?.color }}>{previewEx.etapa}</span>
            </div>
            <div className="flex gap8">
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(previewEx)}>✏️ Editar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewEx(null)}>✕</button>
            </div>
          </div>
          {renderMedia(previewEx, 200)}
          {previewEx.description && (
            <p className="text-sm text-muted mt12" style={{ lineHeight:1.6 }}>{previewEx.description}</p>
          )}
        </div>
      )}

      {/* Lista agrupada por etapa */}
      {filtered.length === 0
        ? <div className="empty"><div className="empty-icon">🏋️</div>{ejercicios.length===0 ? "Sin ejercicios en la biblioteca" : "Sin resultados"}</div>
        : ETAPAS.map(et => {
            const exs = grupos[et];
            if (!exs?.length) return null;
            const style = ETAPA_STYLE[et];
            return (
              <div key={et} className="mb24">
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0 10px" }}>
                  <span style={{ padding:"3px 12px", borderRadius:999, fontSize:11, fontWeight:700, background:style.bg, color:style.color, whiteSpace:"nowrap" }}>{et.toUpperCase()}</span>
                  <div style={{ flex:1, height:1, background:style.bg }} />
                  <span className="text-xs text-muted">{exs.length}</span>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10 }}>
                  {exs.map(e => (
                    <div key={e.id}
                      onClick={() => setPreviewEx(previewEx?.id===e.id ? null : e)}
                      style={{
                        background: previewEx?.id===e.id ? style.bg : "var(--bg2)",
                        border: `1px solid ${previewEx?.id===e.id ? style.color : "var(--border)"}`,
                        borderRadius:"var(--r-lg)", overflow:"hidden", cursor:"pointer",
                        transition:"all 0.15s",
                      }}
                    >
                      {/* Thumbnail animación */}
                      {e.videoUrl && (isImage(e.videoUrl) || e.videoType==="image") ? (
                        <img src={proxyImg(e.videoUrl)} alt={e.name} referrerPolicy="no-referrer" crossOrigin="anonymous"
                          style={{ width:"100%", height:100, objectFit:"cover", display:"block", background:"var(--bg3)" }} />
                      ) : (
                        <div style={{ width:"100%", height:100, background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize:28 }}>{e.videoUrl ? "▶" : "🏋️"}</span>
                        </div>
                      )}
                      <div style={{ padding:"8px 10px" }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", lineHeight:1.3, marginBottom:6 }}>{e.name}</div>
                        <div className="flex gap4">
                          <button className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:"3px 8px" }}
                            onClick={e2 => { e2.stopPropagation(); openEdit(e); }}>✏️</button>
                          <button className="btn btn-danger btn-sm" style={{ fontSize:11, padding:"3px 8px" }}
                            onClick={e2 => { e2.stopPropagation(); remove(e); }}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
      }
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
