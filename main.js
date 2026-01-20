import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

const viewport = document.getElementById("viewport");
const statusLabel = document.getElementById("status");
const selectedLabel = document.getElementById("selected-block");
const boosterSlider = document.getElementById("booster-power");
const gravitySlider = document.getElementById("gravity");

const blockButtons = [...document.querySelectorAll("[data-block]")];
const spawnCrateBtn = document.getElementById("spawn-crate");
const spawnBallBtn = document.getElementById("spawn-ball");
const resetBtn = document.getElementById("reset-world");
const clearPropsBtn = document.getElementById("clear-props");

const blockLabels = {
  wood: "Wood",
  stone: "Stone",
  glass: "Glass",
  metal: "Metal",
  roof: "Roof",
  booster: "Booster",
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 35, 160);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(16, 16, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 5, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 6;
controls.maxDistance = 120;

const hemiLight = new THREE.HemisphereLight(0x9ec9ff, 0x1a1f30, 0.75);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
sunLight.position.set(24, 40, 18);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 5;
sunLight.shadow.camera.far = 120;
sunLight.shadow.camera.left = -60;
sunLight.shadow.camera.right = 60;
sunLight.shadow.camera.top = 60;
sunLight.shadow.camera.bottom = -60;
scene.add(sunLight);

const groundGeometry = new THREE.BoxGeometry(140, 1, 140);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b2233,
  roughness: 0.85,
});
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.position.set(0, -0.5, 0);
groundMesh.receiveShadow = true;
groundMesh.userData.isGround = true;
scene.add(groundMesh);

const gridHelper = new THREE.GridHelper(140, 140, 0x303a52, 0x1a2234);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -10, 0),
});
world.allowSleep = true;
world.broadphase = new CANNON.SAPBroadphase(world);

const defaultMaterial = new CANNON.Material("default");
world.defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.45,
    restitution: 0.15,
  }
);

const groundBody = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Box(new CANNON.Vec3(70, 0.5, 70)),
  material: defaultMaterial,
});
groundBody.position.copy(groundMesh.position);
world.addBody(groundBody);

const roofGeometry = createRoofGeometry();
const blockGeometries = {
  wood: new THREE.BoxGeometry(1, 1, 1),
  stone: new THREE.BoxGeometry(1, 1, 1),
  glass: new THREE.BoxGeometry(1, 1, 1),
  metal: new THREE.BoxGeometry(1, 1, 1),
  roof: roofGeometry,
  booster: new THREE.BoxGeometry(1, 1, 1),
};

const blockMaterials = {
  wood: new THREE.MeshStandardMaterial({
    color: "#9c6b36",
    roughness: 0.8,
    metalness: 0.1,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: "#7d828a",
    roughness: 0.9,
  }),
  glass: new THREE.MeshStandardMaterial({
    color: "#9bdcf8",
    roughness: 0.1,
    metalness: 0.05,
    transparent: true,
    opacity: 0.5,
  }),
  metal: new THREE.MeshStandardMaterial({
    color: "#8d97a6",
    roughness: 0.3,
    metalness: 0.6,
  }),
  roof: new THREE.MeshStandardMaterial({
    color: "#b7483f",
    roughness: 0.75,
  }),
  booster: new THREE.MeshStandardMaterial({
    color: "#4ff0b7",
    roughness: 0.2,
    metalness: 0.3,
    emissive: "#2fbf93",
    emissiveIntensity: 0.8,
  }),
};

const ghostMaterial = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  transparent: true,
  opacity: 0.35,
  roughness: 0.5,
});

const ghostMesh = new THREE.Mesh(blockGeometries.wood, ghostMaterial);
ghostMesh.castShadow = false;
ghostMesh.visible = false;
scene.add(ghostMesh);

const blockInstances = new Map();
const blockMeshes = [];
const boosterKeys = new Set();

const dynamicObjects = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0.2, 0.1);
let pointerInside = false;
let pointerDown = null;
let isShiftDown = false;

let currentBlock = "wood";
let rotationIndex = 0;
let statusMessage = "Place blocks to start building.";
let placementMessage = "Move the cursor over the build area.";

function renderStatus() {
  statusLabel.textContent = `${placementMessage} | ${statusMessage} | Blocks: ${
    blockInstances.size
  } | Props: ${dynamicObjects.length}`;
}

function setStatus(text) {
  statusMessage = text;
}

function setPlacement(text) {
  placementMessage = text;
}

function gridKey(grid) {
  return `${grid.x},${grid.y},${grid.z}`;
}

