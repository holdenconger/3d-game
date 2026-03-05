const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const ui = {
  score: document.getElementById("score"),
  wave: document.getElementById("wave"),
  hp: document.getElementById("hp"),
  combo: document.getElementById("combo"),
  dodge: document.getElementById("dodge"),
  mats: document.getElementById("mats"),
  build: document.getElementById("build"),
  mapLabel: document.getElementById("map-label"),
  heroLabel: document.getElementById("hero-label"),
  achCount: document.getElementById("ach-count"),
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlayText: document.getElementById("overlay-text"),
  startBtn: document.getElementById("start-btn"),
  mapSector: document.getElementById("map-sector"),
  characterSector: document.getElementById("character-sector"),
  achievementText: document.getElementById("achievement-text"),
};

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

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const setText = (el, text) => {
  if (el) el.textContent = text;
};

const MAPS = [
  {
    id: "neon-block",
    name: "Neon Block",
    description: "Balanced city streets and clean sight lines.",
    zombieSpeedMult: 1,
    spawnRateMult: 1,
    palette: {
      tileA: "#0f161f",
      tileB: "#121d28",
      fog: "rgba(12, 22, 36, 0.62)",
      star: "rgba(164, 214, 255, ALPHA)",
      stain: "rgba(95, 18, 30, ALPHA)",
    },
    structures: [
      { x: 24, y: 24, w: 48, h: 32, kind: "building" },
      { x: 250, y: 20, w: 50, h: 30, kind: "building" },
      { x: 20, y: 124, w: 42, h: 30, kind: "building" },
      { x: 236, y: 116, w: 62, h: 40, kind: "building" },
      { x: 136, y: 34, w: 16, h: 12, kind: "crate" },
      { x: 168, y: 42, w: 14, h: 10, kind: "crate" },
      { x: 146, y: 130, w: 18, h: 12, kind: "crate" },
      { x: 172, y: 116, w: 16, h: 12, kind: "crate" },
    ],
  },
  {
    id: "factory-yard",
    name: "Factory Yard",
    description: "Tight cover lanes. Harder to kite zombies.",
    zombieSpeedMult: 1.07,
    spawnRateMult: 1.08,
    palette: {
      tileA: "#14110f",
      tileB: "#1a1713",
      fog: "rgba(36, 28, 20, 0.6)",
      star: "rgba(255, 219, 160, ALPHA)",
      stain: "rgba(102, 26, 26, ALPHA)",
    },
    structures: [
      { x: 18, y: 20, w: 56, h: 24, kind: "building" },
      { x: 96, y: 24, w: 18, h: 12, kind: "crate" },
      { x: 132, y: 20, w: 56, h: 24, kind: "building" },
      { x: 206, y: 24, w: 18, h: 12, kind: "crate" },
      { x: 238, y: 20, w: 62, h: 24, kind: "building" },
      { x: 24, y: 84, w: 16, h: 12, kind: "crate" },
      { x: 64, y: 74, w: 42, h: 24, kind: "building" },
      { x: 128, y: 84, w: 16, h: 12, kind: "crate" },
      { x: 166, y: 74, w: 42, h: 24, kind: "building" },
      { x: 232, y: 84, w: 16, h: 12, kind: "crate" },
      { x: 262, y: 74, w: 42, h: 24, kind: "building" },
      { x: 24, y: 132, w: 66, h: 28, kind: "building" },
      { x: 112, y: 136, w: 18, h: 12, kind: "crate" },
      { x: 150, y: 132, w: 20, h: 14, kind: "crate" },
      { x: 196, y: 132, w: 104, h: 28, kind: "building" },
    ],
  },
  {
    id: "grave-district",
    name: "Grave District",
    description: "Open center with dangerous side choke points.",
    zombieSpeedMult: 0.95,
    spawnRateMult: 0.94,
    palette: {
      tileA: "#11131a",
      tileB: "#161a22",
      fog: "rgba(17, 17, 30, 0.6)",
      star: "rgba(190, 190, 255, ALPHA)",
      stain: "rgba(80, 12, 42, ALPHA)",
    },
    structures: [
      { x: 16, y: 18, w: 54, h: 24, kind: "building" },
      { x: 16, y: 52, w: 20, h: 12, kind: "crate" },
      { x: 16, y: 72, w: 54, h: 24, kind: "building" },
      { x: 16, y: 106, w: 20, h: 12, kind: "crate" },
      { x: 16, y: 126, w: 54, h: 24, kind: "building" },
      { x: 250, y: 18, w: 54, h: 24, kind: "building" },
      { x: 284, y: 52, w: 20, h: 12, kind: "crate" },
      { x: 250, y: 72, w: 54, h: 24, kind: "building" },
      { x: 284, y: 106, w: 20, h: 12, kind: "crate" },
      { x: 250, y: 126, w: 54, h: 24, kind: "building" },
      { x: 140, y: 34, w: 14, h: 12, kind: "crate" },
      { x: 166, y: 38, w: 12, h: 10, kind: "crate" },
      { x: 144, y: 128, w: 16, h: 12, kind: "crate" },
      { x: 168, y: 122, w: 14, h: 10, kind: "crate" },
    ],
  },
];

