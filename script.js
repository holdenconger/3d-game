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
const WORLD_W = 3400;
const GROUND_Y = 445;
const GRAVITY = 1700;
const STORAGE_KEY = "pixel-tower-sideview-v1";

const TOWER = {
  x: 130,
  w: 124,
  h: 220,
  maxHp: 1500,
};
TOWER.y = GROUND_Y - TOWER.h;

const WEAPONS = {
  pistol: {
    id: "pistol",
    name: "Pistol",
    type: "gun",
    unlockScore: 0,
    damage: 18,
    fireRate: 0.2,
    speed: 940,
    spread: 0.02,
    pellets: 1,
    recoil: 0.6,
    life: 1.1,
  },
  smg: {
    id: "smg",
    name: "SMG",
    type: "gun",
    unlockScore: 1200,
    damage: 11,
    fireRate: 0.085,
    speed: 1000,
    spread: 0.09,
    pellets: 1,
    recoil: 0.45,
    life: 0.95,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    type: "gun",
    unlockScore: 2600,
    damage: 9,
    fireRate: 0.58,
    speed: 900,
    spread: 0.26,
    pellets: 7,
    recoil: 1.3,
    life: 0.55,
  },
  bat: {
    id: "bat",
    name: "Bat",
    type: "melee",
    unlockScore: 0,
    damage: 34,
    cooldown: 0.42,
    range: 86,
    arc: 1.45,
  },
  sword: {
    id: "sword",
    name: "Sword",
    type: "melee",
    unlockScore: 2000,
    damage: 52,
    cooldown: 0.31,
    range: 102,
    arc: 1.12,
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
    unlockScore: 1600,
    body: "#b83a4e",
    head: "#ff7990",
    trail: "#ffc0ca",
  },
  {
    id: "specter",
    name: "Specter",
    unlockScore: 3800,
    body: "#5d4db6",
    head: "#9789f6",
    trail: "#b8b0ff",
  },
  {
    id: "gold",
    name: "Gold Ops",
    unlockScore: 6500,
    body: "#b98a24",
    head: "#ffd772",
    trail: "#fff1bf",
  },
];

const ENEMIES = {
  walker: {
    hp: 42,
    speed: 84,
    touch: 12,
    tower: 11,
    score: 30,
    cash: 20,
    w: 28,
    h: 44,
    body: "#4e9e58",
  },
  runner: {
    hp: 28,
    speed: 134,
    touch: 11,
    tower: 9,
    score: 36,
    cash: 24,
    w: 24,
    h: 36,
    body: "#7bbf57",
  },
  brute: {
    hp: 140,
    speed: 58,
    touch: 24,
    tower: 28,
    score: 120,
    cash: 72,
    w: 42,
    h: 62,
    body: "#7f5f44",
  },
};

