const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const ui = {
  score: document.getElementById("score"),
  wave: document.getElementById("wave"),
  towerHp: document.getElementById("tower-hp"),
  playerHp: document.getElementById("player-hp"),
  cash: document.getElementById("cash"),
  weapon: document.getElementById("weapon"),
  skin: document.getElementById("skin"),
  status: document.getElementById("status-text"),
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlayText: document.getElementById("overlay-text"),
  startBtn: document.getElementById("start-btn"),
};

const VIEW_W = canvas.width;
const VIEW_H = canvas.height;
const WORLD_W = 2200;
const WORLD_H = 1500;

const TOWER = {
  x: WORLD_W * 0.5,
  y: WORLD_H * 0.5,
  r: 96,
};

const STORAGE_KEY = "tower-outbreak-defense-v1";

const WEAPONS = {
  pistol: {
    id: "pistol",
    name: "Pistol",
    type: "gun",
    unlockScore: 0,
    damage: 18,
    fireRate: 0.23,
    projSpeed: 820,
    spread: 0.02,
    pellets: 1,
    range: 860,
    recoil: 0.6,
  },
  smg: {
    id: "smg",
    name: "SMG",
    type: "gun",
    unlockScore: 1200,
    damage: 11,
    fireRate: 0.085,
    projSpeed: 850,
    spread: 0.09,
    pellets: 1,
    range: 760,
    recoil: 0.45,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    type: "gun",
    unlockScore: 2800,
    damage: 10,
    fireRate: 0.62,
    projSpeed: 760,
    spread: 0.27,
    pellets: 7,
    range: 520,
    recoil: 1.6,
  },
  bat: {
    id: "bat",
    name: "Bat",
    type: "melee",
    unlockScore: 0,
    damage: 34,
    cooldown: 0.44,
    range: 78,
    arc: 1.35,
  },
  sword: {
    id: "sword",
    name: "Sword",
    type: "melee",
    unlockScore: 2200,
    damage: 52,
    cooldown: 0.33,
    range: 96,
    arc: 1.08,
  },
};

const SKINS = [
  {
    id: "ranger",
    name: "Ranger",
    unlockScore: 0,
    body: "#2f73d2",
    head: "#5aa8ff",
    trail: "#68ffd2",
  },
  {
    id: "crimson",
    name: "Crimson",
    unlockScore: 1800,
    body: "#b83a4e",
    head: "#ff7990",
    trail: "#ffc0ca",
  },
  {
    id: "specter",
    name: "Specter",
    unlockScore: 4200,
    body: "#5d4db6",
    head: "#9789f6",
    trail: "#b8b0ff",
  },
  {
    id: "gold",
    name: "Gold Ops",
    unlockScore: 7000,
    body: "#b98a24",
    head: "#ffd772",
    trail: "#fff1bf",
  },
];

const ENEMY_TYPES = {
  walker: {
    id: "walker",
    hp: 40,
    speed: 78,
    touchDamage: 12,
    towerDamage: 11,
    score: 30,
    cash: 18,
    color: "#4e9e58",
    radius: 17,
  },
  runner: {
    id: "runner",
    hp: 26,
    speed: 122,
    touchDamage: 10,
    towerDamage: 9,
    score: 34,
    cash: 20,
    color: "#77bd57",
    radius: 14,
  },
  brute: {
    id: "brute",
    hp: 120,
    speed: 54,
    touchDamage: 26,
    towerDamage: 28,
    score: 110,
    cash: 60,
    color: "#7f5f44",
    radius: 24,
  },
};

const input = {
  keys: new Set(),
  mouse: {
    x: VIEW_W / 2,
    y: VIEW_H / 2,
    down: false,
  },
};

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const angleDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

function loadProfile() {
  const fallback = {
    unlockedWeapons: ["pistol", "bat"],
    unlockedSkins: ["ranger"],
    selectedWeapon: "pistol",
    selectedSkin: "ranger",
    bestScore: 0,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const profile = {
      ...fallback,
      ...parsed,
    };
    profile.unlockedWeapons = Array.from(
      new Set(["pistol", "bat", ...(parsed.unlockedWeapons || [])])
    );
    profile.unlockedSkins = Array.from(
      new Set(["ranger", ...(parsed.unlockedSkins || [])])
    );
    return profile;
  } catch {
    return fallback;
  }
}

function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

const profile = loadProfile();

function getSkinById(id) {
  return SKINS.find((skin) => skin.id === id) || SKINS[0];
}

