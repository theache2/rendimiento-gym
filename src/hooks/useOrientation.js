import { useState, useEffect } from "react";
export function useOrientation() {
  const [landscape, setLandscape] = useState(window.innerWidth > window.innerHeight);
  useEffect(() => {
    const handler = () => setLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return landscape;
}
