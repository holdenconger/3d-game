import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

const viewport = document.getElementById("viewport");
const statusLabel = document.getElementById("status");
const sizeReadout = document.getElementById("size-readout");
const gateReadout = document.getElementById("gate-readout");
const resetRunBtn = document.getElementById("reset-run");
const resetWorldBtn = document.getElementById("reset-world");
const playAgainBtn = document.getElementById("play-again");
const winOverlay = document.getElementById("win");

const loader = document.getElementById("loader");
const loaderBar = loader.querySelector(".loader-bar span");
const loaderPercent = loader.querySelector(".loader-percent");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 28, 90);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 10, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI * 0.48;

const hemiLight = new THREE.HemisphereLight(0xa0c4ff, 0x16202f, 0.7);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(16, 25, 12);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 4;
sunLight.shadow.camera.far = 80;
sunLight.shadow.camera.left = -40;
sunLight.shadow.camera.right = 40;
sunLight.shadow.camera.top = 40;
sunLight.shadow.camera.bottom = -40;
scene.add(sunLight);

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});
world.allowSleep = true;
world.broadphase = new CANNON.SAPBroadphase(world);

const defaultMaterial = new CANNON.Material("default");
world.defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.45,
    restitution: 0.1,
  }
);

const arenaRadius = 8;
const wallHeight = 2.4;
const wallThickness = 0.65;
const wallSegments = 36;
const gateUnlockSize = 0.9;

const floorGeometry = new THREE.CircleGeometry(26, 64);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x141b2b,
  roughness: 0.85,
});
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

const ringGeometry = new THREE.RingGeometry(arenaRadius - 0.08, arenaRadius + 0.08, 64);
const ringMaterial = new THREE.MeshStandardMaterial({
  color: 0x1f2a42,
  roughness: 0.6,
  emissive: 0x203760,
  emissiveIntensity: 0.35,
  side: THREE.DoubleSide,
});
const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
ringMesh.rotation.x = -Math.PI / 2;
ringMesh.position.y = 0.01;
scene.add(ringMesh);

const groundBody = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Plane(),
  material: defaultMaterial,
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

const wallMeshes = [];
const wallBodies = [];

let gateBody = null;
let gateMesh = null;
let gateOpen = false;

const segmentLength = (2 * Math.PI * arenaRadius) / wallSegments;
const segmentWidth = segmentLength * 1.02;

for (let i = 0; i < wallSegments; i += 1) {
  const angle = (i / wallSegments) * Math.PI * 2;
  const isGate = i === 0;
  const mesh = createWallSegment(segmentWidth, isGate);
  const body = createWallBody(segmentWidth, isGate);
  const x = Math.cos(angle) * arenaRadius;
  const z = Math.sin(angle) * arenaRadius;
  mesh.position.set(x, wallHeight / 2, z);
  mesh.rotation.y = -angle;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  body.position.set(x, wallHeight / 2, z);
  body.quaternion.setFromEuler(0, -angle, 0);
  world.addBody(body);

  if (isGate) {
    gateBody = body;
    gateMesh = mesh;
  } else {
    wallMeshes.push(mesh);
    wallBodies.push(body);
  }
}

const exitBeacon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.2, 0.2, 3.2, 16),
  new THREE.MeshStandardMaterial({
    color: 0x6b8cff,
    emissive: 0x6b8cff,
    emissiveIntensity: 0.8,
  })
);
exitBeacon.position.set(arenaRadius + 0.4, wallHeight / 2 + 0.8, 0);
exitBeacon.castShadow = true;
scene.add(exitBeacon);

const ballBaseRadius = 0.45;
let ballRadius = ballBaseRadius;
const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(ballBaseRadius, 32, 24),
  new THREE.MeshStandardMaterial({
    color: 0x8fe9ff,
    roughness: 0.25,
    metalness: 0.2,
  })
);
ballMesh.castShadow = true;
ballMesh.receiveShadow = true;
scene.add(ballMesh);

const ballBody = new CANNON.Body({
  mass: 1.2,
  material: defaultMaterial,
  shape: new CANNON.Sphere(ballRadius),
});
ballBody.position.set(0, ballRadius + 0.2, 0);
ballBody.linearDamping = 0.3;
ballBody.angularDamping = 0.4;
world.addBody(ballBody);
controls.target.copy(ballMesh.position);
controls.update();

const growthPads = [];
const padPulseSpeed = 1.4;
const padFloatSpeed = 1.1;