function createPlayer() {
  return {
    x: TOWER.x,
    y: TOWER.y + 140,
    r: 16,
    hp: 160,
    maxHp: 160,
    speed: 252,
    facing: -Math.PI * 0.5,
    attackCooldown: 0,
    invuln: 0,
    swingTimer: 0,
    trail: [],
  };
}

const state = {
  running: false,
  score: 0,
  cash: 0,
  kills: 0,
  wave: 1,
  toSpawn: 0,
  spawnTimer: 0,
  intermission: 0,
  shake: 0,
  waveBannerTimer: 0,
  waveBannerText: "",
  statusTimer: 0,
  camera: { x: 0, y: 0 },
  tower: {
    hp: 1000,
    maxHp: 1000,
    turretCooldown: 0.45,
  },
  player: createPlayer(),
  enemies: [],
  bullets: [],
  particles: [],
  splats: [],
  selectedWeapon: profile.selectedWeapon,
  selectedSkin: profile.selectedSkin,
};

if (!profile.unlockedWeapons.includes(state.selectedWeapon)) {
  state.selectedWeapon = "pistol";
}
if (!profile.unlockedSkins.includes(state.selectedSkin)) {
  state.selectedSkin = "ranger";
}

function setStatus(text, color = "#93ffd3", duration = 2.4) {
  ui.status.textContent = text;
  ui.status.style.color = color;
  state.statusTimer = duration;
}

function showOverlay(title, text, buttonText) {
  ui.overlayTitle.textContent = title;
  ui.overlayText.textContent = text;
  ui.startBtn.textContent = buttonText;
  ui.overlay.classList.add("visible");
}

function hideOverlay() {
  ui.overlay.classList.remove("visible");
}

function ensureUnlocks() {
  for (const weapon of Object.values(WEAPONS)) {
    if (profile.unlockedWeapons.includes(weapon.id)) continue;
    if (state.score >= weapon.unlockScore) {
      profile.unlockedWeapons.push(weapon.id);
      setStatus(`UNLOCKED WEAPON: ${weapon.name.toUpperCase()}`, "#ffd27a", 3.5);
      saveProfile();
    }
  }

  for (const skin of SKINS) {
    if (profile.unlockedSkins.includes(skin.id)) continue;
    if (state.score >= skin.unlockScore) {
      profile.unlockedSkins.push(skin.id);
      setStatus(`UNLOCKED SKIN: ${skin.name.toUpperCase()}`, "#ffd27a", 3.5);
      saveProfile();
    }
  }
}

function updateHud() {
  ui.score.textContent = Math.floor(state.score).toString();
  ui.wave.textContent = state.wave.toString();
  ui.towerHp.textContent = `${Math.max(
    0,
    Math.round((state.tower.hp / state.tower.maxHp) * 100)
  )}%`;
  ui.playerHp.textContent = `${Math.max(
    0,
    Math.round((state.player.hp / state.player.maxHp) * 100)
  )}%`;
  ui.cash.textContent = Math.floor(state.cash).toString();
  ui.weapon.textContent = WEAPONS[state.selectedWeapon].name.toUpperCase();
  ui.skin.textContent = getSkinById(state.selectedSkin).name.toUpperCase();
}

function selectWeapon(id) {
  if (!profile.unlockedWeapons.includes(id)) {
    setStatus(`LOCKED: ${WEAPONS[id].name.toUpperCase()} (${WEAPONS[id].unlockScore} SCORE)`, "#ff9aa9");
    return;
  }
  state.selectedWeapon = id;
  profile.selectedWeapon = id;
  saveProfile();
  updateHud();
}

function cycleSkin() {
  const unlocked = SKINS.filter((skin) => profile.unlockedSkins.includes(skin.id));
  const currentIndex = unlocked.findIndex((skin) => skin.id === state.selectedSkin);
  const nextSkin = unlocked[(currentIndex + 1) % unlocked.length];
  state.selectedSkin = nextSkin.id;
  profile.selectedSkin = nextSkin.id;
  saveProfile();
  setStatus(`SKIN: ${nextSkin.name.toUpperCase()}`, "#7ef2ff");
  updateHud();
}

