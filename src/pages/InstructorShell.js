import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { watchConfig } from "../lib/db";
import { useOrientation } from "../hooks/useOrientation";

// Instructor pages
import InstAlumnos     from "./instructor/InstAlumnos";
import InstRutinas     from "./instructor/InstRutinas";
import InstEjercicios  from "./instructor/InstEjercicios";
import InstPlantillas  from "./instructor/InstPlantillas";
import InstActividad   from "./instructor/InstActividad";
import InstConfig      from "./instructor/InstConfig";

const MOB_NAV = [
  { icon: "👥", label: "Alumnos",    path: "/instructor/alumnos" },
  { icon: "📋", label: "Rutinas",    path: "/instructor/rutinas" },
  { icon: "🏋️", label: "Ejercicios", path: "/instructor/ejercicios" },
  { icon: "📊", label: "Actividad",  path: "/instructor/actividad" },
  { icon: "⚙️", label: "Config",     path: "/instructor/config" },
];

export default function InstructorShell() {
  const [config, setConfig] = useState({ gymName: "RENDIMIENTO", logoUrl: null });
  const landscape = useOrientation();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => watchConfig(setConfig), []);

  return (
    <div className="app-shell">
      <Sidebar config={config} />

      <div className={`main-area${!landscape ? " sidebar-collapsed" : ""}`}>
        <Routes>
          <Route path="alumnos"    element={<InstAlumnos config={config} />} />
          <Route path="rutinas"    element={<InstRutinas config={config} />} />
          <Route path="ejercicios" element={<InstEjercicios />} />
          <Route path="plantillas" element={<InstPlantillas />} />
          <Route path="actividad"  element={<InstActividad />} />
          <Route path="config"     element={<InstConfig config={config} onConfigChange={setConfig} />} />
          <Route path="*"          element={<Navigate to="alumnos" replace />} />
        </Routes>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {MOB_NAV.map(item => (
          <div
            key={item.path}
            className={`mobile-nav-item${location.pathname.startsWith(item.path) ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
