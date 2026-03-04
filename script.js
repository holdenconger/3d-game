const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const hud = {
  score: document.getElementById("score"),
  wave: document.getElementById("wave"),
  hp: document.getElementById("hp"),
  combo: document.getElementById("combo"),
  dodge: document.getElementById("dodge"),
  mats: document.getElementById("mats"),
  build: document.getElementById("build"),
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
  enemyShots: [],
  zombies: [],
  particles: [],
  pickups: [],
  stains: [],
  stars: [],
  structures: [],
  materials: 0,
  buildMode: false,
  buildIndex: 0,
  buildRotation: 0,
  player: null,
};

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const BASE_STRUCTURES = [
  { x: 24, y: 28, w: 46, h: 34, kind: "building" },
  { x: 244, y: 24, w: 52, h: 30, kind: "building" },
  { x: 22, y: 122, w: 42, h: 30, kind: "building" },
  { x: 238, y: 116, w: 58, h: 42, kind: "building" },
  { x: 132, y: 32, w: 16, h: 12, kind: "crate" },
  { x: 171, y: 40, w: 14, h: 10, kind: "crate" },
  { x: 144, y: 128, w: 20, h: 14, kind: "crate" },
  { x: 172, y: 114, w: 16, h: 12, kind: "crate" },
];

const BUILD_PARTS = [
  { name: "wall", w: 20, h: 6, kind: "crate", cost: 3 },
  { name: "pillar", w: 12, h: 12, kind: "crate", cost: 2 },
  { name: "room", w: 24, h: 18, kind: "building", cost: 6 },
];

function circleHitsRect(cx, cy, radius, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function resolveCircleRect(entity, rect) {
  const nearestX = clamp(entity.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(entity.y, rect.y, rect.y + rect.h);
  let dx = entity.x - nearestX;
  let dy = entity.y - nearestY;
  let distSq = dx * dx + dy * dy;
  const radiusSq = entity.r * entity.r;

  if (distSq >= radiusSq) return;

  if (distSq === 0) {
    const left = Math.abs(entity.x - rect.x);
    const right = Math.abs(rect.x + rect.w - entity.x);
    const top = Math.abs(entity.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - entity.y);
    const minSide = Math.min(left, right, top, bottom);

    if (minSide === left) {
      dx = -1;
      dy = 0;
    } else if (minSide === right) {
      dx = 1;
      dy = 0;
    } else if (minSide === top) {
      dx = 0;
      dy = -1;
    } else {
      dx = 0;
      dy = 1;
    }
    distSq = 1;
  }

  const dist = Math.sqrt(distSq);
  const overlap = entity.r - dist;
  entity.x += (dx / dist) * overlap;
  entity.y += (dy / dist) * overlap;
}

function moveEntityWithCollisions(entity, moveX, moveY) {
  entity.x += moveX;
  for (const s of state.structures) {
    resolveCircleRect(entity, s);
  }

  entity.y += moveY;
  for (const s of state.structures) {
    resolveCircleRect(entity, s);
  }
}

function projectileBlockedByStructures(x, y, r = 1) {
  for (const s of state.structures) {
    if (circleHitsRect(x, y, r, s)) return true;
  }
  return false;
}

function lineBlockedByStructures(x1, y1, x2, y2) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(distance / 4));

  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (projectileBlockedByStructures(x, y, 1)) {
      return true;
    }
  }
  return false;
}

function generateStructures() {
  state.structures = BASE_STRUCTURES.map((item) => ({ ...item }));
}

function rectsOverlap(a, b, pad = 0) {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w > b.x - pad &&
    a.y < b.y + b.h + pad &&
    a.y + a.h > b.y - pad
  );
}

function getBuildPart() {
  return BUILD_PARTS[state.buildIndex % BUILD_PARTS.length];
}

