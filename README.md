# Paseo de la rata — escena Aulestia

Visor web para recorrer un Gaussian Splat con colisiones y una rata controlable.
Abre `index.html` desde un servidor web (GitHub Pages, Netlify, etc.). Con doble clic en local no carga la escena incluida.

Controles: clic en la escena para capturar el ratón · WASD mover · Shift correr · Espacio saltar ·
V 1ª/3ª persona · rueda zoom · F vuelo · R volver al inicio · H ocultar panel.

Archivos:
- `index.html` — visor (three.js + Spark + three-mesh-bvh, todo incluido)
- `scene.json` — qué cargar y ajustes por defecto
- `aulestia.part1.spz`, `aulestia.part2.spz` — splat partido en dos (<25 MB cada uno, para poder subirlo desde la web de GitHub)
- `collider.glb` — malla de colisión (sin texturas)
