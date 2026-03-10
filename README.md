# RPS FPS

A first-person shooter where your weapons are Rock, Paper, and Scissors. Enemy projectiles obey the same RPS rules — counter-type shots chip away enemy projectile HP before destroying them, and the killing shot pierces straight through.

## Running the game

Because the game uses pointer lock and loads separate JS files, you **must serve it over HTTP** — opening `index.html` directly as a `file://` URL will not work in most browsers.

**Quickest option — Python (no install needed on macOS/Linux):**
```bash
cd rps-fps
python3 -m http.server 8080
# then open http://localhost:8080
```

**Node (if you have it):**
```bash
npx serve .
```

**VS Code:** Install the *Live Server* extension and click "Go Live".

---

## Controls

| Key / Input | Action |
|---|---|
| `W A S D` | Move |
| Mouse | Look (click game to capture mouse) |
| `LMB` | Shoot (hold to auto-fire) |
| `1` | Rock |
| `2` | Paper |
| `3` | Scissors |
| Scroll wheel | Cycle weapons |
| `← →` Arrow keys | Turn (keyboard fallback) |

---

## Project structure

```
rps-fps/
├── index.html          # Entry point — HTML structure & script loading
├── README.md
├── src/
│   ├── style.css       # All CSS
│   ├── config.js       # ← Tune weapon stats, enemy stats, wave rules here
│   ├── map.js          # ← Edit the level layout here
│   ├── assets.js       # ← Replace projectile visuals & add sounds here
│   ├── renderer.js     # Raycaster + sprite rendering (drawing only)
│   └── game.js         # Game loop, physics, input, AI
└── assets/
    ├── projectiles/    # Put custom projectile images here (PNG recommended)
    └── sounds/         # Put sound files here (MP3 / OGG / WAV)
```

---

## How to replace projectile visuals

Open **`src/assets.js`**. Each weapon has a `draw()` function inside `ASSETS.projectiles`:

```js
rock: {
  draw(ctx, x, y, size, hpRatio) {
    // ctx   — Canvas 2D context
    // x, y  — screen centre of the projectile (pixels)
    // size  — display radius in pixels (already perspective-scaled)
    // hpRatio — current hp / maxHp  (1.0 = full health, 0 = about to die)
    //           use this to tint or fade damaged shots

    ctx.globalAlpha = 0.4 + hpRatio * 0.6; // fade as hp drops
    ctx.fillStyle   = '#cd7f32';
    // ... your drawing code
  }
}
```

### Option A — Draw with canvas shapes

Replace the function body with any canvas 2D drawing code. The helpers `hexPoly()` and `roundRect()` are available globally from `assets.js`.

```js
// Example: draw a red circle for Rock
draw(ctx, x, y, size, hpRatio) {
  ctx.globalAlpha = 0.4 + hpRatio * 0.6;
  ctx.fillStyle   = '#ff4444';
  ctx.shadowBlur  = 12;
  ctx.shadowColor = '#ff0000';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}
```

### Option B — Use a PNG image

1. Put your image in `assets/projectiles/rock.png`
2. Preload it near the top of `assets.js`:

```js
const rockImg = new Image();
rockImg.src = 'assets/projectiles/rock.png';
```

3. Replace the `draw()` body:

```js
draw(ctx, x, y, size, hpRatio) {
  ctx.globalAlpha = 0.4 + hpRatio * 0.6;
  ctx.drawImage(rockImg, x - size, y - size, size * 2, size * 2);
}
```

The image will be centred on the projectile and automatically scaled by the perspective engine.

---

## How to add sounds

1. Drop a sound file into `assets/sounds/` (MP3 or OGG recommended for browser compatibility).
2. Preload it near the top of `assets.js`:

```js
const shootSfx = new Audio('assets/sounds/shoot.mp3');
shootSfx.volume = 0.4;
```

3. Call `.play()` inside the matching stub in `ASSETS.sounds`:

```js
sounds: {
  shoot() { shootSfx.currentTime = 0; shootSfx.play(); },
  hit()   { /* ... */ },
  kill()  { /* ... */ },
  hurt()  { /* ... */ },
},
```

Setting `currentTime = 0` before `.play()` lets the sound retrigger even if it's already playing (important for rapid fire).

---

## Tuning game values

Everything numeric lives in **`src/config.js`** — weapon stats, enemy stats, wave scaling, FOV, player speed, and mouse sensitivity. Every value has a comment explaining what it does.

```js
// Example: make Rock faster and give it more range
rock: {
  speed:    12,   // was 7
  range:    15,   // was 9
  damage:   40,
  hp:       3,
  cooldown: 320,
  ...
}
```

---

## Editing the map

Open **`src/map.js`**. The `MAP` array is a 2D grid where `0` = floor and `1` = wall. The outer border must stay as walls (`1`) or enemies will escape.

```
[1,1,1,1,1, ...],   // top border — keep as 1s
[1,0,0,0,0, ...],   // interior rows — 0 = walkable, 1 = wall
...
```

`MAP_W` and `MAP_H` must match the actual array width and height if you resize the map.

---

## GitHub Pages deployment

Once pushed to GitHub, enable Pages in your repo settings pointing at the `main` branch root. The game will be live at `https://<you>.github.io/<repo>/`.

No build step required — it's plain HTML/CSS/JS.
"# rps-fps" 
