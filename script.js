const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const hud = {
  score: document.getElementById("score"),
  wave: document.getElementById("wave"),
  hp: document.getElementById("hp"),
  combo: document.getElementById("combo"),
};

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start-btn");

const WORLD = {
  w: canvas.width,
  h: canvas.height,
};

const input = {
  keys: new Set(),
  mouse: {
    x: WORLD.w / 2,
    y: WORLD.h / 2,
    down: false,
  },
};

const state = {
  running: false,
  score: 0,
  wave: 1,
  waveTarget: 0,
  waveSpawned: 0,
  waveKilled: 0,
  waveBreak: 1.2,
  spawnTimer: 0.2,
  combo: 1,
  comboTimer: 0,
  bannerText: "",
  bannerTimer: 0,
  shake: 0,
  bullets: [],
  zombies: [],
  particles: [],
  pickups: [],
  stains: [],
  stars: [],
  player: null,
};

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function setOverlay(title, text, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = buttonText;
  overlay.classList.add("visible");
}

function hideOverlay() {
  overlay.classList.remove("visible");
}

function waveTarget(level) {
  return 7 + level * 3;
}

function updateHud() {
  hud.score.textContent = Math.floor(state.score).toString();
  hud.wave.textContent = state.wave.toString();
  hud.hp.textContent = Math.max(0, Math.ceil(state.player.hp)).toString();
  hud.combo.textContent = `x${state.combo.toFixed(1)}`;
}

function spawnStars() {
  state.stars.length = 0;
  for (let i = 0; i < 38; i += 1) {
    state.stars.push({
      x: Math.floor(rand(0, WORLD.w)),
      y: Math.floor(rand(0, WORLD.h)),
      t: rand(0.2, 1),
      s: rand(0.05, 0.3),
    });
  }
}

function resetGame() {
  state.running = true;
  state.score = 0;
  state.wave = 1;
  state.waveTarget = waveTarget(1);
  state.waveSpawned = 0;
  state.waveKilled = 0;
  state.waveBreak = 1.4;
  state.spawnTimer = 0.4;
  state.combo = 1;
  state.comboTimer = 0;
  state.bannerText = "WAVE 1";
  state.bannerTimer = 1.5;
  state.shake = 0;
  state.bullets = [];
  state.zombies = [];
  state.particles = [];
  state.pickups = [];
  state.stains = [];
  state.player = {
    x: WORLD.w * 0.5,
    y: WORLD.h * 0.55,
    r: 5,
    hp: 5,
    maxHp: 5,
    speed: 70,
    shotCooldown: 0,
    hitCooldown: 0,
    dashCooldown: 0,
    dashTime: 0,
    dashDirX: 0,
    dashDirY: 0,
    trail: [],
  };
  spawnStars();
  updateHud();
}

function spawnZombie() {
  const pad = 12;
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = rand(-pad, WORLD.w + pad);
    y = -pad;
  } else if (side === 1) {
    x = WORLD.w + pad;
    y = rand(-pad, WORLD.h + pad);
  } else if (side === 2) {
    x = rand(-pad, WORLD.w + pad);
    y = WORLD.h + pad;
  } else {
    x = -pad;
    y = rand(-pad, WORLD.h + pad);
  }

  const levelScale = 1 + state.wave * 0.05;
  const hp = 2 + Math.floor(state.wave * 0.2);

  state.zombies.push({
    x,
    y,
    r: 5,
    hp,
    speed: rand(16, 28) * levelScale,
    pushX: 0,
    pushY: 0,
    damageCooldown: 0,
  });
}

function spawnPickup(x, y) {
  state.pickups.push({
    x,
    y,
    r: 4,
    life: 8,
  });
}

function spawnBlood(x, y, power = 1) {
  const amount = Math.floor(rand(7, 12) * power);
  for (let i = 0; i < amount; i += 1) {
    state.particles.push({
      x,
      y,
      vx: rand(-45, 45) * power,
      vy: rand(-45, 45) * power,
      life: rand(0.15, 0.45),
      maxLife: 0.45,
      color: Math.random() > 0.25 ? "#ff4d61" : "#8e1f2e",
      size: Math.floor(rand(1, 3)),
      gravity: 35,
    });
  }
}

