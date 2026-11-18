# Paseo de la rata — visor de Gaussian Splats con colisiones

Visor web para recorrer un Gaussian Splat con una rata controlable que camina sobre una malla de colisión.

**Demo:** https://bitsatoms.github.io/splat-mesh-demo/

Controles: clic en la escena para capturar el ratón · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> mover ·
<kbd>Shift</kbd> correr · <kbd>Espacio</kbd> saltar · <kbd>V</kbd> 1ª/3ª persona · rueda zoom · <kbd>F</kbd> vuelo ·
<kbd>C</kbd> ver collider · <kbd>R</kbd> volver al inicio · <kbd>P</kbd> fijar inicio aquí · <kbd>H</kbd> ocultar panel.

Desde el panel (o arrastrando a la ventana) se puede cargar otro splat (`.spz`, `.ply`, `.splat`, `.ksplat`, `.sog`)
y otro collider (`.glb`/`.gltf`, sin compresión Draco). Se leen en el navegador: no se suben ni se guardan en ningún sitio.

## Desarrollo

Requisitos: [Node.js](https://nodejs.org/) 24 o superior.

```sh
npm install       # una vez
npm run dev       # servidor local con recarga automática → http://localhost:5173
npm run build     # comprueba tipos y genera dist/
npm run preview   # sirve dist/ para probar el build
```

Librerías: [three.js](https://threejs.org/), [Spark](https://sparkjs.dev/) (render de splats) y
[three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) (colisiones). Las versiones están fijadas en `package.json`.

## Estructura

```
index.html                 Marcado del panel y HUD
public/                    Se copia tal cual al build
  scene.json               Escena que se carga al abrir la página
  scenes/aulestia/         Splat (en dos partes) y collider de la escena incluida
src/
  main.ts                  Punto de entrada
  app.ts                   Conecta los módulos: carga, acciones, bucle principal
  config.ts                Ajustes por defecto y constantes de física/cámara
  state.ts                 Estado del juego (jugador, cámara, punto de inicio)
  core/viewer.ts           Renderer, escena, cámara, luces
  world/splat-layer.ts     Carga y orientación del splat (Spark)
  world/collider-layer.ts  GLB → geometría única + BVH, raycasts, malla de alambre
  scene/                   scene.json, descargas con progreso, importar/exportar ajustes
  player/                  Teclado/ratón, física al caminar y en vuelo, cámara 1ª/3ª persona
  character/               Modelo de la rata, su animación y su sombra
  ui/                      Panel de ajustes y zona para soltar archivos
```

## Cambiar la escena incluida

Pon los archivos en `public/scenes/<nombre>/` y apunta a ellos en `public/scene.json`:

```json
{
  "title": "Escena: Aulestia",
  "splat": ["scenes/aulestia/aulestia.part1.spz", "scenes/aulestia/aulestia.part2.spz"],
  "splatName": "aulestia.spz",
  "collider": "scenes/aulestia/collider.glb",
  "settings": { "height": 0.12, "speed": 2.1, "spawn": [4.158, -0.017, 1.926], "yaw": 2.371, "pitch": -0.444 }
}
```

- `splat` admite un archivo o una lista de partes que se concatenan. GitHub rechaza archivos de más de 100 MB.
- `splatName` debe llevar la extensión real: Spark la usa para detectar el formato.
- `settings` acepta lo que copia el botón **Copiar ajustes** del panel.

## Despliegue

Cada push a `main` ejecuta `.github/workflows/deploy.yml`, que compila y publica `dist/` en GitHub Pages
(Settings → Pages → Source: **GitHub Actions**).
