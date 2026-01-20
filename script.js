const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: false });

const buffer = document.createElement("canvas");
const bctx = buffer.getContext("2d", { alpha: false });

const config = {
  N: 160,
  diffusion: 0.00006,
  viscosity: 0.00002,
  iterations: 12,
  dyeDecay: 0.992,
  velDecay: 0.985,
  force: 0.55,
  radius: 6,
  dyeAmount: 60
};

let viewWidth = 1;
let viewHeight = 1;
let dpr = 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  canvas.width = Math.floor(viewWidth * dpr);
  canvas.height = Math.floor(viewHeight * dpr);
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

window.addEventListener("resize", resize);
resize();

const N = config.N;
const SIZE = (N + 2) * (N + 2);

buffer.width = N;
buffer.height = N;

let u = new Float32Array(SIZE);
let v = new Float32Array(SIZE);
let u0 = new Float32Array(SIZE);
let v0 = new Float32Array(SIZE);

let r = new Float32Array(SIZE);
let g = new Float32Array(SIZE);
let b = new Float32Array(SIZE);
let r0 = new Float32Array(SIZE);
let g0 = new Float32Array(SIZE);
let b0 = new Float32Array(SIZE);

let p = new Float32Array(SIZE);
let div = new Float32Array(SIZE);

const imageData = bctx.createImageData(N, N);

function IX(x, y) {
  return x + (N + 2) * y;
}

function addSource(x, s, dt) {
  for (let i = 0; i < SIZE; i++) {
    x[i] += dt * s[i];
  }
}

function setBoundary(b, x) {
  for (let i = 1; i <= N; i++) {
    x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
    x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
    x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
    x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
  }
  x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
  x[IX(0, N + 1)] = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
  x[IX(N + 1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
  x[IX(N + 1, N + 1)] =
    0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);
}

function linearSolve(b, x, x0, a, c) {
  for (let k = 0; k < config.iterations; k++) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        x[IX(i, j)] =
          (x0[IX(i, j)] +
            a *
              (x[IX(i - 1, j)] +
                x[IX(i + 1, j)] +
                x[IX(i, j - 1)] +
                x[IX(i, j + 1)])) /
          c;
      }
    }
    setBoundary(b, x);
  }
}

function diffuse(b, x, x0, diff, dt) {
  const a = dt * diff * N * N;
  linearSolve(b, x, x0, a, 1 + 4 * a);
}

function advect(b, d, d0, uField, vField, dt) {
  const dt0 = dt * N;
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      let x = i - dt0 * uField[IX(i, j)];
      let y = j - dt0 * vField[IX(i, j)];
      if (x < 0.5) x = 0.5;
      if (x > N + 0.5) x = N + 0.5;
      const i0 = Math.floor(x);
      const i1 = i0 + 1;
      if (y < 0.5) y = 0.5;
      if (y > N + 0.5) y = N + 0.5;
      const j0 = Math.floor(y);
      const j1 = j0 + 1;
      const s1 = x - i0;
      const s0 = 1 - s1;
      const t1 = y - j0;
      const t0 = 1 - t1;
      d[IX(i, j)] =
        s0 *
          (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
        s1 *
          (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
    }
  }
  setBoundary(b, d);
}

function project(uField, vField, pField, divField) {
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      divField[IX(i, j)] =
        (-0.5 *
          (uField[IX(i + 1, j)] -
            uField[IX(i - 1, j)] +
            vField[IX(i, j + 1)] -
            vField[IX(i, j - 1)])) /
        N;
      pField[IX(i, j)] = 0;
    }
  }
  setBoundary(0, divField);
  setBoundary(0, pField);
  linearSolve(0, pField, divField, 1, 4);
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      uField[IX(i, j)] -=
        0.5 * N * (pField[IX(i + 1, j)] - pField[IX(i - 1, j)]);
      vField[IX(i, j)] -=
        0.5 * N * (pField[IX(i, j + 1)] - pField[IX(i, j - 1)]);
    }
  }
  setBoundary(1, uField);
  setBoundary(2, vField);
}