function spawnMuzzle(x, y, angle) {
  for (let i = 0; i < 4; i += 1) {
    const spread = rand(-0.28, 0.28);
    const speed = rand(40, 90);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle + spread) * speed,
      vy: Math.sin(angle + spread) * speed,
      life: rand(0.08, 0.16),
      maxLife: 0.16,
      color: i % 2 === 0 ? "#ffd166" : "#ff9e2a",
      size: 1 + (i % 2),
      gravity: 0,
    });
  }
}

function pushStain(x, y) {
  state.stains.push({
    x: Math.floor(x),
    y: Math.floor(y),
    r: Math.floor(rand(2, 5)),
    a: rand(0.2, 0.46),
  });
  if (state.stains.length > 90) {
    state.stains.shift();
  }
}

function fireBullet() {
  const p = state.player;
  const angle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);
  const speed = 168;
  const bx = p.x + Math.cos(angle) * 7;
  const by = p.y + Math.sin(angle) * 7;

  state.bullets.push({
    x: bx,
    y: by,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 0.9,
    r: 1.5,
    damage: 1,
  });

  spawnMuzzle(bx, by, angle);
  p.shotCooldown = 0.11;
  state.shake = Math.max(state.shake, 0.9);
}

function startDash(dx, dy) {
  const p = state.player;
  const mag = Math.hypot(dx, dy);
  if (mag < 0.001 || p.dashCooldown > 0) {
    return;
  }
  p.dashDirX = dx / mag;
  p.dashDirY = dy / mag;
  p.dashTime = 0.14;
  p.dashCooldown = 1.3;
  state.shake = Math.max(state.shake, 1.5);

  for (let i = 0; i < 8; i += 1) {
    state.particles.push({
      x: p.x,
      y: p.y,
      vx: rand(-40, 40),
      vy: rand(-40, 40),
      life: rand(0.18, 0.3),
      maxLife: 0.3,
      color: "#79ffd8",
      size: 2,
      gravity: 0,
    });
  }
}

function gameOver() {
  state.running = false;
  setOverlay(
    "YOU WERE EATEN",
    `Final score ${Math.floor(state.score)} - Reached wave ${state.wave}`,
    "TRY AGAIN"
  );
}

function updateWave(dt) {
  if (state.waveBreak > 0) {
    state.waveBreak -= dt;
    if (state.waveBreak <= 0) {
      state.bannerText = `WAVE ${state.wave}`;
      state.bannerTimer = 1.4;
    }
    return;
  }

  if (state.waveSpawned < state.waveTarget) {
    state.spawnTimer -= dt;
    const gap = clamp(0.82 - state.wave * 0.03, 0.22, 0.82);
    if (state.spawnTimer <= 0) {
      spawnZombie();
      state.waveSpawned += 1;
      state.spawnTimer = gap * rand(0.68, 1.24);
    }
  }

  if (state.waveKilled >= state.waveTarget && state.zombies.length === 0) {
    state.wave += 1;
    state.waveTarget = waveTarget(state.wave);
    state.waveSpawned = 0;
    state.waveKilled = 0;
    state.waveBreak = 2.1;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
    state.combo = 1;
    state.comboTimer = 0;
    state.bannerText = `WAVE ${state.wave}`;
    state.bannerTimer = 1.6;
    state.shake = 2.4;
    updateHud();
  }
}