const input = {
  keys: new Set(),
  mouse: { x: VIEW_W / 2, y: VIEW_H / 2, down: false },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
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
    return {
      ...fallback,
      ...parsed,
      unlockedWeapons: Array.from(new Set(["pistol", "bat", ...(parsed.unlockedWeapons || [])])),
      unlockedSkins: Array.from(new Set(["ranger", ...(parsed.unlockedSkins || [])])),
    };
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

function getSkin(id) {
  return SKINS.find((skin) => skin.id === id) || SKINS[0];
}

function setStatus(text, color = "#93ffd3", duration = 2.2) {
  ui.status.textContent = text;
  ui.status.style.color = color;
  state.statusTimer = duration;
}

function showOverlay(title, text, button) {
  ui.overlayTitle.textContent = title;
  ui.overlayText.textContent = text;
  ui.startBtn.textContent = button;
  ui.overlay.classList.add("visible");
}

function hideOverlay() {
  ui.overlay.classList.remove("visible");
}

function createPlayer() {
  return {
    x: TOWER.x + TOWER.w + 26,
    y: GROUND_Y - 24,
    w: 28,
    h: 48,
    vx: 0,
    vy: 0,
    hp: 180,
    maxHp: 180,
    speed: 300,
    facing: 1,
    attackCooldown: 0,
    invuln: 0,
    swingTimer: 0,
    trail: [],
    onGround: true,
  };
}

const state = {
  running: false,
  score: 0,
  cash: 0,
  wave: 1,
  kills: 0,
  toSpawn: 0,
  spawnTimer: 0,
  intermission: 0,
  cameraX: 0,
  shake: 0,
  waveBanner: "",
  waveBannerTimer: 0,
  statusTimer: 0,
  tower: { hp: TOWER.maxHp, maxHp: TOWER.maxHp, turretCooldown: 0.45 },
  player: createPlayer(),
  enemies: [],
  bullets: [],
  particles: [],
  splats: [],
  selectedWeapon: profile.selectedWeapon,
  selectedSkin: profile.selectedSkin,
};

if (!profile.unlockedWeapons.includes(state.selectedWeapon)) state.selectedWeapon = "pistol";
if (!profile.unlockedSkins.includes(state.selectedSkin)) state.selectedSkin = "ranger";

function updateHud() {
  ui.score.textContent = Math.floor(state.score).toString();
  ui.wave.textContent = state.wave.toString();
  ui.towerHp.textContent = `${Math.max(0, Math.round((state.tower.hp / state.tower.maxHp) * 100))}%`;
  ui.playerHp.textContent = `${Math.max(0, Math.round((state.player.hp / state.player.maxHp) * 100))}%`;
  ui.cash.textContent = Math.floor(state.cash).toString();
  ui.weapon.textContent = WEAPONS[state.selectedWeapon].name.toUpperCase();
  ui.skin.textContent = getSkin(state.selectedSkin).name.toUpperCase();
}

function ensureUnlocks() {
  for (const weapon of Object.values(WEAPONS)) {
    if (profile.unlockedWeapons.includes(weapon.id)) continue;
    if (state.score >= weapon.unlockScore) {
      profile.unlockedWeapons.push(weapon.id);
      setStatus(`UNLOCKED WEAPON: ${weapon.name.toUpperCase()}`, "#ffd27a", 3.2);
      saveProfile();
    }
  }
  for (const skin of SKINS) {
    if (profile.unlockedSkins.includes(skin.id)) continue;
    if (state.score >= skin.unlockScore) {
      profile.unlockedSkins.push(skin.id);
      setStatus(`UNLOCKED SKIN: ${skin.name.toUpperCase()}`, "#ffd27a", 3.2);
      saveProfile();
    }
  }
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
  const idx = unlocked.findIndex((skin) => skin.id === state.selectedSkin);
  const next = unlocked[(idx + 1) % unlocked.length];
  state.selectedSkin = next.id;
  profile.selectedSkin = next.id;
  saveProfile();
  setStatus(`SKIN: ${next.name.toUpperCase()}`, "#7ef2ff");
  updateHud();
}

function startWave(number) {
  state.wave = number;
  state.toSpawn = 10 + number * 3;
  state.spawnTimer = 0.6;
  state.waveBanner = `WAVE ${number}`;
  state.waveBannerTimer = 1.8;
}

function resetGame() {
  state.running = true;
  state.score = 0;
  state.cash = 0;
  state.wave = 1;
  state.kills = 0;
  state.toSpawn = 0;
  state.spawnTimer = 0;
  state.intermission = 0;
  state.cameraX = 0;
  state.shake = 0;
  state.waveBanner = "";
  state.waveBannerTimer = 0;
  state.statusTimer = 0;
  state.tower.hp = state.tower.maxHp;
  state.tower.turretCooldown = 0.45;
  state.player = createPlayer();
  state.enemies = [];
  state.bullets = [];
  state.particles = [];
  state.splats = [];
  startWave(1);
  updateHud();
}

function addParticles(x, y, count, color, power = 1, maxSize = 3) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: rand(-1, 1) * 140 * power,
      vy: rand(-1, 1) * 140 * power,
      life: rand(0.12, 0.48),
      maxLife: 0.48,
      color,
      size: Math.max(1, Math.floor(rand(1, maxSize + 1))),
      gravity: 62,
    });
  }
}

