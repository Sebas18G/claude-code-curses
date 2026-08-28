# SPEC 01 — MVP jugable de Arkanoid

> **Status:** implementado
> **Depends on:** (ninguno)
> **Date:** 2026-08-23
> **Objective:** Implementar el primer MVP jugable de Arkanoid: paddle, pelota, un nivel fijo de bloques, vidas, puntaje y pantallas de fin de partida.

## Scope

**In:**

- Canvas de 800x600 px en `index.html`.
- Paddle controlado por teclado (flechas y/o A/D) y por mouse de forma simultánea.
- Pelota que rebota en las paredes izquierda, derecha y superior, y en el paddle.
- Un único nivel fijo: cuadrícula de 10 columnas x 6 filas (60 bloques), con color asignado al azar por bloque entre los 7 colores disponibles en `SPRITES.blocks` (`gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`).
- Sistema de 3 vidas. Al perder una vida se reinicia la posición de la pelota y el paddle, pero se conserva el progreso de bloques ya rotos.
- Puntaje visible en pantalla, sin persistencia entre sesiones.
- Pantalla de Game Over al llegar a 0 vidas, con opción de reiniciar la partida completa (vidas, puntaje y bloques).
- Pantalla de Victoria al romper los 60 bloques, con opción de reiniciar la partida completa.
- Copiar `assets/assets/spritesheet-breakout.png` y `assets/assets/spritesheet.js` a una carpeta `assets/` nueva junto al `index.html` del juego, sin modificar `spritesheet.js`.
- Estilo visual arcade clásico (agregado tras el MVP inicial, referencia: captura de pantalla `Captura de pantalla 2026-08-23 211623.png` provista por el usuario): marco/bezel oscuro alrededor del área de juego, fondo azul texturizado (patrón diagonal tipo "quilted") dentro del canvas, y HUD de puntaje/vidas con tipografía monoespaciada en mayúsculas al estilo arcade. No incluye `HIGH SCORE` ni persistencia de puntaje más alto (sigue fuera de alcance, ver sección de fuera de alcance).

**Out of scope (for future specs):**

- Efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- Persistencia de high score (localStorage u otro mecanismo).
- Pantalla de inicio (Start) y pausa.
- Animación de explosión de bloques (`EXPLOSION_FRAMES` / `EXPLOSION_DURATION`).
- Múltiples niveles o progresión entre niveles.
- Power-ups u otras mecánicas adicionales.

## Data model

```js
// Estado global del juego (game.js)
const state = {
  screen: 'playing', // 'playing' | 'gameover' | 'victory'
  lives: 3,
  score: 0,
  paddle: { x: 350, y: 570, w: 100, h: 16 },
  ball: { x: 400, y: 300, vx: 4, vy: -4, r: 8 },
  blocks: [ /* { row, col, x, y, w, h, color, alive: true } */ ],
};

const BLOCK_COLORS = ['gray', 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];
const GRID_COLS = 10;
const GRID_ROWS = 6;
const BLOCK_SCORE = 10;
```

Convenciones:

- Origen de coordenadas: esquina superior izquierda del canvas (800x600).
- `blocks` se genera una sola vez al iniciar/reiniciar la partida: `GRID_COLS * GRID_ROWS` = 60 entradas, cada una con un color elegido al azar de `BLOCK_COLORS` y `alive: true`.
- Perder una vida solo reinicia `paddle` y `ball` a sus valores iniciales; el arreglo `blocks` no se toca.
- Reiniciar tras Game Over o Victoria regenera `state` completo (vidas, puntaje y `blocks` nuevos).
- El control de paddle por teclado y por mouse escriben ambos sobre `state.paddle.x` (clamped a `[0, 800 - state.paddle.w]`); no hay lógica de prioridad entre ellos, gana el último input procesado.

## Implementation plan

1. Crear `index.html` (canvas 800x600), `style.css` y `game.js` con un esqueleto vacío. Copiar `assets/assets/spritesheet-breakout.png` y `assets/assets/spritesheet.js` a una carpeta `assets/` nueva junto a `index.html`. Enlazar `assets/spritesheet.js` y `game.js` desde `index.html`. Prueba manual: abrir `index.html`, ver el canvas vacío sin errores en consola.
2. Implementar `loadSpritesheet` + game loop base con `requestAnimationFrame` que dibuja el paddle estático centrado en la parte inferior usando `drawSprite`. Prueba manual: se ve el paddle en pantalla.
3. Implementar el control del paddle: teclado (flechas y/o A/D) y mouse (`mousemove`), ambos actualizando `state.paddle.x` con clamp a los bordes del canvas. Prueba manual: mover el paddle con teclado y con el mouse.
4. Implementar la pelota: posición inicial sobre el paddle, movimiento con velocidad constante y rebote en las paredes izquierda, derecha y superior. Prueba manual: la pelota rebota en las paredes.
5. Implementar la colisión pelota-paddle (rebote) y la pérdida de vida cuando la pelota cae debajo del paddle (resta 1 vida, reinicia posición de pelota y paddle). Prueba manual: dejar caer la pelota y ver que resta una vida y se reinicia la posición.
6. Generar la cuadrícula de 60 bloques (10x6, color aleatorio por bloque) y dibujarla con `drawSprite('block_<color>', ...)`. Prueba manual: se ven los 60 bloques coloreados al cargar la página.
7. Implementar la colisión pelota-bloque: al golpear un bloque vivo, este pasa a `alive: false` (deja de dibujarse), se suma `BLOCK_SCORE` al puntaje y la pelota rebota. Prueba manual: romper bloques y ver que el puntaje sube y los bloques desaparecen.
8. Implementar el HUD de puntaje y vidas restantes, visible en todo momento sobre el canvas. Prueba manual: el HUD se actualiza en tiempo real al perder vidas o romper bloques.
9. Implementar la pantalla de Game Over al llegar a 0 vidas, con opción de reiniciar la partida completa. Prueba manual: perder las 3 vidas y confirmar que la pantalla aparece y el botón/tecla de reinicio regenera el estado completo.
10. Implementar la pantalla de Victoria al romper los 60 bloques, con opción de reiniciar la partida completa. Prueba manual: romper todos los bloques y confirmar que la pantalla aparece y el reinicio funciona.
11. Agregar el estilo visual arcade: marco/bezel oscuro alrededor del canvas (CSS), fondo azul texturizado dentro del área de juego (dibujado en `game.js`) y tipografía monoespaciada en mayúsculas para el HUD de puntaje/vidas. Prueba manual: el canvas se ve enmarcado, con fondo azul texturizado detrás de bloques/paddle/pelota, y el HUD con el nuevo estilo.

