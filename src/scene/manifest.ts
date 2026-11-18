import type { Settings } from "../config";
import { concatBytes, decodeIfBase64, fetchBytes, type ProgressCallback } from "./download";

/** Ajustes guardados en scene.json (los que exporta el botón «Copiar ajustes»). */
export type SceneSettings = Partial<Settings> & {
  spawn?: [number, number, number];
  yaw?: number;
  pitch?: number;
};

/** Formato de `scene.json`: qué escena cargar al abrir la página. Todas las rutas son relativas a la página. */
export interface SceneManifest {
  title?: string;
  /** Un archivo, o varias partes que se concatenan (para no superar límites de tamaño por archivo). */
  splat?: string | string[];
  /** Nombre con extensión para el splat concatenado; Spark lo usa para detectar el formato. */
  splatName?: string;
  collider?: string;
  encoding?: "base64";
  settings?: SceneSettings;
}

/** Lee el manifiesto. Devuelve null si no existe (la página funciona igual, cargando archivos a mano). */
export async function fetchManifest(url = "scene.json"): Promise<SceneManifest | null> {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return null;
    return (await response.json()) as SceneManifest;
  } catch {
    return null;
  }
}

export async function downloadCollider(
  manifest: SceneManifest,
  onProgress: ProgressCallback,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!manifest.collider) return null;
  const bytes = await fetchBytes(manifest.collider, "collider", onProgress);
  return decodeIfBase64(bytes, manifest.collider, manifest.encoding);
}

export async function downloadSplat(
  manifest: SceneManifest,
  onProgress: ProgressCallback,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; name: string } | null> {
  if (!manifest.splat) return null;
  const urls = Array.isArray(manifest.splat) ? manifest.splat : [manifest.splat];
  const parts: Uint8Array[] = [];
  for (const [i, url] of urls.entries()) {
    const label = urls.length > 1 ? `splat (parte ${i + 1}/${urls.length})` : "splat";
    parts.push(decodeIfBase64(await fetchBytes(url, label, onProgress), url, manifest.encoding));
  }
  return { bytes: concatBytes(parts), name: manifest.splatName || urls[0] };
}
