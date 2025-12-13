# School Computer 3D Driving Game

A simple **3D driving game** that runs in a web browser (good for school computers).

## How to run

### Option A (recommended): start a local server

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/`

### Option B: double-click `index.html`

Some browsers block `type="module"` scripts when opened as a file. If you see a blank screen, use Option A.

## Controls

- **W / ↑**: accelerate
- **S / ↓**: brake / reverse
- **A / ←**: steer left
- **D / →**: steer right
- **Space**: handbrake (drift)
- **R**: reset
- **H**: help
- **M**: mute

## Notes

- This uses Three.js from a CDN. If your school computer has **no internet**, I can switch it to a fully offline version by bundling Three.js into the repo.
