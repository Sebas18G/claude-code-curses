const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const BG_COLOR = '#1414a0';

const SOUNDS = {
  bounce: 'assets/sounds/ball-bounce.mp3',
  break: 'assets/sounds/break-sound.mp3',
};

function playSound( name ) {
  const audio = new Audio( SOUNDS[ name ] );
  audio.play().catch( () => {} );
}

const BLOCK_COLORS = [ 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ];
const INDESTRUCTIBLE_TEXTURES = [ 'wood', 'brick_red', 'stone', 'brick_dark' ];
const GRID_COLS = 10;
const BLOCK_SCORE = 10;
const MAX_LEVEL = 15;

function rowsForLevel( level ) {
  return Math.min( 6 + Math.floor( ( level - 1 ) / 3 ), 10 );
}

function indestructibleCountForLevel( level ) {
  return Math.min( level - 1, 8 );
}

function speedMultiplierForLevel( level ) {
  return 1 + 0.08 * ( level - 1 );
}

const BLOCK_W = 76;
const BLOCK_H = 24;
const BLOCK_GAP = 4;
const BLOCK_MARGIN_X = 2;
const BLOCK_MARGIN_TOP = 60;

const INITIAL_PADDLE = { x: 350, y: 570, w: 100, h: 16 };
const INITIAL_BALL = { x: 400, y: 300, vx: 4, vy: -4, r: 8 };

const state = {
  screen: 'playing', // 'playing' | 'gameover' | 'victory' | 'levelcomplete'
  lives: 3,
  score: 0,
  level: 1,
  paddle: { ...INITIAL_PADDLE },
  ball: { ...INITIAL_BALL },
  blocks: [], // { row, col, x, y, w, h, alive, breakable, color? } | { ..., breakable: false, texture }
  explosions: [], // { x, y, w, h, color, startTime }
  pendingVictory: false,
  pendingLevelComplete: false,
};

function resetPositions() {
  state.paddle = { ...INITIAL_PADDLE };
  const speedMul = speedMultiplierForLevel( state.level );
  state.ball = {
    ...INITIAL_BALL,
    vx: INITIAL_BALL.vx * speedMul,
    vy: INITIAL_BALL.vy * speedMul,
  };
}

function advanceLevel() {
  state.level += 1;
  state.blocks = generateBlocks( state.level );
  state.explosions = [];
  state.pendingLevelComplete = false;
  resetPositions();
  state.screen = 'playing';
}

function resetGame() {
  state.lives = 3;
  state.score = 0;
  state.level = 1;
  state.blocks = generateBlocks( state.level );
  state.explosions = [];
  state.pendingVictory = false;
  state.pendingLevelComplete = false;
  state.screen = 'playing';
  resetPositions();
}

function generateBlocks( level ) {
  const rows = rowsForLevel( level );
  const blocks = [];
  for ( let row = 0; row < rows; row++ ) {
    for ( let col = 0; col < GRID_COLS; col++ ) {
      blocks.push( {
        row,
        col,
        x: BLOCK_MARGIN_X + col * ( BLOCK_W + BLOCK_GAP ),
        y: BLOCK_MARGIN_TOP + row * ( BLOCK_H + BLOCK_GAP ),
        w: BLOCK_W,
        h: BLOCK_H,
        alive: true,
        breakable: true,
        color: BLOCK_COLORS[ row % BLOCK_COLORS.length ],
      } );
    }
  }

  const remainingIndices = blocks.map( ( _, i ) => i );
  const indestructibleCount = indestructibleCountForLevel( level );
  for ( let i = 0; i < indestructibleCount; i++ ) {
    const pick = Math.floor( Math.random() * remainingIndices.length );
    const blockIndex = remainingIndices.splice( pick, 1 )[ 0 ];
    const block = blocks[ blockIndex ];
    block.breakable = false;
    delete block.color;
    block.texture = INDESTRUCTIBLE_TEXTURES[ Math.floor( Math.random() * INDESTRUCTIBLE_TEXTURES.length ) ];
  }

  return blocks;
}

state.blocks = generateBlocks( state.level );

const PADDLE_SPEED = 7;
const keys = { left: false, right: false };

function clampPaddleX( x ) {
  return Math.max( 0, Math.min( canvas.width - state.paddle.w, x ) );
}

window.addEventListener( 'keydown', ( e ) => {
  if ( e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ) keys.left = true;
  if ( e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ) keys.right = true;
  if ( ( state.screen === 'gameover' || state.screen === 'victory' ) && ( e.key === 'Enter' || e.key === ' ' ) ) {
    resetGame();
  }
  if ( state.screen === 'levelcomplete' && ( e.key === 'Enter' || e.key === ' ' ) ) {
    advanceLevel();
  }
} );

window.addEventListener( 'keyup', ( e ) => {
  if ( e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ) keys.left = false;
  if ( e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ) keys.right = false;
} );

canvas.addEventListener( 'mousemove', ( e ) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  state.paddle.x = clampPaddleX( mouseX - state.paddle.w / 2 );
} );

function updatePaddle() {
  if ( keys.left ) state.paddle.x = clampPaddleX( state.paddle.x - PADDLE_SPEED );
  if ( keys.right ) state.paddle.x = clampPaddleX( state.paddle.x + PADDLE_SPEED );
}

