import React, { useEffect } from "react";
export default function Toast({ msg, onDone }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }
  }, [msg]);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}
