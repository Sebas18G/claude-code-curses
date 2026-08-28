# SPEC 02 — Animación de explosión al romper bloques

> **Status:** implementado
> **Depends on:** SPEC 01
> **Date:** 2026-08-23
> **Objective:** Reemplazar la desaparición instantánea de los bloques por una animación de explosión de 4 frames usando `EXPLOSION_FRAMES`, sin agregar sonido.

## Scope

**In:**

- Al romper un bloque, en lugar de desaparecer al instante, se reproduce la animación de explosión de 4 frames correspondiente a su color (`EXPLOSION_FRAMES[color]`), en la misma posición y tamaño del bloque roto.
- La animación completa dura `EXPLOSION_DURATION` (150ms) en total, repartidos en partes iguales entre los 4 frames (~37.5ms cada uno).
- El bloque deja de participar en las colisiones desde el momento en que es golpeado (igual que ahora); la animación es puramente visual y no afecta la física de la pelota.
- El resto del juego sigue funcionando con normalidad mientras se reproduce una explosión: la pelota se sigue moviendo y se pueden golpear otros bloques en simultáneo (pueden coexistir varias explosiones a la vez en pantalla).
- Si el bloque roto es el último que queda, la pantalla de Victoria espera a que termine de reproducirse su animación de explosión antes de aparecer (en vez de aparecer en el mismo frame como ocurre hoy).
- El puntaje se suma en el momento del golpe (comportamiento actual), no al terminar la animación.

**Out of scope (for future specs):**

- Efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`) — sigue fuera de alcance según SPEC 01.
- Cualquier otro efecto visual (partículas, shake de cámara, etc.) que no sea la animación de `EXPLOSION_FRAMES` ya provista.
- Cambios a la velocidad de la pelota, puntaje o cualquier otra regla de juego.

## Data model

Extiende el `state` definido en SPEC 01 (no lo reemplaza), agregando un arreglo de explosiones activas y una bandera de victoria pendiente:

```js
const state = {
  // ...campos existentes de SPEC 01 (screen, lives, score, paddle, ball, blocks)
  explosions: [ /* { x, y, w, h, color, startTime } */ ],
  pendingVictory: false,
};
```

Conventions:

- `x, y, w, h` de cada explosión son los mismos del bloque roto (misma posición y tamaño en pantalla).
- `startTime` se toma con `performance.now()` en el momento del golpe.
- En cada frame del loop se calcula `elapsed = performance.now() - startTime`; el índice de frame a dibujar es `Math.min(3, Math.floor(elapsed / (EXPLOSION_DURATION / 4)))`. Cuando `elapsed >= EXPLOSION_DURATION`, la explosión se elimina de `state.explosions`.
- `state.pendingVictory` se pone en `true` cuando se rompe el último bloque vivo, en vez de cambiar `state.screen` directamente. `state.screen` pasa a `'victory'` recién cuando `pendingVictory` es `true` y `state.explosions.length === 0`.
- Al reiniciar la partida completa (Game Over o Victoria), `state.explosions` se vacía y `state.pendingVictory` vuelve a `false`, igual que el resto del estado.
- Perder una vida (sin reiniciar la partida completa) no toca `state.explosions`: las explosiones en curso siguen animándose con normalidad.

## Implementation plan

1. Agregar `explosions: []` y `pendingVictory: false` al `state` inicial y a `resetGame()` en `game.js`. Prueba manual: recargar la página, no hay errores en consola, el juego se ve igual que antes.
2. En `checkBlockCollisions()`, al golpear un bloque: además de `alive = false` y sumar el puntaje, hacer `push` de una explosión `{ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, startTime: performance.now() }` a `state.explosions`. Reemplazar el `state.screen = 'victory'` inmediato por `state.pendingVictory = true` cuando ya no queden bloques vivos. Prueba manual: romper un bloque en medio de la partida y ver en consola (`console.log` temporal o debugger) que se agrega una entrada a `state.explosions`.
3. Agregar una función `updateExplosions()` que recorra `state.explosions`, calcule el frame según `elapsed`, y elimine (filtre) las que ya superaron `EXPLOSION_DURATION`. Llamarla desde `loop()` cuando `state.screen === 'playing'`. Al final de esta función, si `state.pendingVictory` es `true` y `state.explosions.length === 0`, poner `state.screen = 'victory'`. Prueba manual: romper el último bloque y confirmar que la pantalla de Victoria tarda ~150ms en aparecer en vez de ser instantánea.
4. En `draw()`, dibujar cada explosión activa con `drawFrame(ctx, EXPLOSION_FRAMES[color][frameIndex], x, y, w, h)`, en el mismo lugar donde antes se dibujaba el bloque (el bloque ya no se dibuja porque `alive` es `false`). Prueba manual: romper bloques de distintos colores y ver la animación de 4 frames en la posición correcta antes de que desaparezca del todo.

## Acceptance criteria

- [x] Al golpear un bloque vivo, en su posición se reproduce una animación de 4 frames (`EXPLOSION_FRAMES[color]`) antes de desaparecer por completo, en vez de desaparecer instantáneamente.
- [x] La animación completa dura 150ms (`EXPLOSION_DURATION`) repartidos en 4 frames iguales.
- [x] El puntaje aumenta en `BLOCK_SCORE` en el momento del golpe, sin esperar a que termine la animación.
- [x] La pelota y el resto del juego siguen funcionando con normalidad mientras hay una o más explosiones en pantalla (no hay pausa).
- [x] Pueden verse varias explosiones simultáneas en pantalla si se rompe más de un bloque en un intervalo corto.
- [x] Al romper el último bloque, la pantalla de Victoria aparece recién cuando termina de reproducirse la animación de explosión de ese bloque, no en el mismo frame en que se rompe.
- [x] Reiniciar la partida (tras Game Over o Victoria) deja `state.explosions` vacío y no arrastra animaciones de la partida anterior.
- [x] El juego no reproduce ningún sonido asociado a la explosión.
- [x] Abrir `index.html` y jugar una partida completa no genera errores en la consola del navegador.

## Decisions

- **Yes:** `EXPLOSION_DURATION` (150ms) se interpreta como duración total de la animación de 4 frames (~37.5ms por frame), no como duración por frame. Razón: decisión explícita del usuario, coherente con el nombre de la constante.
- **Yes:** la pantalla de Victoria espera a que termine la explosión del último bloque antes de aparecer. Razón: decisión explícita del usuario para que la animación se alcance a ver en vez de quedar tapada por el overlay.
- **Yes:** el juego no se pausa mientras se reproducen explosiones; pueden coexistir varias en simultáneo. Razón: decisión explícita del usuario, mantiene el juego fluido.
- **No:** agregar sonido de explosión (`break-sound.mp3`). Razón: pedido explícito del usuario de que esta spec sea solo la animación visual.
- **No:** cambiar el momento en que se suma el puntaje (sigue siendo inmediato al golpe, no al terminar la animación). Razón: simplicidad, evita desincronizar el HUD del golpe real.

## What is **not** in this spec

- Efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- Otros efectos visuales además de `EXPLOSION_FRAMES` (partículas, shake, etc.).
- Cambios a las reglas de puntaje, vidas o velocidad de la pelota.

Cada uno de estos, si se implementa, va en su propio spec.