function resetGame() {
  state.running = true;
  state.score = 0;
  state.cash = 0;
  state.kills = 0;
  state.wave = 1;
  state.toSpawn = 0;
  state.spawnTimer = 0;
  state.intermission = 0;
  state.shake = 0;
  state.waveBannerTimer = 0;
  state.waveBannerText = "";
  state.statusTimer = 0;
  state.tower.hp = state.tower.maxHp;
  state.tower.turretCooldown = 0.45;
  state.player = createPlayer();
  state.enemies = [];
  state.bullets = [];
  state.particles = [];
  state.splats = [];
  state.camera.x = TOWER.x - VIEW_W * 0.5;
  state.camera.y = TOWER.y - VIEW_H * 0.5;
  startWave(1);
  updateHud();
}

function startWave(num) {
  state.wave = num;
  state.toSpawn = 9 + num * 3;
  state.spawnTimer = 0.6;
  state.waveBannerText = `WAVE ${num}`;
  state.waveBannerTimer = 1.8;
}

function spawnEnemy() {
  let typeId = "walker";
  if (state.wave >= 5 && Math.random() < 0.2) typeId = "brute";
  else if (state.wave >= 3 && Math.random() < 0.38) typeId = "runner";

  const type = ENEMY_TYPES[typeId];
  const side = Math.floor(Math.random() * 4);
  const pad = 90;
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = rand(-pad, WORLD_W + pad);
    y = -pad;
  } else if (side === 1) {
    x = WORLD_W + pad;
    y = rand(-pad, WORLD_H + pad);
  } else if (side === 2) {
    x = rand(-pad, WORLD_W + pad);
    y = WORLD_H + pad;
  } else {
    x = -pad;
    y = rand(-pad, WORLD_H + pad);
  }

  state.enemies.push({
    typeId,
    x,
    y,
    r: type.radius,
    hp: type.hp + Math.floor(state.wave * 1.4),
    speed: type.speed + state.wave * 1.8,
    attackCooldown: rand(0.2, 0.6),
    pushX: 0,
    pushY: 0,
  });
}

function addParticles(x, y, count, color, power = 1, size = 2) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: rand(-1, 1) * 120 * power,
      vy: rand(-1, 1) * 120 * power,
      life: rand(0.1, 0.5),
      maxLife: 0.5,
      color,
      size: Math.max(1, Math.floor(rand(1, size + 1))),
      gravity: 58,
    });
  }
}

function killEnemy(index) {
  const enemy = state.enemies[index];
  const type = ENEMY_TYPES[enemy.typeId];
  state.score += type.score + Math.floor(state.wave * 0.8);
  state.cash += type.cash + Math.floor(state.wave * 0.6);
  state.kills += 1;
  state.shake = Math.max(state.shake, 1.3);
  state.splats.push({
    x: enemy.x,
    y: enemy.y,
    r: rand(5, 13),
    a: rand(0.15, 0.4),
  });
  if (state.splats.length > 280) state.splats.shift();
  addParticles(enemy.x, enemy.y, 10, "#bc233f", 1.1, 3);
  state.enemies.splice(index, 1);
}

function fireGun(weapon, angle) {
  const startX = state.player.x + Math.cos(angle) * 16;
  const startY = state.player.y + Math.sin(angle) * 16;
  for (let p = 0; p < weapon.pellets; p += 1) {
    const spreadAngle = angle + rand(-weapon.spread, weapon.spread);
    state.bullets.push({
      x: startX,
      y: startY,
      vx: Math.cos(spreadAngle) * weapon.projSpeed,
      vy: Math.sin(spreadAngle) * weapon.projSpeed,
      life: weapon.range / weapon.projSpeed,
      damage: weapon.damage,
      from: "player",
      r: 2,
    });
  }
  state.player.attackCooldown = weapon.fireRate;
  state.shake = Math.max(state.shake, weapon.recoil);
  addParticles(startX, startY, 4, "#ffd585", 0.55, 2);
}

function doMelee(weapon, angle) {
  state.player.attackCooldown = weapon.cooldown;
  state.player.swingTimer = 0.12;
  let hitAny = false;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const d = dist(state.player.x, state.player.y, enemy.x, enemy.y);
    if (d > weapon.range + enemy.r) continue;
    const toEnemy = Math.atan2(enemy.y - state.player.y, enemy.x - state.player.x);
    if (Math.abs(angleDiff(toEnemy, angle)) > weapon.arc * 0.5) continue;

    enemy.hp -= weapon.damage;
    enemy.pushX += Math.cos(angle) * 260;
    enemy.pushY += Math.sin(angle) * 260;
    addParticles(enemy.x, enemy.y, 8, "#d43f5a", 0.85, 3);
    hitAny = true;
    if (enemy.hp <= 0) killEnemy(i);
  }

  if (hitAny) {
    state.shake = Math.max(state.shake, 1.2);
  } else {
    state.shake = Math.max(state.shake, 0.4);
  }
}

