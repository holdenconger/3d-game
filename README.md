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

- This repo includes a local copy of Three.js in `vendor/`, so it can run **offline**.
- If you’re not allowed to run `python3`, try one of these instead:
  - **VS Code**: install/enable the “Live Server” extension and click “Go Live”
  - **Node.js**: `npx serve .` (or `npx http-server .`)
  - **Chromebook / very locked down**: you may need a teacher/admin to allow running a local server
