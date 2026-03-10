// ============================================================
//  renderer.js  —  All canvas drawing.  No game logic here.
// ============================================================

const Renderer = (() => {

  // ── CANVAS SETUP ──────────────────────────────────────────
  const canvas    = document.getElementById('gameCanvas');
  const ctx       = canvas.getContext('2d');
  const miniCvs   = document.getElementById('minimap');
  const mctx      = miniCvs.getContext('2d');
  miniCvs.width   = 110;
  miniCvs.height  = 110;

  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  // ── RAYCASTER ─────────────────────────────────────────────
  function castRay(px, py, angle) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let mx = Math.floor(px), my = Math.floor(py);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const ddx = Math.abs(1 / dx),  ddy = Math.abs(1 / dy);
    let sdx = (dx > 0 ? (mx + 1 - px) : (px - mx)) * ddx;
    let sdy = (dy > 0 ? (my + 1 - py) : (py - my)) * ddy;
    let side = 0, dist = 0;

    for (let i = 0; i < 80; i++) {
      if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; }
      else           { sdy += ddy; my += sy; side = 1; }
      if (mapIsWall(mx, my)) {
        dist = side === 0
          ? (mx - px + (1 - sx) / 2) / dx
          : (my - py + (1 - sy) / 2) / dy;
        break;
      }
    }
    return { dist: Math.max(0.01, dist), side };
  }

  // ── MAIN DRAW ─────────────────────────────────────────────
  function draw(state) {
    const W = canvas.width, H = canvas.height;
    const p = state.player;
    const FOV = CONFIG.fov;

    ctx.clearRect(0, 0, W, H);

    // Screen shake
    const sx = (Math.random() - 0.5) * state.screenShake * 7;
    const sy = (Math.random() - 0.5) * state.screenShake * 4;
    ctx.save();
    ctx.translate(sx, sy);

    // ── Sky / floor ──────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    sky.addColorStop(0, '#04040a');
    sky.addColorStop(1, '#0b0b1a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.5);

    const flr = ctx.createLinearGradient(0, H * 0.5, 0, H);
    flr.addColorStop(0, '#090909');
    flr.addColorStop(1, '#040404');
    ctx.fillStyle = flr;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);

    // Thin horizon glow
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(0, H * 0.5 - 1, W, 2);

    // ── Wall columns ─────────────────────────────────────────
    const NUM_RAYS = Math.floor(W / 1.5);
    const zBuf = new Float32Array(NUM_RAYS);

    for (let col = 0; col < NUM_RAYS; col++) {
      const rayAngle  = p.angle - FOV / 2 + (col / NUM_RAYS) * FOV;
      const { dist, side } = castRay(p.x, p.y, rayAngle);
      const corrDist  = dist * Math.cos(rayAngle - p.angle);
      zBuf[col] = corrDist;

      const wallH = Math.min(H, H / corrDist);
      const wallT = H * 0.5 - wallH * 0.5;
      const br    = Math.max(0, Math.min(1, 1 / (corrDist * 0.18 + 0.3)));
      const sd    = side === 1 ? 0.62 : 1;
      const b     = br * sd;
      const r     = Math.floor(b * 35 + 12);
      const g     = Math.floor(b * 35 + 12);
      const bv    = Math.floor(b * 52 + 18);

      const x0 = col * (W / NUM_RAYS);
      const x1 = (col + 1) * (W / NUM_RAYS);
      ctx.fillStyle = `rgb(${r},${g},${bv})`;
      ctx.fillRect(x0, wallT, x1 - x0 + 1, wallH);
    }

    // ── Sprite pass ──────────────────────────────────────────
    // Build list: enemies, all projectiles, particles
    const sprites = [];
    for (const e  of state.enemies)           { const dx=e.x-p.x, dy=e.y-p.y; sprites.push({ kind:'enemy',  obj:e,  dx, dy, d2:dx*dx+dy*dy }); }
    for (const pr of state.enemyProjectiles)  { const dx=pr.x-p.x,dy=pr.y-p.y;sprites.push({ kind:'eproj',  obj:pr, dx, dy, d2:dx*dx+dy*dy }); }
    for (const pr of state.projectiles)       { const dx=pr.x-p.x,dy=pr.y-p.y;sprites.push({ kind:'pproj',  obj:pr, dx, dy, d2:dx*dx+dy*dy }); }
    for (const pt of state.particles)         { const dx=pt.x-p.x,dy=pt.y-p.y;sprites.push({ kind:'part',   obj:pt, dx, dy, d2:dx*dx+dy*dy }); }

    // Sort back-to-front
    sprites.sort((a, b) => b.d2 - a.d2);

    for (const sp of sprites) {
      const { dx, dy, obj } = sp;
      const dist = Math.sqrt(sp.d2);

      // Relative angle from player facing
      let ra = Math.atan2(dy, dx) - p.angle;
      while (ra < -Math.PI) ra += Math.PI * 2;
      while (ra >  Math.PI) ra -= Math.PI * 2;
      if (Math.abs(ra) > FOV * 0.88) continue;

      const screenX = (0.5 + ra / FOV) * W;
      const corrDist = dist * Math.cos(ra);
      if (corrDist <= 0.05) continue;

      // Depth-test against wall buffer
      const ci = Math.floor(screenX / (W / NUM_RAYS));
      const occluded = ci >= 0 && ci < NUM_RAYS && zBuf[ci] < corrDist;
      if (occluded) continue;

      const alpha = Math.min(1, 1.5 - corrDist * 0.06);

      if (sp.kind === 'enemy') {
        const e   = obj;
        const eh  = Math.min(H * 1.6, H / corrDist * 0.72);
        const ew  = eh * 0.62;
        const ex  = screenX - ew / 2;
        const ey  = H * 0.5 - eh * 0.5;

        ctx.save();
        ctx.globalAlpha = alpha;
        ASSETS.drawEnemy(ctx, ex, ey, ew, eh, e, screenX);

        // HP bar
        const hpPct = e.hp / e.maxHp;
        const bw    = ew * 1.1, bh = 4;
        const bx    = screenX - bw / 2, by = ey - 15;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#111';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#fbbf24' : '#ef4444';
        ctx.fillRect(bx, by, bw * hpPct, bh);
        ctx.restore();

      } else if (sp.kind === 'eproj' || sp.kind === 'pproj') {
        const pr  = obj;
        const wep = CONFIG.weapons[pr.type];
        const size = Math.min(H * 0.28, (H / corrDist) * wep.pSize * 0.012);
        const hpRatio = pr.hp / pr.maxHp;

        ctx.save();
        ctx.globalAlpha = Math.min(1, 1.9 - corrDist * 0.07);

        // Enemy projectiles get a reddish tint overlay
        if (sp.kind === 'eproj') {
          ctx.filter = 'hue-rotate(20deg) saturate(1.3)';
        }

        ASSETS.projectiles[pr.type].draw(ctx, screenX, H * 0.5, size, hpRatio);

        // HP pips for multi-HP projectiles
        if (pr.maxHp > 1) {
          ctx.filter = 'none';
          for (let k = 0; k < pr.maxHp; k++) {
            ctx.beginPath();
            ctx.arc(screenX - size + k * size, H * 0.5 - size - 5, 3, 0, Math.PI * 2);
            ctx.fillStyle   = k < pr.hp ? wep.color : '#222';
            ctx.globalAlpha = 1;
            ctx.fill();
          }
        }
        ctx.restore();

      } else if (sp.kind === 'part') {
        const pt   = obj;
        const size = Math.min(55, (H / corrDist) * pt.sz * 8);
        ctx.save();
        ctx.globalAlpha = pt.life * Math.min(1, 1.6 - corrDist * 0.09);
        ctx.fillStyle   = pt.color;
        ctx.shadowBlur  = 8;
        ctx.shadowColor = pt.color;
        ctx.beginPath();
        ctx.arc(screenX, H * 0.5, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── Viewmodel ────────────────────────────────────────────
    drawViewmodel(W, H, p, state.recoil);

    ctx.restore(); // end screen-shake transform

    // ── Minimap ──────────────────────────────────────────────
    drawMinimap(state);
  }

  // ── VIEWMODEL ─────────────────────────────────────────────
  function drawViewmodel(W, H, player, recoil) {
    const wep  = CONFIG.weapons[player.weapon];
    const bob  = Math.sin(player.bobPhase) * 6 * player.bobAmt;
    const ry   = recoil * 38;
    const ax   = W * 0.71;
    const ay   = H * 0.77 + bob + ry;
    const aw   = W * 0.27;
    const ah   = H * 0.36;

    ctx.save();
    ctx.shadowBlur  = 18;
    ctx.shadowColor = wep.color;

    // Arm
    ctx.fillStyle = '#181818';
    roundRect(ctx, ax, ay, aw * 0.34, ah, 7);
    ctx.fill();

    // Launcher body
    ctx.fillStyle = '#202020';
    roundRect(ctx, ax + aw * 0.04, ay - ah * 0.16, aw * 0.68, ah * 0.24, 5);
    ctx.fill();

    // Colour stripe
    ctx.fillStyle   = wep.color;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(ax + aw * 0.06, ay - ah * 0.14, aw * 0.64, 3);
    ctx.globalAlpha = 1;

    // Glowing barrel tip
    ctx.beginPath();
    ctx.arc(ax + aw * 0.64, ay - ah * 0.08, 7, 0, Math.PI * 2);
    ctx.fillStyle   = wep.color;
    ctx.globalAlpha = 0.75 + Math.sin(Date.now() * 0.007) * 0.2;
    ctx.fill();

    // Weapon emoji
    ctx.globalAlpha = 1;
    ctx.font        = `${Math.floor(H * 0.052)}px serif`;
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 0;
    ctx.fillText(wep.emoji, ax + aw * 0.17, ay + ah * 0.28 + bob);

    ctx.restore();
  }

  // ── MINIMAP ───────────────────────────────────────────────
  function drawMinimap(state) {
    const mw = 110, mh = 110;
    mctx.clearRect(0, 0, mw, mh);
    mctx.fillStyle = 'rgba(0,0,0,0.72)';
    mctx.fillRect(0, 0, mw, mh);

    const sc = mw / MAP_W;

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (MAP[y][x] === 1) {
          mctx.fillStyle = '#1c1c2c';
          mctx.fillRect(x * sc, y * sc, sc, sc);
        }
      }
    }

    for (const e of state.enemies) {
      mctx.beginPath();
      mctx.arc(e.x * sc, e.y * sc, 2.8, 0, Math.PI * 2);
      mctx.fillStyle = e.color;
      mctx.fill();
    }

    const px = state.player.x * sc, py = state.player.y * sc;
    mctx.save();
    mctx.translate(px, py);
    mctx.rotate(state.player.angle);
    mctx.fillStyle = '#fff';
    mctx.beginPath();
    mctx.moveTo(0, -5); mctx.lineTo(3, 3); mctx.lineTo(-3, 3);
    mctx.closePath();
    mctx.fill();
    mctx.restore();
  }

  // ── HUD HELPERS ───────────────────────────────────────────
  function updateHealthUI(hp, maxHp) {
    const pct = Math.max(0, hp / maxHp * 100);
    document.getElementById('health-bar').style.width = pct + '%';
    document.getElementById('health-val').textContent  = Math.max(0, Math.round(hp));
    document.getElementById('health-bar').style.background =
      pct > 50
        ? 'linear-gradient(90deg,#e63946,#ff6b6b)'
        : 'linear-gradient(90deg,#8b0000,#e63946)';
  }

  function updateCooldownUI(weapon, cooldowns) {
    for (const w of ['rock', 'paper', 'scissors']) {
      const maxCd = CONFIG.weapons[w].cooldown;
      const pct   = 1 - (cooldowns[w] / maxCd);
      document.getElementById('cd-' + w).style.width = (pct * 100) + '%';
    }
  }

  function setActiveWeaponUI(w) {
    document.querySelectorAll('.weapon-slot').forEach(s => s.classList.remove('active'));
    document.getElementById('slot-' + w).classList.add('active');
  }

  function flashHitmarker() {
    const hm = document.getElementById('hitmarker');
    hm.style.opacity    = '1';
    hm.style.transform  = 'translate(-50%,-50%) scale(1.35)';
    clearTimeout(Renderer._hitT);
    Renderer._hitT = setTimeout(() => {
      hm.style.opacity   = '0';
      hm.style.transform = 'translate(-50%,-50%) scale(1)';
    }, 110);
  }

  function flashDamageVignette() {
    const el = document.getElementById('dmg-flash');
    el.style.opacity = '1';
    clearTimeout(Renderer._dmgT);
    Renderer._dmgT = setTimeout(() => el.style.opacity = '0', 130);
  }

  function addKillfeed(text) {
    const feed = document.getElementById('killfeed');
    const item = document.createElement('div');
    item.className   = 'kf';
    item.textContent = text;
    feed.appendChild(item);
    setTimeout(() => item.remove(), 2500);
  }

  function showWaveAnnounce(text) {
    const el = document.getElementById('wave-announce');
    el.textContent = text;
    el.classList.remove('wf');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add('wf');
  }

  function setScoreUI(score)  { document.getElementById('score-val').textContent = score; }
  function setWaveUI(wave)    { document.getElementById('wave-val').textContent  = wave;  }
  function setLockMsg(locked) { document.getElementById('lock-msg').style.opacity = locked ? '0' : '1'; }

  // ── PUBLIC API ────────────────────────────────────────────
  return {
    canvas,
    draw,
    updateHealthUI,
    updateCooldownUI,
    setActiveWeaponUI,
    flashHitmarker,
    flashDamageVignette,
    addKillfeed,
    showWaveAnnounce,
    setScoreUI,
    setWaveUI,
    setLockMsg,
  };

})();
