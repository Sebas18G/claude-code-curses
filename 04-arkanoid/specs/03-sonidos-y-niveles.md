# SPEC 03 — Sonidos y sistema de niveles

> **Status:** implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-23
> **Objective:** Agregar efectos de sonido de rebote y rotura de bloques, y un sistema de 15 niveles con velocidad creciente, patrón de color por fila y bloques irrompibles nuevos.

## Scope

**In:**

- Reproducir `assets/sounds/ball-bounce.mp3` en todo rebote de la pelota: paredes izquierda/derecha/superior, paddle, y cualquier bloque (rompible o irrompible).
- Reproducir `assets/sounds/break-sound.mp3` en el momento exacto en que se rompe un bloque rompible (mismo instante en que se suma `BLOCK_SCORE`), no en bloques irrompibles.
- Los sonidos pueden solaparse libremente si ocurren varios eventos casi al mismo tiempo (ej. romper dos bloques en el mismo frame). Sin control de volumen ni mute en el HUD.
- Copiar `assets/assets/sounds/ball-bounce.mp3` y `assets/assets/sounds/break-sound.mp3` a `assets/sounds/` junto al resto de los assets del juego (mismo patrón que SPEC 01 con el spritesheet).
- Sistema de 15 niveles (`MAX_LEVEL = 15`), calculados por fórmula a partir de `state.level` (sin un array de configuración por nivel):
  - **Filas de bloques:** `rowsForLevel(level) = min(6 + floor((level - 1) / 3), 10)`. 10 columnas fijas siempre.
  - **Velocidad de la pelota:** `speedMultiplierForLevel(level) = 1 + 0.08 * (level - 1)`, aplicado a `vx`/`vy` iniciales de cada nivel, sin tope.
  - **Cantidad de bloques irrompibles:** `indestructibleCountForLevel(level) = min(level - 1, 8)`. Nivel 1 no tiene ninguno.
  - **Patrón de color:** cada fila de bloques rompibles usa un único color, asignado cíclicamente con `BLOCK_COLORS[row % BLOCK_COLORS.length]`, reemplazando el color aleatorio por bloque de SPEC 01.
- `BLOCK_COLORS` pasa a tener 6 colores (`red, yellow, cyan, magenta, hotpink, green`); se quita `gray`, cuyo sprite (`sx=32, sy=288`) se reutiliza como una de las 4 texturas de bloque irrompible.
- 4 texturas nuevas de bloque irrompible, mapeadas en `SPRITES.indestructible` (`spritesheet.js`): `wood` (`sx=32,sy=272`), `brick_red` (`sx=64,sy=272`), `stone` (`sx=32,sy=288`), `brick_dark` (`sx=64,sy=288`). Cada bloque irrompible generado elige una de las 4 al azar.
- Los bloques irrompibles se ubican en posiciones aleatorias de la cuadrícula del nivel (entre los bloques rompibles), nunca se rompen, no otorgan puntaje, y la pelota rebota contra ellos igual que contra un bloque normal (misma física, mismo sonido de rebote, sin sonido de rotura).
- Al romper todos los bloques rompibles de un nivel que no es el último, se muestra una pantalla "NIVEL X COMPLETADO" (mismo estilo visual que Game Over/Victoria) que espera Enter/Espacio para avanzar al siguiente nivel, conservando vidas y puntaje; los bloques irrompibles del nivel completado desaparecen al generarse el nuevo nivel.
- Al romper todos los bloques rompibles del nivel 15 (último), se muestra la pantalla de Victoria ya existente (SPEC 01/02) en vez de "Nivel completado".
- HUD muestra `NIVEL X / 15` junto a puntaje y vidas.
- Reiniciar la partida completa (tras Game Over o Victoria) vuelve a nivel 1 con velocidad, filas y cantidad de irrompibles reseteados a sus valores iniciales.

**Out of scope (for future specs):**

- Control de volumen o mute en el HUD.
- Pantalla de inicio para garantizar el gesto de usuario que habilita audio en el navegador.
- Sonido para los eventos de "Nivel completado", Victoria o Game Over (solo existen los dos archivos de audio ya provistos).
- Niveles infinitos o generados proceduralmente más allá del 15.
- Patrones de bloques únicos por nivel (layouts a mano); todo se deriva de las fórmulas descritas arriba.
- Power-ups u otras mecánicas adicionales.

