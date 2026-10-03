"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("filario-theme");
    const next =
      stored === "dark" || stored === "light"
        ? stored
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("filario-theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <button className="button ghost small" type="button" onClick={toggle} aria-label="Changer de thème">
      {theme === "dark" ? "Mode clair" : "Mode sombre"}
    </button>
  );
}