const CHARACTERS = [
  {
    id: "survivor",
    name: "Survivor",
    lockedHint: "Default",
    stats: {
      hpBonus: 0,
      speedMult: 1,
      fireRateMult: 1,
      damageMult: 1,
      dodgeBonus: 0,
      startMats: 0,
      buildDiscount: 0,
      matsBonus: 0,
      bodyColor: "#2e6dca",
      headColor: "#54a5ff",
    },
    description: "Balanced all-rounder.",
  },
  {
    id: "scout",
    name: "Scout",
    lockedHint: "Reach Wave 3",
    stats: {
      hpBonus: -1,
      speedMult: 1.22,
      fireRateMult: 1.2,
      damageMult: 0.9,
      dodgeBonus: 1,
      startMats: 0,
      buildDiscount: 0,
      matsBonus: 0,
      bodyColor: "#2f8f7b",
      headColor: "#62d7be",
    },
    description: "Fast mover with extra dodge.",
  },
  {
    id: "tank",
    name: "Tank",
    lockedHint: "Score 1500+ in a run",
    stats: {
      hpBonus: 3,
      speedMult: 0.82,
      fireRateMult: 0.9,
      damageMult: 1.25,
      dodgeBonus: -1,
      startMats: 2,
      buildDiscount: 0,
      matsBonus: 0,
      bodyColor: "#6d4f9a",
      headColor: "#a37fd7",
    },
    description: "Huge HP and stronger shots.",
  },
  {
    id: "engineer",
    name: "Engineer",
    lockedHint: "Build 10 structures in a run",
    stats: {
      hpBonus: 0,
      speedMult: 1,
      fireRateMult: 1,
      damageMult: 1,
      dodgeBonus: 0,
      startMats: 8,
      buildDiscount: 1,
      matsBonus: 1,
      bodyColor: "#ba7b29",
      headColor: "#ffb457",
    },
    description: "Best builder. Cheapest cover.",
  },
];

const ACHIEVEMENTS = [
  {
    id: "wave3",
    title: "Frontline Scout",
    description: "Reach Wave 3",
    unlockCharacterId: "scout",
    check: (state) => state.runStats.maxWave >= 3,
  },
  {
    id: "score1500",
    title: "Heavy Hitter",
    description: "Score 1500 in one run",
    unlockCharacterId: "tank",
    check: (state) => state.score >= 1500,
  },
  {
    id: "builder10",
    title: "Field Architect",
    description: "Build 10 structures in one run",
    unlockCharacterId: "engineer",
    check: (state) => state.runStats.builds >= 10,
  },
];

const BUILD_PARTS = [
  { name: "wall", w: 20, h: 6, kind: "crate", cost: 3 },
  { name: "pillar", w: 12, h: 12, kind: "crate", cost: 2 },
  { name: "room", w: 24, h: 18, kind: "building", cost: 6 },
];

const STORAGE_KEY = "pixel-zombie-profile-v2";

function loadProfile() {
  const fallback = {
    selectedMapId: MAPS[0].id,
    selectedCharacterId: "survivor",
    unlockedCharacters: ["survivor"],
    achievements: {
      wave3: false,
      score1500: false,
      builder10: false,
    },
    bestScore: 0,
    bestWave: 1,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      achievements: {
        ...fallback.achievements,
        ...(parsed.achievements || {}),
      },
      unlockedCharacters: Array.isArray(parsed.unlockedCharacters)
        ? Array.from(new Set(["survivor", ...parsed.unlockedCharacters]))
        : ["survivor"],
    };
  } catch {
    return fallback;
  }
}

function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore write failures in restricted environments.
  }
}

function getMapById(id) {
  return MAPS.find((map) => map.id === id) || MAPS[0];
}

function getCharacterById(id) {
  return CHARACTERS.find((character) => character.id === id) || CHARACTERS[0];
}

function isCharacterUnlocked(characterId) {
  return profile.unlockedCharacters.includes(characterId);
}

function unlockCharacter(characterId) {
  if (!isCharacterUnlocked(characterId)) {
    profile.unlockedCharacters.push(characterId);
  }
}

function completedAchievementCount() {
  return ACHIEVEMENTS.filter((achievement) => profile.achievements[achievement.id]).length;
}

function setOverlay(title, text, buttonText) {
  setText(ui.overlayTitle, title);
  setText(ui.overlayText, text);
  setText(ui.startBtn, buttonText);
  if (ui.overlay) ui.overlay.classList.add("visible");
}

