(function () {
'use strict';
/* ---- Easy-to-edit settings ---- */
var CONFIG = {
  greeting: 'M E R R Y   C H R I S T M A S',
  treeRows: 36,            // tree height in character rows
  rotationSpeed: 0.28,     // radians per second
  seed: 2024,
  finalTime: 20,           // time shown for reduced-motion / frozen view
  time: { treeStart: 2, treeEnd: 7, garlandStart: 7, garlandEnd: 9.8, ornStart: 8, ornEnd: 11,
          giftStart: 10.5, giftGap: 0.6, starStart: 10.5, greetStart: 13, greetEnd: 16 },
  ornamentColors: ['#ff3b3b', '#ffc94d', '#38d9f5', '#ffffff', '#ff5c8a'],
  lightColors: ['#fff3a8', '#ffd23f', '#ff6b6b', '#8be9fd', '#ffffff'],
  // dx: horizontal offset as a fraction of tree base radius
  gifts: [
    { dx: -0.85, w: 7, h: 4, body: '#d62839', rib: '#f5f5f5' },
    { dx: -0.48, w: 5, h: 3, body: '#1e6bff', rib: '#ffe38a' },
    { dx: -0.12, w: 4, h: 3, body: '#e03a3a', rib: '#ffffff' },
    { dx: 0.42, w: 5, h: 3, body: '#1fa84f', rib: '#ff6b6b' },
    { dx: 0.82, w: 7, h: 4, body: '#d62839', rib: '#f5f5f5' }
  ]
};

var cv = document.getElementById('scene'), ctx = cv.getContext('2d');
var pauseBtn = document.getElementById('pause'), replayBtn = document.getElementById('replay');
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var qs = new URLSearchParams(location.search);
var D = CONFIG.time, N = CONFIG.treeRows, R = N * 0.5, TAU = Math.PI * 2;
var T = 0, paused = false, last = 0, dirty = true;
var W, H, dpr, fs, cw, ch, cx, ty0, bg, twinkle = [], flakes = [];
if (reduce) { T = CONFIG.finalTime; paused = true; }
if (qs.has('t')) { T = parseFloat(qs.get('t')) || 0; paused = true; }

function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function radius(t) { var l = (t * 6) % 1; return R * (0.05 + 0.95 * t) * (0.8 + 0.2 * l); }

/* ---- Procedural 3D model: every item has (t height 0..1, a angle, r radius) ---- */
var rand = rng(CONFIG.seed), items = [], vis = [];
var GL = 'W%&VX#*+/\\W%&#X'.split('');
var GREENS = ['#0b7a3b', '#12a24a', '#1ec45b', '#2fe27a', '#0f8f45', '#3be07f'];
var DARK = ['#07502a', '#0a6a35', '#0b7a3b', '#0f8f45'];
var i, j, s, n;
for (j = 0; j < N; j++) {
  var t0 = (j + 0.5) / N, r0 = radius(t0), cnt = Math.round(r0 * 5) + 4;
  for (var layer = 0; layer < 2; layer++) for (i = 0; i < cnt; i++) {
    items.push({ k: 0, t: t0 + (rand() - 0.5) * 0.8 / N, a: (i + rand() * 0.9) / cnt * TAU,
      r: r0 * (layer ? 0.55 + rand() * 0.25 : 0.88 + rand() * 0.14), ch: pick(rand, GL),
      c: pick(rand, layer ? DARK : GREENS), j: (rand() - 0.5) * 0.04 });
  }
}
for (s = 0; s < 3; s++) for (i = 0; i < 200; i++) {
  var u = i / 199, gt = 0.07 + 0.89 * u;
  items.push({ k: 1, t: gt, u: u, a: s * 2.094 + u * 3.3 * TAU, r: radius(gt) * 1.05 + 0.3,
    ch: '*o~'[i % 3], c: i % 2 ? '#ffd23f' : '#ffb52e', ph: rand() * 6 });
}
for (i = 0; i < 46; i++) { var ot = 0.12 + 0.8 * rand();
  items.push({ k: 2, t: ot, a: rand() * TAU, r: radius(ot) * 1.06 + 0.2, ch: rand() < 0.5 ? '@' : 'O',
    c: pick(rand, CONFIG.ornamentColors), ap: D.ornStart + rand() * (D.ornEnd - D.ornStart) }); }
for (i = 0; i < 80; i++) { var lt = 0.08 + 0.88 * rand();
  items.push({ k: 3, t: lt, a: rand() * TAU, r: radius(lt) * 1.02 + 0.4, ch: '*',
    c: pick(rand, CONFIG.lightColors), ap: 7.5 + rand() * 3.5, sp: 1.5 + rand() * 3, ph: rand() * 6 }); }
function byZ(p, q) { return p.z - q.z; }

/* ---- Layout + cached background ---- */
function layout() {
  W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  var cols = 2 * R + 12;
  fs = Math.max(6, Math.min(H * 0.93 / (N + 10), W * 0.95 / (cols * 0.6)));
  fs = Math.floor(fs * 2) / 2; cw = fs * 0.6; ch = fs; cx = W / 2;
  ty0 = (H - (N + 9) * ch) / 2 + 4 * ch;
  var r = rng(77), b;
  bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height; b = bg.getContext('2d');
  b.scale(dpr, dpr);
  var g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#03060f'); g.addColorStop(1, '#0a1532');
  b.fillStyle = g; b.fillRect(0, 0, W, H);
  var ns = Math.round(W * H / 1800), k;
  for (k = 0; k < ns; k++) { b.globalAlpha = 0.25 + 0.75 * r(); b.fillStyle = '#fff';
    var z = r() < 0.9 ? 1 : 1.7; b.fillRect(r() * W, r() * H, z, z); }
  b.globalAlpha = 0.8;
  for (k = 0; k < 9; k++) { var x = r() * W, y = r() * H * 0.7, L = 3 + r() * 4;
    b.fillRect(x - L, y, 2 * L + 1, 1); b.fillRect(x, y - L, 1, 2 * L + 1); }
  b.globalAlpha = 0.1; b.fillStyle = '#9fc4ff';
  for (var gy = H * 0.55; gy < H; gy += 14) for (var gx = 7; gx < W; gx += 14) b.fillRect(gx, gy, 1.2, 1.2);
  twinkle = []; for (k = 0; k < 28; k++) twinkle.push({ x: r() * W, y: r() * H * 0.8, ph: r() * 6, sp: 1 + r() * 2 });
  flakes = []; for (k = 0; k < 60; k++) flakes.push({ x: r(), y: r(), sp: 8 + r() * 14, sz: 1 + r() * 1.6, sw: 4 + r() * 10, ph: r() * 6 });
  dirty = true;
}

/* ---- Drawing helpers ---- */
function giftCells(g) { var out = [], mid = Math.floor(g.w / 2), hr = Math.floor(g.h / 2), x, y;
  for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) {
    var v = x === mid, hz = y === hr, c = g.body, chr = (x + y) % 2 ? '%' : '#';
    if (v && hz) { chr = '+'; c = g.rib; } else if (v) { chr = '|'; c = g.rib; } else if (hz) { chr = '='; c = g.rib; }
    out.push([x, y, chr, c]); }
  out.push([mid - 1, -1, '(', g.rib], [mid, -1, '&', g.rib], [mid + 1, -1, ')', g.rib]); return out; }
var giftData = CONFIG.gifts.map(function (g) { return { g: g, cells: giftCells(g) }; });
function easeBack(x) { var c = 1.7; x = clamp(x) - 1; return 1 + (c + 1) * x * x * x + c * x * x; }

function frame() {
  var x, y, k, it, rot = reduce ? 0.5 : CONFIG.rotationSpeed * T + 0.5;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.drawImage(bg, 0, 0, W, H);
  ctx.fillStyle = '#fff';
  for (k = 0; k < twinkle.length; k++) { var tw = twinkle[k]; ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(T * tw.sp + tw.ph));
    ctx.fillRect(tw.x - 2, tw.y, 5, 1); ctx.fillRect(tw.x, tw.y - 2, 1, 5); }
  ctx.globalAlpha = 0.7;
  for (k = 0; k < flakes.length; k++) { var f = flakes[k];
    ctx.fillRect(f.x * W + Math.sin(T * 0.5 + f.ph) * f.sw, (f.y * H + T * f.sp) % (H + 10) - 5, f.sz, f.sz); }
  ctx.font = fs + 'px ui-monospace,SFMono-Regular,Menlo,Consolas,"Courier New",monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  var dt = D.treeEnd - D.treeStart, gp = clamp((T - D.garlandStart) / (D.garlandEnd - D.garlandStart)), lights = 0, n = 0;
  for (k = 0; k < items.length; k++) { it = items[k]; var al = 1, col = it.c, age;
    if (it.k === 0) { age = T - (D.treeStart + (it.t + it.j) * dt); if (age < 0) continue; al = clamp(age / 0.3); if (age < 0.5) col = '#dfffe9'; }
    else if (it.k === 1) { if (it.u > gp) continue; al = clamp((gp - it.u) * 10) * (0.8 + 0.2 * Math.sin(T * 3 + it.ph + it.u * 40)); }
    else if (it.k === 2) { age = T - it.ap; if (age < 0) continue; al = clamp(age / 0.4); }
    else { age = T - it.ap; if (age < 0) continue; var bl = 0.5 + 0.5 * Math.sin(T * it.sp + it.ph); if (bl > 0.5) lights++; al = clamp(age / 0.4) * (0.2 + 0.8 * bl); }
    var ang = it.a + rot, z = it.r * Math.sin(ang);
    var face = clamp(z / R * 0.5 + 0.5);
    it.z = z; it.al = al * (it.k === 0 ? 0.35 + 0.65 * face : 0.55 + 0.45 * face); it.col = col;
    it.sx = cx + Math.round(it.r * Math.cos(ang)) * cw; it.sy = ty0 + Math.round(it.t * N) * ch;
    vis[n++] = it; }
  vis.length = n; vis.sort(byZ);
  for (k = 0; k < n; k++) { it = vis[k]; ctx.globalAlpha = it.al; ctx.fillStyle = it.col; ctx.fillText(it.ch, it.sx, it.sy); }

  /* trunk */
  if (T > D.treeStart + 3) { ctx.globalAlpha = clamp((T - D.treeStart - 3) / 0.5); ctx.fillStyle = '#7a4a22';
    for (y = 0; y < 2; y++) for (x = -1; x <= 1; x++) ctx.fillText('#', cx + x * cw, ty0 + (N + y) * ch); }

  /* gifts */
  for (k = 0; k < giftData.length; k++) { var gd = giftData[k], ga = T - (D.giftStart + k * D.giftGap); if (ga < 0) continue;
    var sc = easeBack(ga / 0.5), g = gd.g, gx = cx + Math.round(g.dx * R) * cw, gy = ty0 + (N + 1) * ch;
    ctx.save(); ctx.translate(gx, gy); ctx.scale(sc, sc); ctx.globalAlpha = clamp(ga / 0.3);
    for (var c = 0; c < gd.cells.length; c++) { var ce = gd.cells[c]; ctx.fillStyle = ce[3];
      ctx.fillText(ce[2], (ce[0] - (g.w - 1) / 2) * cw, (ce[1] - (g.h - 1)) * ch); }
    ctx.restore(); }

  /* star */
  var sa = T - D.starStart;
  if (sa > 0) { var ss = easeBack(sa / 1.5), sy = ty0 - 1.6 * ch, pulse = 1 + 0.5 * Math.sin(T * 3);
    ctx.globalAlpha = clamp(sa / 0.6); ctx.fillStyle = '#ffd24a'; ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = fs * pulse * (sa > 1.5 ? 1.4 : 0.6);
    ctx.font = fs * 1.9 * ss + 'px monospace'; ctx.fillText('*', cx, sy);
    ctx.font = fs * ss + 'px monospace';
    ctx.fillText('-', cx - 1.6 * cw * ss, sy); ctx.fillText('-', cx + 1.6 * cw * ss, sy); ctx.fillText('|', cx, sy - 1.5 * ch * ss);
    ctx.fillText('\\', cx - cw * ss, sy - ch * ss); ctx.fillText('/', cx + cw * ss, sy - ch * ss);
    ctx.shadowBlur = 0; }

  /* greeting */
  var text = CONFIG.greeting, len = text.length, shown = Math.floor(clamp((T - D.greetStart) / (D.greetEnd - D.greetStart)) * len);
  ctx.font = 'bold ' + fs + 'px ui-monospace,Menlo,Consolas,monospace'; ctx.fillStyle = '#ff8a80';
  var gcols = ['#ff8a80', '#ffd98a', '#9be7a6', '#ffd98a'], word = 0;
  for (k = 0; k < len; k++) { var chh = text.charAt(k);
    if (chh === ' ' && text.charAt(k - 1) === ' ' ) word = 1; 
    if (chh === ' ' || k >= shown) continue;
    ctx.globalAlpha = 0.9; ctx.fillStyle = word ? gcols[(k + 1) % 4 || 1] : gcols[0];
    ctx.fillText(chh, cx + (k - (len - 1) / 2) * cw, ty0 + (N + 3.5) * ch); }

  /* HUD */
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#c8dcff'; ctx.font = '11px ui-monospace,Menlo,Consolas,monospace'; ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right'; ctx.fillText('\u25CF t ' + T.toFixed(2) + 's', W - 12, 18);
  ctx.textAlign = 'left'; ctx.fillText('rot ' + Math.round(((rot * 180 / Math.PI) % 360 + 360) % 360) + '\u00B0  lights ' + lights, 12, H - 12);
  ctx.globalAlpha = 1;
}

function loop(now) {
  requestAnimationFrame(loop);
  var dt = last ? Math.min((now - last) / 1000, 0.25) : 0; last = now;
  if (!paused) { T += dt; dirty = true; }
  if (dirty) { frame(); dirty = false; }
}
function syncBtn() { pauseBtn.textContent = paused ? 'Resume' : 'Pause'; }
pauseBtn.addEventListener('click', function () { paused = !paused; last = 0; syncBtn(); });
replayBtn.addEventListener('click', function () { T = 0; paused = false; last = 0; syncBtn(); dirty = true; });
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', layout);
layout(); syncBtn(); requestAnimationFrame(loop);
})();
