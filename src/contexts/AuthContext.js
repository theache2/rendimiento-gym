// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [instructor, setInstructor] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("instructor")) || null; }
    catch { return null; }
  });

  const login = async (pin) => {
    // Busca el instructor con ese PIN en Firestore
    const snap = await getDocs(collection(db, "instructores"));
    const found = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .find(i => i.pin === pin);
    if (!found) return { ok: false, error: "PIN incorrecto" };
    const inst = { id: found.id, name: found.name, role: found.role };
    sessionStorage.setItem("instructor", JSON.stringify(inst));
    setInstructor(inst);
    return { ok: true };
  };

  const logout = () => {
    sessionStorage.removeItem("instructor");
    setInstructor(null);
  };

  return (
    <AuthContext.Provider value={{ instructor, login, logout, isAdmin: instructor?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
