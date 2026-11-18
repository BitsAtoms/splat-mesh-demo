import { type Settings, jumpHeight } from "../config";
import { byId } from "./dom";

/** Casillas del panel: el id del <input> coincide con la clave del ajuste. */
const TOGGLES = ["flipSplat", "flipCollider", "showCollider", "thirdPerson", "fly"] as const;
/** Deslizadores: id del <input> → clave del ajuste. */
const SLIDERS = { height: "height", speed: "speed", jump: "jumpMul" } as const;

type ToggleKey = (typeof TOGGLES)[number];
type SliderKey = (typeof SLIDERS)[keyof typeof SLIDERS];
export type PanelSettingKey = ToggleKey | SliderKey;

export interface PanelHandlers {
  /** Se llama después de escribir el nuevo valor en `settings`. */
  onSettingChange(key: PanelSettingKey): void;
  onReset(): void;
  onSplatFile(file: File): void;
  onColliderFile(file: File): void;
  /** JSON con los ajustes actuales, para el botón «Copiar ajustes». */
  exportSettings(): string;
}

export interface PanelView {
  settings: Settings;
  pointerLocked: boolean;
  hasCollider: boolean;
}

/** Panel de ajustes, mensajes de estado y HUD. Lee y escribe directamente en `settings`. */
export class Panel {
  private readonly status = byId("status");

  constructor(
    private readonly settings: Settings,
    handlers: PanelHandlers,
  ) {
    for (const key of TOGGLES) {
      byId<HTMLInputElement>(key).addEventListener("change", (e) => {
        this.settings[key] = (e.target as HTMLInputElement).checked;
        handlers.onSettingChange(key);
      });
    }
    for (const [id, key] of Object.entries(SLIDERS) as [string, SliderKey][]) {
      byId<HTMLInputElement>(id).addEventListener("input", (e) => {
        this.settings[key] = parseFloat((e.target as HTMLInputElement).value);
        handlers.onSettingChange(key);
      });
    }

    byId<HTMLInputElement>("splatInput").addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handlers.onSplatFile(file);
    });
    byId<HTMLInputElement>("colliderInput").addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handlers.onColliderFile(file);
    });

    // Quitar el foco a botones y casillas al usarlos, para que las teclas vuelvan a controlar la rata.
    byId<HTMLButtonElement>("resetBtn").addEventListener("click", (e) => {
      handlers.onReset();
      (e.currentTarget as HTMLElement).blur();
    });
    byId<HTMLButtonElement>("copyBtn").addEventListener("click", (e) => {
      (e.currentTarget as HTMLElement).blur();
      void this.copySettings(handlers.exportSettings());
    });
    for (const input of document.querySelectorAll<HTMLInputElement>("#panel input")) {
      input.addEventListener("change", () => input.blur());
    }
  }

  /** Refleja el estado actual en los controles, etiquetas, punto de mira e indicador de modo. */
  sync({ settings, pointerLocked, hasCollider }: PanelView): void {
    for (const key of TOGGLES) byId<HTMLInputElement>(key).checked = settings[key];
    for (const [id, key] of Object.entries(SLIDERS) as [string, SliderKey][]) {
      byId<HTMLInputElement>(id).value = String(settings[key]);
    }
    byId("heightVal").textContent = `${settings.height.toFixed(2)} m`;
    byId("speedVal").textContent = `${settings.speed.toFixed(1)} m/s`;
    byId("jumpVal").textContent = `${jumpHeight(settings).toFixed(2)} m`;
    byId("crosshair").style.display = pointerLocked && !settings.thirdPerson ? "block" : "none";

    const view = settings.thirdPerson ? "3ª PERSONA · " : "1ª PERSONA · ";
    const mode = settings.fly ? "VUELO (sin colisión)" : hasCollider ? "CAMINAR" : "VUELO (sin collider)";
    byId("modeBadge").textContent = view + mode;
  }

  setStatus(message: string, isError = false): void {
    this.status.textContent = message;
    this.status.classList.toggle("err", isError);
  }

  setSplatName(name: string): void {
    byId("splatName").textContent = name;
  }

  setColliderName(name: string): void {
    byId("colliderName").textContent = name;
  }

  /** Muestra la etiqueta de «escena incluida» con el título de scene.json. */
  showBundleNote(title?: string): void {
    const note = byId("bundleNote");
    note.hidden = false;
    if (title) note.textContent = title;
  }

  hideDropHint(): void {
    byId("dropHint").style.display = "none";
  }

  toggleVisible(): void {
    byId("panel").classList.toggle("hidden");
  }

  setPosition(x: number, y: number, z: number): void {
    byId("pos").textContent = `x ${x.toFixed(2)}  y ${y.toFixed(2)}  z ${z.toFixed(2)}`;
  }

  private async copySettings(json: string): Promise<void> {
    const box = byId<HTMLTextAreaElement>("configBox");
    box.value = json;
    box.hidden = false;
    box.select();
    try {
      await navigator.clipboard.writeText(json);
      this.setStatus("Ajustes copiados al portapapeles.");
    } catch {
      this.setStatus("Copia el texto del recuadro (Ctrl+C).");
    }
  }
}
