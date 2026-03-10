// ============================================================
//  game.js  —  Game loop, state, input, physics
//  No drawing happens here — all rendering is in renderer.js
// ============================================================

// ── STATE ─────────────────────────────────────────────────
let G = {};

function initState() {
  const cfg = CONFIG.player;
  G = {
    running:          false,
    player: {
      x:        cfg.startX,
      y:        cfg.startY,
      angle:    cfg.startAngle,
      hp:       cfg.maxHp,
      maxHp:    cfg.maxHp,
      weapon:   'rock',
      cooldowns: { rock: 0, paper: 0, scissors: 0 },
      bobPhase: 0,
      bobAmt:   0,
    },
    projectiles:       [],  // player shots
    enemyProjectiles:  [],  // enemy shots
    enemies:           [],
    particles:         [],
    score:        0,
    wave:         1,
    waveSpawned:  0,
    waveTotal:    0,
    spawnTimer:   0,
    spawnInterval: CONFIG.wave.baseSpawnMs,
    between:      false,
    betweenTimer: 0,
    keys:         {},
    locked:       false,   // pointer lock active
    shootHeld:    false,
    lastTime:     0,
    recoil:       0,
    screenShake:  0,
  };
}

// ── POINTER LOCK ──────────────────────────────────────────
// We request lock on the document body so overlays don't block it.
// mousemove fires on document regardless of which element is locked.

document.addEventListener('click', () => {
  if (G.running) document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  G.locked = document.pointerLockElement === document.body;
  Renderer.setLockMsg(G.locked);
});

document.addEventListener('mousemove', e => {
  if (!G.locked || !G.running) return;
  G.player.angle += e.movementX * CONFIG.player.mouseSensitivity;
});

// ── MOUSE BUTTONS ─────────────────────────────────────────
document.addEventListener('mousedown', e => {
  if (e.button === 0 && G.running) { G.shootHeld = true; tryShoot(); }
});
document.addEventListener('mouseup', e => {
  if (e.button === 0) G.shootHeld = false;
});

// ── SCROLL WHEEL — cycle weapons ──────────────────────────
document.addEventListener('wheel', e => {
  if (!G.running) return;
  const keys = Object.keys(CONFIG.weapons);
  const idx  = keys.indexOf(G.player.weapon);
  const next = (idx + (e.deltaY > 0 ? 1 : -1) + keys.length) % keys.length;
  setWeapon(keys[next]);
});

// ── KEYBOARD ──────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (!G.running) return;
  G.keys[e.key.toLowerCase()] = true;
  const wKeys = Object.keys(CONFIG.weapons);
  const n = parseInt(e.key);
  if (n >= 1 && n <= wKeys.length) setWeapon(wKeys[n - 1]);
});
window.addEventListener('keyup', e => {
  G.keys[e.key.toLowerCase()] = false;
});

function setWeapon(w) {
  if (!CONFIG.weapons[w]) return;
  G.player.weapon = w;
  Renderer.setActiveWeaponUI(w);
}

// ── SHOOTING ──────────────────────────────────────────────
function tryShoot() {
  const p   = G.player;
  const key = p.weapon;
  if (p.cooldowns[key] > 0) return;

  const wep = CONFIG.weapons[key];
  G.projectiles.push({
    x:      p.x,
    y:      p.y,
    angle:  p.angle,
    type:   key,
    hp:     wep.hp,
    maxHp:  wep.hp,
    dist:   0,
  });
  p.cooldowns[key] = wep.cooldown;
  G.recoil = 0.14;
  ASSETS.sounds.shoot();
}

// ── ENEMY HELPERS ─────────────────────────────────────────
function spawnEnemy() {
  const wcfg = CONFIG.wave;
  let tries = 0, ex, ey;
  do {
    ex = 1 + Math.floor(Math.random() * (MAP_W - 2));
    ey = 1 + Math.floor(Math.random() * (MAP_H - 2));
    tries++;
  } while (
    (MAP[ey][ex] !== 0 || dist2D(ex + 0.5, ey + 0.5, G.player.x, G.player.y) < wcfg.minSpawnDistFromPlayer)
    && tries < 200
  );

  // Weighted tier selection (higher waves favour tougher enemies)
  const tw  = CONFIG.enemyTypes.map((_, i) => Math.max(0, 4 - G.wave * 0.5 + i * G.wave * 0.35));
  const tot = tw.reduce((a, b) => a + b, 0);
  let r     = Math.random() * tot, tier = 0;
  for (let i = 0; i < tw.length; i++) { r -= tw[i]; if (r <= 0) { tier = i; break; } }

  const et = CONFIG.enemyTypes[tier];
  const hpScale = 1 + (G.wave - 1) * CONFIG.wave.hpScalePerWave;

  G.enemies.push({
    x: ex + 0.5, y: ey + 0.5,
    angle: 0,
    hp: et.hp * hpScale, maxHp: et.hp * hpScale,
    speed:     et.speed,
    accel:     et.accel,
    color:     et.color,
    size:      et.size,
    score:     et.score,
    weapon:    et.weapon,
    fireTimer: Math.random() * et.fireRate,
    fireRate:  et.fireRate,
    flashTimer: 0,
    vx: 0, vy: 0,
  });
}