function spawnEnemy() {
  let typeId = "walker";
  if (state.wave >= 5 && Math.random() < 0.22) typeId = "brute";
  else if (state.wave >= 3 && Math.random() < 0.38) typeId = "runner";

  const type = ENEMIES[typeId];
  const x = WORLD_W + rand(40, 260);
  const y = GROUND_Y - type.h * 0.5;

  state.enemies.push({
    typeId,
    x,
    y,
    w: type.w,
    h: type.h,
    hp: type.hp + Math.floor(state.wave * 1.35),
    speed: type.speed + state.wave * 1.4,
    vx: 0,
    vy: 0,
    attackCooldown: rand(0.2, 0.6),
    pushX: 0,
  });
}

function killEnemy(index) {
  const enemy = state.enemies[index];
  const type = ENEMIES[enemy.typeId];
  state.score += type.score + Math.floor(state.wave * 0.7);
  state.cash += type.cash + Math.floor(state.wave * 0.6);
  state.kills += 1;
  state.shake = Math.max(state.shake, 1.2);
  state.splats.push({
    x: enemy.x,
    y: GROUND_Y - 4,
    w: rand(10, 24),
    a: rand(0.14, 0.36),
  });
  if (state.splats.length > 320) state.splats.shift();
  addParticles(enemy.x, enemy.y, 10, "#bc233f", 1.1, 3);
  state.enemies.splice(index, 1);
}

function fireGun(weapon, angle) {
  const px = state.player.x + Math.cos(angle) * 14;
  const py = state.player.y - 8 + Math.sin(angle) * 14;
  for (let i = 0; i < weapon.pellets; i += 1) {
    const a = angle + rand(-weapon.spread, weapon.spread);
    state.bullets.push({
      x: px,
      y: py,
      vx: Math.cos(a) * weapon.speed,
      vy: Math.sin(a) * weapon.speed,
      life: weapon.life,
      damage: weapon.damage,
      from: "player",
      r: 2,
    });
  }
  state.player.attackCooldown = weapon.fireRate;
  state.shake = Math.max(state.shake, weapon.recoil);
  addParticles(px, py, 4, "#ffd585", 0.55, 2);
}

function doMelee(weapon, angle) {
  state.player.attackCooldown = weapon.cooldown;
  state.player.swingTimer = 0.12;
  let hit = false;
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    const d = dist(state.player.x, state.player.y - 10, e.x, e.y - 10);
    if (d > weapon.range + e.w * 0.35) continue;
    const toEnemy = Math.atan2(e.y - state.player.y, e.x - state.player.x);
    if (Math.abs(angleDiff(toEnemy, angle)) > weapon.arc * 0.5) continue;
    e.hp -= weapon.damage;
    e.pushX += Math.cos(angle) * 280;
    addParticles(e.x, e.y - 8, 8, "#d43f5a", 0.9, 3);
    hit = true;
    if (e.hp <= 0) killEnemy(i);
  }
  state.shake = Math.max(state.shake, hit ? 1.2 : 0.45);
}

function towerTurret(dt) {
  state.tower.turretCooldown -= dt;
  if (state.tower.turretCooldown > 0) return;
  let target = null;
  let best = Infinity;
  const tx = TOWER.x + TOWER.w - 8;
  const ty = TOWER.y + 34;
  for (const e of state.enemies) {
    const d = dist(tx, ty, e.x, e.y - 12);
    if (d < best && d < 480) {
      best = d;
      target = e;
    }
  }
  if (!target) return;
  const angle = Math.atan2(target.y - 12 - ty, target.x - tx);
  state.bullets.push({
    x: tx,
    y: ty,
    vx: Math.cos(angle) * 780,
    vy: Math.sin(angle) * 780,
    life: 0.8,
    damage: 16 + state.wave * 0.32,
    from: "tower",
    r: 2,
  });
  state.tower.turretCooldown = 0.5;
}

