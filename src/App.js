import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./index.css";

// Páginas alumno
import SelectRole      from "./pages/SelectRole";
import AlumnoSelect    from "./pages/AlumnoSelect";
import AlumnoRutina    from "./pages/AlumnoRutina";

// Páginas instructor
import InstructorLogin    from "./pages/InstructorLogin";
import InstructorShell    from "./pages/InstructorShell";

function PrivateRoute({ children }) {
  const { instructor } = useAuth();
  return instructor ? children : <Navigate to="/instructor/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Alumno */}
          <Route path="/"                  element={<SelectRole />} />
          <Route path="/alumnos"           element={<AlumnoSelect />} />
          <Route path="/alumnos/:alumnoId" element={<AlumnoRutina />} />

          {/* Instructor */}
          <Route path="/instructor/login"  element={<InstructorLogin />} />
          <Route path="/instructor/*"      element={<PrivateRoute><InstructorShell /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
