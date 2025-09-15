// CoCode Theme Management

export type Theme = "dark" | "light" | "system";

export function getTheme(): Theme {
  const stored = localStorage.getItem("cocode-theme") as Theme | null;
  return stored ?? "system";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  const effectiveTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  
  root.setAttribute("data-theme", effectiveTheme);
  localStorage.setItem("cocode-theme", theme);
  
  // Dispatch theme change event for components that need to react
  window.dispatchEvent(new CustomEvent("themechange", {
    detail: { theme, effectiveTheme }
  }));
}

export function initTheme() {
  applyTheme(getTheme());
  
  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if (getTheme() === "system") {
        applyTheme("system");
      }
    });
  }
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
