import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./index.css";

import SelectRole      from "./pages/SelectRole";
import AlumnoLogin     from "./pages/AlumnoLogin";
import AlumnoSelect    from "./pages/AlumnoSelect";
import AlumnoRutina    from "./pages/AlumnoRutina";
import InstructorLogin from "./pages/InstructorLogin";
import InstructorShell from "./pages/InstructorShell";

function PrivateInstructor({ children }) {
  const { instructor } = useAuth();
  return instructor ? children : <Navigate to="/instructor/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                  element={<SelectRole />} />
          <Route path="/login-alumno"      element={<AlumnoLogin />} />
          <Route path="/alumnos"           element={<AlumnoSelect />} />
          <Route path="/alumnos/:alumnoId" element={<AlumnoRutina />} />
          <Route path="/instructor/login"  element={<InstructorLogin />} />
          <Route path="/instructor/*"      element={<PrivateInstructor><InstructorShell /></PrivateInstructor>} />
          <Route path="*"                  element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
