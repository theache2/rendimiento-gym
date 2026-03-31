import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, onSnapshot, serverTimestamp, query, orderBy, limit
} from "firebase/firestore";
import { db } from "./firebase";

export async function logActivity({ type, message, instructorId, instructorName, alumnoId, alumnoName }) {
  try {
    await addDoc(collection(db, "activity"), {
      type, message,
      instructorId:   instructorId   || null,
      instructorName: instructorName || null,
      alumnoId:       alumnoId       || null,
      alumnoName:     alumnoName     || null,
      timestamp:      serverTimestamp(),
      date:           new Date().toISOString().split("T")[0],
      time:           new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    });
  } catch(e) { console.warn("logActivity error:", e); }
}

export async function registrarSesion({ alumnoId, alumnoName, rutinaId, rutinaNombre }) {
  try {
    await addDoc(collection(db, "sesiones"), {
      alumnoId, alumnoName, rutinaId, rutinaNombre,
      timestamp: serverTimestamp(),
      date:      new Date().toISOString().split("T")[0],
      time:      new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    });
    await updateDoc(doc(db, "alumnos", alumnoId), {
      lastSession: { rutinaId, rutinaNombre, date: new Date().toISOString() }
    });
    await logActivity({ type:"session", message:`${alumnoName} abrió sesión · "${rutinaNombre}"`, alumnoId, alumnoName });
  } catch(e) { console.warn("registrarSesion error:", e); }
}

export function watchInstructores(cb) {
  return onSnapshot(collection(db, "instructores"), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function saveInstructor(data, id = null) {
  if (id) await updateDoc(doc(db, "instructores", id), data);
  else    await addDoc(collection(db, "instructores"), { ...data, createdAt: serverTimestamp() });
}

export async function deleteInstructor(id) {
  await deleteDoc(doc(db, "instructores", id));
}

export function watchAlumnos(cb) {
  return onSnapshot(collection(db, "alumnos"), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)))
  );
}

export async function saveAlumno(data, id = null) {
  if (id) {
    await updateDoc(doc(db, "alumnos", id), data);
    return id;
  } else {
    const ref = await addDoc(collection(db, "alumnos"), { ...data, createdAt: serverTimestamp() });
    return ref.id;
  }
}

export async function deleteAlumno(id) {
  await deleteDoc(doc(db, "alumnos", id));
}

export function watchEjercicios(cb) {
  return onSnapshot(collection(db, "ejercicios"), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)))
  );
}

export async function saveEjercicio(data, id = null) {
  if (id) { await updateDoc(doc(db, "ejercicios", id), data); return id; }
  else    { const ref = await addDoc(collection(db, "ejercicios"), { ...data, createdAt: serverTimestamp() }); return ref.id; }
}

export async function deleteEjercicio(id) {
  await deleteDoc(doc(db, "ejercicios", id));
}

export function watchBloques(alumnoId, cb) {
  return onSnapshot(collection(db, "alumnos", alumnoId, "bloques"), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order||0) - (b.order||0)))
  );
}

export async function saveBloque(alumnoId, data, id = null) {
  if (id) { await updateDoc(doc(db, "alumnos", alumnoId, "bloques", id), data); return id; }
  else    { const ref = await addDoc(collection(db, "alumnos", alumnoId, "bloques"), { ...data, createdAt: serverTimestamp() }); return ref.id; }
}

export async function deleteBloque(alumnoId, bloqueId) {
  await deleteDoc(doc(db, "alumnos", alumnoId, "bloques", bloqueId));
}

export function watchPlantillas(cb) {
  return onSnapshot(collection(db, "plantillas"), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function savePlantilla(data, id = null) {
  if (id) { await updateDoc(doc(db, "plantillas", id), data); return id; }
  else    { const ref = await addDoc(collection(db, "plantillas"), { ...data, createdAt: serverTimestamp() }); return ref.id; }
}

export function watchActivity(cb, limitN = 50) {
  const q = query(collection(db, "activity"), orderBy("timestamp", "desc"), limit(limitN));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function getConfig() {
  const snap = await getDoc(doc(db, "config", "app"));
  return snap.exists() ? snap.data() : { gymName: "RENDIMIENTO", logoUrl: null };
}

export async function saveConfig(data) {
  await setDoc(doc(db, "config", "app"), data, { merge: true });
}

export function watchConfig(cb) {
  return onSnapshot(doc(db, "config", "app"), snap => {
    cb(snap.exists() ? snap.data() : { gymName: "RENDIMIENTO", logoUrl: null });
  });
}
