import { CAMERA } from "../config";

export type KeyAction = "toggleFly" | "toggleCollider" | "reset" | "setSpawn" | "toggleView" | "togglePanel";

const ACTION_KEYS: Record<string, KeyAction> = {
  KeyF: "toggleFly",
  KeyC: "toggleCollider",
  KeyR: "reset",
  KeyP: "setSpawn",
  KeyV: "toggleView",
  KeyH: "togglePanel",
};

/** Teclas cuya acción por defecto del navegador (hacer scroll) hay que evitar. */
const SCROLL_KEYS = new Set(["Space", "ArrowUp", "ArrowDown"]);

export interface InputHandlers {
  onAction(action: KeyAction): void;
  /** Giro de cámara en radianes, ya escalado por la sensibilidad. */
  onLook(deltaYaw: number, deltaPitch: number): void;
  /** Rueda del ratón. Devuelve true si se usó (y así se evita el scroll de la página). */
  onWheel(deltaY: number): boolean;
  onPointerLockChange(locked: boolean): void;
}

/**
 * Teclado y ratón. Guarda qué teclas están pulsadas para la física y avisa de
 * las acciones puntuales (cambiar modo, reiniciar…) mediante callbacks.
 */
export class Input {
  private readonly pressed = new Set<string>();
  private jumpQueued = false;
  private dragging = false;
  pointerLocked = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly handlers: InputHandlers,
  ) {
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.pressed.delete(e.code));
    // Si la ventana pierde el foco no llega el keyup: soltamos todo para que la rata no siga andando.
    window.addEventListener("blur", () => this.pressed.clear());

    canvas.addEventListener("click", () => this.requestPointerLock());
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      handlers.onPointerLockChange(this.pointerLocked);
    });
    // Sin pointer lock (p. ej. si el navegador lo rechaza) también se puede mirar arrastrando.
    canvas.addEventListener("mousedown", () => (this.dragging = true));
    window.addEventListener("mouseup", () => (this.dragging = false));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (handlers.onWheel(e.deltaY)) e.preventDefault();
      },
      { passive: false },
    );
  }

  isDown(...codes: string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }

  get sprinting(): boolean {
    return this.isDown("ShiftLeft", "ShiftRight");
  }

  /** Devuelve si se pidió un salto desde la última llamada, y borra la petición. */
  consumeJump(): boolean {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  private onKeyDown(e: KeyboardEvent): void {
    // No robar teclas mientras se escribe en el panel (las casillas sí dejan pasar los atajos).
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "checkbox") return;

    this.pressed.add(e.code);
    if (e.code === "Space" && !e.repeat) this.jumpQueued = true;
    const action = ACTION_KEYS[e.code];
    // Ignorar la autorrepetición: mantener pulsada una tecla no debe alternar el modo una y otra vez.
    if (action && !e.repeat) this.handlers.onAction(action);
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.pointerLocked && !this.dragging) return;
    const sensitivity = this.pointerLocked ? CAMERA.sensitivityLocked : CAMERA.sensitivityDrag;
    this.handlers.onLook(-e.movementX * sensitivity, -e.movementY * sensitivity);
  }

  private async requestPointerLock(): Promise<void> {
    this.canvas.focus();
    if (this.pointerLocked) return;
    try {
      await this.canvas.requestPointerLock();
    } catch {
      // El navegador puede rechazarlo (p. ej. justo después de pulsar Esc); se sigue pudiendo arrastrar.
    }
  }
}