function hideOverlay() {
  if (ui.overlay) ui.overlay.classList.remove("visible");
}

function waveTarget(waveNumber) {
  return 7 + waveNumber * 3;
}

function updateHud() {
  if (!state.player) return;
  setText(ui.score, Math.floor(state.score).toString());
  setText(ui.wave, state.wave.toString());
  setText(ui.hp, Math.max(0, Math.ceil(state.player.hp)).toString());
  setText(ui.combo, `x${state.combo.toFixed(1)}`);
  setText(ui.dodge, `${state.player.dodgeCharges}/${state.player.maxDodgeCharges}`);
  setText(ui.mats, state.materials.toString());
  setText(ui.mapLabel, state.map.name);
  setText(ui.heroLabel, state.character.name);
  setText(ui.achCount, `${completedAchievementCount()}/${ACHIEVEMENTS.length}`);

  if (ui.build) {
    if (!state.buildMode) {
      ui.build.textContent = "FIGHT";
    } else {
      const part = getBuildPart();
      ui.build.textContent = `${part.name.toUpperCase()} $${getBuildPartCost(part)}`;
    }
  }
}

function refreshAchievementText() {
  if (!ui.achievementText) return;
  const lines = ACHIEVEMENTS.map((achievement) => {
    const done = profile.achievements[achievement.id];
    const marker = done ? "[DONE]" : "[ ]";
    return `${marker} ${achievement.description}`;
  });
  ui.achievementText.textContent = lines.join("   ");
}

function renderMapSector() {
  if (!ui.mapSector) return;
  ui.mapSector.innerHTML = "";

  for (const map of MAPS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sector-chip";
    if (profile.selectedMapId === map.id) button.classList.add("selected");
    button.innerHTML = `${map.name}<small>${map.description}</small>`;
    button.addEventListener("click", () => {
      profile.selectedMapId = map.id;
      state.map = getMapById(profile.selectedMapId);
      spawnStars();
      updateHud();
      saveProfile();
      renderMapSector();
    });
    ui.mapSector.appendChild(button);
  }
}

function renderCharacterSector() {
  if (!ui.characterSector) return;
  ui.characterSector.innerHTML = "";

  for (const character of CHARACTERS) {
    const unlocked = isCharacterUnlocked(character.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sector-chip";
    if (profile.selectedCharacterId === character.id) button.classList.add("selected");
    if (!unlocked) button.classList.add("locked");

    const subtitle = unlocked ? character.description : `LOCKED: ${character.lockedHint}`;
    button.innerHTML = `${character.name}<small>${subtitle}</small>`;

    button.addEventListener("click", () => {
      if (!unlocked) return;
      profile.selectedCharacterId = character.id;
      state.character = getCharacterById(profile.selectedCharacterId);
      updateHud();
      saveProfile();
      renderCharacterSector();
    });

    ui.characterSector.appendChild(button);
  }
}

function applyProfileSelections() {
  state.map = getMapById(profile.selectedMapId);
  const selectedCharacter = getCharacterById(profile.selectedCharacterId);
  if (isCharacterUnlocked(selectedCharacter.id)) {
    state.character = selectedCharacter;
  } else {
    state.character = getCharacterById("survivor");
    profile.selectedCharacterId = "survivor";
  }
}

function spawnStars() {
  state.stars.length = 0;
  for (let i = 0; i < 40; i += 1) {
    state.stars.push({
      x: Math.floor(rand(0, WORLD.w)),
      y: Math.floor(rand(0, WORLD.h)),
      t: rand(0.2, 1.2),
    });
  }
}

function createPlayerFromCharacter(character) {
  const stats = character.stats;
  return {
    x: WORLD.w * 0.5,
    y: WORLD.h * 0.55,
    r: 5,
    hp: 5 + stats.hpBonus,
    maxHp: 5 + stats.hpBonus,
    speed: 70 * stats.speedMult,
    shotCooldown: 0,
    shotInterval: 0.11 / stats.fireRateMult,
    bulletDamage: stats.damageMult,
    hitCooldown: 0,
    dashTime: 0,
    dashDirX: 0,
    dashDirY: 0,
    dodgeCharges: Math.max(1, 2 + stats.dodgeBonus),
    maxDodgeCharges: Math.max(1, 2 + stats.dodgeBonus),
    dodgeRegen: 0,
    buildDiscount: stats.buildDiscount,
    matsBonus: stats.matsBonus,
    trail: [],
    bodyColor: stats.bodyColor,
    headColor: stats.headColor,
  };
}

function cloneMapStructures(map) {
  return map.structures.map((item) => ({ ...item }));
}

function resetGame() {
  applyProfileSelections();
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
  state.bannerText = `WAVE 1 - ${state.map.name}`;
  state.bannerTimer = 1.6;
  state.shake = 0;
  state.announcementText = "";
  state.announcementTimer = 0;
  state.bullets = [];
  state.enemyShots = [];
  state.zombies = [];
  state.particles = [];
  state.pickups = [];
  state.stains = [];
  state.structures = cloneMapStructures(state.map);
  state.buildMode = false;
  state.buildIndex = 0;
  state.buildRotation = 0;
  state.player = createPlayerFromCharacter(state.character);
  state.materials = 12 + state.character.stats.startMats;
  state.runStats = {
    maxWave: 1,
    builds: 0,
  };

  spawnStars();
  updateHud();
}

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
  let distanceSq = dx * dx + dy * dy;
  const radiusSq = entity.r * entity.r;

  if (distanceSq >= radiusSq) return;

  if (distanceSq === 0) {
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
    distanceSq = 1;
  }

  const distance = Math.sqrt(distanceSq);
  const overlap = entity.r - distance;
  entity.x += (dx / distance) * overlap;
  entity.y += (dy / distance) * overlap;
}

