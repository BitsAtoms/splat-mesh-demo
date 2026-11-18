/** getElementById que falla con un mensaje claro si el HTML no tiene el elemento. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta el elemento #${id} en index.html`);
  return element as T;
}
