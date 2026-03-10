// ============================================================
//  assets.js  —  Visual & audio asset definitions
//
//  This is the main file to edit when replacing projectiles,
//  enemy appearances, or adding sounds.
//
//  HOW TO REPLACE PROJECTILE VISUALS
//  ──────────────────────────────────
//  Each weapon entry has a `draw(ctx, x, y, size, hpRatio)`
//  function. Replace the body of that function with your own
//  canvas drawing code, or swap in an Image object (see the
//  IMAGE SWAP section below).
//
//  Parameters passed to draw():
//    ctx     – the Canvas 2D rendering context
//    x, y    – screen centre of the projectile (pixels)
//    size    – display radius in pixels (already perspective-scaled)
//    hpRatio – current hp / max hp  (1.0 = full, fading to 0)
//              use this to tint or fade damaged projectiles
//
//  The draw() call happens with ctx already translated so
//  (0, 0) inside your function IS the sprite centre — but
//  x and y are also passed for convenience.
//
//  IMAGE SWAP EXAMPLE
//  ──────────────────
//  To use a PNG instead of canvas shapes:
//
//    // 1. Put your image in  assets/projectiles/rock.png
//    // 2. Preload it at the top of this file:
//
//    const rockImg = new Image();
//    rockImg.src = 'assets/projectiles/rock.png';
//
//    // 3. In the rock draw() function, replace everything with:
//
//    ctx.globalAlpha = 0.4 + hpRatio * 0.6;
//    ctx.drawImage(rockImg, x - size, y - size, size * 2, size * 2);
//
//  ADDING SOUNDS
//  ─────────────
//  Create an Audio object and call .play() inside the hook:
//
//    const shootSfx = new Audio('assets/sounds/shoot.wav');
//    shootSfx.volume = 0.4;
//
//    // Then in ASSETS.sounds.shoot:
//    shoot() { shootSfx.currentTime = 0; shootSfx.play(); }
//
// ============================================================

const ASSETS = {

  // ── PROJECTILE VISUALS ────────────────────────────────────
  // Each entry maps to a weapon key in CONFIG.weapons
  projectiles: {

    rock: {
      /**
       * Draw a rock projectile.
       * @param {CanvasRenderingContext2D} ctx
       * @param {number} x   screen X centre (pixels)
       * @param {number} y   screen Y centre (pixels)
       * @param {number} size  display radius (pixels, perspective-scaled)
       * @param {number} hpRatio  current hp fraction 0–1
       */
      draw(ctx, x, y, size, hpRatio) {
        ctx.globalAlpha = 0.4 + hpRatio * 0.6;
        ctx.shadowBlur  = 14;
        ctx.shadowColor = CONFIG.weapons.rock.color;
        ctx.fillStyle   = CONFIG.weapons.rock.color;

        // Rough hexagonal boulder shape
        ctx.beginPath();
        hexPoly(ctx, x, y, size, 6);
        ctx.fill();
      },
    },

    paper: {
      /**
       * Draw a paper projectile.
       */
      draw(ctx, x, y, size, hpRatio) {
        ctx.globalAlpha = 0.4 + hpRatio * 0.6;
        ctx.shadowBlur  = 14;
        ctx.shadowColor = CONFIG.weapons.paper.color;
        ctx.fillStyle   = CONFIG.weapons.paper.color;

        // Thin rectangle (flying sheet)
        ctx.fillRect(x - size * 1.3, y - size * 0.5, size * 2.6, size);
      },
    },

    scissors: {
      /**
       * Draw a scissors projectile.
       */
      draw(ctx, x, y, size, hpRatio) {
        ctx.globalAlpha = 0.4 + hpRatio * 0.6;
        ctx.shadowBlur  = 14;
        ctx.shadowColor = CONFIG.weapons.scissors.color;
        ctx.fillStyle   = CONFIG.weapons.scissors.color;

        // Two blade triangles (V-shape pointing right)
        ctx.beginPath();
        ctx.moveTo(x + size,       y);
        ctx.lineTo(x - size * 0.6, y - size * 0.65);
        ctx.lineTo(x - size * 0.3, y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + size,       y);
        ctx.lineTo(x - size * 0.6, y + size * 0.65);
        ctx.lineTo(x - size * 0.3, y);
        ctx.closePath();
        ctx.fill();
      },
    },

  }, // end projectiles


  // ── ENEMY VISUALS ─────────────────────────────────────────
  // drawEnemy is called once per enemy per frame.
  // It receives the screen-space bounding box already computed.
  //
  //   ctx               – Canvas 2D context
  //   ex, ey, ew, eh    – screen rect (left, top, width, height)
  //   enemy             – the enemy object (has .color, .weapon, .hp, .maxHp, .flashTimer)
  //   screenX           – horizontal screen centre (for text centring)
  //
  drawEnemy(ctx, ex, ey, ew, eh, enemy, screenX) {
    const flash = enemy.flashTimer > 0 && (enemy.flashTimer % 80) < 40;
    ctx.fillStyle   = flash ? '#ffffff' : enemy.color;
    ctx.shadowBlur  = 22;
    ctx.shadowColor = enemy.color;

    // Rounded-rectangle body
    roundRect(ctx, ex, ey, ew, eh, ew * 0.14);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(ex + ew * 0.2,  ey + eh * 0.2, ew * 0.24, ew * 0.2);
    ctx.fillRect(ex + ew * 0.56, ey + eh * 0.2, ew * 0.24, ew * 0.2);

    // Weapon emoji label above head
    ctx.shadowBlur = 0;
    ctx.font       = `${Math.max(10, eh * 0.17)}px serif`;
    ctx.textAlign  = 'center';
    ctx.fillStyle  = '#fff';
    ctx.fillText(weaponEmoji(enemy.weapon), screenX, ey - 5);
  },


  // ── SOUNDS ────────────────────────────────────────────────
  // Stub functions — add Audio().play() calls here.
  // See the "ADDING SOUNDS" section at the top of this file.
  sounds: {
    shoot()   { /* play shoot sound */ },
    hit()     { /* play hit sound   */ },
    kill()    { /* play kill sound  */ },
    hurt()    { /* play hurt sound  */ },
  },

};

// ── SHARED DRAWING HELPERS ────────────────────────────────
// Used by both assets.js and renderer.js.
// You can use these inside your custom draw() functions too.

/** Draw a regular polygon centred at (cx, cy) with n sides and radius r. */
function hexPoly(ctx, cx, cy, r, n) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    i === 0
      ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
}

/** Draw a rounded rectangle path (does not fill/stroke). */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);       ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);   ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);       ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x, y + r);           ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
}

/** Return the emoji for a given weapon key. */
function weaponEmoji(w) {
  return CONFIG.weapons[w] ? CONFIG.weapons[w].emoji : '?';
}