function enemyShoot(e) {
  const dx  = G.player.x - e.x, dy = G.player.y - e.y;
  const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.14;
  const wep = CONFIG.weapons[e.weapon];
  G.enemyProjectiles.push({
    x: e.x, y: e.y,
    angle: ang,
    type:  e.weapon,
    hp:    wep.hp, maxHp: wep.hp,
    dist:  0,
  });
}

// ── WAVE MANAGEMENT ───────────────────────────────────────
function startWave(w) {
  const wcfg    = CONFIG.wave;
  G.wave        = w;
  G.waveTotal   = wcfg.baseEnemies + (w - 1) * wcfg.enemiesPerWave;
  G.waveSpawned = 0;
  G.spawnInterval = Math.max(wcfg.minSpawnMs, wcfg.baseSpawnMs - (w - 1) * wcfg.spawnMsPerWave);
  G.spawnTimer  = 0;
  G.between     = false;
  Renderer.setWaveUI(w);
  Renderer.showWaveAnnounce('WAVE ' + w);
}

// ── UTILS ─────────────────────────────────────────────────
function dist2D(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
function lerp(a, b, t) { return a + (b - a) * t; }

function spawnParticles(wx, wy, color) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 0.5 + Math.random() * 1.8;
    G.particles.push({
      x: wx, y: wy,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 1, decay: 1 + Math.random(),
      color, sz: 0.04 + Math.random() * 0.09,
    });
  }
}

// ── UPDATE ────────────────────────────────────────────────
function update(dt) {
  const p   = G.player;
  const rps = CONFIG.beats;

  // Arrow-key rotation fallback (for browsers that don't get pointer lock)
  if (G.keys['arrowleft'])  p.angle -= 1.8 * dt;
  if (G.keys['arrowright']) p.angle += 1.8 * dt;

  // Movement
  let mx = 0, my = 0;
  if (G.keys['w'] || G.keys['arrowup'])    { mx += Math.cos(p.angle); my += Math.sin(p.angle); }
  if (G.keys['s'] || G.keys['arrowdown'])  { mx -= Math.cos(p.angle); my -= Math.sin(p.angle); }
  if (G.keys['a']) { mx += Math.cos(p.angle - Math.PI / 2); my += Math.sin(p.angle - Math.PI / 2); }
  if (G.keys['d']) { mx += Math.cos(p.angle + Math.PI / 2); my += Math.sin(p.angle + Math.PI / 2); }

  const ml  = Math.sqrt(mx * mx + my * my) || 1;
  const spd = CONFIG.player.moveSpeed * dt;
  if (mx || my) {
    const nx = p.x + (mx / ml) * spd;
    const ny = p.y + (my / ml) * spd;
    if (mapIsOpen(nx, p.y)) p.x = nx;
    if (mapIsOpen(p.x, ny)) p.y = ny;
  }

  // Head bob
  const moving = G.keys['w'] || G.keys['s'] || G.keys['a'] || G.keys['d'];
  p.bobAmt += ((moving ? 1 : 0) - p.bobAmt) * dt * 10;
  p.bobPhase += p.bobAmt * dt * 8;

  // Recoil & shake decay
  G.recoil      = Math.max(0, G.recoil      - dt * 3);
  G.screenShake = Math.max(0, G.screenShake - dt * 8);

  // Cooldowns
  for (const w in p.cooldowns) {
    if (p.cooldowns[w] > 0) p.cooldowns[w] -= dt * 1000;
    if (p.cooldowns[w] < 0) p.cooldowns[w]  = 0;
  }
  Renderer.updateCooldownUI(p.weapon, p.cooldowns);

  if (G.shootHeld) tryShoot();

  // ── Wave spawning ──────────────────────────────────────
  if (!G.between) {
    if (G.waveSpawned < G.waveTotal) {
      G.spawnTimer -= dt * 1000;
      if (G.spawnTimer <= 0) {
        spawnEnemy();
        G.waveSpawned++;
        G.spawnTimer = G.spawnInterval;
      }
    }
    if (G.waveSpawned >= G.waveTotal && G.enemies.length === 0) {
      G.between     = true;
      G.betweenTimer = CONFIG.wave.betweenWaveMs;
    }
  } else {
    G.betweenTimer -= dt * 1000;
    if (G.betweenTimer <= 0) startWave(G.wave + 1);
  }

  // ── Enemy movement & AI ───────────────────────────────
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e    = G.enemies[i];
    const dx   = p.x - e.x, dy = p.y - e.y;
    const d    = dist2D(e.x, e.y, p.x, p.y) || 1;

    e.vx = lerp(e.vx, (dx / d) * e.speed, dt * e.accel);
    e.vy = lerp(e.vy, (dy / d) * e.speed, dt * e.accel);

    const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
    if (mapIsOpen(nx, e.y)) e.x = nx; else e.vx = 0;
    if (mapIsOpen(e.x, ny)) e.y = ny; else e.vy = 0;

    e.angle = Math.atan2(dy, dx);
    if (e.flashTimer > 0) e.flashTimer -= dt * 1000;

    // Shoot at player
    e.fireTimer -= dt * 1000;
    if (e.fireTimer <= 0) {
      if (d < 18) enemyShoot(e);
      e.fireTimer = e.fireRate + (Math.random() - 0.5) * 500;
    }

    // Melee
    if (d < e.size + 0.28) {
      p.hp -= 20;
      G.enemies.splice(i, 1);
      onPlayerHurt();
      if (p.hp <= 0) { gameOver(); return; }
    }
  }

  // ── Player projectiles ────────────────────────────────
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr  = G.projectiles[i];
    const wep = CONFIG.weapons[pr.type];
    const step = wep.speed * dt;

    pr.x += Math.cos(pr.angle) * step;
    pr.y += Math.sin(pr.angle) * step;
    pr.dist += step;

    if (!mapIsOpen(pr.x, pr.y) || pr.dist > wep.range) {
      G.projectiles.splice(i, 1); continue;
    }

    // RPS collision vs enemy projectiles
    let killed = false;
    for (let j = G.enemyProjectiles.length - 1; j >= 0; j--) {
      const ep = G.enemyProjectiles[j];
      if (dist2D(pr.x, pr.y, ep.x, ep.y) < 0.28) {
        if (rps[pr.type] === ep.type) {
          // player proj beats enemy proj
          ep.hp--;
          if (ep.hp <= 0) G.enemyProjectiles.splice(j, 1);
        } else if (rps[ep.type] === pr.type) {
          // enemy proj beats player proj
          pr.hp--;
          if (pr.hp <= 0) { G.projectiles.splice(i, 1); killed = true; break; }
        }
        // neutral — pass through
      }
    }
    if (killed) continue;

    // Hit enemies
    for (let j = G.enemies.length - 1; j >= 0; j--) {
      const e = G.enemies[j];
      if (dist2D(pr.x, pr.y, e.x, e.y) < e.size + 0.14) {
        e.hp -= wep.damage;
        e.flashTimer = 150;
        Renderer.flashHitmarker();
        ASSETS.sounds.hit();

        if (e.hp <= 0) {
          G.score += e.score;
          Renderer.setScoreUI(G.score);
          Renderer.addKillfeed('+' + e.score + '  ' + weaponEmoji(e.weapon) + ' eliminated');
          spawnParticles(e.x, e.y, e.color);
          G.enemies.splice(j, 1);
          ASSETS.sounds.kill();
        }
        break; // projectile hits one enemy per frame (pierces walls but not stacked enemies)
      }
    }
  }

  // ── Enemy projectiles ─────────────────────────────────
  for (let i = G.enemyProjectiles.length - 1; i >= 0; i--) {
    const pr  = G.enemyProjectiles[i];
    const wep = CONFIG.weapons[pr.type];
    const step = wep.speed * 0.68 * dt;

    pr.x += Math.cos(pr.angle) * step;
    pr.y += Math.sin(pr.angle) * step;
    pr.dist += step;

    if (!mapIsOpen(pr.x, pr.y) || pr.dist > wep.range * 1.3) {
      G.enemyProjectiles.splice(i, 1); continue;
    }

    if (dist2D(pr.x, pr.y, p.x, p.y) < 0.38) {
      p.hp -= wep.damage * 0.65;
      G.enemyProjectiles.splice(i, 1);
      onPlayerHurt();
      if (p.hp <= 0) { gameOver(); return; }
    }
  }

  // ── Particles ─────────────────────────────────────────
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.87;      pt.vy *= 0.87;
    pt.life -= pt.decay * dt;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
}

