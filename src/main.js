// School Computer 3D Driving Game
// Runs in a browser (Three.js vendored for offline use).

import * as THREE from "../vendor/three.module.js";

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("game"));
const speedEl = document.getElementById("speed");
const statusEl = document.getElementById("status");
const overlayEl = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const helpBtn = document.getElementById("helpBtn");

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function setOverlayVisible(visible) {
  overlayEl?.classList.toggle("hidden", !visible);
}

// --- Audio (tiny engine tone, optional) ---
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let muted = false;

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  engineOsc = audioCtx.createOscillator();
  engineGain = audioCtx.createGain();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 60;
  engineGain.gain.value = 0.0;
  engineOsc.connect(engineGain);
  engineGain.connect(audioCtx.destination);
  engineOsc.start();
}

function setEngineSound(speed01) {
  if (!audioCtx || !engineOsc || !engineGain) return;
  const on = muted ? 0 : 1;
  engineOsc.frequency.setTargetAtTime(60 + speed01 * 240, audioCtx.currentTime, 0.03);
  engineGain.gain.setTargetAtTime(on * (0.02 + speed01 * 0.06), audioCtx.currentTime, 0.05);
}

function toggleMute() {
  muted = !muted;
  statusEl.textContent = muted ? "Muted" : "Unmuted";
  if (audioCtx && engineGain) engineGain.gain.value = 0;
}

// --- Renderer / Scene ---
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x0b1220, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b1220, 70, 220);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 900);
camera.position.set(0, 6, 12);

// Lights
const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x213042, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(40, 60, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 180;
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
scene.add(sun);

// Ground
const groundSize = 220;
const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 1, 1);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x173125,
  roughness: 1.0,
  metalness: 0.0,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Subtle grid helper (as "grass lines")
const grid = new THREE.GridHelper(groundSize, 44, 0x2a4a3b, 0x213a2f);
grid.material.transparent = true;
grid.material.opacity = 0.22;
grid.position.y = 0.01;
scene.add(grid);

// Track (simple ring road)
const track = new THREE.Group();
scene.add(track);

const trackOuterR = 42;
const trackInnerR = 24;
const roadColor = 0x1b1f2b;
const edgeColor = 0xdde3ff;

function makeRingMesh(innerR, outerR, y, color, roughness = 0.95) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ShapeGeometry(shape, 96);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

const road = makeRingMesh(trackInnerR, trackOuterR, 0.02, roadColor, 0.9);
track.add(road);

// Road edge stripes (two thin rings)
const stripeW = 0.6;
const stripeOuter = makeRingMesh(trackOuterR - stripeW, trackOuterR, 0.03, edgeColor, 0.7);
const stripeInner = makeRingMesh(trackInnerR, trackInnerR + stripeW, 0.03, edgeColor, 0.7);
track.add(stripeOuter, stripeInner);

// Checkpoint arch (simple goal)
const arch = new THREE.Group();
arch.position.set(trackOuterR - 2, 0, 0);
arch.rotation.y = -Math.PI / 2;
scene.add(arch);

const archMat = new THREE.MeshStandardMaterial({ color: 0x7cdbff, roughness: 0.35 });
const archLegGeo = new THREE.BoxGeometry(0.5, 3.0, 0.5);
const archTopGeo = new THREE.BoxGeometry(0.5, 0.5, 6.5);
const legL = new THREE.Mesh(archLegGeo, archMat);
const legR = new THREE.Mesh(archLegGeo, archMat);
legL.position.set(0, 1.5, -3.25);
legR.position.set(0, 1.5, 3.25);
const top = new THREE.Mesh(archTopGeo, archMat);
top.position.set(0, 3.0, 0);
[legL, legR, top].forEach((m) => {
  m.castShadow = true;
  m.receiveShadow = true;
  arch.add(m);
});

// Obstacles (cones)
const obstacles = [];
const obstacleBoxes = [];

function addCone(x, z) {
  const cone = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xffb34d, roughness: 0.8 });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const base = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 18), baseMat);
  base.position.y = 0.6;
  base.castShadow = true;
  base.receiveShadow = true;
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.47, 0.22, 18), tipMat);
  stripe.position.y = 0.52;
  stripe.castShadow = true;
  stripe.receiveShadow = true;
  cone.add(base, stripe);
  cone.position.set(x, 0, z);
  scene.add(cone);
  obstacles.push(cone);

  const box = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(x, 0.6, z),
    new THREE.Vector3(1.1, 1.3, 1.1)
  );
  obstacleBoxes.push(box);
}

// Place cones along the inside of the track + a chicane
for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2;
  const r = lerp(trackInnerR + 3, trackOuterR - 3, (i % 2) * 0.25 + 0.35);
  addCone(Math.cos(a) * r, Math.sin(a) * r);
}
for (let i = 0; i < 6; i++) {
  addCone(8 + i * 1.3, 9 + (i % 2 ? 1.2 : -1.2));
}