function towerAutoFire(dt) {
  state.tower.turretCooldown -= dt;
  if (state.tower.turretCooldown > 0 || state.enemies.length === 0) return;

  let target = null;
  let bestDist = Infinity;
  for (const enemy of state.enemies) {
    const d = dist(TOWER.x, TOWER.y, enemy.x, enemy.y);
    if (d < bestDist && d < 430) {
      bestDist = d;
      target = enemy;
    }
  }
  if (!target) return;

  const angle = Math.atan2(target.y - TOWER.y, target.x - TOWER.x);
  state.bullets.push({
    x: TOWER.x + Math.cos(angle) * 24,
    y: TOWER.y + Math.sin(angle) * 24,
    vx: Math.cos(angle) * 720,
    vy: Math.sin(angle) * 720,
    life: 0.75,
    damage: 16 + state.wave * 0.3,
    from: "tower",
    r: 2,
  });
  state.tower.turretCooldown = 0.55;
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      bullet.life <= 0 ||
      bullet.x < -80 ||
      bullet.x > WORLD_W + 80 ||
      bullet.y < -80 ||
      bullet.y > WORLD_H + 80
    ) {
      state.bullets.splice(i, 1);
      continue;
    }

    for (let e = state.enemies.length - 1; e >= 0; e -= 1) {
      const enemy = state.enemies[e];
      if (dist(bullet.x, bullet.y, enemy.x, enemy.y) > enemy.r + bullet.r + 1) continue;
      enemy.hp -= bullet.damage;
      enemy.pushX += bullet.vx * 0.055;
      enemy.pushY += bullet.vy * 0.055;
      addParticles(bullet.x, bullet.y, 4, "#ff7f94", 0.45, 2);
      state.bullets.splice(i, 1);
      if (enemy.hp <= 0) killEnemy(e);
      break;
    }
  }
}

