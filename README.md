# Sandbox Builders 3D

Build a simple 3D physics sandbox in the browser. Stack blocks, make houses,
and drop props to test stability. Boosters add lift to nearby objects so you
can experiment with movement.

## Run locally

Use any static web server, then open `index.html` in your browser:

```
python -m http.server 8080
```

Visit `http://localhost:8080`.

## Controls

- Left click: place a block
- Right click: remove a block
- R: rotate the preview
- Drag: orbit the camera, scroll to zoom
- Shift: snap to a larger grid

## Features

- Block palette: wood, stone, glass, metal, roof, booster
- Physics props: crate and ball spawner
- Tuning: gravity and booster power sliders