function update(dt) {
  if (!state.player) {
    return;
  }

  if (!state.running) {
    updateParticles(dt, true);
    return;
  }

  const p = state.player;
  const isDown = (key) => input.keys.has(key);

  let dx = 0;
  let dy = 0;
  if (isDown("KeyW") || isDown("ArrowUp")) dy -= 1;
  if (isDown("KeyS") || isDown("ArrowDown")) dy += 1;
  if (isDown("KeyA") || isDown("ArrowLeft")) dx -= 1;
  if (isDown("KeyD") || isDown("ArrowRight")) dx += 1;

  const mag = Math.hypot(dx, dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  }

  if ((isDown("ShiftLeft") || isDown("ShiftRight")) && p.dashCooldown <= 0) {
    startDash(dx, dy);
  }

  p.shotCooldown -= dt;
  p.hitCooldown -= dt;
  p.dashCooldown -= dt;
  p.dashTime -= dt;

  let speed = p.speed;
  if (p.dashTime > 0) {
    speed *= 3.6;
    dx = p.dashDirX;
    dy = p.dashDirY;
  }

  p.x += dx * speed * dt;
  p.y += dy * speed * dt;
  p.x = clamp(p.x, 7, WORLD.w - 7);
  p.y = clamp(p.y, 7, WORLD.h - 7);

  p.trail.push({ x: p.x, y: p.y, life: 0.2 });
  if (p.trail.length > 12) p.trail.shift();
  for (const t of p.trail) t.life -= dt;
  p.trail = p.trail.filter((t) => t.life > 0);

  const firing = input.mouse.down || isDown("Space");
  if (firing && p.shotCooldown <= 0) {
    fireBullet();
  }

  updateBullets(dt);
  updateZombies(dt);
  updatePickups(dt);
  updateParticles(dt, false);
  updateWave(dt);

  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
  } else {
    state.combo = clamp(state.combo - dt * 0.45, 1, 9.9);
  }

  state.shake = Math.max(0, state.shake - dt * 4.4);
  updateHud();
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    let removed = false;
    if (b.life <= 0 || b.x < -2 || b.x > WORLD.w + 2 || b.y < -2 || b.y > WORLD.h + 2) {
      state.bullets.splice(i, 1);
      continue;
    }

    for (let z = state.zombies.length - 1; z >= 0; z -= 1) {
      const enemy = state.zombies[z];
      const hitDist = b.r + enemy.r + 1;
      if (Math.hypot(b.x - enemy.x, b.y - enemy.y) <= hitDist) {
        enemy.hp -= b.damage;
        enemy.pushX += b.vx * 0.04;
        enemy.pushY += b.vy * 0.04;
        spawnBlood(b.x, b.y, 0.65);
        state.bullets.splice(i, 1);
        removed = true;

        if (enemy.hp <= 0) {
          state.zombies.splice(z, 1);
          state.waveKilled += 1;
          state.score += Math.floor(35 * state.combo);
          state.combo = clamp(state.combo + 0.24, 1, 9.9);
          state.comboTimer = 2.35;
          state.shake = Math.max(state.shake, 2.6);
          pushStain(enemy.x, enemy.y);
          spawnBlood(enemy.x, enemy.y, 1.4);
          if (Math.random() < 0.11) {
            spawnPickup(enemy.x, enemy.y);
          }
        } else {
          state.score += Math.floor(6 * state.combo);
        }
        break;
      }
    }

    if (removed) {
      continue;
    }
  }
}

function updateZombies(dt) {
  const p = state.player;
  for (let i = state.zombies.length - 1; i >= 0; i -= 1) {
    const z = state.zombies[i];
    const toX = p.x - z.x;
    const toY = p.y - z.y;
    const d = Math.hypot(toX, toY) || 1;

    const nx = toX / d;
    const ny = toY / d;
    z.x += nx * z.speed * dt + z.pushX * dt;
    z.y += ny * z.speed * dt + z.pushY * dt;
    z.pushX *= 0.75;
    z.pushY *= 0.75;
    z.damageCooldown -= dt;

    const hitDist = z.r + p.r + 0.4;
    if (d < hitDist && p.hitCooldown <= 0 && p.dashTime <= 0) {
      p.hp -= 1;
      p.hitCooldown = 0.9;
      state.combo = 1;
      state.comboTimer = 0;
      state.shake = Math.max(state.shake, 5.5);
      spawnBlood(p.x, p.y, 1);
      if (p.hp <= 0) {
        gameOver();
        return;
      }
    }
  }
}

function updatePickups(dt) {
  const p = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const med = state.pickups[i];
    med.life -= dt;
    if (med.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    if (Math.hypot(med.x - p.x, med.y - p.y) < med.r + p.r + 1) {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      state.score += 25;
      state.pickups.splice(i, 1);
      for (let c = 0; c < 10; c += 1) {
        state.particles.push({
          x: med.x,
          y: med.y,
          vx: rand(-30, 30),
          vy: rand(-35, 0),
          life: rand(0.2, 0.4),
          maxLife: 0.4,
          color: "#66ffd2",
          size: 2,
          gravity: 45,
        });
      }
      state.shake = Math.max(state.shake, 1.1);
    }
  }
}