// --- Car ---
const car = new THREE.Group();
scene.add(car);

const carBodyMat = new THREE.MeshStandardMaterial({ color: 0x78ff8a, roughness: 0.35 });
const carGlassMat = new THREE.MeshStandardMaterial({
  color: 0x9bd7ff,
  roughness: 0.15,
  metalness: 0.2,
  transparent: true,
  opacity: 0.65,
});
const carWheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 3.0), carBodyMat);
body.position.y = 0.45;
body.castShadow = true;
body.receiveShadow = true;
car.add(body);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.48, 1.4), carGlassMat);
cabin.position.set(0, 0.78, -0.25);
cabin.castShadow = true;
cabin.receiveShadow = true;
car.add(cabin);

const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 18);
wheelGeo.rotateZ(Math.PI / 2);

function addWheel(x, z) {
  const w = new THREE.Mesh(wheelGeo, carWheelMat);
  w.position.set(x, 0.25, z);
  w.castShadow = true;
  w.receiveShadow = true;
  car.add(w);
  return w;
}

const wheelFL = addWheel(-0.78, 1.05);
const wheelFR = addWheel(0.78, 1.05);
const wheelRL = addWheel(-0.78, -1.05);
const wheelRR = addWheel(0.78, -1.05);

// Car state
const carState = {
  pos: new THREE.Vector3(trackOuterR - 6, 0, 0),
  vel: new THREE.Vector3(0, 0, 0),
  yaw: Math.PI, // facing -X
  yawRate: 0,
  speed: 0,
  grounded: true,
};

const carHalfSize = new THREE.Vector3(0.95, 0.6, 1.65);
const carBox = new THREE.Box3();

function updateCarBox() {
  // Approx AABB in world space (good enough for cones)
  carBox.setFromCenterAndSize(new THREE.Vector3(car.position.x, 0.55, car.position.z), carHalfSize.clone().multiplyScalar(2));
}

// Input
const keys = new Set();
let started = false;

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "KeyH") setOverlayVisible(overlayEl.classList.contains("hidden"));
  if (e.code === "KeyR") resetCar();
  if (e.code === "KeyM") toggleMute();
  if (e.code === "Space") e.preventDefault();

  // On first interaction, allow audio
  if (!started) return;
  ensureAudio();
  if (audioCtx?.state === "suspended") audioCtx.resume();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

startBtn?.addEventListener("click", () => {
  started = true;
  setOverlayVisible(false);
  statusEl.textContent = "Go!";
  ensureAudio();
  if (audioCtx?.state === "suspended") audioCtx.resume();
});

helpBtn?.addEventListener("click", () => {
  setOverlayVisible(true);
});

function resetCar() {
  carState.pos.set(trackOuterR - 6, 0, 0);
  carState.vel.set(0, 0, 0);
  carState.yaw = Math.PI;
  carState.yawRate = 0;
  carState.speed = 0;
  statusEl.textContent = "Reset";
}

// --- Gameplay bounds ---
const playBounds = {
  rMax: 85,
  rMin: 4,
};

function isOnRoad(x, z) {
  const r = Math.hypot(x, z);
  return r >= trackInnerR && r <= trackOuterR;
}

// --- Camera follow ---
const camTarget = new THREE.Vector3();
const camPosDesired = new THREE.Vector3();

function updateCamera(dt) {
  const forward = new THREE.Vector3(Math.sin(carState.yaw), 0, Math.cos(carState.yaw));
  camTarget.copy(car.position).add(new THREE.Vector3(0, 1.0, 0));
  camPosDesired.copy(car.position)
    .addScaledVector(forward, -8.5)
    .add(new THREE.Vector3(0, 4.6, 0));

  // Smooth follow
  camera.position.lerp(camPosDesired, 1 - Math.pow(0.001, dt));
  camera.lookAt(camTarget);
}

// --- Physics parameters (arcade) ---
const params = {
  accel: 24, // m/s^2 (ish)
  brake: 30,
  reverseAccel: 12,
  maxSpeed: 28, // m/s
  maxReverse: 10,
  steerAtLow: 2.9, // rad/s
  steerAtHigh: 1.2,
  lateralGrip: 10.0,
  driftGrip: 5.0,
  drag: 0.8,
  offroadDrag: 2.1,
  bounce: 0.35,
};