function enemyTouchesPlayer(enemy) {
  return (
    Math.abs(enemy.x - state.player.x) < enemy.w * 0.5 + state.player.w * 0.5 - 4 &&
    Math.abs(enemy.y - state.player.y) < enemy.h * 0.5 + state.player.h * 0.5 - 6
  );
}

function damagePlayer(amount) {
  if (state.player.invuln > 0) return;
  state.player.hp -= amount;
  state.player.invuln = 0.45;
  state.shake = Math.max(state.shake, 2.4);
  addParticles(state.player.x, state.player.y - 8, 7, "#ff5d79", 0.7, 2);
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (
      b.life <= 0 ||
      b.x < -140 ||
      b.x > WORLD_W + 140 ||
      b.y < -120 ||
      b.y > VIEW_H + 220
    ) {
      state.bullets.splice(i, 1);
      continue;
    }

    if (b.y > GROUND_Y + 5) {
      state.bullets.splice(i, 1);
      continue;
    }

    for (let e = state.enemies.length - 1; e >= 0; e -= 1) {
      const enemy = state.enemies[e];
      if (Math.abs(b.x - enemy.x) > enemy.w * 0.5 + 3) continue;
      if (Math.abs(b.y - (enemy.y - 8)) > enemy.h * 0.5 + 3) continue;
      enemy.hp -= b.damage;
      enemy.pushX += b.vx * 0.05;
      addParticles(b.x, b.y, 4, "#ff7f94", 0.45, 2);
      state.bullets.splice(i, 1);
      if (enemy.hp <= 0) killEnemy(e);
      break;
    }
  }
}

function updateEnemies(dt) {
  const towerFront = TOWER.x + TOWER.w;
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const type = ENEMIES[enemy.typeId];

    const nearPlayer = dist(enemy.x, enemy.y, state.player.x, state.player.y) < 170;
    const targetX = nearPlayer ? state.player.x : towerFront;
    const dir = targetX < enemy.x ? -1 : 1;

    enemy.vx = dir * enemy.speed + enemy.pushX;
    enemy.x += enemy.vx * dt;
    enemy.pushX *= 0.8;
    enemy.attackCooldown -= dt;

    if (enemy.x < towerFront + enemy.w * 0.5 + 2) {
      enemy.x = towerFront + enemy.w * 0.5 + 2;
      if (enemy.attackCooldown <= 0) {
        state.tower.hp -= type.tower;
        state.shake = Math.max(state.shake, 2.6);
        enemy.attackCooldown = 0.72;
      }
    }

    if (enemyTouchesPlayer(enemy) && enemy.attackCooldown <= 0) {
      damagePlayer(type.touch);
      enemy.attackCooldown = 0.72;
    }

    if (enemy.x < -220 || enemy.x > WORLD_W + 220) {
      state.enemies.splice(i, 1);
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
    if (state.intermission <= 0) startWave(state.wave + 1);
    return;
  }

  if (state.toSpawn > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.toSpawn -= 1;
      state.spawnTimer = clamp(0.74 - state.wave * 0.022, 0.2, 0.74) * rand(0.72, 1.18);
    }
  } else if (state.enemies.length === 0) {
    state.intermission = 4;
    state.cash += 120 + state.wave * 34;
    state.score += 120 + state.wave * 40;
    setStatus("WAVE CLEARED! BONUS INCOME", "#7dffcb");
  }
}