addGrowthPad(new THREE.Vector3(2.5, 0.05, -2.5), 0.12, "grow");
addGrowthPad(new THREE.Vector3(-3.2, 0.05, 1.8), 0.12, "grow");
addGrowthPad(new THREE.Vector3(1.2, 0.05, 3.4), 0.12, "grow");
addGrowthPad(new THREE.Vector3(-2.8, 0.05, -3.4), 0.12, "grow");
addGrowthPad(new THREE.Vector3(5.4, 0.05, 0.4), 0.2, "mega");
addGrowthPad(new THREE.Vector3(-5.2, 0.05, -0.6), 0.2, "mega");

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};
let wantsJump = false;
let hasEscaped = false;

let loaderProgress = 0;
let sceneReady = false;
let loaderFinished = false;

function setStatus(text) {
  statusLabel.textContent = text;
}

function updateReadouts() {
  sizeReadout.textContent = ballRadius.toFixed(2);
  gateReadout.textContent = gateOpen ? "Open" : "Locked";
  gateReadout.dataset.state = gateOpen ? "open" : "locked";
}

function createWallSegment(width, isGate) {
  const geometry = new THREE.BoxGeometry(width, wallHeight, wallThickness);
  const material = new THREE.MeshStandardMaterial({
    color: isGate ? 0x5b6ea8 : 0x2a3246,
    roughness: 0.7,
    metalness: 0.1,
    emissive: isGate ? 0x1b2a5a : 0x000000,
    emissiveIntensity: isGate ? 0.45 : 0,
  });
  return new THREE.Mesh(geometry, material);
}

function createWallBody(width, isGate) {
  return new CANNON.Body({
    mass: 0,
    material: defaultMaterial,
    shape: new CANNON.Box(new CANNON.Vec3(width / 2, wallHeight / 2, wallThickness / 2)),
    collisionFilterGroup: isGate ? 2 : 1,
  });
}

function addGrowthPad(position, amount, type) {
  const padGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 24);
  const padMaterial = new THREE.MeshStandardMaterial({
    color: type === "mega" ? 0xffc57a : 0x70ffc9,
    roughness: 0.3,
    emissive: type === "mega" ? 0xffc57a : 0x70ffc9,
    emissiveIntensity: 0.6,
  });
  const mesh = new THREE.Mesh(padGeometry, padMaterial);
  mesh.position.copy(position);
  mesh.castShadow = true;
  scene.add(mesh);
  growthPads.push({
    mesh,
    amount,
    type,
    used: false,
    baseScale: 1,
  });
}

function setBallSize(radius) {
  ballRadius = Math.max(0.3, radius);
  const scale = ballRadius / ballBaseRadius;
  ballMesh.scale.setScalar(scale);
  ballBody.shapes.length = 0;
  ballBody.shapeOffsets.length = 0;
  ballBody.shapeOrientations.length = 0;
  ballBody.addShape(new CANNON.Sphere(ballRadius));
  ballBody.updateMassProperties();
  ballBody.position.y = Math.max(ballBody.position.y, ballRadius + 0.05);
  updateReadouts();
}

function growBall(amount) {
  setBallSize(Math.min(ballRadius + amount, 1.4));
  setStatus("Growth pad activated!");
  if (!gateOpen && ballRadius >= gateUnlockSize) {
    openGate();
  }
}

function openGate() {
  gateOpen = true;
  if (gateMesh && gateBody) {
    scene.remove(gateMesh);
    world.removeBody(gateBody);
    gateMesh = null;
    gateBody = null;
  }
  exitBeacon.material.emissiveIntensity = 1.3;
  setStatus("Exit gate unlocked. Escape the ring!");
  updateReadouts();
}

function resetBall() {
  ballBody.position.set(0, ballRadius + 0.2, 0);
  ballBody.velocity.set(0, 0, 0);
  ballBody.angularVelocity.set(0, 0, 0);
  hasEscaped = false;
  winOverlay.classList.remove("show");
  setStatus("Roll to a growth pad.");
}

function resetArena() {
  setBallSize(ballBaseRadius);
  resetBall();
  gateOpen = false;
  updateReadouts();
  if (!gateMesh) {
    const mesh = createWallSegment(segmentWidth, true);
    const body = createWallBody(segmentWidth, true);
    mesh.position.set(arenaRadius, wallHeight / 2, 0);
    mesh.rotation.y = 0;
    scene.add(mesh);
    world.addBody(body);
    body.position.set(arenaRadius, wallHeight / 2, 0);
    gateMesh = mesh;
    gateBody = body;
  }
  exitBeacon.material.emissiveIntensity = 0.8;
  growthPads.forEach((pad) => {
    pad.used = false;
    pad.mesh.material.opacity = 1;
    pad.mesh.material.transparent = false;
  });
  setStatus("Arena reset. Grab the pads.");
}