function step(dt) {
  if (!started) return;

  // Inputs
  const throttle = keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0;
  const brake = keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0;
  const left = keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0;
  const right = keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0;
  const handbrake = keys.has("Space") ? 1 : 0;

  // Forward/right directions from yaw
  const forward = new THREE.Vector3(Math.sin(carState.yaw), 0, Math.cos(carState.yaw));
  const rightV = new THREE.Vector3(forward.z, 0, -forward.x);

  // Decompose velocity
  const v = carState.vel;
  const vForward = v.dot(forward);
  const vSide = v.dot(rightV);

  // Acceleration/brake along forward axis
  let aForward = 0;
  if (throttle) {
    if (vForward >= 0) aForward += params.accel;
    else aForward += params.brake * 0.6; // help recover from reverse
  }
  if (brake) {
    if (vForward > 0.2) aForward -= params.brake;
    else aForward -= params.reverseAccel;
  }

  // Steering (speed dependent)
  const speedAbs = Math.abs(vForward);
  const steerMax = lerp(params.steerAtLow, params.steerAtHigh, clamp(speedAbs / params.maxSpeed, 0, 1));
  const steerInput = right - left;
  carState.yawRate = steerInput * steerMax * (0.6 + 0.4 * clamp(speedAbs / 6, 0, 1));
  carState.yaw += carState.yawRate * dt * (handbrake ? 1.2 : 1.0);

  // Apply forward accel
  v.addScaledVector(forward, aForward * dt);

  // Lateral grip / drift
  const grip = handbrake ? params.driftGrip : params.lateralGrip;
  const sideCorrection = -vSide * grip;
  v.addScaledVector(rightV, sideCorrection * dt);

  // Drag (more offroad)
  const offroad = !isOnRoad(carState.pos.x, carState.pos.z);
  const drag = offroad ? params.offroadDrag : params.drag;
  v.multiplyScalar(Math.exp(-drag * dt));

  // Speed limits
  const newVForward = v.dot(forward);
  const vForwardClamped = clamp(newVForward, -params.maxReverse, params.maxSpeed);
  v.addScaledVector(forward, vForwardClamped - newVForward);

  // Integrate position
  carState.pos.addScaledVector(v, dt);

  // Bounds (simple circular arena)
  const r = Math.hypot(carState.pos.x, carState.pos.z);
  if (r > playBounds.rMax) {
    const n = new THREE.Vector3(carState.pos.x, 0, carState.pos.z).normalize();
    carState.pos.copy(n.multiplyScalar(playBounds.rMax));
    // reflect velocity
    const vn = v.dot(n);
    v.addScaledVector(n, -(1 + params.bounce) * vn);
    statusEl.textContent = "Hit boundary";
  }
  if (r < playBounds.rMin) {
    const n = new THREE.Vector3(carState.pos.x, 0, carState.pos.z).normalize();
    if (n.lengthSq() < 1e-6) n.set(1, 0, 0);
    carState.pos.copy(n.multiplyScalar(playBounds.rMin));
    const vn = v.dot(n);
    v.addScaledVector(n, -(1 + params.bounce) * vn);
    statusEl.textContent = "Center bump";
  }

  // Cone collisions (AABB vs AABB)
  car.position.set(carState.pos.x, 0, carState.pos.z);
  car.rotation.y = carState.yaw;
  updateCarBox();

  for (let i = 0; i < obstacleBoxes.length; i++) {
    const box = obstacleBoxes[i];
    if (!carBox.intersectsBox(box)) continue;

    // Push away from cone center
    const center = new THREE.Vector3();
    box.getCenter(center);
    const push = new THREE.Vector3(car.position.x - center.x, 0, car.position.z - center.z);
    const len = push.length() || 1;
    push.multiplyScalar(1 / len);
    carState.pos.addScaledVector(push, 0.6);
    v.addScaledVector(push, 6.0);
    statusEl.textContent = "Bonk!";
  }

  // Visuals: wheels spin & steer
  const speed = v.length();
  const wheelSpin = speed * dt * 2.6;
  wheelFL.rotation.x += wheelSpin;
  wheelFR.rotation.x += wheelSpin;
  wheelRL.rotation.x += wheelSpin;
  wheelRR.rotation.x += wheelSpin;
  const steerAngle = steerInput * 0.45;
  wheelFL.rotation.y = steerAngle;
  wheelFR.rotation.y = steerAngle;

  // HUD
  carState.speed = speed;
  const kmh = Math.round(speed * 3.6);
  speedEl.textContent = `${kmh} km/h`;

  // Engine sound
  setEngineSound(clamp(speed / params.maxSpeed, 0, 1));

  // Checkpoint hint (near arch)
  const dToArch = car.position.distanceTo(arch.position);
  if (dToArch < 6) statusEl.textContent = "Checkpoint!";
  else if (offroad) statusEl.textContent = "Off-road (slippery)";
}

// Animate
let last = performance.now();
function animate(now) {
  const dt = clamp((now - last) / 1000, 0, 0.033);
  last = now;

  step(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Resize
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", onResize);
onResize();

// Initial placement
resetCar();
car.position.set(carState.pos.x, 0, carState.pos.z);
car.rotation.y = carState.yaw;
statusEl.textContent = "Press Start";

// If you still get a blank page on school devices, use a local server (README).