function updateEnemies(dt) {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const type = ENEMY_TYPES[enemy.typeId];
    const dp = dist(enemy.x, enemy.y, state.player.x, state.player.y);
    const pursuePlayer = dp < 260;
    const tx = pursuePlayer ? state.player.x : TOWER.x;
    const ty = pursuePlayer ? state.player.y : TOWER.y;

    const angle = Math.atan2(ty - enemy.y, tx - enemy.x);
    enemy.x += Math.cos(angle) * enemy.speed * dt + enemy.pushX * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt + enemy.pushY * dt;
    enemy.pushX *= 0.78;
    enemy.pushY *= 0.78;
    enemy.attackCooldown -= dt;

    if (enemy.x < -120 || enemy.x > WORLD_W + 120 || enemy.y < -120 || enemy.y > WORLD_H + 120) {
      state.enemies.splice(i, 1);
      continue;
    }

    if (pursuePlayer) {
      const reach = enemy.r + state.player.r + 3;
      if (dp < reach && enemy.attackCooldown <= 0) {
        if (state.player.invuln <= 0) {
          state.player.hp -= type.touchDamage;
          state.player.invuln = 0.46;
          state.shake = Math.max(state.shake, 2.4);
          addParticles(state.player.x, state.player.y, 6, "#ff5d79", 0.7, 2);
        }
        enemy.attackCooldown = 0.72;
      }
    } else {
      const dTower = dist(enemy.x, enemy.y, TOWER.x, TOWER.y);
      const reachTower = enemy.r + TOWER.r + 2;
      if (dTower < reachTower && enemy.attackCooldown <= 0) {
        state.tower.hp -= type.towerDamage;
        enemy.attackCooldown = 0.74;
        state.shake = Math.max(state.shake, 2.8);
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updateWave(dt) {
  if (state.intermission > 0) {
    state.intermission -= dt;
    if (state.intermission <= 0) {
      startWave(state.wave + 1);
    }
    return;
  }

  if (state.toSpawn > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.toSpawn -= 1;
      state.spawnTimer = clamp(0.72 - state.wave * 0.022, 0.2, 0.72) * rand(0.72, 1.22);
    }
  } else if (state.enemies.length === 0) {
    state.intermission = 4;
    state.cash += 120 + state.wave * 36;
    state.score += 120 + state.wave * 42;
    setStatus(`WAVE CLEARED! +BONUS`, "#7dffcb");
  }
}

function tryRepairTower() {
  const nearTower = dist(state.player.x, state.player.y, TOWER.x, TOWER.y) < TOWER.r + 140;
  if (!nearTower) {
    setStatus("MOVE CLOSER TO TOWER TO REPAIR", "#ff9aa9");
    return;
  }
  if (state.cash < 200) {
    setStatus("NOT ENOUGH CASH ($200)", "#ff9aa9");
    return;
  }
  if (state.tower.hp >= state.tower.maxHp) {
    setStatus("TOWER IS FULL", "#ffd27a");
    return;
  }
  state.cash -= 200;
  state.tower.hp = clamp(state.tower.hp + 220, 0, state.tower.maxHp);
  setStatus("TOWER REPAIRED +22%", "#7dffcb");
}

function updatePlayer(dt) {
  const down = (code) => input.keys.has(code);

  let dx = 0;
  let dy = 0;
  if (down("KeyW") || down("ArrowUp")) dy -= 1;
  if (down("KeyS") || down("ArrowDown")) dy += 1;
  if (down("KeyA") || down("ArrowLeft")) dx -= 1;
  if (down("KeyD") || down("ArrowRight")) dx += 1;

  const mag = Math.hypot(dx, dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  }

  const sprinting = down("ShiftLeft") || down("ShiftRight");
  const speed = state.player.speed * (sprinting ? 1.4 : 1);
  state.player.x = clamp(state.player.x + dx * speed * dt, 12, WORLD_W - 12);
  state.player.y = clamp(state.player.y + dy * speed * dt, 12, WORLD_H - 12);

  const worldMouseX = state.camera.x + input.mouse.x;
  const worldMouseY = state.camera.y + input.mouse.y;
  const aim = Math.atan2(worldMouseY - state.player.y, worldMouseX - state.player.x);
  state.player.facing = aim;

  state.player.attackCooldown -= dt;
  state.player.invuln -= dt;
  state.player.swingTimer -= dt;

  state.player.trail.push({
    x: state.player.x,
    y: state.player.y,
    life: 0.2,
  });
  if (state.player.trail.length > 14) state.player.trail.shift();
  for (const trail of state.player.trail) trail.life -= dt;
  state.player.trail = state.player.trail.filter((trail) => trail.life > 0);

  if (input.mouse.down && state.player.attackCooldown <= 0) {
    const weapon = WEAPONS[state.selectedWeapon];
    if (weapon.type === "gun") {
      fireGun(weapon, aim);
    } else {
      doMelee(weapon, aim);
    }
  }
}

function updateCamera(dt) {
  const targetX = clamp(state.player.x - VIEW_W * 0.5, 0, WORLD_W - VIEW_W);
  const targetY = clamp(state.player.y - VIEW_H * 0.5, 0, WORLD_H - VIEW_H);
  state.camera.x += (targetX - state.camera.x) * clamp(8 * dt, 0, 1);
  state.camera.y += (targetY - state.camera.y) * clamp(8 * dt, 0, 1);
}

function update(dt) {
  if (state.statusTimer > 0) {
    state.statusTimer -= dt;
    if (state.statusTimer <= 0) ui.status.textContent = "Hold the perimeter.";
  }

  if (!state.running) {
    updateParticles(dt * 0.3);
    return;
  }

  updatePlayer(dt);
  towerAutoFire(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateParticles(dt);
  updateWave(dt);
  updateCamera(dt);
  ensureUnlocks();

  state.shake = Math.max(0, state.shake - dt * 4.2);
  state.waveBannerTimer = Math.max(0, state.waveBannerTimer - dt);

  if (state.player.hp <= 0 || state.tower.hp <= 0) {
    state.running = false;
    profile.bestScore = Math.max(profile.bestScore, Math.floor(state.score));
    saveProfile();
    showOverlay(
      state.tower.hp <= 0 ? "TOWER FALLEN" : "YOU DIED",
      `Final score ${Math.floor(state.score)} | Best ${profile.bestScore}`,
      "RESTART DEFENSE"
    );
  }

  updateHud();
}

function drawGround(time) {
  ctx.fillStyle = "#0a1018";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const cell = 64;
  for (let y = 0; y < WORLD_H; y += cell) {
    for (let x = 0; x < WORLD_W; x += cell) {
      const c = ((x / cell + y / cell) % 2 === 0) ? "#0f1824" : "#101d2b";
      ctx.fillStyle = c;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  ctx.strokeStyle = "rgba(130, 170, 220, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < WORLD_W; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, WORLD_H);
    ctx.stroke();
  }
  for (let y = 0; y < WORLD_H; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WORLD_W, y + 0.5);
    ctx.stroke();
  }

  for (const splat of state.splats) {
    ctx.fillStyle = `rgba(126, 24, 40, ${splat.a.toFixed(3)})`;
    ctx.fillRect(splat.x - splat.r, splat.y - splat.r, splat.r * 2, splat.r * 2);
  }

  const pulse = 0.24 + Math.abs(Math.sin(time * 1.8)) * 0.16;
  ctx.strokeStyle = `rgba(109, 255, 210, ${pulse.toFixed(3)})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(TOWER.x, TOWER.y, TOWER.r + 24, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTower(time) {
  ctx.fillStyle = "#374d72";
  ctx.beginPath();
  ctx.arc(TOWER.x, TOWER.y, TOWER.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4f6b9a";
  ctx.beginPath();
  ctx.arc(TOWER.x, TOWER.y, TOWER.r - 12, 0, Math.PI * 2);
  ctx.fill();

  const hpRatio = clamp(state.tower.hp / state.tower.maxHp, 0, 1);
  ctx.fillStyle = hpRatio > 0.5 ? "#79ffd8" : hpRatio > 0.25 ? "#ffd166" : "#ff5f78";
  ctx.fillRect(TOWER.x - 50, TOWER.y + TOWER.r + 16, 100 * hpRatio, 6);
  ctx.strokeStyle = "#1a2438";
  ctx.strokeRect(TOWER.x - 50, TOWER.y + TOWER.r + 16, 100, 6);

  const turretAngle = time * 1.8;
  ctx.strokeStyle = "#ffd88d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(TOWER.x, TOWER.y);
  ctx.lineTo(TOWER.x + Math.cos(turretAngle) * 22, TOWER.y + Math.sin(turretAngle) * 22);
  ctx.stroke();
}

function drawEnemy(enemy, time) {
  const type = ENEMY_TYPES[enemy.typeId];
  const x = enemy.x;
  const y = enemy.y;

  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + type.radius + 4, type.radius * 0.9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = type.color;
  ctx.fillRect(Math.floor(x - type.radius), Math.floor(y - type.radius), type.radius * 2, type.radius * 2);

  const blink = Math.sin(time * 9 + x * 0.03) > 0;
  ctx.fillStyle = blink ? "#ffe680" : "#c83b52";
  ctx.fillRect(Math.floor(x - 4), Math.floor(y - type.radius + 5), 2, 2);
  ctx.fillRect(Math.floor(x + 2), Math.floor(y - type.radius + 5), 2, 2);
}

function drawPlayer(time) {
  const skin = getSkinById(state.selectedSkin);
  const p = state.player;
  const x = p.x;
  const y = p.y;

  for (const trail of p.trail) {
    const alpha = clamp(trail.life / 0.2, 0, 1) * 0.4;
    ctx.fillStyle = `${skin.trail}${Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.fillRect(Math.floor(trail.x - 4), Math.floor(trail.y - 4), 8, 8);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + p.r + 4, p.r * 0.85, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const flicker = p.invuln > 0 && Math.sin(time * 40) > 0;
  if (!flicker) {
    ctx.fillStyle = skin.body;
    ctx.fillRect(Math.floor(x - p.r), Math.floor(y - p.r), p.r * 2, p.r * 2);
    ctx.fillStyle = skin.head;
    ctx.fillRect(Math.floor(x - p.r + 2), Math.floor(y - p.r - 9), p.r * 2 - 4, 7);
    ctx.fillStyle = "#ebf6ff";
    ctx.fillRect(Math.floor(x - 4), Math.floor(y - p.r - 6), 2, 2);
    ctx.fillRect(Math.floor(x + 2), Math.floor(y - p.r - 6), 2, 2);
  }

  const weapon = WEAPONS[state.selectedWeapon];
  ctx.strokeStyle = weapon.type === "melee" ? "#f4c673" : "#ffd575";
  ctx.lineWidth = weapon.type === "melee" ? 5 : 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 1);
  const reach = weapon.type === "melee" ? 22 : 17;
  let drawAngle = p.facing;
  if (p.swingTimer > 0 && weapon.type === "melee") {
    drawAngle += Math.sin((0.12 - p.swingTimer) * 38) * 0.55;
  }
  ctx.lineTo(x + Math.cos(drawAngle) * reach, y + Math.sin(drawAngle) * reach);
  ctx.stroke();
}

function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.from === "tower" ? "#9be2ff" : "#ffd166";
    ctx.fillRect(Math.floor(bullet.x - 1), Math.floor(bullet.y - 1), 3, 3);
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

function drawCrosshair() {
  const x = input.mouse.x;
  const y = input.mouse.y;
  ctx.strokeStyle = "#d4ecff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x - 3, y);
  ctx.moveTo(x + 3, y);
  ctx.lineTo(x + 8, y);
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y - 3);
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x, y + 8);
  ctx.stroke();
  ctx.fillStyle = "#d4ecff";
  ctx.fillRect(x - 1, y - 1, 2, 2);
}

function drawWorld(time) {
  const shakeX = state.shake > 0 ? rand(-state.shake, state.shake) : 0;
  const shakeY = state.shake > 0 ? rand(-state.shake, state.shake) : 0;

  ctx.save();
  ctx.translate(-state.camera.x + shakeX, -state.camera.y + shakeY);

  drawGround(time);
  drawTower(time);
  for (const enemy of state.enemies) drawEnemy(enemy, time);
  drawBullets();
  drawParticles();
  drawPlayer(time);

  ctx.restore();

  drawCrosshair();

  if (state.waveBannerTimer > 0) {
    const alpha = clamp(state.waveBannerTimer / 1.8, 0, 1);
    ctx.fillStyle = `rgba(14, 28, 44, ${(0.35 * alpha).toFixed(3)})`;
    ctx.fillRect(VIEW_W * 0.5 - 90, 20, 180, 28);
    ctx.fillStyle = "#79ffd8";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(state.waveBannerText, VIEW_W * 0.5, 38);
  }

  if (state.intermission > 0 && state.running) {
    ctx.fillStyle = "rgba(12, 20, 35, 0.4)";
    ctx.fillRect(14, VIEW_H - 36, 330, 20);
    ctx.fillStyle = "#9fe4ff";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`NEXT WAVE IN ${Math.ceil(state.intermission)}s`, 22, VIEW_H - 22);
  }
}