function updateParticles(dt, slow) {
  const factor = slow ? 0.42 : 1;
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.vy += p.gravity * dt * factor;
    p.x += p.vx * dt * factor;
    p.y += p.vy * dt * factor;
    p.life -= dt * factor;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function drawBackground(time) {
  ctx.fillStyle = "#090f14";
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  for (let y = 0; y < WORLD.h; y += 8) {
    for (let x = 0; x < WORLD.w; x += 8) {
      const flip = ((x + y) / 8) % 2 === 0;
      ctx.fillStyle = flip ? "#0d141d" : "#111a23";
      ctx.fillRect(x, y, 8, 8);
    }
  }

  for (const s of state.stars) {
    const twinkle = 0.5 + Math.sin(time * s.t + s.x * 0.1) * 0.5;
    ctx.fillStyle = `rgba(170, 210, 255, ${0.2 + twinkle * 0.3})`;
    ctx.fillRect(s.x, s.y, 1, 1);
  }

  ctx.fillStyle = "rgba(11, 22, 33, 0.65)";
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  for (const stain of state.stains) {
    ctx.fillStyle = `rgba(95, 18, 30, ${stain.a})`;
    ctx.fillRect(stain.x - stain.r, stain.y - stain.r, stain.r * 2, stain.r * 2);
  }
}

function drawPickup(pickup, time) {
  const bob = Math.sin(time * 5 + pickup.x * 0.08) * 0.8;
  const x = Math.floor(pickup.x);
  const y = Math.floor(pickup.y + bob);
  const pulse = 0.32 + Math.sin(time * 8) * 0.08;

  ctx.fillStyle = `rgba(102, 255, 210, ${pulse})`;
  ctx.fillRect(x - 6, y - 6, 12, 12);

  ctx.fillStyle = "#80ffd8";
  ctx.fillRect(x - 1, y - 3, 2, 7);
  ctx.fillRect(x - 3, y - 1, 7, 2);
  ctx.fillStyle = "#1b5a4c";
  ctx.fillRect(x - 1, y - 2, 2, 5);
  ctx.fillRect(x - 2, y - 1, 5, 2);
}

function drawZombie(zombie, time) {
  const x = Math.floor(zombie.x);
  const y = Math.floor(zombie.y);
  const walk = Math.sin(time * 12 + x * 0.04) > 0 ? 1 : -1;

  ctx.fillStyle = "#1f5029";
  ctx.fillRect(x - 4, y - 5, 8, 9);
  ctx.fillStyle = "#3d8d4f";
  ctx.fillRect(x - 3, y - 8, 6, 4);
  ctx.fillStyle = "#95d76f";
  ctx.fillRect(x - 2, y - 8, 2, 1);
  ctx.fillRect(x + 1, y - 8, 2, 1);

  ctx.fillStyle = "#9f2737";
  ctx.fillRect(x - 2, y - 7, 1, 1);
  ctx.fillRect(x + 1, y - 7, 1, 1);

  ctx.fillStyle = "#2a6736";
  ctx.fillRect(x - 6, y - 3 + walk, 2, 4);
  ctx.fillRect(x + 4, y - 3 - walk, 2, 4);
}

function drawPlayer(time) {
  const p = state.player;
  const x = Math.floor(p.x);
  const y = Math.floor(p.y);
  const angle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);

  for (const trail of p.trail) {
    const alpha = clamp(trail.life / 0.2, 0, 1) * 0.45;
    ctx.fillStyle = `rgba(85, 255, 210, ${alpha})`;
    ctx.fillRect(Math.floor(trail.x - 3), Math.floor(trail.y - 3), 6, 6);
  }

  const flicker = p.hitCooldown > 0 && Math.sin(time * 40) > 0;
  if (!flicker) {
    ctx.fillStyle = "#2e6dca";
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = "#54a5ff";
    ctx.fillRect(x - 3, y - 8, 6, 5);
    ctx.fillStyle = "#e5f3ff";
    ctx.fillRect(x - 2, y - 7, 1, 1);
    ctx.fillRect(x + 1, y - 7, 1, 1);
  }

  const gunX = x + Math.cos(angle) * 6;
  const gunY = y + Math.sin(angle) * 6;
  ctx.strokeStyle = "#f6bf4b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 1);
  ctx.lineTo(Math.floor(gunX), Math.floor(gunY));
  ctx.stroke();
}

