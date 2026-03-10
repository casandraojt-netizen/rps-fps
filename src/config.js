// ============================================================
//  config.js  —  All tunable game values in one place
//  Edit this file to change weapon stats, enemy stats, etc.
// ============================================================

const CONFIG = {

  // ── PLAYER ──────────────────────────────────────────────
  player: {
    moveSpeed:    3.5,   // world-units per second
    mouseSensitivity: 0.0022, // radians per pixel of mouse movement
    startX:       2.5,   // starting map X position
    startY:       2.5,   // starting map Y position
    startAngle:   0,     // starting facing angle (radians)
    maxHp:        100,
  },

  // ── FIELD OF VIEW ───────────────────────────────────────
  fov: Math.PI / 2.8,   // radians (~64 degrees). Lower = narrower/zoomed, higher = wider.

  // ── WEAPONS ─────────────────────────────────────────────
  // speed   : world-units per second the projectile travels
  // range   : world-units before the projectile expires
  // damage  : hp removed from an enemy per hit
  // hp      : how many counter-type hits it takes to destroy this projectile
  // cooldown: milliseconds between shots
  // pSize   : visual size of the projectile sprite (arbitrary units)
  // color   : hex colour used for glow / HUD tint
  // emoji   : shown in HUD and on the viewmodel
  weapons: {
    rock: {
      emoji:    '🪨',
      color:    '#cd7f32',
      speed:    7,
      range:    9,
      damage:   40,
      hp:       3,
      cooldown: 320,   // ms  (fast – spammable close-range)
      pSize:    18,
    },
    paper: {
      emoji:    '📄',
      color:    '#a8d8ea',
      speed:    11,
      range:    16,
      damage:   25,
      hp:       2,
      cooldown: 600,   // ms  (medium)
      pSize:    13,
    },
    scissors: {
      emoji:    '✂️',
      color:    '#e8c5c5',
      speed:    17,
      range:    28,
      damage:   15,
      hp:       1,
      cooldown: 950,   // ms  (slow – long-range sniper)
      pSize:    9,
    },
  },

  // ── RPS RULES ───────────────────────────────────────────
  // beats[A] = B means weapon A destroys weapon B projectiles
  beats: {
    rock:     'scissors',
    paper:    'rock',
    scissors: 'paper',
  },

  // ── ENEMIES ─────────────────────────────────────────────
  // size     : collision radius in world-units
  // hp       : base HP (scaled up each wave)
  // speed    : world-units per second
  // accel    : how quickly it reaches full speed (higher = snappier)
  // score    : points awarded on kill
  // weapon   : which RPS weapon it shoots
  // fireRate : ms between shots
  enemyTypes: [
    { color: '#e63946', size: 0.32, hp: 60,  speed: 1.8, accel: 3,   score: 100, weapon: 'scissors', fireRate: 2800 },
    { color: '#f4a261', size: 0.38, hp: 100, speed: 1.2, accel: 2,   score: 180, weapon: 'rock',     fireRate: 2200 },
    { color: '#a8dadc', size: 0.44, hp: 140, speed: 0.9, accel: 1.5, score: 250, weapon: 'paper',    fireRate: 3500 },
    { color: '#e9c46a', size: 0.28, hp: 80,  speed: 2.4, accel: 4,   score: 220, weapon: 'scissors', fireRate: 1800 },
  ],

  // ── WAVES ───────────────────────────────────────────────
  wave: {
    baseEnemies:     5,    // enemies in wave 1
    enemiesPerWave:  3,    // added each wave
    hpScalePerWave:  0.25, // enemy HP multiplier per wave (e.g. wave 3 = 1 + 2*0.25 = 1.5x)
    baseSpawnMs:     1200, // ms between spawns in wave 1
    spawnMsPerWave:  80,   // reduction per wave
    minSpawnMs:      400,  // floor
    betweenWaveMs:   2400, // pause between waves
    minSpawnDistFromPlayer: 5, // world-units
  },

};