function moveEntityWithCollisions(entity, moveX, moveY) {
  entity.x += moveX;
  for (const structure of state.structures) {
    resolveCircleRect(entity, structure);
  }

  entity.y += moveY;
  for (const structure of state.structures) {
    resolveCircleRect(entity, structure);
  }

  entity.x = clamp(entity.x, entity.r + 1, WORLD.w - entity.r - 1);
  entity.y = clamp(entity.y, entity.r + 1, WORLD.h - entity.r - 1);
}

function projectileBlockedByStructures(x, y, radius = 1) {
  for (const structure of state.structures) {
    if (circleHitsRect(x, y, radius, structure)) return true;
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
    if (projectileBlockedByStructures(x, y, 1)) return true;
  }
  return false;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function getBuildPart() {
  return BUILD_PARTS[state.buildIndex % BUILD_PARTS.length];
}

function getBuildPartCost(part) {
  return Math.max(1, part.cost - state.player.buildDiscount);
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
  return { x, y, w, h, kind: part.kind };
}

function isBuildPlacementValid(candidate) {
  if (
    candidate.x < 1 ||
    candidate.y < 1 ||
    candidate.x + candidate.w > WORLD.w - 1 ||
    candidate.y + candidate.h > WORLD.h - 1
  ) {
    return false;
  }

  for (const structure of state.structures) {
    if (rectsOverlap(candidate, structure)) return false;
  }

  if (state.player && circleHitsRect(state.player.x, state.player.y, state.player.r + 2, candidate)) {
    return false;
  }

  for (const zombie of state.zombies) {
    if (circleHitsRect(zombie.x, zombie.y, zombie.r + 1, candidate)) return false;
  }

  return true;
}

function placeBuildPart() {
  if (!state.running || !state.buildMode) return;
  const part = getBuildPart();
  const cost = getBuildPartCost(part);
  const candidate = getBuildPlacement();
  const valid = isBuildPlacementValid(candidate);

  if (!valid || state.materials < cost) return;

  state.structures.push(candidate);
  state.materials -= cost;
  state.runStats.builds += 1;
  state.shake = Math.max(state.shake, 1.1);
  announce("Structure placed");
  evaluateAchievements();
}

function announce(text) {
  state.announcementText = text;
  state.announcementTimer = 1.7;
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

  const spawnSpitter = state.wave >= 2 && Math.random() < clamp(0.1 + state.wave * 0.015, 0.1, 0.32);

  state.zombies.push({
    x,
    y,
    r: 5,
    hp: spawnSpitter ? 3 + Math.floor(state.wave * 0.15) : 2 + Math.floor(state.wave * 0.2),
    speed: rand(16, 28) * (1 + state.wave * 0.05) * state.map.zombieSpeedMult * (spawnSpitter ? 0.82 : 1),
    type: spawnSpitter ? "spitter" : "walker",
    pushX: 0,
    pushY: 0,
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

function spawnParticles(x, y, amount, colorA, colorB, power = 1) {
  for (let i = 0; i < amount; i += 1) {
    state.particles.push({
      x,
      y,
      vx: rand(-45, 45) * power,
      vy: rand(-45, 45) * power,
      life: rand(0.12, 0.45),
      maxLife: 0.45,
      color: Math.random() > 0.3 ? colorA : colorB,
      size: Math.floor(rand(1, 3)),
      gravity: 35,
    });
  }
}

function fireBullet() {
  const player = state.player;
  const angle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);
  const speed = 168;
  const startX = player.x + Math.cos(angle) * 7;
  const startY = player.y + Math.sin(angle) * 7;

  state.bullets.push({
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 0.9,
    r: 1.5,
    damage: player.bulletDamage,
  });

  spawnParticles(startX, startY, 4, "#ffd166", "#ff9e2a", 0.7);
  player.shotCooldown = player.shotInterval;
  state.shake = Math.max(state.shake, 0.9);
}

function startDodge(dx, dy) {
  const player = state.player;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude < 0.001 || player.dodgeCharges <= 0 || player.dashTime > 0) return;

  player.dashDirX = dx / magnitude;
  player.dashDirY = dy / magnitude;
  player.dashTime = 0.18;
  player.dodgeCharges -= 1;
  if (player.dodgeRegen <= 0) player.dodgeRegen = 1.05;
  state.shake = Math.max(state.shake, 1.8);
}

function hitPlayer(amount) {
  const player = state.player;
  if (player.hitCooldown > 0 || player.dashTime > 0) return;

  player.hp -= amount;
  player.hitCooldown = 0.86;
  state.combo = 1;
  state.comboTimer = 0;
  state.shake = Math.max(state.shake, 5);
  spawnParticles(player.x, player.y, 8, "#ff4d61", "#8e1f2e", 1);

  if (player.hp <= 0) {
    state.running = false;
    profile.bestScore = Math.max(profile.bestScore, Math.floor(state.score));
    profile.bestWave = Math.max(profile.bestWave, state.wave);
    saveProfile();
    renderCharacterSector();
    refreshAchievementText();
    setOverlay(
      "YOU WERE EATEN",
      `Score ${Math.floor(state.score)} | Wave ${state.wave} | Best ${profile.bestScore}`,
      "PLAY AGAIN"
    );
  }
}

function evaluateAchievements() {
  let unlockedAny = false;

  for (const achievement of ACHIEVEMENTS) {
    if (profile.achievements[achievement.id]) continue;
    if (!achievement.check(state)) continue;

    profile.achievements[achievement.id] = true;
    unlockCharacter(achievement.unlockCharacterId);
    unlockedAny = true;

    const unlockedCharacter = getCharacterById(achievement.unlockCharacterId);
    announce(`Achievement: ${achievement.title} | Unlocked ${unlockedCharacter.name}`);
  }

  if (unlockedAny) {
    saveProfile();
    renderCharacterSector();
    refreshAchievementText();
  }
}

function updateWave(dt) {
  if (state.waveBreak > 0) {
    state.waveBreak -= dt;
    return;
  }

  if (state.waveSpawned < state.waveTarget) {
    state.spawnTimer -= dt;
    const gap = clamp(0.82 - state.wave * 0.03, 0.22, 0.82) / state.map.spawnRateMult;
    if (state.spawnTimer <= 0) {
      spawnZombie();
      state.waveSpawned += 1;
      state.spawnTimer = gap * rand(0.7, 1.24);
    }
  }

  if (state.waveKilled >= state.waveTarget && state.zombies.length === 0) {
    state.wave += 1;
    state.runStats.maxWave = Math.max(state.runStats.maxWave, state.wave);
    state.waveTarget = waveTarget(state.wave);
    state.waveSpawned = 0;
    state.waveKilled = 0;
    state.waveBreak = 2.1;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
    state.materials += 2;
    state.combo = 1;
    state.comboTimer = 0;
    state.bannerText = `WAVE ${state.wave}`;
    state.bannerTimer = 1.45;
    state.shake = Math.max(state.shake, 2.4);
    evaluateAchievements();
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      bullet.life <= 0 ||
      bullet.x < -2 ||
      bullet.x > WORLD.w + 2 ||
      bullet.y < -2 ||
      bullet.y > WORLD.h + 2
    ) {
      state.bullets.splice(i, 1);
      continue;
    }

    if (projectileBlockedByStructures(bullet.x, bullet.y, bullet.r + 0.2)) {
      state.bullets.splice(i, 1);
      continue;
    }

    for (let z = state.zombies.length - 1; z >= 0; z -= 1) {
      const zombie = state.zombies[z];
      if (Math.hypot(bullet.x - zombie.x, bullet.y - zombie.y) > bullet.r + zombie.r + 1) continue;

      zombie.hp -= bullet.damage;
      zombie.pushX += bullet.vx * 0.04;
      zombie.pushY += bullet.vy * 0.04;
      spawnParticles(bullet.x, bullet.y, 5, "#ff4d61", "#8e1f2e", 0.65);
      state.bullets.splice(i, 1);

      if (zombie.hp <= 0) {
        state.zombies.splice(z, 1);
        state.waveKilled += 1;
        state.score += Math.floor(35 * state.combo);
        state.combo = clamp(state.combo + 0.24, 1, 9.9);
        state.comboTimer = 2.35;
        state.materials += (zombie.type === "spitter" ? 2 : 1) + state.player.matsBonus;
        state.shake = Math.max(state.shake, 2.6);
        state.stains.push({
          x: Math.floor(zombie.x),
          y: Math.floor(zombie.y),
          r: Math.floor(rand(2, 5)),
          a: rand(0.2, 0.46),
        });
        if (state.stains.length > 100) state.stains.shift();
        spawnParticles(zombie.x, zombie.y, 12, "#ff4d61", "#8e1f2e", 1.2);
        if (Math.random() < 0.12) spawnPickup(zombie.x, zombie.y);
      } else {
        state.score += Math.floor(6 * state.combo);
      }

      evaluateAchievements();
      break;
    }
  }
}

function updateZombies(dt) {
  const player = state.player;

  for (let i = state.zombies.length - 1; i >= 0; i -= 1) {
    const zombie = state.zombies[i];
    const toX = player.x - zombie.x;
    const toY = player.y - zombie.y;
    const distance = Math.hypot(toX, toY) || 1;
    const nx = toX / distance;
    const ny = toY / distance;

    moveEntityWithCollisions(
      zombie,
      nx * zombie.speed * dt + zombie.pushX * dt,
      ny * zombie.speed * dt + zombie.pushY * dt
    );

    zombie.pushX *= 0.75;
    zombie.pushY *= 0.75;
    zombie.fireCooldown -= dt;

    if (
      zombie.type === "spitter" &&
      zombie.fireCooldown <= 0 &&
      distance < 145 &&
      !lineBlockedByStructures(zombie.x, zombie.y, player.x, player.y)
    ) {
      const angle = Math.atan2(player.y - zombie.y, player.x - zombie.x);
      state.enemyShots.push({
        x: zombie.x + Math.cos(angle) * 6,
        y: zombie.y + Math.sin(angle) * 6,
        vx: Math.cos(angle) * 70,
        vy: Math.sin(angle) * 70,
        r: 2,
        life: 2.2,
      });
      zombie.fireCooldown = rand(1.15, 2.05);
    }

    if (distance < zombie.r + player.r + 0.4) {
      hitPlayer(1);
    }
  }
}

function updateEnemyShots(dt) {
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

    if (Math.hypot(shot.x - state.player.x, shot.y - state.player.y) < shot.r + state.player.r) {
      state.enemyShots.splice(i, 1);
      hitPlayer(1);
    }
  }
}

