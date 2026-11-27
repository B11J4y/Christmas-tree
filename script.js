(function () {
'use strict';
/* ---- Easy-to-edit settings ---- */
var CONFIG = {
  greeting: 'M E R R Y   C H R I S T M A S   2 0 2 6',
  treeRows: 54,            // tree height in character rows
  rotationSpeed: 0.3,      // radians per second
  seed: 2024,
  finalTime: 20,           // time shown for reduced-motion / frozen view
  time: { treeStart: 2, treeEnd: 7, garlandStart: 7, garlandEnd: 9.8, ornStart: 7.5, ornEnd: 11,
          giftStart: 9.5, giftGap: 0.4, giftFall: 0.6, starStart: 11.5, greetStart: 13, greetEnd: 16 },
  ornamentColors: ['#ff2d2d', '#ffb52e', '#e8eefc', '#ff2d2d', '#ffd23f', '#3fc8ff'],
  lightColors: ['#fff3a8', '#ffe14d', '#ff6b6b', '#8be9fd', '#ffffff'],
  greetingColors: ['#ff5a4d', '#ffb52e', '#ffe14d', '#4ddc7a', '#e9eef7'],
  // 3D gift boxes orbit the tree base with it. ang = start angle (deg); w/h/d = size in character cells
  gifts: [
    { ang: 30,  w: 10, h: 7, d: 8,  body: '#e8272b', rib: '#ffffff', yaw: 0.3 },
    { ang: 100, w: 9,  h: 7, d: 8,  body: '#2f6bff', rib: '#ffe14d', yaw: -0.2 },
    { ang: 170, w: 8,  h: 6, d: 7,  body: '#f06fa0', rib: '#ffffff', yaw: 0.5 },
    { ang: 240, w: 8,  h: 6, d: 7,  body: '#f0a020', rib: '#e8272b', yaw: -0.4 },
    { ang: 310, w: 9,  h: 7, d: 8,  body: '#25b04a', rib: '#ffe14d', yaw: 0.2 }
  ]
};

var cv = document.getElementById('scene'), ctx = cv.getContext('2d');
var pauseBtn = document.getElementById('pause'), replayBtn = document.getElementById('replay');
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var qs = new URLSearchParams(location.search);
var D = CONFIG.time, N = CONFIG.treeRows, R = N * 0.76, SC = N / 36, TAU = Math.PI * 2, TILT = 0.5;
var T = 0, paused = false, last = 0, dirty = true;
var W, H, dpr, fs, cw, ch, cx, ty0, bg, flakes = [];
if (reduce) { T = CONFIG.finalTime; paused = true; }
if (qs.has('t')) { T = parseFloat(qs.get('t')) || 0; paused = true; }

function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function radius(t) { var l = (t * 6) % 1; return R * (0.04 + 0.96 * Math.pow(t, 1.05)) * (0.8 + 0.2 * l); }
function easeBack(x) { var c = 1.7; x = clamp(x) - 1; return 1 + (c + 1) * x * x * x + c * x * x; }
function hash(a, b, c) { return ((Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) >>> 0); }
var shadeCache = {}, haloCache = {};
function shades(hex) {            // 6 brightness levels of a color
  if (shadeCache[hex]) return shadeCache[hex];
  var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16), out = [];
  [0.3, 0.5, 0.7, 0.9, 1.1, 1.35].forEach(function (f) { out.push('rgb(' + Math.min(255, Math.round(r * f)) + ',' +
    Math.min(255, Math.round(g * f)) + ',' + Math.min(255, Math.round(b * f)) + ')'); });
  return (shadeCache[hex] = out);
}
function halo(hex) {              // soft glow sprite
  if (haloCache[hex]) return haloCache[hex];
  var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, hex); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (haloCache[hex] = c);
}

