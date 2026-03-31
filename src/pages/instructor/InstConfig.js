import React, { useState, useEffect, useRef } from "react";
import { watchInstructores, saveInstructor, deleteInstructor, saveConfig, logActivity } from "../../lib/db";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import Toast from "../../components/Toast";

export default function InstConfig({ config, onConfigChange }) {
  const [instructores, setInstructores] = useState([]);
  const [gymName, setGymName]           = useState(config?.gymName || "RENDIMIENTO");
  const [logoUrl, setLogoUrl]           = useState(config?.logoUrl || null);
  const [uploadPct, setUploadPct]       = useState(null);
  const [instForm, setInstForm]         = useState({ name:"", pin:"", role:"instructor" });
  const [showInstForm, setShowInstForm] = useState(false);
  const [toast, setToast]               = useState("");
  const logoRef = useRef();
  const { instructor, isAdmin } = useAuth();

  useEffect(() => watchInstructores(setInstructores), []);
  useEffect(() => { setGymName(config?.gymName || "RENDIMIENTO"); setLogoUrl(config?.logoUrl || null); }, [config]);

  const saveGym = async () => {
    await saveConfig({ gymName, logoUrl });
    onConfigChange?.({ gymName, logoUrl });
    await logActivity({ type:"change", message:`Configuración del gimnasio actualizada`, instructorId: instructor.id, instructorName: instructor.name });
    setToast("Configuración guardada");
  };

  const uploadLogo = (file) => new Promise((res, rej) => {
    const r2 = ref(storage, `logos/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(r2, file);
    task.on("state_changed",
      s => setUploadPct(Math.round(s.bytesTransferred/s.totalBytes*100)),
      rej,
      async () => { res(await getDownloadURL(task.snapshot.ref)); setUploadPct(null); }
    );
  });

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadLogo(file);
      setLogoUrl(url);
      setToast("Logo subido ✓");
    } catch { setToast("Error al subir el logo"); setUploadPct(null); }
  };

  const addInstructor = async () => {
    if (!instForm.name.trim() || instForm.pin.length < 4) return;
    await saveInstructor(instForm);
    await logActivity({ type:"create", message:`Instructor "${instForm.name}" creado`, instructorId: instructor.id, instructorName: instructor.name });
    setInstForm({ name:"", pin:"", role:"instructor" });
    setShowInstForm(false);
    setToast("Instructor agregado");
  };

  const removeInst = async (i) => {
    if (i.id === instructor.id) { setToast("No podés eliminar tu propio perfil"); return; }
    if (!window.confirm(`¿Eliminar a ${i.name}?`)) return;
    await deleteInstructor(i.id);
    setToast("Instructor eliminado");
  };

  const roleColor = { admin:"var(--red)", instructor:"var(--blue)" };

  return (
    <div className="page">
      <h2 style={{ fontSize:36, marginBottom:24 }}>CONFIGURACIÓN</h2>

      {/* Logo y nombre */}
      <div className="card mb24">
        <h3 style={{ fontSize:20, marginBottom:16 }}>Identidad del gimnasio</h3>

        <label className="label">Logo</label>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:"white", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0, border:"1px solid var(--border-md)" }}>
            {logoUrl
              ? <img src={logoUrl} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <span style={{ fontFamily:"'Bebas Neue'", fontSize:36, color:"var(--red)", fontStyle:"italic" }}>R</span>
            }
          </div>
          <div style={{ flex:1 }}>
            <input type="file" accept="image/*" ref={logoRef} style={{ display:"none" }} onChange={handleLogo} />
            <button className="btn btn-ghost btn-full" onClick={() => logoRef.current.click()} disabled={uploadPct!==null}>
              {uploadPct!==null ? `Subiendo... ${uploadPct}%` : "📁 Cambiar logo"}
            </button>
            {uploadPct!==null && <div className="progress mt8"><div className="progress-fill" style={{ width:`${uploadPct}%` }} /></div>}
            <p className="text-xs text-muted mt8">PNG o JPG · fondo blanco o transparente recomendado</p>
          </div>
        </div>

        <div className="field">
          <label className="label">Nombre del gimnasio</label>
          <input value={gymName} onChange={e => setGymName(e.target.value)} placeholder="RENDIMIENTO" />
        </div>

        <button className="btn btn-primary" onClick={saveGym}>Guardar cambios</button>
      </div>

      {/* Instructores */}
      {isAdmin && (
        <div className="card">
          <div className="flex-between mb16">
            <h3 style={{ fontSize:20 }}>Instructores</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowInstForm(s => !s)}>
              {showInstForm ? "Cancelar" : "+ Nuevo"}
            </button>
          </div>

          {showInstForm && (
            <div className="card card-red mb16" style={{ background:"var(--bg3)" }}>
              <div className="field">
                <label className="label">Nombre completo</label>
                <input value={instForm.name} onChange={e => setInstForm(f=>({...f,name:e.target.value}))} placeholder="Ej: Laura Ríos" autoFocus />
              </div>
              <div className="field-row">
                <div>
                  <label className="label">PIN (4 dígitos)</label>
                  <input value={instForm.pin} onChange={e => setInstForm(f=>({...f,pin:e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="1234" type="password" maxLength={4} />
                </div>
                <div>
                  <label className="label">Rol</label>
                  <select value={instForm.role} onChange={e => setInstForm(f=>({...f,role:e.target.value}))}>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary btn-full" onClick={addInstructor} disabled={instForm.pin.length<4 || !instForm.name.trim()}>
                Agregar instructor
              </button>
            </div>
          )}

          {instructores.map(i => (
            <div key={i.id} className="card card-sm flex-between" style={{ marginBottom:8 }}>
              <div className="flex gap12">
                <div className="inst-av" style={{ background: i.role==="admin" ? "var(--red-bg)" : "var(--blue-bg)", color: i.role==="admin" ? "var(--red)" : "var(--blue)" }}>
                  {i.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{i.name} {i.id===instructor.id && <span className="badge badge-gray" style={{ fontSize:10 }}>Vos</span>}</div>
                  <span className="badge" style={{ fontSize:10, background:"transparent", border:`1px solid ${roleColor[i.role]}`, color:roleColor[i.role] }}>{i.role}</span>
                </div>
              </div>
              {i.id !== instructor.id && (
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeInst(i)}>✕</button>
              )}
            </div>
          ))}

          <p className="text-xs text-muted mt12">Los instructores con rol Admin pueden gestionar otros instructores y la configuración del gimnasio.</p>
        </div>
      )}

      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