function getBuildPlacement() {
  const part = getBuildPart();
  let w = part.w;
  let h = part.h;
  if (state.buildRotation % 2 === 1) {
    w = part.h;
    h = part.w;
  }

  const x = clamp(Math.floor((input.mouse.x - w / 2) / 2) * 2, 1, WORLD.w - w - 1);
  const y = clamp(Math.floor((input.mouse.y - h / 2) / 2) * 2, 1, WORLD.h - h - 1);
  return {
    x,
    y,
    w,
    h,
    kind: part.kind,
  };
}

function isBuildPlacementValid(candidate) {
  if (candidate.x < 1 || candidate.y < 1 || candidate.x + candidate.w > WORLD.w - 1 || candidate.y + candidate.h > WORLD.h - 1) {
    return false;
  }

  for (const structure of state.structures) {
    if (rectsOverlap(candidate, structure, 0)) {
      return false;
    }
  }

  if (state.player && circleHitsRect(state.player.x, state.player.y, state.player.r + 2, candidate)) {
    return false;
  }

  for (const zombie of state.zombies) {
    if (circleHitsRect(zombie.x, zombie.y, zombie.r + 1, candidate)) {
      return false;
    }
  }

  return true;
}

function placeBuildPart() {
  if (!state.running || !state.buildMode) return false;
  const part = getBuildPart();
  const candidate = getBuildPlacement();
  const canAfford = state.materials >= part.cost;
  const valid = isBuildPlacementValid(candidate);
  if (!canAfford || !valid) return false;

  state.structures.push(candidate);
  state.materials -= part.cost;
  state.shake = Math.max(state.shake, 0.8);
  for (let i = 0; i < 10; i += 1) {
    state.particles.push({
      x: candidate.x + candidate.w * 0.5,
      y: candidate.y + candidate.h * 0.5,
      vx: rand(-24, 24),
      vy: rand(-24, 24),
      life: rand(0.1, 0.22),
      maxLife: 0.22,
      color: "#8fe7ff",
      size: 1,
      gravity: 0,
    });
  }
  updateHud();
  return true;
}

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
  if (!state.player) return;
  if (hud.score) hud.score.textContent = Math.floor(state.score).toString();
  if (hud.wave) hud.wave.textContent = state.wave.toString();
  if (hud.hp) hud.hp.textContent = Math.max(0, Math.ceil(state.player.hp)).toString();
  if (hud.combo) hud.combo.textContent = `x${state.combo.toFixed(1)}`;
  if (hud.dodge) {
    hud.dodge.textContent = `${state.player.dodgeCharges}/${state.player.maxDodgeCharges}`;
  }
  if (hud.mats) {
    hud.mats.textContent = state.materials.toString();
  }
  if (hud.build) {
    if (state.buildMode) {
      const part = getBuildPart();
      hud.build.textContent = `${part.name.toUpperCase()} $${part.cost}`;
    } else {
      hud.build.textContent = "FIGHT";
    }
  }
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
  state.enemyShots = [];
  state.zombies = [];
  state.particles = [];
  state.pickups = [];
  state.stains = [];
  state.materials = 12;
  state.buildMode = false;
  state.buildIndex = 0;
  state.buildRotation = 0;
  generateStructures();
  state.player = {
    x: WORLD.w * 0.5,
    y: WORLD.h * 0.55,
    r: 5,
    hp: 5,
    maxHp: 5,
    speed: 70,
    shotCooldown: 0,
    hitCooldown: 0,
    dodgeLock: 0,
    dodgeCharges: 2,
    maxDodgeCharges: 2,
    dodgeRegen: 0,
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
  const spawnSpitter = state.wave >= 2 && Math.random() < clamp(0.1 + state.wave * 0.015, 0.1, 0.32);
  const hp = spawnSpitter ? 3 + Math.floor(state.wave * 0.16) : 2 + Math.floor(state.wave * 0.2);

  state.zombies.push({
    x,
    y,
    r: 5,
    hp,
    speed: rand(16, 28) * levelScale * (spawnSpitter ? 0.82 : 1),
    type: spawnSpitter ? "spitter" : "walker",
    pushX: 0,
    pushY: 0,
    damageCooldown: 0,
    fireCooldown: rand(1, 2.2),
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
  if (mag < 0.001 || p.dodgeCharges <= 0 || p.dodgeLock > 0) {
    return;
  }
  p.dashDirX = dx / mag;
  p.dashDirY = dy / mag;
  p.dashTime = 0.18;
  p.dodgeLock = 0.14;
  p.dodgeCharges -= 1;
  if (p.dodgeRegen <= 0) {
    p.dodgeRegen = 1.05;
  }
  state.shake = Math.max(state.shake, 2.2);

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

  if ((isDown("ShiftLeft") || isDown("ShiftRight")) && mag > 0) {
    startDash(dx, dy);
  }

  p.shotCooldown -= dt;
  p.hitCooldown -= dt;
  p.dodgeLock -= dt;
  p.dashTime -= dt;
  if (p.dodgeCharges < p.maxDodgeCharges) {
    p.dodgeRegen -= dt;
    if (p.dodgeRegen <= 0) {
      p.dodgeCharges += 1;
      if (p.dodgeCharges < p.maxDodgeCharges) {
        p.dodgeRegen = 1.05;
      } else {
        p.dodgeRegen = 0;
      }
    }
  }

  let speed = p.speed;
  if (p.dashTime > 0) {
    speed *= 4.2;
    dx = p.dashDirX;
    dy = p.dashDirY;
  }

  moveEntityWithCollisions(p, dx * speed * dt, dy * speed * dt);
  p.x = clamp(p.x, p.r + 1, WORLD.w - p.r - 1);
  p.y = clamp(p.y, p.r + 1, WORLD.h - p.r - 1);

  p.trail.push({ x: p.x, y: p.y, life: 0.2 });
  if (p.trail.length > 12) p.trail.shift();
  for (const t of p.trail) t.life -= dt;
  p.trail = p.trail.filter((t) => t.life > 0);

  const firing = isDown("Space") || (!state.buildMode && input.mouse.down);
  if (firing && p.shotCooldown <= 0) {
    fireBullet();
  }

  updateBullets(dt);
  updateZombies(dt);
  updateEnemyShots(dt);
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
    if (projectileBlockedByStructures(b.x, b.y, b.r + 0.2)) {
      for (let p = 0; p < 4; p += 1) {
        state.particles.push({
          x: b.x,
          y: b.y,
          vx: rand(-24, 24),
          vy: rand(-24, 24),
          life: rand(0.06, 0.14),
          maxLife: 0.14,
          color: "#e3f5ff",
          size: 1,
          gravity: 0,
        });
      }
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
          state.materials += enemy.type === "spitter" ? 2 : 1;
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
    moveEntityWithCollisions(z, nx * z.speed * dt + z.pushX * dt, ny * z.speed * dt + z.pushY * dt);
    z.x = clamp(z.x, z.r + 1, WORLD.w - z.r - 1);
    z.y = clamp(z.y, z.r + 1, WORLD.h - z.r - 1);
    z.pushX *= 0.75;
    z.pushY *= 0.75;
    z.damageCooldown -= dt;
    z.fireCooldown -= dt;

    if (z.type === "spitter" && z.fireCooldown <= 0 && d < 145 && !lineBlockedByStructures(z.x, z.y, p.x, p.y)) {
      const angle = Math.atan2(p.y - z.y, p.x - z.x);
      const speed = 70;
      state.enemyShots.push({
        x: z.x + Math.cos(angle) * 6,
        y: z.y + Math.sin(angle) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2,
        life: 2.2,
      });
      z.fireCooldown = rand(1.2, 2);
    }

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

function updateEnemyShots(dt) {
  const p = state.player;
  for (let i = state.enemyShots.length - 1; i >= 0; i -= 1) {
    const shot = state.enemyShots[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;

    if (
      shot.life <= 0 ||
      shot.x < -2 ||
      shot.x > WORLD.w + 2 ||
      shot.y < -2 ||
      shot.y > WORLD.h + 2 ||
      projectileBlockedByStructures(shot.x, shot.y, shot.r)
    ) {
      state.enemyShots.splice(i, 1);
      continue;
    }

    if (Math.hypot(shot.x - p.x, shot.y - p.y) < shot.r + p.r && p.hitCooldown <= 0 && p.dashTime <= 0) {
      p.hp -= 1;
      p.hitCooldown = 0.75;
      state.combo = 1;
      state.comboTimer = 0;
      state.shake = Math.max(state.shake, 4);
      spawnBlood(p.x, p.y, 0.8);
      state.enemyShots.splice(i, 1);
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
      state.materials += 2;
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

function drawStructure(structure, time) {
  const x = Math.floor(structure.x);
  const y = Math.floor(structure.y);
  if (structure.kind === "building") {
    ctx.fillStyle = "#2c3b52";
    ctx.fillRect(x, y, structure.w, structure.h);
    ctx.fillStyle = "#3e597a";
    ctx.fillRect(x + 1, y + 1, structure.w - 2, 3);
    ctx.fillStyle = "#1d2a3d";
    ctx.fillRect(x + 2, y + 6, structure.w - 4, structure.h - 8);

    for (let wy = y + 9; wy < y + structure.h - 4; wy += 8) {
      for (let wx = x + 6; wx < x + structure.w - 4; wx += 10) {
        const glow = 0.35 + Math.abs(Math.sin(time * 2 + wx * 0.05)) * 0.22;
        ctx.fillStyle = `rgba(108, 198, 255, ${glow})`;
        ctx.fillRect(wx, wy, 3, 3);
      }
    }
  } else {
    ctx.fillStyle = "#594330";
    ctx.fillRect(x, y, structure.w, structure.h);
    ctx.fillStyle = "#7e5f43";
    ctx.fillRect(x + 1, y + 1, structure.w - 2, structure.h - 2);
    ctx.fillStyle = "#4a3421";
    ctx.fillRect(x + 1, y + Math.floor(structure.h / 2), structure.w - 2, 1);
    ctx.fillRect(x + Math.floor(structure.w / 2), y + 1, 1, structure.h - 2);
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
  const body = zombie.type === "spitter" ? "#45583e" : "#1f5029";
  const head = zombie.type === "spitter" ? "#639d61" : "#3d8d4f";
  const eye = zombie.type === "spitter" ? "#f6f86e" : "#9f2737";

  ctx.fillStyle = body;
  ctx.fillRect(x - 4, y - 5, 8, 9);
  ctx.fillStyle = head;
  ctx.fillRect(x - 3, y - 8, 6, 4);
  ctx.fillStyle = "#95d76f";
  ctx.fillRect(x - 2, y - 8, 2, 1);
  ctx.fillRect(x + 1, y - 8, 2, 1);

  ctx.fillStyle = eye;
  ctx.fillRect(x - 2, y - 7, 1, 1);
  ctx.fillRect(x + 1, y - 7, 1, 1);

  ctx.fillStyle = "#2a6736";
  ctx.fillRect(x - 6, y - 3 + walk, 2, 4);
  ctx.fillRect(x + 4, y - 3 - walk, 2, 4);

  if (zombie.type === "spitter") {
    ctx.fillStyle = "#7da46f";
    ctx.fillRect(x - 1, y - 5, 2, 2);
  }
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

function drawEnemyShot(shot, time) {
  const pulse = Math.sin(time * 12 + shot.x * 0.1) > 0 ? "#b6ff72" : "#8fe05a";
  ctx.fillStyle = pulse;
  ctx.fillRect(Math.floor(shot.x - 2), Math.floor(shot.y - 2), 4, 4);
  ctx.fillStyle = "#447a2b";
  ctx.fillRect(Math.floor(shot.x - 1), Math.floor(shot.y - 1), 2, 2);
}

function drawParticle(p) {
  const alpha = clamp(p.life / p.maxLife, 0, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  ctx.globalAlpha = 1;
}

function drawBuildPreview() {
  if (!state.running || !state.buildMode) return;
  const part = getBuildPart();
  const placement = getBuildPlacement();
  const canAfford = state.materials >= part.cost;
  const valid = isBuildPlacementValid(placement);

  const fill = valid && canAfford ? "rgba(88, 255, 190, 0.26)" : "rgba(255, 90, 110, 0.26)";
  const stroke = valid && canAfford ? "#6dffd2" : "#ff8ca0";
  ctx.fillStyle = fill;
  ctx.fillRect(placement.x, placement.y, placement.w, placement.h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(placement.x + 0.5, placement.y + 0.5, placement.w - 1, placement.h - 1);

  ctx.fillStyle = "#dff4ff";
  ctx.font = "6px 'Press Start 2P', monospace";
  ctx.textAlign = "left";
  const labelY = placement.y > 10 ? placement.y - 3 : placement.y + placement.h + 8;
  ctx.fillText(`${part.name} $${part.cost}`, placement.x, labelY);
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

  for (const structure of state.structures) drawStructure(structure, time);
  drawBuildPreview();
  for (const pickup of state.pickups) drawPickup(pickup, time);

  const mobs = [...state.zombies].sort((a, b) => a.y - b.y);
  for (const zombie of mobs) drawZombie(zombie, time);
  for (const bullet of state.bullets) drawBullet(bullet);
  for (const shot of state.enemyShots) drawEnemyShot(shot, time);
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
  const block = [
    "Space",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ShiftLeft",
    "ShiftRight",
    "KeyB",
    "KeyQ",
    "KeyE",
    "KeyR",
  ];
  if (block.includes(event.code)) event.preventDefault();

  if (!event.repeat) {
    if (event.code === "KeyB") {
      state.buildMode = !state.buildMode;
      input.mouse.down = false;
      updateHud();
    } else if (event.code === "KeyR" && state.buildMode) {
      state.buildRotation = (state.buildRotation + 1) % 2;
      updateHud();
    } else if (event.code === "KeyQ" && state.buildMode) {
      state.buildIndex = (state.buildIndex - 1 + BUILD_PARTS.length) % BUILD_PARTS.length;
      updateHud();
    } else if (event.code === "KeyE" && state.buildMode) {
      state.buildIndex = (state.buildIndex + 1) % BUILD_PARTS.length;
      updateHud();
    }
  }

  input.keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.code);
});

canvas.addEventListener("mousemove", (event) => {
  toCanvasCoordinates(event.clientX, event.clientY);
});

canvas.addEventListener("mousedown", (event) => {
  toCanvasCoordinates(event.clientX, event.clientY);
  if (event.button === 0) {
    if (state.running && state.buildMode) {
      placeBuildPart();
    } else {
      input.mouse.down = true;
    }
  }
});

window.addEventListener("mouseup", () => {
  input.mouse.down = false;
});

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  if (!event.changedTouches[0]) return;
  const touch = event.changedTouches[0];
  toCanvasCoordinates(touch.clientX, touch.clientY);
  if (state.running && state.buildMode) {
    placeBuildPart();
    input.mouse.down = false;
  } else {
    input.mouse.down = true;
  }
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
  "B for build mode. Place cover, dodge hard, and survive the siege.",
  "START GAME"
);
spawnStars();
generateStructures();
state.materials = 12;
state.buildMode = false;
state.buildIndex = 0;
state.buildRotation = 0;
state.player = {
  x: WORLD.w * 0.5,
  y: WORLD.h * 0.55,
  r: 5,
  hp: 5,
  maxHp: 5,
  speed: 70,
  shotCooldown: 0,
  hitCooldown: 0,
  dodgeLock: 0,
  dodgeCharges: 2,
  maxDodgeCharges: 2,
  dodgeRegen: 0,
  dashTime: 0,
  dashDirX: 0,
  dashDirY: 0,
  trail: [],
};
updateHud();
requestAnimationFrame(frame);