function gridToWorld(grid) {
  return new THREE.Vector3(grid.x + 0.5, grid.y + 0.5, grid.z + 0.5);
}

function createBlockMesh(type) {
  const geometry = blockGeometries[type] || blockGeometries.wood;
  const material = blockMaterials[type] || blockMaterials.wood;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isBlock = true;
  mesh.userData.blockType = type;
  return mesh;
}

function placeBlock(grid, type, rotation) {
  const key = gridKey(grid);
  if (blockInstances.has(key)) {
    setStatus("Space occupied.");
    return false;
  }

  const mesh = createBlockMesh(type);
  mesh.position.copy(gridToWorld(grid));
  mesh.rotation.y = rotation * (Math.PI / 2);
  mesh.userData.gridKey = key;
  scene.add(mesh);
  blockMeshes.push(mesh);

  const body = new CANNON.Body({
    mass: 0,
    material: defaultMaterial,
  });
  const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
  body.addShape(shape);
  body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
  body.quaternion.setFromEuler(0, mesh.rotation.y, 0);
  world.addBody(body);

  blockInstances.set(key, { mesh, body, type });
  if (type === "booster") {
    boosterKeys.add(key);
  }
  setStatus("Block placed.");
  return true;
}

function removeBlock(mesh) {
  if (!mesh || !mesh.userData.gridKey) {
    return;
  }
  const key = mesh.userData.gridKey;
  const block = blockInstances.get(key);
  if (!block) {
    return;
  }
  scene.remove(block.mesh);
  world.removeBody(block.body);
  const index = blockMeshes.indexOf(block.mesh);
  if (index >= 0) {
    blockMeshes.splice(index, 1);
  }
  blockInstances.delete(key);
  boosterKeys.delete(key);
  setStatus("Block removed.");
}

function clearDynamicObjects() {
  dynamicObjects.forEach(({ mesh, body }) => {
    scene.remove(mesh);
    world.removeBody(body);
  });
  dynamicObjects.length = 0;
  setStatus("Props cleared.");
}

function resetWorld() {
  blockInstances.forEach((block) => {
    scene.remove(block.mesh);
    world.removeBody(block.body);
  });
  blockInstances.clear();
  boosterKeys.clear();
  blockMeshes.length = 0;
  clearDynamicObjects();
  setStatus("World reset.");
}

function spawnDynamic(kind) {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const spawnPos = camera.position
    .clone()
    .add(direction.multiplyScalar(8));
  spawnPos.y = Math.max(spawnPos.y, 8);

  if (kind === "ball") {
    const radius = 0.45;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 24),
      new THREE.MeshStandardMaterial({
        color: "#d7f3ff",
        roughness: 0.35,
        metalness: 0.2,
      })
    );
    mesh.castShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({
      mass: 1.2,
      shape: new CANNON.Sphere(radius),
      material: defaultMaterial,
    });
    body.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    world.addBody(body);
    dynamicObjects.push({ mesh, body });
  } else {
    const size = 0.8;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({
        color: "#f4b860",
        roughness: 0.7,
      })
    );
    mesh.castShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({
      mass: 1.6,
      shape: new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2)),
      material: defaultMaterial,
    });
    body.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    world.addBody(body);
    dynamicObjects.push({ mesh, body });
  }

  setStatus("Prop spawned.");
}

function getPlacementHit() {
  const objects = [groundMesh, ...blockMeshes];
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(objects, true);
  if (!hits.length) {
    return null;
  }

  for (const hit of hits) {
    const normal =
      hit.face?.normal
        ?.clone()
        .applyMatrix3(
          new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)
        )
        .normalize() || new THREE.Vector3(0, 1, 0);
    if (hit.object.userData.isGround && normal.y < 0.5) {
      continue;
    }
    const step = isShiftDown ? 2 : 1;
    const snapped = new THREE.Vector3(
      Math.floor((hit.point.x + normal.x * 0.5) / step) * step,
      Math.floor((hit.point.y + normal.y * 0.5) / step) * step,
      Math.floor((hit.point.z + normal.z * 0.5) / step) * step
    );
    snapped.y = Math.max(snapped.y, 0);
    return { grid: snapped, normal, object: hit.object };
  }
  return null;
}