function applyControls() {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3()
    .crossVectors(forward, new THREE.Vector3(0, 1, 0))
    .normalize();

  const move = new THREE.Vector3();
  if (keys.forward) {
    move.add(forward);
  }
  if (keys.backward) {
    move.sub(forward);
  }
  if (keys.left) {
    move.sub(right);
  }
  if (keys.right) {
    move.add(right);
  }

  if (move.lengthSq() > 0) {
    move.normalize();
    const drive = 26 + ballRadius * 8;
    const force = new CANNON.Vec3(
      move.x * drive,
      0,
      move.z * drive
    );
    ballBody.applyForce(force, ballBody.position);
  }

  if (wantsJump) {
    wantsJump = false;
    const nearGround = ballBody.position.y <= ballRadius + 0.08;
    if (nearGround) {
      ballBody.applyImpulse(
        new CANNON.Vec3(0, ballBody.mass * 3.8, 0),
        ballBody.position
      );
    }
  }
}

function updatePads(time) {
  growthPads.forEach((pad, index) => {
    const phase = time * 0.001 * padFloatSpeed + index;
    const pulse = 1 + Math.sin(phase * padPulseSpeed) * 0.06;
    pad.mesh.scale.set(pulse, pulse, pulse);
    pad.mesh.position.y = 0.05 + Math.sin(phase) * 0.05;
  });
}

function checkGrowthPads() {
  const ballPos = ballMesh.position;
  growthPads.forEach((pad) => {
    if (pad.used) {
      return;
    }
    const distance = ballPos.distanceTo(pad.mesh.position);
    if (distance < ballRadius + 0.55) {
      pad.used = true;
      pad.mesh.material.transparent = true;
      pad.mesh.material.opacity = 0.35;
      growBall(pad.amount);
    }
  });
}

function updateCamera() {
  controls.target.lerp(ballMesh.position, 0.18);
  controls.update();
}

function checkEscape() {
  if (!gateOpen || hasEscaped) {
    return;
  }
  const distance = Math.hypot(ballBody.position.x, ballBody.position.z);
  if (distance > arenaRadius + 3) {
    hasEscaped = true;
    winOverlay.classList.add("show");
    setStatus("Escaped! Reset to run again.");
  }
}

function updateLoader(delta) {
  const target = sceneReady ? 1 : 0.85;
  const speed = sceneReady ? 1.4 : 0.6;
  loaderProgress += (target - loaderProgress) * delta * speed;
  loaderProgress = Math.min(loaderProgress, 1);
  const percent = Math.round(loaderProgress * 100);
  loaderBar.style.width = `${percent}%`;
  loaderPercent.textContent = `${percent}%`;
  if (sceneReady && !loaderFinished && loaderProgress > 0.99) {
    document.body.classList.add("loaded");
    loaderFinished = true;
  }
}

function updateMeshes() {
  ballMesh.position.copy(ballBody.position);
  ballMesh.quaternion.copy(ballBody.quaternion);
}

resetRunBtn.addEventListener("click", resetBall);
resetWorldBtn.addEventListener("click", resetArena);
playAgainBtn.addEventListener("click", resetArena);

window.addEventListener("keydown", (event) => {
  switch (event.key.toLowerCase()) {
    case "w":
    case "arrowup":
      keys.forward = true;
      break;
    case "s":
    case "arrowdown":
      keys.backward = true;
      break;
    case "a":
    case "arrowleft":
      keys.left = true;
      break;
    case "d":
    case "arrowright":
      keys.right = true;
      break;
    case " ":
      wantsJump = true;
      break;
    default:
      break;
  }
});

window.addEventListener("keyup", (event) => {
  switch (event.key.toLowerCase()) {
    case "w":
    case "arrowup":
      keys.forward = false;
      break;
    case "s":
    case "arrowdown":
      keys.backward = false;
      break;
    case "a":
    case "arrowleft":
      keys.left = false;
      break;
    case "d":
    case "arrowright":
      keys.right = false;
      break;
    default:
      break;
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.domElement.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

let lastTime = performance.now();
function animate(time) {
  requestAnimationFrame(animate);
  const delta = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  if (!sceneReady) {
    sceneReady = true;
  }

  applyControls();
  world.step(1 / 60, delta, 3);
  updateMeshes();
  updatePads(time);
  checkGrowthPads();
  checkEscape();
  updateCamera();
  updateLoader(delta);
  renderer.render(scene, camera);
}

setStatus("Roll to a growth pad.");
updateReadouts();
requestAnimationFrame(animate);