function updatePickups(dt) {
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = state.pickups[i];
    pickup.life -= dt;
    if (pickup.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }

    if (Math.hypot(pickup.x - state.player.x, pickup.y - state.player.y) < pickup.r + state.player.r + 1) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
      state.score += 25;
      state.materials += 2;
      state.pickups.splice(i, 1);
      spawnParticles(pickup.x, pickup.y, 10, "#66ffd2", "#2ddfaa", 0.8);
      evaluateAchievements();
    }
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const particle = state.particles[i];
    particle.vy += particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    if (particle.life <= 0) state.particles.splice(i, 1);
  }
}

function update(dt) {
  if (!state.player) return;

  if (!state.running) {
    updateParticles(dt * 0.4);
    return;
  }

  const player = state.player;
  const down = (code) => input.keys.has(code);

  let dx = 0;
  let dy = 0;
  if (down("KeyW") || down("ArrowUp")) dy -= 1;
  if (down("KeyS") || down("ArrowDown")) dy += 1;
  if (down("KeyA") || down("ArrowLeft")) dx -= 1;
  if (down("KeyD") || down("ArrowRight")) dx += 1;

  const magnitude = Math.hypot(dx, dy);
  if (magnitude > 0) {
    dx /= magnitude;
    dy /= magnitude;
  }

  if ((down("ShiftLeft") || down("ShiftRight")) && magnitude > 0 && player.dashTime <= 0) {
    startDodge(dx, dy);
  }

  player.shotCooldown -= dt;
  player.hitCooldown -= dt;
  player.dashTime -= dt;

  if (player.dodgeCharges < player.maxDodgeCharges) {
    player.dodgeRegen -= dt;
    if (player.dodgeRegen <= 0) {
      player.dodgeCharges += 1;
      player.dodgeRegen = player.dodgeCharges < player.maxDodgeCharges ? 1.05 : 0;
    }
  }

  let speed = player.speed;
  if (player.dashTime > 0) {
    speed *= 4.2;
    dx = player.dashDirX;
    dy = player.dashDirY;
  }

  moveEntityWithCollisions(player, dx * speed * dt, dy * speed * dt);

  player.trail.push({ x: player.x, y: player.y, life: 0.2 });
  if (player.trail.length > 12) player.trail.shift();
  for (const segment of player.trail) segment.life -= dt;
  player.trail = player.trail.filter((segment) => segment.life > 0);

  const firing = input.keys.has("Space") || (!state.buildMode && input.mouse.down);
  if (firing && player.shotCooldown <= 0) {
    fireBullet();
  }

  updateBullets(dt);
  updateZombies(dt);
  updateEnemyShots(dt);
  updatePickups(dt);
  updateParticles(dt);
  updateWave(dt);

  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
  } else {
    state.combo = clamp(state.combo - dt * 0.45, 1, 9.9);
  }

  state.shake = Math.max(0, state.shake - dt * 4.4);
  state.bannerTimer = Math.max(0, state.bannerTimer - dt);
  state.announcementTimer = Math.max(0, state.announcementTimer - dt);

  updateHud();
}