function updateBall() {
  const b = state.ball;
  b.x += b.vx;
  b.y += b.vy;

  if ( b.x - b.r <= 0 ) {
    b.x = b.r;
    b.vx *= -1;
    playSound( 'bounce' );
  } else if ( b.x + b.r >= canvas.width ) {
    b.x = canvas.width - b.r;
    b.vx *= -1;
    playSound( 'bounce' );
  }

  if ( b.y - b.r <= 0 ) {
    b.y = b.r;
    b.vy *= -1;
    playSound( 'bounce' );
  }

  if ( b.vy > 0 && collidesWithRect( b, state.paddle ) ) {
    b.y = state.paddle.y - b.r;
    b.vy *= -1;
    playSound( 'bounce' );
  }

  checkBlockCollisions();

  if ( b.y - b.r > canvas.height ) {
    state.lives -= 1;
    if ( state.lives <= 0 ) {
      state.screen = 'gameover';
    }
    resetPositions();
  }
}

function collidesWithRect( b, r ) {
  const closestX = Math.max( r.x, Math.min( b.x, r.x + r.w ) );
  const closestY = Math.max( r.y, Math.min( b.y, r.y + r.h ) );
  const dx = b.x - closestX;
  const dy = b.y - closestY;
  return ( dx * dx + dy * dy ) <= b.r * b.r;
}

function bounceOffBlock( b, block ) {
  const overlapLeft = ( b.x + b.r ) - block.x;
  const overlapRight = ( block.x + block.w ) - ( b.x - b.r );
  const overlapTop = ( b.y + b.r ) - block.y;
  const overlapBottom = ( block.y + block.h ) - ( b.y - b.r );
  const minOverlapX = Math.min( overlapLeft, overlapRight );
  const minOverlapY = Math.min( overlapTop, overlapBottom );

  if ( minOverlapX < minOverlapY ) {
    b.vx *= -1;
  } else {
    b.vy *= -1;
  }
}

function checkBlockCollisions() {
  const b = state.ball;
  for ( const block of state.blocks ) {
    if ( !block.alive ) continue;
    if ( !collidesWithRect( b, block ) ) continue;
    bounceOffBlock( b, block );
    playSound( 'bounce' );
    if ( block.breakable ) {
      block.alive = false;
      state.score += BLOCK_SCORE;
      state.explosions.push( {
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        startTime: performance.now(),
      } );
      playSound( 'break' );
      const breakableCleared = state.blocks.filter( ( bl ) => bl.breakable ).every( ( bl ) => !bl.alive );
      if ( breakableCleared ) {
        if ( state.level === MAX_LEVEL ) {
          state.pendingVictory = true;
        } else {
          state.pendingLevelComplete = true;
        }
      }
    }
    break;
  }
}

function updateExplosions() {
  state.explosions = state.explosions.filter( ( ex ) => {
    const elapsed = performance.now() - ex.startTime;
    return elapsed < EXPLOSION_DURATION;
  } );

  if ( state.explosions.length === 0 ) {
    if ( state.pendingVictory ) {
      state.screen = 'victory';
    } else if ( state.pendingLevelComplete ) {
      state.screen = 'levelcomplete';
    }
  }
}

function drawExplosions() {
  for ( const ex of state.explosions ) {
    const elapsed = performance.now() - ex.startTime;
    const frameIndex = Math.min( 3, Math.floor( elapsed / ( EXPLOSION_DURATION / 4 ) ) );
    const frame = EXPLOSION_FRAMES[ ex.color ][ frameIndex ];
    drawFrame( ctx, frame, ex.x, ex.y, ex.w, ex.h );
  }
}

function draw() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect( 0, 0, canvas.width, canvas.height );
  drawSprite( ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h );
  const b = state.ball;
  drawSprite( ctx, 'ball', b.x - b.r, b.y - b.r, b.r * 2, b.r * 2 );
  for ( const block of state.blocks ) {
    if ( !block.alive ) continue;
    const spriteName = block.breakable ? `block_${ block.color }` : `indestructible_${ block.texture }`;
    drawSprite( ctx, spriteName, block.x, block.y, block.w, block.h );
  }
  drawExplosions();
  drawHUD();

  if ( state.screen === 'gameover' ) {
    drawGameOverScreen();
  }
  if ( state.screen === 'victory' ) {
    drawVictoryScreen();
  }
  if ( state.screen === 'levelcomplete' ) {
    drawLevelCompleteScreen();
  }
}

function drawGameOverScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '48px sans-serif';
  ctx.fillText( 'GAME OVER', canvas.width / 2, canvas.height / 2 - 30 );
  ctx.font = '20px sans-serif';
  ctx.fillText( 'Presiona Enter o Espacio para reiniciar', canvas.width / 2, canvas.height / 2 + 20 );
}

function drawVictoryScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '48px sans-serif';
  ctx.fillText( '¡VICTORIA!', canvas.width / 2, canvas.height / 2 - 30 );
  ctx.font = '20px sans-serif';
  ctx.fillText( 'Presiona Enter o Espacio para reiniciar', canvas.width / 2, canvas.height / 2 + 20 );
}

function drawLevelCompleteScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '48px sans-serif';
  ctx.fillText( `NIVEL ${ state.level } COMPLETADO`, canvas.width / 2, canvas.height / 2 - 30 );
  ctx.font = '20px sans-serif';
  ctx.fillText( 'Presiona Enter o Espacio para continuar', canvas.width / 2, canvas.height / 2 + 20 );
}

function drawHUD() {
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 6;

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText( `PUNTAJE ${ state.score }`, 10, 10 );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText( `NIVEL ${ state.level } / ${ MAX_LEVEL }`, canvas.width / 2, 10 );

  ctx.fillStyle = '#ff3b3b';
  ctx.textAlign = 'right';
  ctx.fillText( `VIDAS ${ state.lives }`, canvas.width - 10, 10 );

  ctx.shadowBlur = 0;
}

function loop() {
  if ( state.screen === 'playing' ) {
    updatePaddle();
    updateBall();
    updateExplosions();
  }
  draw();
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  requestAnimationFrame( loop );
} );