// ── PLAYER HURT ───────────────────────────────────────────
function onPlayerHurt() {
  Renderer.updateHealthUI(G.player.hp, G.player.maxHp);
  Renderer.flashDamageVignette();
  G.screenShake = 0.55;
  ASSETS.sounds.hurt();
}

// ── GAME LOOP ─────────────────────────────────────────────
function gameLoop(ts) {
  if (!G.running) return;
  const dt = Math.min((ts - G.lastTime) / 1000, 0.05);
  G.lastTime = ts;
  update(dt);
  Renderer.draw(G);
  requestAnimationFrame(gameLoop);
}

// ── START / GAME OVER ─────────────────────────────────────
function startGame() {
  document.getElementById('start-screen').style.display    = 'none';
  document.getElementById('game-over-screen').style.display = 'none';
  initState();
  G.running = true;
  startWave(1);
  Renderer.updateHealthUI(G.player.hp, G.player.maxHp);
  Renderer.setScoreUI(0);
  // Request pointer lock — user must have clicked the Start button so gesture is valid
  document.body.requestPointerLock();
  requestAnimationFrame(ts => { G.lastTime = ts; gameLoop(ts); });
}

function gameOver() {
  G.running = false;
  document.exitPointerLock();
  document.getElementById('final-score').textContent  = G.score;
  document.getElementById('wave-reached').textContent = 'REACHED WAVE ' + G.wave;
  document.getElementById('game-over-screen').style.display = 'flex';
}

// ── WIRE UP BUTTONS ───────────────────────────────────────
document.getElementById('start-btn').addEventListener('click',   startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