function drawBackground(time) {
  const palette = state.map.palette;
  ctx.fillStyle = palette.tileA;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  for (let y = 0; y < WORLD.h; y += 8) {
    for (let x = 0; x < WORLD.w; x += 8) {
      ctx.fillStyle = ((x + y) / 8) % 2 === 0 ? palette.tileA : palette.tileB;
      ctx.fillRect(x, y, 8, 8);
    }
  }

  for (const star of state.stars) {
    const alpha = 0.2 + Math.abs(Math.sin(time * star.t + star.x * 0.08)) * 0.3;
    ctx.fillStyle = palette.star.replace("ALPHA", alpha.toFixed(3));
    ctx.fillRect(star.x, star.y, 1, 1);
  }

  ctx.fillStyle = palette.fog;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  for (const stain of state.stains) {
    ctx.fillStyle = state.map.palette.stain.replace("ALPHA", stain.a.toFixed(3));
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
        ctx.fillStyle = `rgba(108, 198, 255, ${glow.toFixed(3)})`;
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

function drawBuildPreview() {
  if (!state.running || !state.buildMode) return;
  const part = getBuildPart();
  const cost = getBuildPartCost(part);
  const placement = getBuildPlacement();
  const valid = isBuildPlacementValid(placement);
  const canAfford = state.materials >= cost;

  const ok = valid && canAfford;
  ctx.fillStyle = ok ? "rgba(88, 255, 190, 0.26)" : "rgba(255, 90, 110, 0.26)";
  ctx.fillRect(placement.x, placement.y, placement.w, placement.h);
  ctx.strokeStyle = ok ? "#6dffd2" : "#ff8ca0";
  ctx.lineWidth = 1;
  ctx.strokeRect(placement.x + 0.5, placement.y + 0.5, placement.w - 1, placement.h - 1);

  ctx.fillStyle = "#dff4ff";
  ctx.font = "6px 'Press Start 2P', monospace";
  ctx.textAlign = "left";
  const labelY = placement.y > 10 ? placement.y - 3 : placement.y + placement.h + 8;
  ctx.fillText(`${part.name} $${cost}`, placement.x, labelY);
}

function drawPickup(pickup, time) {
  const bob = Math.sin(time * 5 + pickup.x * 0.08) * 0.8;
  const x = Math.floor(pickup.x);
  const y = Math.floor(pickup.y + bob);
  const pulse = 0.32 + Math.sin(time * 8) * 0.08;

  ctx.fillStyle = `rgba(102, 255, 210, ${pulse.toFixed(3)})`;
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
  const player = state.player;
  const x = Math.floor(player.x);
  const y = Math.floor(player.y);
  const angle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);

  for (const trail of player.trail) {
    const alpha = clamp(trail.life / 0.2, 0, 1) * 0.45;
    ctx.fillStyle = `rgba(85, 255, 210, ${alpha.toFixed(3)})`;
    ctx.fillRect(Math.floor(trail.x - 3), Math.floor(trail.y - 3), 6, 6);
  }

  const flicker = player.hitCooldown > 0 && Math.sin(time * 40) > 0;
  if (!flicker) {
    ctx.fillStyle = player.bodyColor;
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = player.headColor;
    ctx.fillRect(x - 3, y - 8, 6, 5);
    ctx.fillStyle = "#e5f3ff";
    ctx.fillRect(x - 2, y - 7, 1, 1);
    ctx.fillRect(x + 1, y - 7, 1, 1);
  }

  ctx.strokeStyle = "#f6bf4b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 1);
  ctx.lineTo(Math.floor(x + Math.cos(angle) * 6), Math.floor(y + Math.sin(angle) * 6));
  ctx.stroke();
}

function drawBullet(bullet) {
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(Math.floor(bullet.x - 1), Math.floor(bullet.y - 1), 2, 2);
}

function drawEnemyShot(shot, time) {
  const pulse = Math.sin(time * 12 + shot.x * 0.1) > 0 ? "#b6ff72" : "#8fe05a";
  ctx.fillStyle = pulse;
  ctx.fillRect(Math.floor(shot.x - 2), Math.floor(shot.y - 2), 4, 4);
  ctx.fillStyle = "#447a2b";
  ctx.fillRect(Math.floor(shot.x - 1), Math.floor(shot.y - 1), 2, 2);
}

function drawParticle(particle) {
  const alpha = clamp(particle.life / particle.maxLife, 0, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = particle.color;
  ctx.fillRect(Math.floor(particle.x), Math.floor(particle.y), particle.size, particle.size);
  ctx.globalAlpha = 1;
}

function drawCrosshair(time) {
  const x = Math.floor(input.mouse.x);
  const y = Math.floor(input.mouse.y);
  const color = Math.sin(time * 9) > 0 ? "#e2f4ff" : "#9ec3df";

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
  const alpha = 0.35 + Math.abs(Math.sin(state.bannerTimer * 12)) * 0.2;
  ctx.fillStyle = `rgba(12, 25, 42, ${alpha.toFixed(3)})`;
  ctx.fillRect(66, 10, 188, 22);
  ctx.fillStyle = "#79ffd8";
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText(state.bannerText, WORLD.w / 2, 24);
}

function drawAnnouncement() {
  if (state.announcementTimer <= 0 || !state.announcementText) return;
  const alpha = clamp(state.announcementTimer / 1.7, 0, 1);
  ctx.fillStyle = `rgba(24, 40, 65, ${(0.4 * alpha).toFixed(3)})`;
  ctx.fillRect(28, WORLD.h - 20, WORLD.w - 56, 12);
  ctx.fillStyle = "#8dffd3";
  ctx.font = "6px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText(state.announcementText, WORLD.w / 2, WORLD.h - 11);
}

function drawScreenFlash() {
  if (state.player.hitCooldown <= 0) return;
  const alpha = clamp(state.player.hitCooldown / 0.86, 0, 1) * 0.18;
  ctx.fillStyle = `rgba(255, 70, 95, ${alpha.toFixed(3)})`;
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
  for (const zombie of state.zombies) drawZombie(zombie, time);
  for (const bullet of state.bullets) drawBullet(bullet);
  for (const shot of state.enemyShots) drawEnemyShot(shot, time);
  for (const particle of state.particles) drawParticle(particle);
  if (state.player) drawPlayer(time);

  ctx.restore();

  drawCrosshair(time);
  drawBanner();
  drawAnnouncement();
  drawScreenFlash();

  if (!state.running && state.player) {
    ctx.fillStyle = "rgba(6, 10, 15, 0.4)";
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
    "Enter",
  ];
  if (block.includes(event.code)) event.preventDefault();

  if (!event.repeat) {
    if (event.code === "Enter" && !state.running && ui.overlay.classList.contains("visible")) {
      hideOverlay();
      resetGame();
    } else if (event.code === "KeyB" && state.running) {
      state.buildMode = !state.buildMode;
      input.mouse.down = false;
      updateHud();
    } else if (event.code === "KeyR" && state.running && state.buildMode) {
      state.buildRotation = (state.buildRotation + 1) % 2;
      updateHud();
    } else if (event.code === "KeyQ" && state.running && state.buildMode) {
      state.buildIndex = (state.buildIndex - 1 + BUILD_PARTS.length) % BUILD_PARTS.length;
      updateHud();
    } else if (event.code === "KeyE" && state.running && state.buildMode) {
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
  if (event.button !== 0) return;

  if (state.running && state.buildMode) {
    placeBuildPart();
    return;
  }

  input.mouse.down = true;
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

ui.startBtn.addEventListener("click", () => {
  hideOverlay();
  resetGame();
});

const profile = loadProfile();

const state = {
  running: false,
  map: MAPS[0],
  character: CHARACTERS[0],
  score: 0,
  wave: 1,
  waveTarget: waveTarget(1),
  waveSpawned: 0,
  waveKilled: 0,
  waveBreak: 1.2,
  spawnTimer: 0.2,
  combo: 1,
  comboTimer: 0,
  bannerText: "",
  bannerTimer: 0,
  announcementText: "",
  announcementTimer: 0,
  shake: 0,
  bullets: [],
  enemyShots: [],
  zombies: [],
  particles: [],
  pickups: [],
  stains: [],
  stars: [],
  structures: [],
  materials: 12,
  buildMode: false,
  buildIndex: 0,
  buildRotation: 0,
  player: null,
  runStats: {
    maxWave: 1,
    builds: 0,
  },
};

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render(now / 1000);
  requestAnimationFrame(frame);
}

applyProfileSelections();
renderMapSector();
renderCharacterSector();
refreshAchievementText();
spawnStars();
state.player = createPlayerFromCharacter(state.character);
updateHud();
setOverlay(
  "PIXEL ZOMBIE SIEGE",
  "Choose your map and hero. Unlock new heroes through achievements.",
  "START GAME"
);
requestAnimationFrame(frame);