## Data model

Extiende el `state` de SPEC 01/02 (no lo reemplaza):

```js
const state = {
  // ...campos existentes (screen, lives, score, paddle, ball, blocks, explosions, pendingVictory)
  level: 1,
  pendingLevelComplete: false,
};

const MAX_LEVEL = 15;
const BLOCK_COLORS = [ 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ]; // 'gray' se quita, ver Decisions
const INDESTRUCTIBLE_TEXTURES = [ 'wood', 'brick_red', 'stone', 'brick_dark' ];
```

Cada entrada de `state.blocks` gana un campo `breakable`:

```js
// bloque rompible (igual que antes + breakable: true)
{ row, col, x, y, w, h, alive: true, breakable: true, color: 'red' }

// bloque irrompible (nuevo)
{ row, col, x, y, w, h, alive: true, breakable: false, texture: 'stone' }
```

Conventions:

- `screen` gana un valor posible más: `'playing' | 'gameover' | 'victory' | 'levelcomplete'`.
- Un bloque irrompible (`breakable: false`) nunca pasa `alive` a `false`; se dibuja siempre con `drawSprite('indestructible_<texture>', ...)`.
- La condición de "nivel/partida completa" se evalúa solo sobre bloques rompibles: `state.blocks.filter(b => b.breakable).every(b => !b.alive)`.
- Al cumplirse esa condición: si `state.level === MAX_LEVEL`, se activa `state.pendingVictory = true` (igual que SPEC 02); si no, se activa `state.pendingLevelComplete = true`. Ambas banderas esperan a que `state.explosions` quede vacío antes de cambiar `state.screen` (mismo mecanismo que SPEC 02 para `pendingVictory`).
- Avanzar de nivel (tecla Enter/Espacio en pantalla `'levelcomplete'`): `state.level += 1`, `state.blocks = generateBlocks(state.level)`, `state.explosions = []`, `state.pendingLevelComplete = false`, `resetPositions()` aplicando `speedMultiplierForLevel(state.level)` a la velocidad inicial de la pelota, `state.screen = 'playing'`. `state.score` y `state.lives` no se tocan.
- Reiniciar la partida completa (Game Over o Victoria) resetea `state.level = 1` además de los campos ya reseteados en SPEC 01/02.
- Perder una vida dentro de un nivel no toca `state.blocks` (ni los rompibles ya rotos ni los irrompibles), igual que en SPEC 01/02.
- `SPRITES.indestructible` (nuevo en `spritesheet.js`) sigue la misma forma que `SPRITES.blocks`: `{ texture: { sx, sy, sw: 32, sh: 16 } }`.

## Implementation plan