function step(dt) {
  addSource(u, u0, dt);
  addSource(v, v0, dt);
  addSource(r, r0, dt);
  addSource(g, g0, dt);
  addSource(b, b0, dt);

  [u, u0] = [u0, u];
  diffuse(1, u, u0, config.viscosity, dt);
  [v, v0] = [v0, v];
  diffuse(2, v, v0, config.viscosity, dt);
  project(u, v, p, div);

  [u, u0] = [u0, u];
  [v, v0] = [v0, v];
  advect(1, u, u0, u0, v0, dt);
  advect(2, v, v0, u0, v0, dt);
  project(u, v, p, div);

  [r, r0] = [r0, r];
  diffuse(0, r, r0, config.diffusion, dt);
  [r, r0] = [r0, r];
  advect(0, r, r0, u, v, dt);

  [g, g0] = [g0, g];
  diffuse(0, g, g0, config.diffusion, dt);
  [g, g0] = [g0, g];
  advect(0, g, g0, u, v, dt);

  [b, b0] = [b0, b];
  diffuse(0, b, b0, config.diffusion, dt);
  [b, b0] = [b0, b];
  advect(0, b, b0, u, v, dt);

  const dyeDecay = config.dyeDecay;
  const velDecay = config.velDecay;
  for (let i = 0; i < SIZE; i++) {
    r[i] *= dyeDecay;
    g[i] *= dyeDecay;
    b[i] *= dyeDecay;
    u[i] *= velDecay;
    v[i] *= velDecay;
  }

  u0.fill(0);
  v0.fill(0);
  r0.fill(0);
  g0.fill(0);
  b0.fill(0);
}

function render() {
  const data = imageData.data;
  let pIndex = 0;
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      const idx = IX(i, j);
      const rr = 1 - Math.exp(-Math.max(0, r[idx]));
      const gg = 1 - Math.exp(-Math.max(0, g[idx]));
      const bb = 1 - Math.exp(-Math.max(0, b[idx]));
      data[pIndex++] = Math.min(255, Math.floor(rr * 255));
      data[pIndex++] = Math.min(255, Math.floor(gg * 255));
      data[pIndex++] = Math.min(255, Math.floor(bb * 255));
      data[pIndex++] = 255;
    }
  }
  bctx.putImageData(imageData, 0, 0);
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.drawImage(buffer, 0, 0, viewWidth, viewHeight);
}

function hslToRgb(h, s, l) {
  const hue2rgb = (p2, q2, t2) => {
    let t = t2;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
    if (t < 1 / 2) return q2;
    if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
    return p2;
  };
  if (s === 0) {
    return { r: l, g: l, b: l };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p2 = 2 * l - q;
  return {
    r: hue2rgb(p2, q, h + 1 / 3),
    g: hue2rgb(p2, q, h),
    b: hue2rgb(p2, q, h - 1 / 3)
  };
}

function addInput(x, y, dx, dy, strength) {
  if (viewWidth <= 0 || viewHeight <= 0) {
    return;
  }
  const gridX = Math.floor((x / viewWidth) * N + 1);
  const gridY = Math.floor((y / viewHeight) * N + 1);
  const radius = config.radius;
  const now = performance.now();
  const hue = ((now * 0.05 + x * 0.25 + y * 0.25) % 360) / 360;
  const rgb = hslToRgb(hue, 1, 0.5);
  const scale = N / Math.min(viewWidth, viewHeight);
  const fx = dx * scale * config.force * strength;
  const fy = dy * scale * config.force * strength;
  const dye = config.dyeAmount * strength;

  for (let j = -radius; j <= radius; j++) {
    for (let i = -radius; i <= radius; i++) {
      if (i * i + j * j > radius * radius) {
        continue;
      }
      const ii = gridX + i;
      const jj = gridY + j;
      if (ii < 1 || ii > N || jj < 1 || jj > N) {
        continue;
      }
      const idx = IX(ii, jj);
      u0[idx] += fx;
      v0[idx] += fy;
      r0[idx] += rgb.r * dye;
      g0[idx] += rgb.g * dye;
      b0[idx] += rgb.b * dye;
    }
  }
}

const pointer = {
  x: 0,
  y: 0,
  down: false,
  ready: false
};

canvas.addEventListener("pointerdown", (event) => {
  pointer.down = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.ready = true;
});

canvas.addEventListener("pointermove", (event) => {
  const x = event.clientX;
  const y = event.clientY;
  if (!pointer.ready) {
    pointer.x = x;
    pointer.y = y;
    pointer.ready = true;
    return;
  }
  const dx = x - pointer.x;
  const dy = y - pointer.y;
  pointer.x = x;
  pointer.y = y;
  const strength = pointer.down ? 1.35 : 0.85;
  addInput(x, y, dx, dy, strength);
});

const endPointer = () => {
  pointer.down = false;
};

canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointerleave", endPointer);
canvas.addEventListener("pointercancel", endPointer);

let lastTime = performance.now();

function animate(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  step(dt);
  render();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