/* ---- Procedural 3D model: items at (t height 0..1, a angle, r radius) + cell offset (dc, dr) ---- */
var rand = rng(CONFIG.seed), items = [], i, j, s;
var GL = 'W%&VvX#*xo@O^~=W%&V#X'.split('');
var GREENS = ['#22e064', '#3cf07f', '#1fc457', '#6ff59a', '#17b84e', '#2fd868', '#0f9d44'];
var DARKS = ['#0d8a3e', '#10993f', '#0b7a3b', '#14a248'];
function add(o) { o.dc = o.dc || 0; o.dr = o.dr || 0; items.push(o); }
for (j = 0; j < N; j++) {
  var t0 = (j + 0.5) / N, r0 = radius(t0), cnt0 = Math.round(r0 * 6.5) + 5;
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
for (i = 0; i < 120; i++) { var lt = 0.08 + 0.88 * rand();
  add({ k: 3, t: lt, a: rand() * TAU, r: radius(lt) * 1.02 + 0.4, ch: rand() < 0.5 ? '*' : '+',
    c: pick(rand, CONFIG.lightColors), ap: 7.5 + rand() * 3.5, sp: 1.5 + rand() * 3, ph: rand() * 6 }); }
var BIAS = [0, 1.2, 0, 1.6];
var baubles = [];
for (i = 0, s = 0; i < 40 && s < 600; s++) { var bt = 0.14 + 0.78 * rand(), ba = rand() * TAU, ok = true;
  for (j = 0; j < baubles.length; j++) { var da = Math.abs(ba - baubles[j].a); da = Math.min(da, TAU - da);
    if (Math.abs(bt - baubles[j].t) * N < 5 && radius(bt) * da < 9) { ok = false; break; } }
  if (!ok) continue; i++;
  baubles.push({ t: bt, a: ba, r: radius(bt) * 1.04, rad: 1.1 + 0.7 * rand(), c: pick(rand, CONFIG.ornamentColors),
    ap: D.ornStart + rand() * (D.ornEnd - D.ornStart) }); }

/* ---- Shaded ASCII sphere (used for baubles and bow loops) ---- */
var RAMP = ['.', 'o', 'O', '0', '@'];
function sphere(xc, yc, rad, hex, hi) {
  var lv = shades(hex), c0 = Math.floor((xc - rad - cx) / cw), c1 = Math.ceil((xc + rad - cx) / cw),
      r0 = Math.floor((yc - rad - ty0) / ch), r1 = Math.ceil((yc + rad - ty0) / ch);
  for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
    var px = cx + cc * cw, py = ty0 + rr * ch, nx = (px - xc) / rad, ny = (py - yc) / rad, d2 = nx * nx + ny * ny;
    if (d2 > 1) continue;
    var nz = Math.sqrt(1 - d2), I = Math.max(0, -0.45 * nx - 0.6 * ny + 0.66 * nz), k = Math.min(4, Math.floor(I * 4.99));
    ctx.fillStyle = (hi && I > 0.97) ? '#ffffff' : lv[Math.min(5, Math.floor(I * 5.6) + (nz < 0.3 ? 0 : 0))];
    ctx.fillText(RAMP[k], px, py);
  }
}
function drawBauble(b, rot, front) {
  var age = T - b.ap; if (age < 0) return;
  var ang = b.a + rot, z = Math.sin(ang);
  if (front ? z < 0 : (z >= 0 || Math.abs(Math.cos(ang)) < 0.78)) return;
  var pop = easeBack(age / 0.45), rad = ch * b.rad * pop, x = cx + b.r * Math.cos(ang) * cw, y = ty0 + b.t * N * ch;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22; ctx.drawImage(halo(b.c), x - rad * 1.8, y - rad * 1.8, rad * 3.6, rad * 3.6);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  sphere(x, y, rad, b.c, true);
  ctx.fillStyle = '#ffd23f'; ctx.fillText('=', x, y - rad - ch * 0.45);
}

