# Animated ASCII Christmas Tree

A standalone, static, procedural ASCII Christmas animation (HTML5 Canvas + plain JS). No build, no backend, no external assets.

Files: `index.html`, `styles.css`, `script.js`, `README.md`.

## Composition and data model
- Tree = a 3D cone of stacked, scalloped branch rings. Every glyph has `(t height, a angle, r radius)`. Each frame the model rotates, projects onto a character grid, and a per-cell depth buffer keeps one crisp glyph per cell (nearest wins).
- Garlands = 2 helical gold strands (3.2 turns) wound upward from the base. Baubles are 2x1 / 2x2 glyph clusters and lights blink; all use fixed `(t, a)` coordinates, so they stay attached while rotating.
- Gifts are real 3D boxes: every character cell ray-casts against a rotating cuboid, so the top and two side faces are lit differently, with a ribbon, a bow, a soft glow and a contact shadow. They **drop from above after the tree is built**, bounce once, then orbit the tree base with it. Baubles are shaded ASCII spheres with a highlight and a gold cap.
- The star is a 7-row ASCII five-point star on a hanging line. Snow is ASCII `+ * .` glyphs falling continuously.
- Timeline (wall-clock seconds): 0-2 snow only, 2-7 tree grows bottom-up with a white leading edge, 7-10 garlands, 7.5-11 baubles and lights, 9.5-12 gifts drop, 11.5 star, 13-16 greeting, then gentle rotation and twinkle forever.

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
- Gifts: edit, add or remove entries in `gifts` (start angle `ang`, size `w`/`h`/`d`, `yaw` twist, `body` and `rib` colors); `greetingColors` colors the letters
- Durations: the `time` block

## Accessibility and behavior
`prefers-reduced-motion` shows the finished, non-rotating tree. The canvas has a text description. Pause/Resume and Replay buttons are bottom-right. Hidden tabs stop rendering, and elapsed time never jumps on return.
