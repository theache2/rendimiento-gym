import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { watchConfig } from "../lib/db";

export default function AlumnoLogin() {
  const navigate = useNavigate();
  const { loginAlumno, alumnoAuth } = useAuth();
  const [pin, setPin]       = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ gymName:"RENDIMIENTO", logoUrl:null });

  useEffect(() => watchConfig(setConfig), []);

  useEffect(() => {
    if (alumnoAuth) {
      if (alumnoAuth.isTablet) navigate("/alumnos", { replace: true });
      else navigate(`/alumnos/${alumnoAuth.id}`, { replace: true });
    }
  }, [alumnoAuth]);

  const handleKey = async (k) => {
    if (loading) return;
    if (k === "del") { setPin(p => p.slice(0,-1)); setError(""); return; }
    const next = pin + k;
    setPin(next);
    setError("");
    if (next.length === 4) {
      setLoading(true);
      const result = await loginAlumno(next);
      if (result.ok) {
        if (result.isTablet) navigate("/alumnos", { replace: true });
        else navigate(`/alumnos/${result.alumnoId}`, { replace: true });
      } else {
        setError("PIN incorrecto. Consultá con tu instructor.");
        setPin("");
      }
      setLoading(false);
    }
  };

  const keys = ["1","2","3","4","5","6","7","8","9","del","0","ok"];
  const gymName = config.gymName || "RENDIMIENTO";

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, background:"var(--bg)" }}>
      <button onClick={() => navigate("/")} style={{ position:"fixed", top:20, left:20, background:"none", border:"none", color:"var(--text2)", fontSize:14, cursor:"pointer" }}>← Volver</button>

      <div style={{ width:"100%", maxWidth:300, textAlign:"center" }}>
        {config.logoUrl
          ? <img src={config.logoUrl} alt="" style={{ height:64, objectFit:"contain", marginBottom:16 }} />
          : <div style={{ width:64, height:64, borderRadius:"50%", background:"white", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <span style={{ fontFamily:"'Bebas Neue'", fontSize:32, color:"var(--red)", fontStyle:"italic" }}>R</span>
            </div>
        }
        <h2 style={{ fontSize:28, marginBottom:4 }}>ACCESO</h2>
        <p className="text-muted mb24" style={{ fontSize:13 }}>{gymName} · Ingresá tu PIN</p>

        {/* Dots */}
        <div className="pin-dots">
          {[0,1,2,3].map(i => <div key={i} className={`pin-dot${pin.length > i ? " filled" : ""}`} />)}
        </div>
        {error && <p style={{ color:"var(--red)", fontSize:13, marginBottom:12, lineHeight:1.4 }}>{error}</p>}

        {/* Keypad */}
        <div className="pin-grid">
          {keys.map(k => (
            <button
              key={k}
              className={`pin-key${k==="ok" ? " pin-key-red" : ""}`}
              onClick={() => k !== "ok" && handleKey(k === "del" ? "del" : k)}
              disabled={loading || k === "ok"}
              style={{ fontSize: k==="del"||k==="ok" ? 14 : 22, opacity: loading ? 0.5 : 1 }}
            >
              {k === "del" ? "⌫" : k === "ok" ? "OK" : k}
            </button>
          ))}
        </div>

        {loading && <div style={{ marginTop:20, display:"flex", justifyContent:"center" }}><div className="spinner" /></div>}

        <p className="text-muted mt24" style={{ fontSize:12, lineHeight:1.5 }}>
          ¿No tenés PIN? Pedíselo a tu instructor.
        </p>
      </div>
    </div>
  );
}