function drawBullet(b) {
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(Math.floor(b.x - 1), Math.floor(b.y - 1), 2, 2);
}

function drawParticle(p) {
  const alpha = clamp(p.life / p.maxLife, 0, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  ctx.globalAlpha = 1;
}

function drawCrosshair(time) {
  const x = Math.floor(input.mouse.x);
  const y = Math.floor(input.mouse.y);
  const pulse = Math.sin(time * 9) > 0 ? 0 : 1;
  const color = pulse ? "#e2f4ff" : "#9ec3df";

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x - 2, y);
  ctx.moveTo(x + 2, y);
  ctx.lineTo(x + 5, y);
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y - 2);
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x, y + 5);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function drawBanner() {
  if (state.bannerTimer <= 0 || !state.bannerText) return;

  const pulse = Math.sin(state.bannerTimer * 14);
  ctx.fillStyle = `rgba(12, 25, 42, ${0.4 + Math.abs(pulse) * 0.22})`;
  ctx.fillRect(90, 10, 140, 22);

  ctx.fillStyle = "#79ffd8";
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText(state.bannerText, WORLD.w / 2, 24);
}

function drawScreenFlash() {
  if (state.player.hitCooldown <= 0) return;
  const alpha = clamp(state.player.hitCooldown / 0.9, 0, 1) * 0.18;
  ctx.fillStyle = `rgba(255, 70, 95, ${alpha})`;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
}

function render(time) {
  drawBackground(time);

  ctx.save();
  if (state.shake > 0) {
    ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
  }

  for (const pickup of state.pickups) drawPickup(pickup, time);

  const mobs = [...state.zombies].sort((a, b) => a.y - b.y);
  for (const zombie of mobs) drawZombie(zombie, time);
  for (const bullet of state.bullets) drawBullet(bullet);
  for (const particle of state.particles) drawParticle(particle);

  if (state.player) {
    drawPlayer(time);
  }

  ctx.restore();
  drawCrosshair(time);
  drawBanner();
  drawScreenFlash();

  if (!state.running && state.player) {
    ctx.fillStyle = "rgba(6, 10, 15, 0.45)";
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  }
}

function toCanvasCoordinates(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * WORLD.w;
  const y = ((clientY - rect.top) / rect.height) * WORLD.h;
  input.mouse.x = clamp(x, 0, WORLD.w);
  input.mouse.y = clamp(y, 0, WORLD.h);
}

window.addEventListener("keydown", (event) => {
  const block = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"];
  if (block.includes(event.code)) event.preventDefault();
  input.keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.code);
});

canvas.addEventListener("mousemove", (event) => {
  toCanvasCoordinates(event.clientX, event.clientY);
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0) {
    input.mouse.down = true;
  }
  toCanvasCoordinates(event.clientX, event.clientY);
});

window.addEventListener("mouseup", () => {
  input.mouse.down = false;
});

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  if (!event.changedTouches[0]) return;
  const touch = event.changedTouches[0];
  input.mouse.down = true;
  toCanvasCoordinates(touch.clientX, touch.clientY);
});

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  if (!event.changedTouches[0]) return;
  const touch = event.changedTouches[0];
  toCanvasCoordinates(touch.clientX, touch.clientY);
});

canvas.addEventListener("touchend", () => {
  input.mouse.down = false;
});

startBtn.addEventListener("click", () => {
  hideOverlay();
  resetGame();
});

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  if (state.bannerTimer > 0) state.bannerTimer -= dt;
  render(now / 1000);
  requestAnimationFrame(frame);
}

setOverlay(
  "PIXEL ZOMBIE SIEGE",
  "Move fast, dash through danger, and hold your combo for huge scores.",
  "START GAME"
);
spawnStars();
state.player = {
  x: WORLD.w * 0.5,
  y: WORLD.h * 0.55,
  r: 5,
  hp: 5,
  maxHp: 5,
  speed: 70,
  shotCooldown: 0,
  hitCooldown: 0,
  dashCooldown: 0,
  dashTime: 0,
  dashDirX: 0,
  dashDirY: 0,
  trail: [],
};
updateHud();
requestAnimationFrame(frame);
