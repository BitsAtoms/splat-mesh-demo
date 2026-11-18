export type ProgressCallback = (message: string) => void;

/** Descarga un archivo informando del progreso (en % si el servidor da el tamaño; si no, en MB). */
export async function fetchBytes(
  url: string,
  label: string,
  onProgress?: ProgressCallback,
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  if (!response.body) return new Uint8Array(await response.arrayBuffer());

  // Con compresión gzip, content-length es el tamaño comprimido: puede quedarse corto.
  const expected = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(
      expected && received <= expected
        ? `Descargando ${label}… ${Math.round((received / expected) * 100)} %`
        : `Descargando ${label}… ${(received / 1e6).toFixed(1)} MB`,
    );
  }
  return concatBytes(chunks);
}

export function concatBytes(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Admite archivos subidos como texto base64 (`.b64.txt` o `"encoding": "base64"` en scene.json). */
export function decodeIfBase64(
  bytes: Uint8Array<ArrayBuffer>,
  path: string,
  encoding?: string,
): Uint8Array<ArrayBuffer> {
  if (encoding !== "base64" && !path.endsWith(".b64.txt")) return bytes;
  const binary = atob(new TextDecoder().decode(bytes).replace(/\s+/g, ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** ArrayBuffer con exactamente los bytes de la vista (sin copiar si ya coincide). */
export function toArrayBuffer(bytes: Uint8Array<ArrayBuffer>): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes;
  return byteOffset === 0 && byteLength === buffer.byteLength
    ? buffer
    : buffer.slice(byteOffset, byteOffset + byteLength);
}