1. Copiar `assets/assets/sounds/ball-bounce.mp3` y `assets/assets/sounds/break-sound.mp3` a `assets/sounds/` junto al `index.html` del juego. Prueba manual: los archivos existen en la carpeta nueva, el juego se ve y funciona igual que antes (sin cambios de código todavía).
2. Agregar un helper `playSound(name)` en `game.js` que cree una nueva instancia de `Audio` por llamada (permite solapamiento) y llame a `.play().catch(() => {})`. Llamarlo con `'bounce'` en cada rebote dentro de `updateBall()` (paredes, paddle) y en `checkBlockCollisions()` en cualquier colisión con un bloque; llamar además con `'break'` en `checkBlockCollisions()` cuando el bloque golpeado se rompe. Prueba manual: jugar y confirmar que se escucha el sonido de rebote en paredes/paddle/bloques y el de rotura al romper un bloque.
3. En `spritesheet.js`: agregar `SPRITES.indestructible` con los 4 sprites (`wood`, `brick_red`, `stone`, `brick_dark`), quitar `gray` de `SPRITES.blocks` y de `EXPLOSION_FRAMES`, y extender `drawSprite()` para soportar el prefijo `'indestructible_'` (mismo mecanismo que `'block_'`). En `game.js`, quitar `'gray'` de `BLOCK_COLORS`. Prueba manual: recargar la página, sin errores en consola; ya no aparecen bloques grises al azar entre los 6 colores restantes.
4. Agregar `level: 1` y `pendingLevelComplete: false` al `state` inicial y a `resetGame()`. Implementar `rowsForLevel()`, `indestructibleCountForLevel()` y `speedMultiplierForLevel()`. Reescribir `generateBlocks()` para recibir `level`, generar `rowsForLevel(level) * 10` bloques con color cíclico por fila, elegir `indestructibleCountForLevel(level)` celdas al azar y convertirlas en irrompibles con textura aleatoria de `INDESTRUCTIBLE_TEXTURES`. Aplicar `speedMultiplierForLevel(state.level)` a `vx`/`vy` en `resetPositions()`. Prueba manual: recargar la página, el nivel 1 se ve igual que antes (6 filas, sin bloques irrompibles, velocidad base).
5. En `checkBlockCollisions()`, distinguir bloque rompible de irrompible: solo el rompible pasa `alive = false`, suma puntaje y agrega una explosión; el irrompible solo rebota (sin tocar `alive`, sin explosión, sin puntaje). Cambiar la condición de fin de nivel para evaluar solo bloques rompibles y activar `pendingVictory` o `pendingLevelComplete` según `state.level === MAX_LEVEL`. Prueba manual: romper todos los bloques rompibles del nivel 1 y ver que la partida pasa a `'levelcomplete'` (o a `'victory'` si `MAX_LEVEL` fuera 1, no es el caso).
6. En `updateExplosions()`, manejar también `pendingLevelComplete` (mismo mecanismo que `pendingVictory`: cuando `state.explosions.length === 0`, pasar `state.screen = 'levelcomplete'`). Agregar `drawLevelCompleteScreen()` (mismo estilo que `drawGameOverScreen`/`drawVictoryScreen`, texto `"NIVEL X COMPLETADO"` y `"Presiona Enter o Espacio para continuar"`) y llamarla desde `draw()` cuando `state.screen === 'levelcomplete'`. En el listener de `keydown`, agregar el caso `state.screen === 'levelcomplete'` con Enter/Espacio para avanzar de nivel (incrementar `state.level`, regenerar bloques, resetear posiciones con la nueva velocidad, volver a `'playing'`), separado del caso existente que hace reinicio completo en Game Over/Victoria. Prueba manual: romper todos los bloques rompibles del nivel 1, ver el overlay "NIVEL 2 COMPLETADO", presionar Enter y confirmar que arranca el nivel 2 con vidas y puntaje conservados.
7. En `draw()`, dibujar los bloques irrompibles vivos con `drawSprite('indestructible_' + block.texture, ...)` junto a los bloques rompibles. Agregar `NIVEL {state.level} / {MAX_LEVEL}` a `drawHUD()`. Prueba manual: se ven los bloques irrompibles con su textura correspondiente y el HUD muestra el nivel actual en todo momento.
8. Jugar una partida completa desde el nivel 1 hasta el nivel 15 (o forzar `state.level` temporalmente para probar rápido) y confirmar velocidad creciente, filas crecientes, cantidad de irrompibles creciente con tope 8, y que el nivel 15 muestra Victoria en vez de "Nivel completado". Prueba manual: partida completa sin errores en consola.

## Acceptance criteria