## Acceptance criteria

- [x] Abrir `index.html` no genera errores en la consola del navegador.
- [x] El paddle se mueve con las flechas del teclado (y/o A/D) y con el movimiento del mouse.
- [x] La pelota rebota en las paredes izquierda, derecha y superior del canvas.
- [x] La pelota rebota al tocar el paddle.
- [x] Al caer la pelota por debajo del paddle se resta una vida y se reinicia la posición de pelota y paddle sin borrar los bloques ya rotos.
- [x] El nivel muestra una cuadrícula de 10 columnas x 6 filas (60 bloques) con colores asignados al azar entre los 7 disponibles en `SPRITES.blocks`.
- [x] Al golpear un bloque vivo, este desaparece inmediatamente y el puntaje aumenta en `BLOCK_SCORE`.
- [x] El puntaje y las vidas restantes se muestran en pantalla en todo momento durante la partida.
- [x] Al llegar a 0 vidas se muestra la pantalla de Game Over con una opción que reinicia la partida completa (vidas, puntaje y bloques).
- [x] Al romper los 60 bloques se muestra la pantalla de Victoria con una opción que reinicia la partida completa.
- [x] El juego no reproduce ningún sonido ni muestra pantalla de inicio o de pausa.
- [x] El canvas tiene un marco/bezel oscuro visible y un fondo azul texturizado dentro del área de juego; el HUD de puntaje/vidas usa tipografía monoespaciada en mayúsculas, sin mostrar `HIGH SCORE` ni persistir puntaje.

## Decisions

- **Yes:** copiar `spritesheet-breakout.png` y `spritesheet.js` a una carpeta `assets/` nueva junto a `index.html`, sin modificar el helper. Razón: `spritesheet.js` carga la imagen con la ruta relativa fija `'assets/spritesheet-breakout.png'`; copiar los archivos evita tocar código ya provisto.
- **No:** usar los sonidos de `assets/assets/sounds/`. Razón: decisión explícita del usuario de dejar el audio fuera de este MVP.
- **Yes:** controles de teclado y mouse simultáneos sobre el mismo `state.paddle.x`. Razón: pedido explícito del usuario; ambos escriben la misma propiedad y no requieren lógica de prioridad.
- **Yes:** un solo nivel fijo de 10x6 bloques con color aleatorio por bloque. Razón: MVP simple, sin necesidad de un sistema de niveles ni de patrones de color por fila.
- **No:** pantalla de inicio (Start) ni pausa. Razón: decisión explícita de que el juego arranque jugable de inmediato al cargar la página.
- **No:** animación de explosión con `EXPLOSION_FRAMES`. Razón: decisión explícita de simplicidad; el bloque desaparece directo al ser golpeado.
- **No:** persistencia de high score. Razón: decisión explícita de mostrar el puntaje solo en pantalla, sin localStorage.
- **Yes:** conservar el progreso de bloques rotos al perder una vida (solo se reinician pelota y paddle). Razón: decisión explícita para no frustrar al jugador reiniciando el nivel completo en cada vida perdida.
- **Yes:** agregar estilo visual arcade (marco, fondo azul texturizado, HUD monoespaciado) como parte de este MVP, agregado a mitad de implementación a pedido explícito del usuario con referencia visual. Razón: pedido explícito del usuario sobre la implementación ya en curso en la rama `spec-01-mvp-jugable`.
- **No:** replicar el `HIGH SCORE` de la imagen de referencia ni su persistencia. Razón: sigue fuera de alcance según decisión previa de este MVP; solo se imita el estilo tipográfico/visual del HUD existente (puntaje y vidas).

## What is **not** in this spec

- Efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- Persistencia de high scores.
- Pantalla de inicio y pausa.
- Animación de explosión de bloques (`EXPLOSION_FRAMES`).
- Múltiples niveles o progresión.
- Power-ups u otras mecánicas adicionales.

Cada uno de estos, si se implementa, va en su propio spec.