function tryRepairTower() {
  const near = dist(state.player.x, state.player.y, towerFrontX(), GROUND_Y - 50) < 170;
  if (!near) return setStatus("MOVE CLOSER TO TOWER TO REPAIR", "#ff9aa9");
  if (state.cash < 200) return setStatus("NOT ENOUGH CASH ($200)", "#ff9aa9");
  if (state.tower.hp >= state.tower.maxHp) return setStatus("TOWER FULL", "#ffd27a");
  state.cash -= 200;
  state.tower.hp = clamp(state.tower.hp + 220, 0, state.tower.maxHp);
  setStatus("TOWER REPAIRED +22%", "#7dffcb");
}

function towerFrontX() {
  return TOWER.x + TOWER.w;
}

function updatePlayer(dt) {
  const down = (k) => input.keys.has(k);
  const p = state.player;

  let move = 0;
  if (down("KeyA") || down("ArrowLeft")) move -= 1;
  if (down("KeyD") || down("ArrowRight")) move += 1;

  const sprint = down("ShiftLeft") || down("ShiftRight");
  const targetSpeed = move * p.speed * (sprint ? 1.35 : 1);
  p.vx += (targetSpeed - p.vx) * clamp(dt * 12, 0, 1);

  if ((down("KeyW") || down("ArrowUp") || down("Space")) && p.onGround) {
    p.vy = -620;
    p.onGround = false;
  }

  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  if (p.y + p.h * 0.5 >= GROUND_Y) {
    p.y = GROUND_Y - p.h * 0.5;
    p.vy = 0;
    p.onGround = true;
  }

  p.x = clamp(p.x, 40, WORLD_W - 40);

  const worldMouseX = state.cameraX + input.mouse.x;
  const worldMouseY = input.mouse.y;
  const aim = Math.atan2(worldMouseY - (p.y - 10), worldMouseX - p.x);
  p.facing = aim;

  p.attackCooldown -= dt;
  p.invuln -= dt;
  p.swingTimer -= dt;

  p.trail.push({ x: p.x, y: p.y, life: 0.2 });
  if (p.trail.length > 14) p.trail.shift();
  for (const t of p.trail) t.life -= dt;
  p.trail = p.trail.filter((t) => t.life > 0);

  if (input.mouse.down && p.attackCooldown <= 0) {
    const weapon = WEAPONS[state.selectedWeapon];
    if (weapon.type === "gun") fireGun(weapon, aim);
    else doMelee(weapon, aim);
  }
}

function updateCamera(dt) {
  const target = clamp(state.player.x - VIEW_W * 0.42, 0, WORLD_W - VIEW_W);
  state.cameraX += (target - state.cameraX) * clamp(9 * dt, 0, 1);
}

function update(dt) {
  if (state.statusTimer > 0) {
    state.statusTimer -= dt;
    if (state.statusTimer <= 0) ui.status.textContent = "Hold the wall.";
  }

  if (!state.running) {
    updateParticles(dt * 0.3);
    return;
  }

  updatePlayer(dt);
  towerTurret(dt);
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
      state.tower.hp <= 0 ? "TOWER DESTROYED" : "YOU DIED",
      `Final score ${Math.floor(state.score)} | Best ${profile.bestScore}`,
      "RESTART DEFENSE"
    );
  }

  updateHud();
}

function drawBackground(time) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, "#0e1627");
  sky.addColorStop(1, "#1b293c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const moonX = 740 - state.cameraX * 0.04;
  const moonY = 94;
  ctx.fillStyle = "#d8ebff";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a2636";
  for (let i = 0; i < 7; i += 1) {
    const x = i * 320 - (state.cameraX * 0.2) % 320;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y - 120);
    ctx.lineTo(x + 160, GROUND_Y - 230);
    ctx.lineTo(x + 320, GROUND_Y - 120);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#223247";
  for (let i = 0; i < 8; i += 1) {
    const x = i * 280 - (state.cameraX * 0.35) % 280;
    ctx.fillRect(x, GROUND_Y - 170, 40, 170);
    ctx.fillRect(x + 50, GROUND_Y - 220, 36, 220);
    ctx.fillRect(x + 92, GROUND_Y - 145, 42, 145);
  }
}