/* ---- 3D gift boxes: each character cell ray-casts against a rotating cuboid, lit per face ---- */
var gifts = CONFIG.gifts.map(function (g, gi) {
  return { g: g, body: shades(g.body), rib: shades(g.rib), ang: g.ang * Math.PI / 180, t0: D.giftStart + gi * D.giftGap, z: 0 };
});
var LX = -0.5, LY = 0.75, LZ = 0.55, LL = Math.sqrt(LX * LX + LY * LY + LZ * LZ);
var BODYG = ['#', '%', '#', '&'], RIBG = ['X', 'X', '@', 'X'];
function drawGift(G, rot) {
  var age = T - G.t0; if (age < 0) return;
  var g = G.g, w = g.w * SC * cw, h = g.h * SC * ch, d = g.d * SC * cw, phi0 = G.ang + rot, phi = phi0 + g.yaw,
      cphi = Math.cos(phi), sphi = Math.sin(phi), cT = Math.cos(TILT), sT = Math.sin(TILT);
  var p = clamp(age / D.giftFall), la = age - D.giftFall,
      yRows = -(1 - p * p) * (N + 2) - (la > 0 ? Math.max(0, Math.sin(la * 9)) * Math.exp(-la * 5) * 1.5 * SC : 0);
  var gx = cx + (R + 1) * cw * Math.cos(phi0), baseY = ty0 + (N - 1.5) * ch + yRows * ch;
  if (Math.sin(phi0) < 0 && Math.abs(gx - cx) < R * cw * 0.8) return;   // hidden behind the tree
  var hd = 0.5 * Math.sqrt(w * w + d * d), rw = Math.min(w, d) * 0.17;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(gx, baseY, hd * 1.05, hd * sT * 0.9, 0, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.2;
  ctx.drawImage(halo(g.body), gx - hd * 1.7, baseY - h * cT * 0.5 - hd * 1.4, hd * 3.4, hd * 2.8);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  var dx = cT * sphi, dy = sT, dz = cT * cphi, hw = w / 2, hdp = d / 2;
  var c0 = Math.floor((gx - hd - cx) / cw), c1 = Math.ceil((gx + hd - cx) / cw),
      r0 = Math.floor((baseY - h * cT - hd * sT - ty0) / ch), r1 = Math.ceil((baseY + hd * sT - ty0) / ch);
  for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
    var px = cx + cc * cw, py = ty0 + rr * ch, relx = px - gx, relz0 = (py - baseY) / sT,
        ox = relx * cphi + relz0 * sphi, oz = -relx * sphi + relz0 * cphi;
    var smin = 1e9, face = -1, sgn = 1, enter = -1e9, ax, lo, hi, o, dd, s1, s2, t1, t2, bad = false;
    for (ax = 0; ax < 3 && !bad; ax++) {
      o = ax === 0 ? ox : ax === 1 ? 0 : oz; dd = ax === 0 ? dx : ax === 1 ? dy : dz;
      lo = ax === 0 ? -hw : ax === 1 ? 0 : -hdp; hi = ax === 0 ? hw : ax === 1 ? h : hdp;
      if (Math.abs(dd) < 1e-6) { if (o < lo || o > hi) bad = true; continue; }
      s1 = (lo - o) / dd; s2 = (hi - o) / dd; t1 = Math.min(s1, s2); t2 = Math.max(s1, s2);
      if (t1 > enter) enter = t1;
      if (t2 < smin) { smin = t2; face = ax; sgn = dd > 0 ? 1 : -1; }
    }
    if (bad || enter > smin) continue;
    var lx = ox + dx * smin, ly = dy * smin, lz = oz + dz * smin, nI, rib, ia, ib;
    if (face === 1) { nI = LY / LL; rib = Math.abs(lx) < rw / 2 || Math.abs(lz) < rw / 2; ia = Math.floor(lx / cw); ib = Math.floor(lz / cw); }
    else {
      var nxw = face === 0 ? sgn * cphi : -sgn * sphi, nzw = face === 0 ? sgn * sphi : sgn * cphi;
      nI = Math.max(0, nxw * LX + nzw * LZ) / LL;
      var across = face === 0 ? lz : lx, band = Math.abs(ly - h / 2) < rw * 0.35;
      rib = Math.abs(across) < rw / 2 || band; ia = Math.floor(across / cw); ib = Math.floor(ly / ch);
    }
    var lvl = face === 1 ? 5 : (nI > 0.42 ? 4 : nI > 0.15 ? 2 : 1), hh = hash(face * 2 + (sgn > 0 ? 1 : 0), ia, ib);
    ctx.fillStyle = rib ? G.rib[Math.min(5, lvl + 1)] : G.body[lvl];
    ctx.fillText(rib ? RIBG[hh & 3] : BODYG[hh & 3], px, py);
  }
  /* bow: two shaded loops and a knot on top */
  var bowY = function (lx, ly) { return baseY - ly * cT + lx * sphi * sT; };
  var br = rw * 0.95, k;
  for (k = -1; k <= 1; k += 2) sphere(gx + k * br * 1.0 * cphi, bowY(k * br, h + br * 0.5) , br, g.rib, false);
  sphere(gx, bowY(0, h + br * 0.35), br * 0.55, g.rib, true);
}

