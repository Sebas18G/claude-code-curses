# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

`04-arkanoid` es uno de los ejercicios del monorepo `claude-code-curses` (ver `../README.md`), cuyo objetivo es un clon de Arkanoid en HTML, CSS y JavaScript vanilla, sin dependencias ni build. **Todavía no está implementado**: por ahora el repo solo contiene los assets del juego y el flujo de trabajo con el que se va a diseñar e implementar (ver más abajo). No existe `index.html`, `game.js` ni ningún otro código de juego aún.

Cuando se implemente, seguirá la misma convención sin build de los proyectos hermanos `02-asteroids` y `03-tetris` (mismo repositorio, un nivel arriba): todo el juego en unos pocos archivos planos (`index.html` + `style.css` + `game.js`), sin `package.json`, bundler ni transpilador.

## Flujo de trabajo: spec-driven

Este proyecto usa el método spec-driven a través de dos skills instalados en `.agents/skills/` (con symlinks en `.claude/skills/`): `spec` y `spec-impl` (origen: `Klerith/fernando-skills`, ver `skills-lock.json`). **Antes de escribir código de juego, revisa si ya existe una carpeta `specs/`** — si no existe, probablemente el trabajo debe empezar por `/spec`, no por editar archivos directamente.

- **`/spec <descripción>`** — diseña una spec de forma guiada: hace preguntas de clarificación por bloques y solo al final escribe `specs/NN-slug.md` en estado `Draft`. No escribe código.
- **`/spec-impl <NN-slug>`** — solo funciona si la spec está en estado `Approved` (o equivalente). Crea la rama `spec-NN-slug`, muestra el resumen de la spec y luego implementa el plan paso a paso, pausando tras cada paso para revisión. Nunca commitea automáticamente.

Los detalles completos del comportamiento de cada fase están en `.agents/skills/spec/SKILL.md` y `.agents/skills/spec-impl/SKILL.md` — léelos si vas a ejecutar estos flujos, no los repitas de memoria. El branching está controlado por `specs/.spec-config.yml` (`AutoCreateBranch`), que se crea con el primer `/spec`.

## Assets disponibles

`assets/assets/` contiene los recursos del juego (nota la carpeta duplicada `assets/assets/`, resultado de extraer un zip que ya traía una carpeta `assets` adentro; también hay basura de macOS en `assets/__MACOSX/` y un `.DS_Store` — no son parte del juego, solo ruido del zip original):

- `spritesheet-breakout.png` — hoja de sprites del juego (paddle, pelota, bloques de colores, frames de explosión).
- `spritesheet.js` — helper de carga y dibujo (`loadSpritesheet`, `drawSprite`, `drawFrame`) con las coordenadas ya mapeadas en `SPRITES` (`paddle`, `ball`, `blocks.<color>` para `gray|red|yellow|cyan|magenta|hotpink|green`) y `EXPLOSION_FRAMES` (4 frames por color, `EXPLOSION_DURATION = 150`ms). `drawSprite(ctx, name, x, y, w, h)` acepta nombres directos (`'paddle'`, `'ball'`) o prefijados `'block_<color>'`.
- `sounds/ball-bounce.mp3` y `sounds/break-sound.mp3` — efectos de sonido.

**Ojo:** `spritesheet.js` carga la imagen con la ruta relativa fija `'assets/spritesheet-breakout.png'` (línea `rawImg.src = ...`). Con la estructura actual (`assets/assets/spritesheet-breakout.png`), el juego deberá vivir en una carpeta desde la que esa ruta relativa resuelva correctamente (p. ej. copiando/moviendo estos archivos a `<carpeta-del-juego>/assets/` cuando se arme el proyecto), o habrá que ajustar la ruta. Esto es algo a decidir explícitamente en la spec (sección de datos/estructura de archivos), no a improvisar durante la implementación.

## Cómo ejecutar (una vez implementado)

Sin build. Basta con abrir `index.html` en el navegador o servirlo con un servidor estático, igual que el resto del monorepo:

```bash
python3 -m http.server 8000
# o, desde la raíz del monorepo
npx serve .
```

No hay tests automatizados, linter ni scripts de build configurados — ni en este proyecto ni en el resto del repositorio.
