import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const AuthContext = createContext(null);

// PIN especial para la tablet del gym (ve todos los alumnos)
export const TABLET_PIN = "0000";

export function AuthProvider({ children }) {
  const [instructor, setInstructor] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("instructor")) || null; }
    catch { return null; }
  });

  const [alumnoAuth, setAlumnoAuth] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("alumnoAuth")) || null; }
    catch { return null; }
  });

  const loginInstructor = async (pin) => {
    const snap = await getDocs(collection(db, "instructores"));
    const found = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .find(i => i.pin === pin);
    if (!found) return { ok: false, error: "PIN incorrecto" };
    const inst = { id: found.id, name: found.name, role: found.role };
    sessionStorage.setItem("instructor", JSON.stringify(inst));
    setInstructor(inst);
    return { ok: true };
  };

  const logoutInstructor = () => {
    sessionStorage.removeItem("instructor");
    setInstructor(null);
  };

  // Login alumno por PIN — retorna el alumno o error
  const loginAlumno = async (pin) => {
    // PIN especial de tablet
    if (pin === TABLET_PIN) {
      const tabletUser = { id: "tablet", name: "Tablet", isTablet: true };
      sessionStorage.setItem("alumnoAuth", JSON.stringify(tabletUser));
      setAlumnoAuth(tabletUser);
      return { ok: true, isTablet: true };
    }

    // Buscar alumno con ese PIN
    const snap = await getDocs(collection(db, "alumnos"));
    const found = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .find(a => a.pin === pin);

    if (!found) return { ok: false, error: "PIN incorrecto" };

    const alumno = { id: found.id, name: found.name, isTablet: false };
    sessionStorage.setItem("alumnoAuth", JSON.stringify(alumno));
    setAlumnoAuth(alumno);
    return { ok: true, isTablet: false, alumnoId: found.id };
  };

  const logoutAlumno = () => {
    sessionStorage.removeItem("alumnoAuth");
    setAlumnoAuth(null);
  };

  return (
    <AuthContext.Provider value={{
      instructor, loginInstructor, logoutInstructor,
      isAdmin: instructor?.role === "admin",
      alumnoAuth, loginAlumno, logoutAlumno,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
