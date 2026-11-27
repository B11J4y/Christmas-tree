(function () {
'use strict';
/* ---- Easy-to-edit settings ---- */
var CONFIG = {
  greeting: 'M E R R Y   C H R I S T M A S   2 0 2 6',
  treeRows: 54,            // tree height in character rows (width is ~1.6x height)
  rotationSpeed: 0.3,      // radians per second
  seed: 2024,
  finalTime: 20,           // time shown for reduced-motion / frozen view
  time: { treeStart: 2, treeEnd: 7, garlandStart: 7, garlandEnd: 9.8, ornStart: 7.5, ornEnd: 11,
          giftStart: 9.5, giftGap: 0.4, giftFall: 0.6, starStart: 11.5, greetStart: 13, greetEnd: 16 },
  ornamentColors: ['#ff2d2d', '#ffb52e', '#ffffff', '#ff2d2d', '#ffd23f'],
  lightColors: ['#fff3a8', '#ffe14d', '#ff6b6b', '#8be9fd', '#ffffff'],
  greetingColors: ['#ff5a4d', '#ffb52e', '#ffe14d', '#4ddc7a', '#e9eef7'],
  // gifts orbit the tree base with it: ang = start angle (deg), w/h in character cells
  gifts: [
    { ang: 30,  w: 11, h: 8, body: '#e8272b', rib: '#ffffff' },
    { ang: 100, w: 10, h: 8, body: '#2f6bff', rib: '#ffe14d' },
    { ang: 170, w: 9,  h: 7, body: '#f4a8b8', rib: '#e8272b' },
    { ang: 240, w: 9,  h: 7, body: '#f0a020', rib: '#e8272b' },
    { ang: 310, w: 10, h: 8, body: '#25b04a', rib: '#e8272b' }
  ]
};

var cv = document.getElementById('scene'), ctx = cv.getContext('2d');
var pauseBtn = document.getElementById('pause'), replayBtn = document.getElementById('replay');
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var qs = new URLSearchParams(location.search);
var D = CONFIG.time, N = CONFIG.treeRows, R = N * 0.8, SC = N / 36, TAU = Math.PI * 2;
var T = 0, paused = false, last = 0, dirty = true;
var W, H, dpr, fs, cw, ch, cx, ty0, bg, flakes = [];
if (reduce) { T = CONFIG.finalTime; paused = true; }
if (qs.has('t')) { T = parseFloat(qs.get('t')) || 0; paused = true; }

function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function radius(t) { var l = (t * 6) % 1; return R * (0.16 + 0.84 * t) * (0.8 + 0.2 * l); }
function easeBack(x) { var c = 1.7; x = clamp(x) - 1; return 1 + (c + 1) * x * x * x + c * x * x; }

/* ---- Procedural 3D model: items at (t height 0..1, a angle, r radius) + cell offset (dc, dr) ---- */
var rand = rng(CONFIG.seed), items = [], i, j, s, n;
var GL = 'W%&VvX#*xo@O^~=W%&V#X'.split('');
var GREENS = ['#22e064', '#3cf07f', '#1fc457', '#6ff59a', '#17b84e', '#2fd868', '#0f9d44'];
var DARKS = ['#0d8a3e', '#10993f', '#0b7a3b', '#14a248'];
function add(o) { o.dc = o.dc || 0; o.dr = o.dr || 0; items.push(o); }
for (j = 0; j < N; j++) {
  var t0 = (j + 0.5) / N, r0 = radius(t0), cnt0 = Math.round(r0 * 6.5) + 4;
  for (var layer = 0; layer < 2; layer++) for (var cnt = layer ? Math.round(cnt0 * 0.5) : cnt0, i = 0; i < cnt; i++)
    add({ k: 0, t: t0 + (rand() - 0.5) * 0.8 / N, a: (i + rand() * 0.9) / cnt * TAU,
      r: r0 * (layer ? 0.55 + rand() * 0.25 : 0.9 + rand() * 0.12), ch: pick(rand, GL),
      c: pick(rand, layer ? DARKS : GREENS), j: (rand() - 0.5) * 0.04 });
}
for (s = 0; s < 2; s++) for (i = 0; i < 420; i++) {   // garlands wind upward from the base
  var u = i / 419, gt = 0.96 - 0.89 * u, ga = s * Math.PI + u * 3.2 * TAU, gr = radius(gt) * 1.05 + 0.3;
  add({ k: 1, t: gt, u: u, a: ga, r: gr, ch: '=~@o*'[i % 5], c: i % 2 ? '#ffe14d' : '#ffb52e', ph: rand() * 6 });
  if (rand() < 0.6) add({ k: 1, t: gt, u: u, a: ga, r: gr, dr: 1, ch: '=', c: '#ffb52e', ph: rand() * 6 });
}
for (i = 0; i < 70; i++) { var ot = 0.12 + 0.8 * rand(), oa = rand() * TAU, orr = radius(ot) * 1.06 + 0.2,
    oc = pick(rand, CONFIG.ornamentColors), oap = D.ornStart + rand() * (D.ornEnd - D.ornStart), tall = rand() < 0.5;
  for (var dy = 0; dy < Math.round((tall ? 2 : 1) * SC); dy++) for (var dx = 0; dx < Math.round(2 * SC); dx++)
    add({ k: 2, t: ot, a: oa, r: orr, dc: dx, dr: dy, ch: pick(rand, ['%', '&', '@', '#']), c: oc, ap: oap }); }
for (i = 0; i < 120; i++) { var lt = 0.08 + 0.88 * rand();
  add({ k: 3, t: lt, a: rand() * TAU, r: radius(lt) * 1.02 + 0.4, ch: rand() < 0.5 ? '*' : '+',
    c: pick(rand, CONFIG.lightColors), ap: 7.5 + rand() * 3.5, sp: 1.5 + rand() * 3, ph: rand() * 6 }); }
var BIAS = [0, 1.2, 2, 1.6];

/* ---- Gifts: chunky ASCII boxes with ribbon and bow, orbiting the base ---- */
var gifts = CONFIG.gifts.map(function (g, gi) {
  var gw = Math.round(g.w * SC), gh = Math.round(g.h * SC), rw = Math.max(2, Math.round(SC * 1.5)),
      cells = [], mid = Math.floor((gw - rw) / 2), hr = Math.floor(gh / 2), x, y;
  for (y = 0; y < gh; y++) for (x = 0; x < gw; x++) {
    var rib = (x >= mid && x < mid + rw) || (y >= hr && y < hr + Math.max(1, Math.round(SC * 0.7)));
    cells.push([x, y, rib ? 'X' : pick(rand, ['%', '#', '&', '@']), rib ? g.rib : g.body]); }
  for (x = mid - 1; x <= mid + rw; x++) cells.push([x, -1, (x === mid - 1 || x === mid + rw) ? '@' : 'o', g.rib]);
  return { g: g, gw: gw, gh: gh, cells: cells, ang: g.ang * Math.PI / 180, t0: D.giftStart + gi * D.giftGap };
});
function drawGift(G, rot) {
  var age = T - G.t0; if (age < 0) return;
  var oc = Math.round((R + 1) * Math.cos(G.ang + rot));
  if (Math.sin(G.ang + rot) < 0 && Math.abs(oc) < R * 0.8) return;   // hidden behind the tree
  var p = clamp(age / D.giftFall), fall = p * p, la = age - D.giftFall,
      land = la > 0 ? Math.max(0, Math.sin(la * 9)) * Math.exp(-la * 5) : 0;
  var yRows = -(1 - fall) * (N + 2) - land * 1.5 * SC, col = Math.round((R + 1) * Math.cos(G.ang + rot));
  ctx.globalAlpha = 1;
  for (var c = 0; c < G.cells.length; c++) { var ce = G.cells[c]; ctx.fillStyle = ce[3];
    ctx.fillText(ce[2], cx + (col + ce[0] - Math.floor(G.gw / 2)) * cw, ty0 + (N - 1.5 - (G.gh - 1) + ce[1] + yRows) * ch); }
}

/* ---- Layout + cached background ---- */
var GC = 2 * Math.ceil(R * 1.5) + 3, GR = N + 6, HALF = (GC - 1) / 2, zb = new Float32Array(GC * GR), zi = new Int32Array(GC * GR);
var FONT = 'ui-monospace,SFMono-Regular,Menlo,Consolas,"Courier New",monospace';
function layout() {
  W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  var cols = 2 * R + 24;
  fs = Math.max(6, Math.min(H * 0.9 / (N + 15), W * 0.95 / (cols * 0.6)));
  fs = Math.floor(fs * 2) / 2; cw = fs * 0.6; ch = fs; cx = W / 2;
  ty0 = (H - (N + 15) * ch) / 2 + 8 * ch;
  var r = rng(77), b, k;
  bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height; b = bg.getContext('2d');
  b.scale(dpr, dpr); b.fillStyle = '#02040a'; b.fillRect(0, 0, W, H);
  b.fillStyle = '#fff';
  for (k = 0; k < Math.round(W * H / 2500); k++) { b.globalAlpha = 0.2 + 0.6 * r(); b.fillRect(r() * W, r() * H, 1.2, 1.2); }
  b.font = Math.max(7, fs * 0.8) + 'px ' + FONT; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillStyle = '#9fc4ff';
  for (var gy = H * 0.72; gy < H; gy += ch * 0.9) for (var gx = cw; gx < W; gx += cw * 2) {
    if (r() < 0.45) continue; b.globalAlpha = 0.1 + 0.2 * r(); b.fillText(pick(r, ['-', '-', '.', ':', '\u00B7']), gx, gy); }
  flakes = []; for (k = 0; k < Math.round(W * H / 1600); k++)
    flakes.push({ x: r(), y: r(), sp: 14 + r() * 40, ch: pick(r, ['+', '+', '*', '.', '+']), sw: 3 + r() * 9, ph: r() * 6, tw: 1 + r() * 2.5 });
  dirty = true;
}

var STAR = ['*', '*', '###', '**##@@@##**', '##@@@##', '#@@@#', '*##&##*'];
var STARC = { '#': '#ffe14d', '@': '#ffd21f', '*': '#ffb52e', '&': '#a6f08a' };

function frame() {
  var k, it, rot = reduce ? 0.5 : CONFIG.rotationSpeed * T + 0.5;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.drawImage(bg, 0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.font = Math.max(10, fs * 1.3) + 'px ' + FONT;
  for (k = 0; k < flakes.length; k++) { var f = flakes[k];   // falling ASCII snow
    ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(T * f.tw + f.ph));
    ctx.fillText(f.ch, f.x * W + Math.sin(T * 0.6 + f.ph) * f.sw, (f.y * H + T * f.sp) % (H + 20) - 10); }
  ctx.font = fs + 'px ' + FONT;

  var dt = D.treeEnd - D.treeStart, gp = clamp((T - D.garlandStart) / (D.garlandEnd - D.garlandStart)), lights = 0;
  zb.fill(-1e9); zi.fill(-1);
  for (k = 0; k < items.length; k++) { it = items[k]; var al = 1, col = it.c, age;
    if (it.k === 0) { age = T - (D.treeStart + (1 - (it.t + it.j)) * dt); if (age < 0) continue; al = clamp(age / 0.2); if (age < 0.45) col = '#ffffff'; }
    else if (it.k === 1) { if (it.u > gp) continue; al = 0.75 + 0.25 * Math.sin(T * 3 + it.ph + it.u * 40); }
    else if (it.k === 2) { age = T - it.ap; if (age < 0) continue; }
    else { age = T - it.ap; if (age < 0) continue; var bl = 0.5 + 0.5 * Math.sin(T * it.sp + it.ph); if (bl > 0.5) lights++; al = 0.2 + 0.8 * bl; }
    var ang = it.a + rot, z = it.r * Math.sin(ang), face = clamp(z / R * 0.5 + 0.5);
    var cc = Math.round(it.r * Math.cos(ang)) + it.dc + HALF, rr = Math.round(it.t * N) + it.dr;
    if (cc < 0 || cc >= GC || rr < 0 || rr >= GR) continue;
    var key = rr * GC + cc, zz = z + BIAS[it.k];
    if (zz > zb[key]) { zb[key] = zz; zi[key] = k; it.col = col; it.al = al * (it.k === 0 ? 0.72 + 0.28 * face : 0.9 + 0.15 * face); }
  }
  var g;
  for (g = 0; g < gifts.length; g++) if (Math.sin(gifts[g].ang + rot) < 0) drawGift(gifts[g], rot);   // gifts behind the tree
  ctx.font = 'bold ' + fs + 'px ' + FONT;
  for (k = 0; k < zi.length; k++) { if (zi[k] < 0) continue; it = items[zi[k]];
    ctx.globalAlpha = it.al; ctx.fillStyle = it.col;
    ctx.fillText(it.ch, cx + ((k % GC) - HALF) * cw, ty0 + ((k / GC) | 0) * ch); }
  ctx.font = fs + 'px ' + FONT;
  if (T > D.treeStart + 3) { ctx.globalAlpha = clamp((T - D.treeStart - 3) / 0.5); ctx.fillStyle = '#8a5a2b';
    for (var y = 0; y < 2; y++) for (var x = -1; x <= 1; x++) ctx.fillText('#', cx + x * cw, ty0 + (N + y) * ch); }
  for (g = 0; g < gifts.length; g++) if (Math.sin(gifts[g].ang + rot) >= 0) drawGift(gifts[g], rot);   // gifts in front

  /* star: ASCII five-point star on a hanging line */
  var sa = T - D.starStart;
  if (sa > 0) { var ss = easeBack(sa / 1.2), pulse = 0.8 + 0.4 * Math.sin(T * 3), ry, rc, row;
    ctx.globalAlpha = clamp(sa / 0.6) * 0.55; ctx.strokeStyle = '#ffb52e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, ty0 - 8.6 * ch); ctx.stroke();
    ctx.globalAlpha = clamp(sa / 0.6); ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = fs * pulse;
    ctx.font = 'bold ' + fs * 1.3 * ss + 'px ' + FONT;
    for (ry = 0; ry < STAR.length; ry++) { row = STAR[ry];
      for (rc = 0; rc < row.length; rc++) { ctx.fillStyle = STARC[row.charAt(rc)];
        ctx.fillText(row.charAt(rc), cx + (rc - (row.length - 1) / 2) * cw * 1.3 * ss, ty0 + (ry - 6.6) * ch * 1.3); } }
    ctx.shadowBlur = 0; }

  /* greeting */
  var text = CONFIG.greeting, len = text.length, shown = Math.floor(clamp((T - D.greetStart) / (D.greetEnd - D.greetStart)) * len), gi = 0;
  var gf = Math.max(9, fs * 0.85), gcw = Math.max(cw, gf * 0.6);
  ctx.font = 'bold ' + gf + 'px ' + FONT;
  for (k = 0; k < len; k++) { var chh = text.charAt(k); if (chh === ' ') continue;
    var gc = CONFIG.greetingColors[gi++ % CONFIG.greetingColors.length]; if (k >= shown) continue;
    ctx.globalAlpha = 0.95; ctx.fillStyle = gc; ctx.fillText(chh, cx + (k - (len - 1) / 2) * gcw, ty0 + (N + 3.5) * ch); }

  /* HUD */
  ctx.font = '11px ' + FONT; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 0.85;
  ctx.textAlign = 'right'; ctx.fillStyle = '#e9eef7'; ctx.fillText('t ' + T.toFixed(2) + 's', W - 12, 18);
  ctx.fillStyle = '#ffb52e'; ctx.fillText('\u25CF', W - 12 - ctx.measureText('t ' + T.toFixed(2) + 's').width - 4, 18);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#c8dcff'; ctx.textAlign = 'left';
  ctx.fillText('rot ' + Math.round(((rot * 180 / Math.PI) % 360 + 360) % 360) + '\u00B0  lights ' + lights, 12, H - 12);
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
