export type FileKind = "splat" | "collider";

const SPLAT_EXTENSIONS = /\.(spz|ply|splat|ksplat|sog)$/;
const COLLIDER_EXTENSIONS = /\.(glb|gltf)$/;

export function detectFileKind(fileName: string): FileKind | null {
  const name = fileName.toLowerCase();
  if (COLLIDER_EXTENSIONS.test(name)) return "collider";
  if (SPLAT_EXTENSIONS.test(name)) return "splat";
  return null;
}

/** Permite soltar archivos en cualquier parte de la ventana (se resalta mientras se arrastra). */
export function setupDropZone(onFile: (file: File) => void): void {
  const body = document.body;
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    body.classList.add("dragging");
  });
  window.addEventListener("dragleave", (e) => {
    // relatedTarget es null solo cuando el puntero sale de la ventana (no al pasar entre elementos).
    if (e.relatedTarget === null) body.classList.remove("dragging");
  });
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    body.classList.remove("dragging");
    for (const file of e.dataTransfer?.files ?? []) onFile(file);
  });
}