- [x] Al rebotar la pelota contra cualquier pared, el paddle, o un bloque (rompible o irrompible) se reproduce `ball-bounce.mp3`.
- [x] Al romper un bloque rompible se reproduce además `break-sound.mp3`, en el mismo momento en que se suma `BLOCK_SCORE`.
- [x] Los sonidos pueden solaparse: romper dos bloques casi al mismo tiempo no corta el sonido del primero.
- [x] Los bloques irrompibles nunca desaparecen: la pelota rebota contra ellos indefinidamente sin sumar puntaje ni reproducir `break-sound.mp3`.
- [x] El nivel 1 no tiene bloques irrompibles y tiene 6 filas de 10 columnas (60 bloques), igual que SPEC 01.
- [x] A partir del nivel 2 aparece una cantidad creciente de bloques irrompibles (`nivel - 1`, tope 8 desde el nivel 9).
- [x] La cantidad de filas crece de 6 (niveles 1-3) a 10 (niveles 13-15) según `rowsForLevel()`, manteniendo 10 columnas.
- [x] La velocidad inicial de la pelota de cada nivel es un 8% mayor que la del nivel anterior, sin tope.
- [x] Cada fila de bloques rompibles tiene un único color, asignado cíclicamente entre los 6 colores de `BLOCK_COLORS`.
- [x] Al romper todos los bloques rompibles de un nivel que no es el 15, aparece "NIVEL X COMPLETADO" y el juego espera Enter/Espacio para avanzar, conservando vidas y puntaje.
- [x] Al romper todos los bloques rompibles del nivel 15 aparece la pantalla de Victoria existente, no "Nivel completado".
- [x] Reiniciar la partida completa (tras Game Over o Victoria) vuelve al nivel 1 con velocidad, filas y bloques irrompibles reseteados.
- [x] Perder una vida dentro de un nivel conserva los bloques rompibles ya rotos y los irrompibles ya generados; solo reinicia posición de pelota y paddle.
- [x] No hay control de volumen ni de mute visible en el HUD.
- [x] Abrir `index.html` y jugar una partida completa (varios niveles, romper bloques, perder vidas) no genera errores en la consola.

## Decisions

- **Yes:** los sonidos se solapan libremente (una instancia de `Audio` por reproducción). Razón: decisión explícita del usuario, simétrico con que ya pueden coexistir varias explosiones visuales (SPEC 02).
- **No:** control de volumen o mute en el HUD. Razón: decisión explícita del usuario de mantener el scope mínimo.
- **No:** pantalla de inicio para garantizar el gesto de usuario que habilita audio. Razón: el juego ya requiere mover el paddle (teclado o mouse) antes de que ocurra el primer rebote, lo cual cuenta como gesto; los fallos de autoplay se ignoran silenciosamente (`.catch(() => {})`).
- **Yes:** quitar `'gray'` de `BLOCK_COLORS` y reutilizar su sprite (`sx=32,sy=288`) como una de las 4 texturas irrompibles. Razón: decisión explícita del usuario; evita que un bloque irrompible sea visualmente idéntico a un bloque rompible gris existente.
- **Yes:** las 4 texturas irrompibles (`wood`, `brick_red`, `stone`, `brick_dark`) se eligen al azar por bloque, no una fija. Razón: decisión explícita del usuario para dar variedad visual.
- **Yes:** filas, velocidad y cantidad de irrompibles se calculan con fórmulas a partir de `state.level`, sin un array `LEVELS` con configuración por nivel. Razón: las diferencias acordadas entre niveles son puramente numéricas, no requieren contenido único por nivel.
- **Yes:** patrón de color "una fila = un color" cíclico, reemplazando el color aleatorio por bloque de SPEC 01. Razón: decisión explícita del usuario, look clásico de Arkanoid.
- **Yes:** la pantalla "Nivel completado" espera Enter/Espacio (no avanza sola por tiempo). Razón: decisión explícita del usuario, consistente con Game Over y Victoria ya existentes.
- **No:** sonido para "Nivel completado", Victoria o Game Over. Razón: solo existen los dos archivos de audio provistos (`ball-bounce.mp3`, `break-sound.mp3`); agregar sonidos nuevos no provistos queda fuera de esta spec.
- **No:** extender `drawSprite()`/`SPRITES` de forma que rompa la firma o el uso actual de `'block_<color>'`. Razón: se agrega el prefijo `'indestructible_<texture>'` como un caso nuevo, sin modificar el comportamiento existente.

## What is **not** in this spec

- Control de volumen o mute en el HUD.
- Pantalla de inicio para el gesto de usuario de audio.
- Sonido para "Nivel completado", Victoria o Game Over.
- Niveles infinitos o procedurales más allá del 15.
- Layouts de bloques únicos por nivel definidos a mano.
- Power-ups u otras mecánicas adicionales.

Cada uno de estos, si se implementa, va en su propio spec.