/* ---- Layout + cached background ---- */
var GC = 2 * Math.ceil(R * 1.5) + 3, GR = N + 6, HALF = (GC - 1) / 2, zb = new Float32Array(GC * GR), zi = new Int32Array(GC * GR);
var FONT = 'ui-monospace,SFMono-Regular,Menlo,Consolas,"Courier New",monospace';
function layout() {
  W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  var cols = 2 * R + 24;
  fs = Math.max(6, Math.min(H * 0.9 / (N + 14), W * 0.95 / (cols * 0.6)));
  fs = Math.floor(fs * 2) / 2; cw = fs * 0.6; ch = fs; cx = W / 2;
  ty0 = (H - (N + 14) * ch) / 2 + 8 * ch;
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
function byZ(a, b) { return a.z - b.z; }

function frame() {
  var k, it, rot = reduce ? 0.5 : CONFIG.rotationSpeed * T + 0.5;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(bg, 0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.font = Math.max(10, fs * 1.3) + 'px ' + FONT;
  for (k = 0; k < flakes.length; k++) { var f = flakes[k];   // falling ASCII snow
    ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(T * f.tw + f.ph));
    ctx.fillText(f.ch, f.x * W + Math.sin(T * 0.6 + f.ph) * f.sw, (f.y * H + T * f.sp) % (H + 20) - 10); }
  ctx.font = 'bold ' + fs + 'px ' + FONT; ctx.globalAlpha = 1;

  var dt = D.treeEnd - D.treeStart, gp = clamp((T - D.garlandStart) / (D.garlandEnd - D.garlandStart)), lights = 0;
  zb.fill(-1e9); zi.fill(-1);
  for (k = 0; k < items.length; k++) { it = items[k]; var al = 1, col = it.c, age;
    if (it.k === 0) { age = T - (D.treeStart + (1 - (it.t + it.j)) * dt); if (age < 0) continue; al = clamp(age / 0.2); if (age < 0.45) col = '#ffffff'; }
    else if (it.k === 1) { if (it.u > gp) continue; al = 0.75 + 0.25 * Math.sin(T * 3 + it.ph + it.u * 40); }
    else { age = T - it.ap; if (age < 0) continue; var bl = 0.5 + 0.5 * Math.sin(T * it.sp + it.ph); if (bl > 0.5) lights++; al = 0.2 + 0.8 * bl; }
    var ang = it.a + rot, z = it.r * Math.sin(ang), face = clamp(z / R * 0.5 + 0.5);
    var cc = Math.round(it.r * Math.cos(ang)) + it.dc + HALF, rr = Math.round(it.t * N) + it.dr;
    if (cc < 0 || cc >= GC || rr < 0 || rr >= GR) continue;
    var key = rr * GC + cc, zz = z + BIAS[it.k];
    if (zz > zb[key]) { zb[key] = zz; zi[key] = k; it.col = col; it.al = al * (it.k === 0 ? 0.72 + 0.28 * face : 0.9); }
  }
  var g;
  for (g = 0; g < gifts.length; g++) gifts[g].z = Math.sin(gifts[g].ang + rot);
  var order = gifts.slice().sort(byZ);
  for (k = 0; k < baubles.length; k++) drawBauble(baubles[k], rot, false);          // back-edge baubles
  for (g = 0; g < order.length; g++) if (order[g].z < 0) drawGift(order[g], rot);   // gifts behind the tree
  ctx.font = 'bold ' + fs + 'px ' + FONT;
  for (k = 0; k < zi.length; k++) { if (zi[k] < 0) continue; it = items[zi[k]];
    ctx.globalAlpha = it.al; ctx.fillStyle = it.col;
    ctx.fillText(it.ch, cx + ((k % GC) - HALF) * cw, ty0 + ((k / GC) | 0) * ch); }
  ctx.globalAlpha = 1;
  for (k = 0; k < baubles.length; k++) drawBauble(baubles[k], rot, true);           // front baubles
  for (g = 0; g < order.length; g++) if (order[g].z >= 0) drawGift(order[g], rot);  // gifts in front

  /* star: ASCII five-point star seated on the tip, hanging from a line */
  var sa = T - D.starStart;
  if (sa > 0) { var ss = easeBack(sa / 1.2), pulse = 0.8 + 0.4 * Math.sin(T * 3), ry, rc, row;
    ctx.globalAlpha = clamp(sa / 0.6) * 0.55; ctx.strokeStyle = '#ffb52e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, ty0 - 7.4 * ch); ctx.stroke();
    ctx.globalAlpha = clamp(sa / 0.6); ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = fs * pulse;
    ctx.font = 'bold ' + fs * ss + 'px ' + FONT;
    for (ry = 0; ry < STAR.length; ry++) { row = STAR[ry];
      for (rc = 0; rc < row.length; rc++) { ctx.fillStyle = STARC[row.charAt(rc)];
        ctx.fillText(row.charAt(rc), cx + (rc - (row.length - 1) / 2) * cw * ss, ty0 + (ry - 6.6) * ch); } }
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
