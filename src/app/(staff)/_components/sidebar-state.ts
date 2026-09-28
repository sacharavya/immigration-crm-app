// Whether the sidebar is an icon rail. A per-viewer convenience kept in
// localStorage; every access is guarded because private modes throw. Both
// the sidebar and the top bar's hamburger read and flip it.
const KEY = "sidebar-collapsed";
const EVENT = "sidebar-collapsed-change";

export function readCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function subscribeCollapsed(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function toggleCollapsed(): void {
  try {
    localStorage.setItem(KEY, readCollapsed() ? "0" : "1");
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