function drawGround() {
  const cell = 48;
  const start = Math.floor(state.cameraX / cell) * cell;
  for (let x = start; x < state.cameraX + VIEW_W + cell; x += cell) {
    const screenX = x - state.cameraX;
    ctx.fillStyle = ((x / cell) % 2 === 0) ? "#1f2b3a" : "#233346";
    ctx.fillRect(screenX, GROUND_Y, cell, VIEW_H - GROUND_Y);
  }
  ctx.fillStyle = "#2e3f57";
  ctx.fillRect(0, GROUND_Y - 7, VIEW_W, 7);
}

function drawTower(time) {
  const x = TOWER.x - state.cameraX;
  const y = TOWER.y;

  ctx.fillStyle = "#314663";
  ctx.fillRect(x, y, TOWER.w, TOWER.h);
  ctx.fillStyle = "#425d83";
  ctx.fillRect(x + 4, y + 4, TOWER.w - 8, 18);

  ctx.fillStyle = "#24344b";
  for (let wy = y + 28; wy < y + TOWER.h - 20; wy += 26) {
    for (let wx = x + 12; wx < x + TOWER.w - 10; wx += 24) {
      ctx.fillRect(wx, wy, 12, 12);
      const glow = 0.36 + Math.abs(Math.sin(time * 2 + wx * 0.02)) * 0.2;
      ctx.fillStyle = `rgba(116, 206, 255, ${glow.toFixed(3)})`;
      ctx.fillRect(wx + 2, wy + 2, 8, 8);
      ctx.fillStyle = "#24344b";
    }
  }

  ctx.fillStyle = "#2a3d58";
  ctx.fillRect(x + TOWER.w - 16, y + 26, 16, 22);

  const hp = clamp(state.tower.hp / state.tower.maxHp, 0, 1);
  ctx.fillStyle = hp > 0.5 ? "#79ffd8" : hp > 0.25 ? "#ffd166" : "#ff5f78";
  ctx.fillRect(x + 10, y - 11, (TOWER.w - 20) * hp, 6);
  ctx.strokeStyle = "#102033";
  ctx.strokeRect(x + 10, y - 11, TOWER.w - 20, 6);
}

function drawEnemy(enemy, time) {
  const type = ENEMIES[enemy.typeId];
  const x = enemy.x - state.cameraX;
  const y = enemy.y;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x - enemy.w * 0.34, GROUND_Y + 2, enemy.w * 0.68, 4);
  ctx.fillStyle = type.body;
  ctx.fillRect(x - enemy.w * 0.5, y - enemy.h * 0.5, enemy.w, enemy.h);
  const blink = Math.sin(time * 9 + x * 0.03) > 0;
  ctx.fillStyle = blink ? "#ffe680" : "#c83b52";
  ctx.fillRect(x - 6, y - enemy.h * 0.5 + 8, 3, 3);
  ctx.fillRect(x + 3, y - enemy.h * 0.5 + 8, 3, 3);
}

