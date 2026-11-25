# Animated ASCII Christmas Tree

A standalone, static, procedural ASCII Christmas animation (HTML5 Canvas + plain JS). No build, no backend, no external assets.

Files: `index.html`, `styles.css`, `script.js`, `README.md`.

## Composition and data model
- Tree = a 3D cone of stacked, scalloped branch rings. Each glyph has `(t height, a angle, r radius)`; rotation is applied to `a` each frame, projected to a character grid, and depth-sorted by z (back glyphs dim, front bright).
- Garlands = 3 helical strands (3.3 turns) on the cone; baubles and blinking lights use fixed `(t, a)` coordinates, so they stay attached while rotating.
- Gifts and the star are small ASCII grids/glyph clusters drawn in screen space; the greeting is revealed letter by letter.
- Timeline (wall-clock seconds, `requestAnimationFrame`, delta clamped): 0–2 stars/snow, 2–7 tree grows top-down, 7–10 garlands, 8–11 baubles, 10.5+ gifts and star, 13–16 greeting, then gentle rotation and twinkle forever.

## Test locally
```
cd ascii-christmas-tree
python3 -m http.server 8000
```
Open http://localhost:8000/. Debug: `?t=12` freezes the scene at 12 seconds.

## Deploy to GitHub Pages
```
git init -b main
git add .
git commit -m "ASCII Christmas tree"
git remote add origin https://github.com/USERNAME/CHRISTMAS_REPO.git
git push -u origin main
```
Then: **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
Site URL: `https://USERNAME.github.io/CHRISTMAS_REPO/`. All paths are relative, so the repo subpath works.

## Easy changes (top of `script.js`, `CONFIG`)
- Greeting: `greeting` · Tree height: `treeRows` · Rotation speed: `rotationSpeed`
- Ornament / light colors: `ornamentColors`, `lightColors`
- Gifts: edit, add or remove entries in `gifts` (position `dx`, size, colors)
- Durations: the `time` block

## Accessibility and behavior
`prefers-reduced-motion` shows the finished, non-rotating tree. The canvas has a text description. Pause/Resume and Replay buttons are bottom-right. Hidden tabs stop rendering, and elapsed time never jumps on return.