function updateGhost() {
  if (!pointerInside) {
    ghostMesh.visible = false;
    setPlacement("Move the cursor over the build area.");
    return null;
  }

  const hit = getPlacementHit();
  if (!hit) {
    ghostMesh.visible = false;
    setPlacement("Move the cursor over the build area.");
    return null;
  }

  const key = gridKey(hit.grid);
  const occupied = blockInstances.has(key);
  const blockMaterial = blockMaterials[currentBlock];
  ghostMesh.geometry = blockGeometries[currentBlock] || blockGeometries.wood;
  ghostMesh.position.copy(gridToWorld(hit.grid));
  ghostMesh.rotation.y = rotationIndex * (Math.PI / 2);
  ghostMesh.visible = true;
  if (occupied) {
    ghostMaterial.color.set("#ff6b6b");
    ghostMaterial.opacity = 0.2;
    setPlacement("Space occupied.");
  } else {
    ghostMaterial.color.copy(blockMaterial.color);
    ghostMaterial.opacity = 0.35;
    setPlacement("Ready to place.");
  }
  return { grid: hit.grid, key, occupied };
}

function applyBoosters() {
  if (!boosterKeys.size || !dynamicObjects.length) {
    return;
  }
  const range = 3.2;
  const power = Number(boosterSlider.value);
  boosterKeys.forEach((key) => {
    const booster = blockInstances.get(key);
    if (!booster) {
      return;
    }
    const origin = booster.body.position;
    dynamicObjects.forEach(({ body }) => {
      const dx = body.position.x - origin.x;
      const dy = body.position.y - origin.y;
      const dz = body.position.z - origin.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < range) {
        const strength = power * (1 - distance / range);
        const force = strength * body.mass;
        body.applyForce(new CANNON.Vec3(0, force, 0), body.position);
      }
    });
  });
}

function updateDynamicMeshes() {
  dynamicObjects.forEach(({ mesh, body }) => {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  });
}

function updateBlockSelection(type) {
  currentBlock = type;
  selectedLabel.textContent = blockLabels[type] || "Block";
  blockButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.block === type);
  });
  setStatus(`Selected ${blockLabels[type] || "block"}.`);
}

blockButtons.forEach((button) => {
  button.addEventListener("click", () => {
    updateBlockSelection(button.dataset.block);
  });
});

spawnCrateBtn.addEventListener("click", () => spawnDynamic("crate"));
spawnBallBtn.addEventListener("click", () => spawnDynamic("ball"));
resetBtn.addEventListener("click", resetWorld);
clearPropsBtn.addEventListener("click", clearDynamicObjects);

gravitySlider.addEventListener("input", (event) => {
  const value = Number(event.target.value);
  world.gravity.set(0, -value, 0);
});

renderer.domElement.addEventListener("pointermove", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  pointerInside = true;
});

renderer.domElement.addEventListener("pointerleave", () => {
  pointerInside = false;
});

renderer.domElement.addEventListener("pointerdown", (event) => {
  pointerDown = {
    x: event.clientX,
    y: event.clientY,
    button: event.button,
  };
});

renderer.domElement.addEventListener("pointerup", (event) => {
  if (!pointerDown) {
    return;
  }
  const dx = event.clientX - pointerDown.x;
  const dy = event.clientY - pointerDown.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 4) {
    const placement = updateGhost();
    if (event.button === 0 && placement && !placement.occupied) {
      placeBlock(placement.grid, currentBlock, rotationIndex);
    } else if (event.button === 2 && placement && blockMeshes.length) {
      const hit = getPlacementHit();
      if (hit && hit.object && hit.object.userData.isBlock) {
        removeBlock(hit.object);
      }
    }
  }
  pointerDown = null;
});

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

window.addEventListener("keydown", (event) => {
  if (event.target.tagName === "INPUT") {
    return;
  }
  if (event.key.toLowerCase() === "r") {
    rotationIndex = (rotationIndex + 1) % 4;
    setStatus("Rotation updated.");
  }
  if (event.key === "Shift") {
    isShiftDown = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "Shift") {
    isShiftDown = false;
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();
function animate(time) {
  requestAnimationFrame(animate);
  const delta = Math.min((time - lastTime) / 1000, 0.02);
  lastTime = time;
  applyBoosters();
  world.step(1 / 60, delta, 3);
  updateDynamicMeshes();
  updateGhost();
  controls.update();
  renderer.render(scene, camera);
  renderStatus();
}

updateBlockSelection(currentBlock);
renderStatus();
requestAnimationFrame(animate);

function createRoofGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0, 0.5);
  shape.lineTo(-0.5, -0.5);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
  });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const offsetX = -(box.max.x + box.min.x) / 2;
  const offsetY = -(box.max.y + box.min.y) / 2;
  const offsetZ = -(box.max.z + box.min.z) / 2;
  geometry.translate(offsetX, offsetY, offsetZ);
  geometry.rotateY(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}