function drawPlayer(time) {
  const p = state.player;
  const skin = getSkin(state.selectedSkin);
  const x = p.x - state.cameraX;
  const y = p.y;

  for (const t of p.trail) {
    const alpha = clamp(t.life / 0.2, 0, 1) * 0.4;
    ctx.fillStyle = `${skin.trail}${Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.fillRect(Math.floor(t.x - state.cameraX - 4), Math.floor(t.y - 4), 8, 8);
  }

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x - p.w * 0.35, GROUND_Y + 2, p.w * 0.7, 4);

  const flicker = p.invuln > 0 && Math.sin(time * 40) > 0;
  if (!flicker) {
    ctx.fillStyle = skin.body;
    ctx.fillRect(x - p.w * 0.5, y - p.h * 0.5, p.w, p.h);
    ctx.fillStyle = skin.head;
    ctx.fillRect(x - p.w * 0.5 + 2, y - p.h * 0.5 - 10, p.w - 4, 8);
    ctx.fillStyle = "#ebf6ff";
    ctx.fillRect(x - 5, y - p.h * 0.5 - 8, 2, 2);
    ctx.fillRect(x + 3, y - p.h * 0.5 - 8, 2, 2);
  }

  const weapon = WEAPONS[state.selectedWeapon];
  let angle = p.facing;
  if (weapon.type === "melee" && p.swingTimer > 0) {
    angle += Math.sin((0.12 - p.swingTimer) * 38) * 0.6;
  }
  const reach = weapon.type === "melee" ? 24 : 18;
  ctx.strokeStyle = weapon.type === "melee" ? "#f4c673" : "#ffd575";
  ctx.lineWidth = weapon.type === "melee" ? 5 : 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x + Math.cos(angle) * reach, y - 8 + Math.sin(angle) * reach);
  ctx.stroke();
}

function drawBullets() {
  for (const b of state.bullets) {
    const x = b.x - state.cameraX;
    ctx.fillStyle = b.from === "tower" ? "#9be2ff" : "#ffd166";
    ctx.fillRect(Math.floor(x - 1), Math.floor(b.y - 1), 3, 3);
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const x = p.x - state.cameraX;
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(x), Math.floor(p.y), p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

function drawSplats() {
  for (const s of state.splats) {
    const x = s.x - state.cameraX;
    ctx.fillStyle = `rgba(120, 22, 36, ${s.a.toFixed(3)})`;
    ctx.fillRect(x - s.w * 0.5, s.y, s.w, 4);
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

function render(time) {
  drawBackground(time);

  const shakeX = state.shake > 0 ? rand(-state.shake, state.shake) : 0;
  const shakeY = state.shake > 0 ? rand(-state.shake, state.shake) : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawGround();
  drawSplats();
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
    ctx.fillRect(VIEW_W * 0.5 - 92, 20, 184, 28);
    ctx.fillStyle = "#79ffd8";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(state.waveBanner, VIEW_W * 0.5, 38);
  }

  if (state.intermission > 0 && state.running) {
    ctx.fillStyle = "rgba(12,20,35,0.42)";
    ctx.fillRect(14, VIEW_H - 36, 340, 20);
    ctx.fillStyle = "#9fe4ff";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`NEXT WAVE IN ${Math.ceil(state.intermission)}s`, 22, VIEW_H - 22);
  }
}

function toCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  input.mouse.x = clamp(((clientX - rect.left) / rect.width) * VIEW_W, 0, VIEW_W);
  input.mouse.y = clamp(((clientY - rect.top) / rect.height) * VIEW_H, 0, VIEW_H);
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
  toCanvas(event.clientX, event.clientY);
});

canvas.addEventListener("mousedown", (event) => {
  toCanvas(event.clientX, event.clientY);
  if (event.button === 0) input.mouse.down = true;
});

window.addEventListener("mouseup", () => {
  input.mouse.down = false;
});

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  const touch = event.changedTouches[0];
  if (!touch) return;
  toCanvas(touch.clientX, touch.clientY);
  input.mouse.down = true;
});

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  const touch = event.changedTouches[0];
  if (!touch) return;
  toCanvas(touch.clientX, touch.clientY);
});

canvas.addEventListener("touchend", () => {
  input.mouse.down = false;
});

ui.startBtn.addEventListener("click", () => {
  hideOverlay();
  resetGame();
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  render(now / 1000);
  requestAnimationFrame(frame);
}

showOverlay(
  "PIXEL TOWER SIEGE",
  "Side-view defense. Go outside the tower and fight with guns, bat, or sword. Unlock gear by score.",
  "START DEFENSE"
);
updateHud();
setStatus("A/D move, W jump, click attack. 1-5 weapons, C skin.", "#8fe8ff", 4);
requestAnimationFrame(frame);