function render(time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawWorld(time);
}

function toCanvasCoordinates(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((clientY - rect.top) / rect.height) * VIEW_H;
  input.mouse.x = clamp(x, 0, VIEW_W);
  input.mouse.y = clamp(y, 0, VIEW_H);
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
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "KeyC",
    "KeyT",
    "Enter",
  ];
  if (block.includes(event.code)) event.preventDefault();

  if (!event.repeat) {
    if (event.code === "Digit1") selectWeapon("pistol");
    else if (event.code === "Digit2") selectWeapon("smg");
    else if (event.code === "Digit3") selectWeapon("shotgun");
    else if (event.code === "Digit4") selectWeapon("bat");
    else if (event.code === "Digit5") selectWeapon("sword");
    else if (event.code === "KeyC") cycleSkin();
    else if (event.code === "KeyT") tryRepairTower();
    else if (event.code === "Enter" && !state.running && ui.overlay.classList.contains("visible")) {
      hideOverlay();
      resetGame();
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
  if (event.button === 0) input.mouse.down = true;
});

window.addEventListener("mouseup", () => {
  input.mouse.down = false;
});

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  const touch = event.changedTouches[0];
  if (!touch) return;
  toCanvasCoordinates(touch.clientX, touch.clientY);
  input.mouse.down = true;
});

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  const touch = event.changedTouches[0];
  if (!touch) return;
  toCanvasCoordinates(touch.clientX, touch.clientY);
});

canvas.addEventListener("touchend", () => {
  input.mouse.down = false;
});

ui.startBtn.addEventListener("click", () => {
  hideOverlay();
  resetGame();
});

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render(now / 1000);
  requestAnimationFrame(frame);
}

showOverlay(
  "TOWER OUTBREAK DEFENSE",
  "Defend the tower. Run outside and fight with guns, bat, or sword. Unlock new weapons and skins by score.",
  "START DEFENSE"
);
updateHud();
setStatus("Press 1-5 to swap weapons. Press C to change unlocked skin.", "#8fe8ff", 4);
requestAnimationFrame(frame);
