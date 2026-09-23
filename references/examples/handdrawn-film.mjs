// "Introducing Opus 5.5" hand-drawn canvas film. 1920x1080, 30fps, 30s.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import rough from 'roughjs';
import { spawn } from 'child_process';
import fs from 'fs';

const W = 1920, H = 1080, FPS = 30, DUR = 30;
for (const [f, n] of [['Newsreader-Display', 'NewsD'], ['DMSans-Med', 'SansM'], ['DMSans-Bold', 'SansB'], ['Kalam-Bold', 'Hand'], ['Silkscreen-Regular', 'Pix']])
  GlobalFonts.registerFromPath(new URL('./fonts/' + f + '.ttf', import.meta.url).pathname, n);

const C = {
  paper: '#F0EEE6', ivory: '#FAF9F5', ink: '#141413', slate: '#3D3D3A', gray: '#A8A69D', lgray: '#CFCCC2',
  clay: '#D97757', clayD: '#B85A3C', oat: '#E3DACC', sky: '#6A9BCC', skyD: '#4E7FB0', olive: '#788C5D', gold: '#E8B04B',
};

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const rc = rough.canvas(canvas);
let BOIL = 0, NOW = 0;

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const eo = t => 1 - Math.pow(1 - t, 3);
const ei = t => t * t * t;
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const back = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const elastic = t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 9 - 0.75) * (2 * Math.PI) / 3) + 1);
function hs(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const rnd = s => (hs(s) % 100000) / 100000;

// ---------- drawing helpers ----------
function ro(id, o = {}) {
  return Object.assign({ roughness: 1.3, bowing: 1.1, stroke: C.ink, strokeWidth: 3.2, fillWeight: 2.4, hachureGap: 10,
    seed: ((hs(id) + BOIL * 7919) % 2147483000) + 1 }, o);
}
function T(str, x, y, o = {}) {
  const { f = 'SansM', size = 40, color = C.ink, align = 'left', reveal = 1, alpha = 1, scale = 1, rot = 0, jit = 1 } = o;
  if (reveal <= 0 || alpha <= 0 || scale <= 0) return 0;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  const j = jit ? (rnd(str + 'x' + BOIL) - 0.5) * 2.2 * jit : 0;
  const jr = jit ? (rnd(str + 'r' + BOIL) - 0.5) * 0.008 * jit : 0;
  ctx.translate(x + j, y + j * 0.6); ctx.rotate(rot + jr); ctx.scale(scale, scale);
  ctx.font = `${size}px ${f}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  const w = ctx.measureText(str).width;
  if (reveal < 1) {
    const x0 = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
    ctx.beginPath(); ctx.rect(x0 - 12, -size * 1.6, (w + 24) * reveal, size * 3.2); ctx.clip();
  }
  ctx.fillText(str, 0, 0);
  ctx.restore();
  return w;
}
function mw(str, f, size) { ctx.save(); ctx.font = `${size}px ${f}`; const w = ctx.measureText(str).width; ctx.restore(); return w; }
function drawOn(id, pts, p, o = {}) {
  if (p <= 0) return;
  const n = pts.length;
  const fk = (n - 1) * clamp(p);
  const k = Math.floor(fk);
  const sub = pts.slice(0, k + 1);
  if (k < n - 1) { const a = pts[k], b = pts[k + 1], f = fk - k; sub.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]); }
  if (sub.length < 2) return;
  rc.curve(sub, ro(id, Object.assign({ roughness: 0.7 }, o)));
}
function wavyLine(x1, y1, x2, y2, n = 10, amp = 6, id = 'w') {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([lerp(x1, x2, t), lerp(y1, y2, t) + Math.sin(t * 7 + rnd(id) * 6) * amp]); }
  return pts;
}
function withT(x, y, s, r, fn) { ctx.save(); ctx.translate(x, y); if (r) ctx.rotate(r); if (s !== 1) ctx.scale(s, s); fn(); ctx.restore(); }

// Section tag like "01 / BUILD"
function tag(str, x, y, p) {
  if (p <= 0) return;
  const w = mw(str, 'Pix', 34) + 48;
  withT(x, y, back(clamp(p)), -0.03, () => {
    rc.rectangle(0, -34, w, 64, ro('tag' + str, { fill: C.ink, fillStyle: 'solid', roughness: 1 }));
    T(str, 24, 12, { f: 'Pix', size: 34, color: C.ivory, jit: 0.5 });
  });
}

// ---------- the hero: an original 8-bit sprite with hand-drawn stick arms ----------
const SPR = [
  '..............',
  '..............',
  '.......K......',
  '....KKKKKK....',
  '...KBBBBBBK...',
  '..KBFFFFFFBK..',
  '..KBFFFFFFBK..',
  '..KBFFFFFFBK..',
  '..KBFFFFFFDK..',
  '..KSSSSSSSSK..',
  '..KBBBBBBBDK..',
  '...KBBBBBDK...',
];
const PCOL = { K: C.ink, B: C.sky, D: C.skyD, F: C.ivory, S: C.clay, X: C.gold, T: C.clay };
function heroPixels(o) {
  const px = [];
  const t = o.t;
  for (let r = 0; r < SPR.length; r++) for (let c = 0; c < 14; c++) {
    let ch = SPR[r][c];
    if (ch === '.') continue;
    if (o.tie && ch === 'S') ch = (c === 6 || c === 7) ? 'T' : 'B';
    px.push([c, r, ch]);
  }
  // spark on the antenna
  const sp = (BOIL % 4 < 2) ? C.gold : C.clay;
  for (const [c, r] of [[7, 0], [8, 0], [7, 1], [8, 1]]) px.push([c, r, 'X', sp]);
  // eyes
  const lk = o.look || 0;
  for (const ec of [5 + lk, 8 + lk]) {
    if (o.blink) px.push([ec, 7, 'K']);
    else { px.push([ec, 6, 'K']); px.push([ec, 7, 'K']); }
  }
  // mouth
  if (o.mouth === 'o') { px.push([6, 8, 'K']); px.push([7, 8, 'K']); }
  else { px.push([6 + lk, 8, 'K']); px.push([7 + lk, 8, 'K']); }
  // tie
  if (o.tie) { px.push([6, 10, 'T']); px.push([7, 10, 'T']); px.push([7, 11, 'T']); }
  // feet
  const ph = o.run != null ? Math.floor(o.run) % 2 : -1;
  const feet = ph === 0 ? [4, 5, 9, 10].map(c => [c, 12]) : ph === 1 ? [2, 3, 10, 11].map(c => [c, 12]) : [3, 4, 9, 10].map(c => [c, 12]);
  for (const [c, r] of feet) px.push([c, r, 'K']);
  // scarf tail flutter (trails on the left)
  if (!o.tie) {
    const sp2 = o.run != null ? 22 : 9;
    const tail = [[1, 9], [0, 9], [-1, 10], [-2, 10]];
    tail.forEach(([c, r], i) => {
      const w = Math.round(Math.sin(t * sp2 + i * 1.3) * (i * 0.5));
      px.push([c, r + w, 'S']);
    });
  }
  return px;
}
function hero(x, y, s, o = {}) {
  o = Object.assign({ t: NOW, arms: 'down', sq: 1, rot: 0, alpha: 1, asm: 1, flip: false }, o);
  if (o.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.shadow !== false && o.asm > 0.8) {
    ctx.fillStyle = 'rgba(20,20,19,0.13)';
    ctx.beginPath(); ctx.ellipse(0, 2, 6 * s, 1.1 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.rotate(o.rot);
  ctx.scale((o.flip ? -1 : 1) / Math.sqrt(o.sq), o.sq);
  const px = heroPixels(o);
  const cx = -7 * s, cy = -13 * s;
  // arms first (behind body)
  if (o.asm > 0.92) {
    const sh = [[-5 * s, -2.6 * s], [5 * s, -2.6 * s]];
    let a = [0.45, 0.45];
    const tt = o.t;
    if (o.arms === 'up') a = [2.55 + Math.sin(tt * 16) * 0.15, 2.55 + Math.cos(tt * 16) * 0.15];
    else if (o.arms === 'wave') a = [0.4, 2.3 + Math.sin(tt * 18) * 0.45];
    else if (o.arms === 'out') a = [1.5, 1.5];
    else if (o.arms === 'run') a = [0.8 + Math.sin(tt * 20) * 0.6, 0.8 - Math.sin(tt * 20) * 0.6];
    else if (o.arms === 'toss') a = [1.2 + Math.sin(tt * 26) * 1.1, 1.2 - Math.sin(tt * 26) * 1.1];
    else if (o.arms === 'type') a = [0.9 + Math.sin(tt * 40) * 0.2, 0.9 + Math.cos(tt * 40) * 0.2];
    else if (Array.isArray(o.arms)) a = o.arms;
    const L = 3.4 * s;
    [-1, 1].forEach((side, i) => {
      const [sx, sy] = sh[i];
      const hx = sx + side * Math.sin(a[i]) * L, hy = sy + Math.cos(a[i]) * L;
      rc.line(sx, sy, hx, hy, ro('arm' + i + s, { strokeWidth: Math.max(2, s * 0.42), roughness: 0.6, bowing: 2 }));
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(hx, hy, s * 0.48, 0, Math.PI * 2); ctx.fill();
    });
  }
  for (const [c, r, ch, col] of px) {
    let X = cx + c * s, Y = cy + r * s;
    if (o.asm < 1) {
      const d = rnd('d' + c + ',' + r) * 0.45;
      const q = clamp((o.asm - d) / 0.55);
      if (q <= 0) continue;
      const th = rnd('a' + c + ',' + r) * Math.PI * 2, R = 260 + rnd('R' + c + r) * 420;
      const e = back(q);
      X = lerp(Math.cos(th) * R, X, e); Y = lerp(-6 * s + Math.sin(th) * R, Y, e);
    }
    const jx = (rnd('jx' + c + ',' + r + BOIL) - 0.5) * s * 0.1, jy = (rnd('jy' + c + ',' + r + BOIL) - 0.5) * s * 0.1;
    ctx.fillStyle = col || PCOL[ch];
    ctx.fillRect(X + jx, Y + jy, s + 0.7, s + 0.7);
  }
  ctx.restore();
}

// ---------- props ----------
function pencil(x, y, len, ang, id = 'pen') {
  withT(x, y, 1, ang, () => {
    const w = len * 0.13, c = len * 0.2;
    rc.polygon([[0, 0], [c, -w / 2], [c, w / 2]], ro(id + 'cone', { fill: C.oat, fillStyle: 'solid', strokeWidth: 3 }));
    rc.polygon([[0, 0], [c * 0.35, -w * 0.18], [c * 0.35, w * 0.18]], ro(id + 'lead', { fill: C.ink, fillStyle: 'solid', strokeWidth: 2 }));
    rc.rectangle(c, -w / 2, len * 0.66, w, ro(id + 'body', { fill: C.gold, fillStyle: 'solid', strokeWidth: 3 }));
    rc.line(c, -w / 6, c + len * 0.66, -w / 6, ro(id + 'l1', { strokeWidth: 2 }));
    rc.line(c, w / 6, c + len * 0.66, w / 6, ro(id + 'l2', { strokeWidth: 2 }));
    rc.rectangle(c + len * 0.66, -w / 2, len * 0.07, w, ro(id + 'fer', { fill: C.gray, fillStyle: 'solid', strokeWidth: 3 }));
    rc.rectangle(c + len * 0.73, -w / 2, len * 0.1, w, ro(id + 'era', { fill: '#E9A99A', fillStyle: 'solid', strokeWidth: 3 }));
  });
}
function bubble(x, y, w, h, tx, ty, p, id) {
  if (p <= 0) return;
  withT(x, y, back(p), 0, () => {
    rc.polygon([[-w * 0.18, h * 0.3], [tx - x, ty - y], [-w * 0.02, h * 0.42]], ro(id + 't', { fill: C.ivory, fillStyle: 'solid' }));
    rc.ellipse(0, 0, w, h, ro(id, { fill: C.ivory, fillStyle: 'solid', strokeWidth: 4 }));
  });
}
function stamp(x, y, l1, l2, p, id, col = C.clay) {
  if (p <= 0) return;
  const sc = lerp(2.6, 1, eo(clamp(p / 0.35)));
  const a = clamp(p / 0.2);
  const w1 = mw(l1, 'SansB', 118), w2 = mw(l2, 'SansB', 40);
  const w = Math.max(w1, w2) + 90, h = 250;
  withT(x, y, sc, -0.11, () => {
    ctx.globalAlpha *= a;
    rc.rectangle(-w / 2, -h / 2, w, h, ro(id + 'a', { stroke: col, strokeWidth: 9, roughness: 1.6 }));
    rc.rectangle(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, ro(id + 'b', { stroke: col, strokeWidth: 4, roughness: 1.8 }));
    T(l1, 0, 20, { f: 'SansB', size: 118, color: col, align: 'center' });
    T(l2, 0, 82, { f: 'SansB', size: 40, color: col, align: 'center' });
  });
}
function confetti(x, y, lt, id, n = 36) {
  if (lt <= 0 || lt > 1.6) return;
  const cols = [C.clay, C.sky, C.gold, C.olive, C.ink];
  for (let i = 0; i < n; i++) {
    const th = -Math.PI / 2 + (rnd(id + i) - 0.5) * 2.6, v = 500 + rnd(id + 'v' + i) * 900;
    const px = x + Math.cos(th) * v * lt, py = y + Math.sin(th) * v * lt + 900 * lt * lt;
    withT(px, py, 1, lt * (6 + i), () => {
      ctx.fillStyle = cols[i % 5]; ctx.fillRect(-9, -5, 18, 10);
    });
  }
}
function burst(x, y, p, id, n = 12, r0 = 70, r1 = 230, col = C.ink) {
  if (p <= 0 || p >= 1) return;
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2 + rnd(id + i) * 0.3;
    const a = lerp(r0, r1, eo(p)), b = lerp(r0, r1, eo(clamp(p * 1.7)));
    const rr = 0.8 + rnd(id + 'r' + i) * 0.4;
    rc.line(x + Math.cos(th) * a * rr, y + Math.sin(th) * a * rr, x + Math.cos(th) * b * rr, y + Math.sin(th) * b * rr,
      ro(id + i, { stroke: col, strokeWidth: 5, roughness: 0.6 }));
  }
}
function coin(x, y, id, col = C.gold) {
  rc.ellipse(x, y + 9, 170, 46, ro(id + 's', { fill: col, fillStyle: 'solid', strokeWidth: 3 }));
  rc.ellipse(x, y, 170, 46, ro(id, { fill: col, fillStyle: 'hachure', hachureGap: 8, strokeWidth: 3 }));
}
function clockDoodle(x, y, r, spin, id) {
  rc.circle(x, y, r * 2, ro(id, { fill: C.ivory, fillStyle: 'solid', strokeWidth: 4 }));
  const a1 = spin * 12, a2 = spin;
  rc.line(x, y, x + Math.sin(a1) * r * 0.75, y - Math.cos(a1) * r * 0.75, ro(id + 'm', { strokeWidth: 4 }));
  rc.line(x, y, x + Math.sin(a2) * r * 0.5, y - Math.cos(a2) * r * 0.5, ro(id + 'h', { strokeWidth: 6 }));
}

// ---------- scribble for intro ----------
const SCRIB = [];
for (let i = 0; i <= 110; i++) {
  const u = i / 110, a = u * Math.PI * 2 * 3.6 + 0.4;
  const r = 400 * (1 - u) + 14 + Math.sin(u * 40) * 14;
  SCRIB.push([960 + Math.cos(a) * r * 1.25, 520 + Math.sin(a) * r * 0.8]);
}

// ================= PANELS =================
const PW = 1920, PH = 1080;
const panels = [];
function panel(name, x, y, t0, t1, draw, w = PW, h = PH, bg = null) { panels.push({ name, x, y, t0, t1, draw, w, h, bg }); }

// ---- P1: pencil scribble -> ink dot -> hero assembles ----
const HERO1 = { x: 960, y: 740, s: 22 };
panel('intro', 0, 0, 0, 2.6, lt => {
  const cx = 960, cy = 520;
  const p = seg(lt, 0.05, 0.85), col = seg(lt, 0.85, 1.05);
  if (col < 1) withT(cx, cy, 1 - ei(col), 0, () => { ctx.translate(-cx, -cy); drawOn('scrib', SCRIB, p, { strokeWidth: 6, roughness: 0.9 }); });
  const dotP = seg(lt, 0.9, 1.1), pop = seg(lt, 1.12, 1.22);
  if (dotP > 0 && pop < 1) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, 46 * back(dotP) * (1 - pop), 0, 7); ctx.fill(); }
  burst(cx, cy, seg(lt, 1.1, 1.45), 'b1', 14, 60, 330);
  if (lt < 1.1) {
    const k = Math.min(SCRIB.length - 1, Math.round(p * (SCRIB.length - 1)));
    let [px, py] = SCRIB[k];
    const ein = eo(seg(lt, 0, 0.12)), eout = ei(seg(lt, 0.85, 1.1));
    px = lerp(2300, px, ein) + eout * 1500; py = lerp(-400, py, ein) - eout * 1100;
    pencil(px, py, 620, -0.85 + Math.sin(lt * 30) * 0.04, 'pen1');
  }
  const asm = seg(lt, 1.1, 1.75);
  if (asm > 0) {
    const bob = lt > 1.75 ? -Math.abs(Math.sin((lt - 1.75) * 7)) * 8 : 0;
    const land = seg(lt, 1.72, 1.9);
    const sq = land > 0 && land < 1 ? 1 - Math.sin(land * Math.PI) * 0.22 : 1;
    const blink = lt > 2.05 && lt < 2.13;
    hero(HERO1.x, HERO1.y + bob, HERO1.s, { asm, sq, blink, arms: lt > 1.9 ? 'wave' : 'down', look: lt > 1.9 && lt < 2.05 ? 1 : 0 });
  }
  const bp = seg(lt, 1.8, 2.0);
  bubble(1400, 300, 560, 210, 1110, 460, bp, 'bub1');
  if (bp > 0) T('hello, world.', 1400, 322, { f: 'Hand', size: 70, align: 'center', reveal: seg(lt, 1.9, 2.25) });
});

// ---- P2: title ----
const TTL = 'Claude Opus 5.5', TSZ = 190;
panel('title', 2180, 0, 2.6, 5.4, lt => {
  T('Introducing', 960, 330, { f: 'Hand', size: 76, color: C.clay, align: 'center', reveal: eo(seg(lt, 0.05, 0.45)) });
  const sl = seg(lt, 0.35, 0.62);
  if (sl > 0) T(TTL, 960, 560, { f: 'NewsD', size: TSZ, align: 'center', scale: lerp(1.8, 1, back(sl)), alpha: sl * 3 });
  drawOn('ul2', wavyLine(250, 612, 1670, 604, 14, 7, 'u2'), seg(lt, 0.62, 0.95), { stroke: C.clay, strokeWidth: 10 });
  // sparkles
  const sp = seg(lt, 0.7, 0.9);
  if (sp > 0) for (const [x, y, i] of [[220, 380, 0], [1720, 360, 1], [1690, 700, 2], [260, 720, 3]]) {
    const r = 26 * back(sp);
    rc.line(x - r, y, x + r, y, ro('sp' + i, { strokeWidth: 5 }));
    rc.line(x, y - r, x, y + r, ro('sq' + i, { strokeWidth: 5 }));
  }
  // hero runs in and lands on "5.5"
  const tw = mw(TTL, 'NewsD', TSZ), pre = mw('Claude Opus ', 'NewsD', TSZ), w55 = mw('5.5', 'NewsD', TSZ);
  const lx = 960 - tw / 2 + pre + w55 / 2, ly = 560 - TSZ * 0.69;
  const s = 10;
  if (lt > 0.5) {
    let x, y, arms = 'run', run = null, sq = 1;
    if (lt < 1.1) { x = lerp(-150, lx - 280, seg(lt, 0.5, 1.1)); y = 820; run = lt * 14; }
    else if (lt < 1.45) { const u = seg(lt, 1.1, 1.45); x = lerp(lx - 280, lx, u); y = lerp(820, ly, u) - Math.sin(u * Math.PI) * 260; arms = 'up'; sq = 1.15; }
    else { x = lx; y = ly; const u = seg(lt, 1.45, 1.62); sq = u < 1 ? 1 - Math.sin(u * Math.PI) * 0.3 : 1; arms = lt > 1.62 ? (lt > 2.2 ? 'wave' : 'up') : 'down'; }
    hero(x, y, s, { run, arms, sq, shadow: lt > 1.45 ? false : true });
  }
  // tagline + highlighter
  const tg = seg(lt, 1.3, 1.6);
  const a = 'Fable 5.1-class performance on most tasks, at ', b = '~40% less to run';
  const wa = mw(a, 'SansM', 46), wb = mw(b, 'SansM', 46), x0 = 960 - (wa + wb) / 2;
  const hp = eo(seg(lt, 1.7, 2.1));
  if (hp > 0) rc.rectangle(x0 + wa - 8, 846, (wb + 16) * hp, 50, ro('hl2', { fill: C.clay, fillStyle: 'hachure', hachureGap: 5, fillWeight: 5, stroke: 'none', roughness: 1.6 }));
  if (tg > 0) T(a + b, x0, 884 + (1 - eo(tg)) * 30, { size: 46, alpha: tg });
});

// ---- P3: build — bars ----
panel('build', 4360, 0, 5.4, 7.6, lt => {
  tag('01 / BUILD', 110, 100, seg(lt, 0, 0.2));
  T('Agentic coding, leveled up.', 110, 250, { f: 'NewsD', size: 82, reveal: eo(seg(lt, 0.05, 0.4)) });
  // legend
  const lg = seg(lt, 0.2, 0.4);
  if (lg > 0) {
    rc.rectangle(112, 300, 34, 34, ro('lg1', { fill: C.clay, fillStyle: 'solid' })); T('Opus 5.5', 160, 330, { size: 32, alpha: lg });
    rc.rectangle(330, 300, 34, 34, ro('lg2', { fill: C.lgray, fillStyle: 'solid' })); T('Fable 5.1', 378, 330, { size: 32, alpha: lg });
  }
  const base = 940, U = 6.6;
  rc.line(90, base, 1060, base, ro('base3', { strokeWidth: 4 }));
  const bars = [
    { x: 150, v: 66.4, c: C.clay, p: seg(lt, 0.25, 0.9), id: 'b1' },
    { x: 330, v: 55.8, c: C.gray, p: seg(lt, 0.3, 0.75), id: 'b2' },
    { x: 620, v: 57.8, c: C.clay, p: seg(lt, 1.0, 1.55), id: 'b3' },
    { x: 800, v: 51.8, c: C.gray, p: seg(lt, 1.0, 1.4), id: 'b4' },
  ];
  const hts = bars.map(b => b.v * U * eo(b.p));
  bars.forEach((b, i) => {
    if (b.p <= 0) return;
    rc.rectangle(b.x, base - hts[i], 150, hts[i], ro(b.id, { fill: b.c, fillStyle: 'hachure', hachureGap: 9, fillWeight: 3.5, strokeWidth: 3.5, hachureAngle: -41 + i * 10 }));
    if (i % 2 === 0) { if (hts[i] > 90) { rc.rectangle(b.x + 12, base - hts[i] + 18, 126, 58, ro(b.id + 'lb', { fill: C.ivory, fillStyle: 'solid', strokeWidth: 2.5 })); T((b.v * eo(b.p)).toFixed(1) + '%', b.x + 75, base - hts[i] + 60, { f: 'SansB', size: 38, align: 'center' }); } }
    else T((b.v * eo(b.p)).toFixed(1) + '%', b.x + 75, base - hts[i] - 22, { f: 'SansB', size: 46, align: 'center', color: C.slate });
  });
  T('Terminal-Bench 4.0', 315, base + 50, { size: 32, align: 'center', alpha: seg(lt, 0.3, 0.5) });
  T('CursorBench 4.0', 785, base + 50, { size: 32, align: 'center', alpha: seg(lt, 1.0, 1.2) });
  // hero rides bars
  let hx, hy, arms = 'up', sq = 1;
  if (lt < 0.95) { hx = 225; hy = base - hts[0]; }
  else if (lt < 1.2) { const u = seg(lt, 0.95, 1.2); hx = lerp(225, 695, u); hy = lerp(base - hts[0], base - Math.max(hts[2], 1), u) - Math.sin(u * Math.PI) * 180; sq = 1.12; }
  else { hx = 695; hy = base - hts[2]; arms = lt > 1.6 ? 'wave' : 'up'; const u = seg(lt, 1.2, 1.32); if (u < 1) sq = 1 - Math.sin(u * Math.PI) * 0.25; }
  hero(hx, hy, 8, { arms, sq, shadow: false });
  // terminal window
  const tw = seg(lt, 0.0, 0.2);
  if (tw > 0) withT(1480, 560, back(tw), 0.015, () => {
    ctx.translate(-1480, -560);
    rc.rectangle(1150, 180, 660, 760, ro('term', { fill: C.ink, fillStyle: 'solid', strokeWidth: 4 }));
    [0, 1, 2].forEach(i => rc.circle(1190 + i * 36, 214, 20, ro('dot' + i, { stroke: C.ivory, strokeWidth: 2.5 })));
    T('> migrate the auth service', 1180, 290, { f: 'Pix', size: 26, color: C.ivory, reveal: seg(lt, 0.1, 0.45), jit: 0.3 });
    const cols = [C.clay, C.sky, C.ivory, C.gold, C.olive];
    for (let i = 0; i < 15; i++) {
      const tl = seg(lt, 0.45 + i * 0.085, 0.53 + i * 0.085);
      if (tl <= 0) break;
      let x = 1190 + (i % 4 === 0 ? 0 : 40 + (i % 3) * 30);
      const y = 340 + i * 36;
      const segs = 2 + (hs('n' + i) % 3);
      for (let k = 0; k < segs; k++) {
        const w = (40 + rnd('w' + i + k) * 130) * tl;
        rc.line(x, y, x + w, y, ro('cl' + i + k, { stroke: cols[(i + k) % 5], strokeWidth: 12, roughness: 0.5 }));
        x += w + 22;
      }
    }
    T('OK  all tests green', 1180, 900, { f: 'Pix', size: 26, color: C.olive, reveal: seg(lt, 1.8, 2.05), jit: 0.3 });
  });
  T('Source: Anthropic, Sep 2026', 110, 1040, { size: 22, color: C.slate, alpha: seg(lt, 0.4, 0.6) });
});

// ---- P4: 680k-line migration ----
panel('migrate', 6540, 0, 7.6, 9.4, lt => {
  const n = Math.round(680000 * eo(seg(lt, 0.0, 0.85)));
  T(n.toLocaleString('en-US'), 960, 175, { f: 'NewsD', size: 170, align: 'center', color: lt > 0.85 ? C.clay : C.ink });
  T('lines of code migrated in under a day', 960, 245, { f: 'SansB', size: 50, align: 'center', alpha: seg(lt, 0.2, 0.4) });
  T('(customer report)', 960, 295, { f: 'Hand', size: 36, align: 'center', color: C.slate, alpha: seg(lt, 0.3, 0.5) });
  // pile of sheets
  const left = Math.round(18 * (1 - seg(lt, 0, 1.8) * 0.7));
  for (let i = 0; i < left; i++) {
    const y = 930 - i * 26;
    withT(340, y, 1, (rnd('pr' + i) - 0.5) * 0.08, () => rc.rectangle(-200, -12, 400, 24, ro('pile' + i, { fill: C.ivory, fillStyle: 'solid', strokeWidth: 2.5 })));
  }
  // done box
  rc.rectangle(1360, 720, 440, 230, ro('box', { fill: C.oat, fillStyle: 'hachure', hachureGap: 12, strokeWidth: 4 }));
  T('migrated!', 1580, 860, { f: 'Hand', size: 58, align: 'center', color: C.ink });
  // flying sheets
  for (let i = 0; i < 44; i++) {
    const ts = i * 0.034, u = (lt - ts) / 0.5;
    if (u <= 0 || u >= 1) continue;
    const x = lerp(340, 1580, u), y = lerp(930 - left * 26, 740, u) - Math.sin(u * Math.PI) * 220;
    withT(x, y, 1, u * 9 + i, () => {
      rc.rectangle(-60, -42, 120, 84, ro('sh' + i, { fill: C.ivory, fillStyle: 'solid', strokeWidth: 2.5, roughness: 1 }));
      for (let k = 0; k < 3; k++) rc.line(-42, -20 + k * 18, 30 - k * 12, -20 + k * 18, ro('shl' + i + k, { strokeWidth: 2, stroke: C.slate }));
    });
  }
  hero(900, 945, 13, { arms: 'toss', run: lt > 1.4 ? null : null, look: Math.sin(lt * 9) > 0 ? 1 : -1 });
});

// ---- P5: speed race ----
panel('race', 6540, 1340, 9.4, 12.0, lt => {
  T('Same 200,000-line codebase.', 110, 170, { f: 'NewsD', size: 76, reveal: eo(seg(lt, 0, 0.35)) });
  rc.line(110, 540, 1820, 540, ro('lane1', { strokeWidth: 4 }));
  rc.line(110, 880, 1820, 880, ro('lane2', { strokeWidth: 4 }));
  // finish flag
  rc.line(1760, 420, 1760, 900, ro('pole', { strokeWidth: 6 }));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0)
    rc.rectangle(1766 + c * 30, 420 + r * 30, 30, 30, ro('chk' + r + c, { fill: C.ink, fillStyle: 'solid', strokeWidth: 1.5, roughness: 0.6 }));
  rc.rectangle(1766, 420, 120, 90, ro('flag', { strokeWidth: 3 }));
  T('Opus 5', 110, 490, { f: 'SansB', size: 38, color: C.slate });
  T('Opus 5.5', 110, 830, { f: 'SansB', size: 38, color: C.clay });
  // snail
  const sx = 360 + 170 * seg(lt, 0, 2.6);
  rc.path(`M ${sx - 90} 540 Q ${sx - 100} 505 ${sx - 70} 500 L ${sx + 40} 520 L ${sx + 60} 540 Z`, ro('snb', { fill: C.oat, fillStyle: 'solid', strokeWidth: 3 }));
  rc.circle(sx - 10, 490, 96, ro('shell', { fill: C.lgray, fillStyle: 'hachure', hachureGap: 8, strokeWidth: 3.5 }));
  const sp = []; for (let i = 0; i < 30; i++) { const a = i * 0.45, r = 40 - i * 1.3; sp.push([sx - 10 + Math.cos(a) * r, 490 + Math.sin(a) * r]); }
  rc.curve(sp, ro('spiral', { strokeWidth: 2.5, roughness: 0.5 }));
  rc.line(sx - 80, 505, sx - 98, 470, ro('ant1', { strokeWidth: 2.5 })); rc.line(sx - 76, 505, sx - 80, 466, ro('ant2', { strokeWidth: 2.5 }));
  clockDoodle(sx + 150, 460, 34, lt * 2, 'ck1');
  T('20+ hrs', sx + 200, 475, { f: 'SansB', size: 44, color: C.slate });
  // hero on pencil rocket
  const u = eio(seg(lt, 0.3, 1.35));
  const hx = lerp(330, 1640, u), moving = lt > 0.3 && lt < 1.35;
  if (moving) for (let i = 0; i < 6; i++) {
    const y = 790 + i * 16 + (rnd('sl' + i + BOIL) - 0.5) * 10, x2 = hx - 220 - rnd('sx' + i) * 60;
    rc.line(x2 - 150 - rnd('sL' + i) * 250, y, x2, y, ro('spl' + i, { strokeWidth: 3, roughness: 0.5 }));
  }
  // flame
  const fl = moving ? 1 : lt < 0.3 ? 0.4 : 0.3;
  const fx = hx - 170;
  rc.polygon([[fx, 815], [fx - (90 + rnd('f' + BOIL) * 70) * fl, 835], [fx, 855]], ro('fl1', { fill: C.clay, fillStyle: 'solid', stroke: C.clayD, strokeWidth: 2 }));
  rc.polygon([[fx, 825], [fx - (45 + rnd('g' + BOIL) * 35) * fl, 835], [fx, 845]], ro('fl2', { fill: C.gold, fillStyle: 'solid', stroke: 'none' }));
  pencil(hx + 160, 835, 330, Math.PI, 'pen2');
  const done = lt > 1.35;
  hero(hx + 10, 812, 9, { arms: done ? 'up' : [1.9, 1.1], shadow: false, rot: moving ? -0.08 : 0, look: 1 });
  confetti(1760, 760, lt - 1.35, 'cf1');
  const fp = seg(lt, 1.35, 1.55);
  if (fp > 0) {
    clockDoodle(1480, 700, 38, lt * 10, 'ck2');
    T('< 3 hrs', 1540, 716, { f: 'SansB', size: 64, color: C.clay, scale: back(fp) });
  }
  stamp(1320, 320, '30% faster', 'output than Opus 5', seg(lt, 1.7, 2.3), 'st1');
  T('customer report: Opus 5 took 20+ hours and 2.5x the tokens', 110, 1010, { f: 'Hand', size: 34, color: C.slate, alpha: seg(lt, 1.5, 1.8) });
});

// ---- P6: knowledge-work dial ----
panel('elo', 4360, 1340, 12.0, 13.7, lt => {
  tag('02 / BEYOND CODE', 110, 100, seg(lt, 0, 0.2));
  T('Not just code.', 110, 250, { f: 'NewsD', size: 82, reveal: eo(seg(lt, 0.05, 0.35)) });
  const cx = 960, cy = 830, R = 400;
  rc.arc(cx, cy, R * 2, R * 2, Math.PI, Math.PI * 2, false, ro('dial', { strokeWidth: 6 }));
  rc.arc(cx, cy, R * 1.72, R * 1.72, Math.PI, Math.PI * 2, false, ro('dial2', { strokeWidth: 2.5, stroke: C.gray }));
  const ang = v => Math.PI + ((v - 1600) / 300) * Math.PI;
  for (let v = 1600; v <= 1900; v += 50) {
    const a = ang(v);
    rc.line(cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88, cx + Math.cos(a) * R, cy + Math.sin(a) * R, ro('tk' + v, { strokeWidth: 4 }));
    T(String(v), cx + Math.cos(a) * R * 1.13, cy + Math.sin(a) * R * 1.13 + 10, { size: 26, align: 'center', color: C.slate });
  }
  // Fable marker
  const fa = ang(1735);
  if (lt > 0.15) {
    rc.line(cx, cy, cx + Math.cos(fa) * R * 0.8, cy + Math.sin(fa) * R * 0.8, ro('fn', { stroke: C.gray, strokeWidth: 6 }));
    T('Fable 5.1 · 1735', cx + Math.cos(fa) * R * 0.8 - 20, cy + Math.sin(fa) * R * 0.8 - 18, { size: 26, color: C.slate, align: 'right' });
  }
  const v = 1600 + 246 * elastic(seg(lt, 0.25, 1.15));
  const a = ang(v);
  rc.line(cx, cy, cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92, ro('needle', { stroke: C.clay, strokeWidth: 12, roughness: 0.7 }));
  rc.circle(cx, cy, 60, ro('hub', { fill: C.ink, fillStyle: 'solid' }));
  T(String(Math.round(clamp(v, 1600, 1846))), cx, cy - 110, { f: 'NewsD', size: 150, align: 'center', color: lt > 1.0 ? C.clay : C.ink });
  T('GDPval-AA v2.1 · knowledge-work Elo', cx, cy + 90, { size: 38, align: 'center' });
  // side doodles: spreadsheet, pie, doc
  const dd = seg(lt, 0.1, 0.4);
  if (dd > 0) withT(1560, 280, back(dd), 0.06, () => {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) rc.rectangle(c * 70, r * 36, 70, 36, ro('ss' + r + c, { strokeWidth: 2, fill: (r + c) % 4 === 0 ? C.oat : undefined, fillStyle: 'solid' }));
  });
  if (dd > 0) withT(1700, 560, back(dd), 0, () => {
    rc.circle(0, 0, 150, ro('pie', { fill: C.ivory, fillStyle: 'solid' }));
    rc.arc(0, 0, 150, 150, -Math.PI / 2, 0.6, true, ro('pie2', { fill: C.sky, fillStyle: 'hachure', hachureGap: 7 }));
  });
  hero(1560, 1000, 11, { tie: true, arms: lt > 1.1 ? 'up' : 'out', look: -1, flip: true });
});

// ---- P7: merger + data analysis ----
panel('merger', 2180, 1340, 13.7, 15.9, lt => {
  // left
  T('Merger analysis', 80, 150, { f: 'Hand', size: 60, reveal: seg(lt, 0, 0.3) });
  rc.rectangle(90, 230, 340, 450, ro('doc', { fill: C.ivory, fillStyle: 'solid', strokeWidth: 4 }));
  T('M&A', 130, 300, { f: 'NewsD', size: 56 });
  for (let i = 0; i < 8; i++) rc.line(130, 350 + i * 30, 130 + 180 + rnd('dl' + i) * 90, 350 + i * 30, ro('dl' + i, { strokeWidth: 2.5, stroke: C.slate }));
  drawOn('sig', wavyLine(140, 640, 330, 630, 12, 14, 'sg'), seg(lt, 0.3, 0.7), { strokeWidth: 4, stroke: C.clay });
  const b1 = eo(seg(lt, 0.15, 0.55)), b2 = eo(seg(lt, 0.15, 0.75));
  T('Opus 5.5', 490, 300, { f: 'SansB', size: 32, color: C.clay });
  if (b1 > 0) rc.rectangle(490, 320, 63 * 4.2 * b1, 60, ro('mb1', { fill: C.clay, fillStyle: 'hachure', hachureGap: 7, fillWeight: 3 }));
  T(Math.round(63 * b1) + ' min', 500 + 63 * 4.2 * b1, 365, { f: 'SansB', size: 38 });
  T('Opus 5', 490, 450, { f: 'SansB', size: 32, color: C.slate });
  if (b2 > 0) rc.rectangle(490, 470, 93 * 4.2 * b2, 60, ro('mb2', { fill: C.lgray, fillStyle: 'hachure', hachureGap: 7, fillWeight: 3 }));
  T(Math.round(93 * b2) + ' min', 500 + 93 * 4.2 * b2, 515, { f: 'SansB', size: 38, color: C.slate });
  const hc = eo(seg(lt, 0.55, 0.8));
  if (hc > 0) rc.rectangle(482, 606, 380 * hc, 50, ro('hl7', { fill: C.clay, fillStyle: 'hachure', hachureGap: 5, fillWeight: 5, stroke: 'none', roughness: 1.6 }));
  T('50% lower cost', 490, 645, { f: 'SansB', size: 50, alpha: seg(lt, 0.5, 0.7) });
  // right
  T('Data analysis', 1040, 150, { f: 'Hand', size: 60, reveal: seg(lt, 0.9, 1.15) });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const on = seg(lt, 0.9 + (r * 5 + c) * 0.012, 1.0 + (r * 5 + c) * 0.012);
    if (on > 0) rc.rectangle(1040 + c * 160, 220 + r * 52, 160, 52, ro('g' + r + c, { strokeWidth: 2.2, fill: r === 0 ? C.oat : (hs('f' + r + c) % 5 === 0 ? '#F3D9CD' : undefined), fillStyle: 'solid' }));
  }
  const r1 = eo(seg(lt, 1.15, 1.6)), r2 = eo(seg(lt, 1.15, 1.45));
  T('Opus 5.5', 1040, 560, { f: 'SansB', size: 32, color: C.clay });
  if (r1 > 0) rc.rectangle(1040, 580, 86.6 * 7 * r1, 56, ro('hb1', { fill: C.clay, fillStyle: 'hachure', hachureGap: 7, fillWeight: 3 }));
  T((86.6 * r1).toFixed(1) + '%', 1055 + 86.6 * 7 * r1, 622, { f: 'SansB', size: 40 });
  T('Opus 5', 1040, 700, { f: 'SansB', size: 32, color: C.slate });
  if (r2 > 0) rc.rectangle(1040, 720, 60.3 * 7 * r2, 56, ro('hb2', { fill: C.lgray, fillStyle: 'hachure', hachureGap: 7, fillWeight: 3 }));
  T((60.3 * r2).toFixed(1) + '%', 1055 + 60.3 * 7 * r2, 762, { f: 'SansB', size: 40, color: C.slate });
  T("of what Hex's evals look for", 1040, 850, { size: 34, alpha: seg(lt, 1.4, 1.6) });
  T('customer-reported results', 80, 1010, { f: 'Hand', size: 32, color: C.slate });
  // hero hops across
  let hx, hy, sq = 1;
  if (lt < 0.85) { hx = 260; hy = 230; }
  else if (lt < 1.15) { const u = seg(lt, 0.85, 1.15); hx = lerp(260, 1440, u); hy = 230 - Math.sin(u * Math.PI) * 260 - u * 10; sq = 1.15; }
  else { hx = 1440; hy = 220; const u = seg(lt, 1.15, 1.3); if (u < 1) sq = 1 - Math.sin(u * Math.PI) * 0.25; }
  hero(hx, hy, 9, { tie: true, sq, arms: lt > 1.3 ? 'wave' : 'type', shadow: false, look: lt < 0.85 ? 1 : 0 });
});

// ---- P8: computer use ----
const CUR = [[0, 900, 300], [0.3, 470, 430], [0.62, 470, 560], [0.95, 470, 690], [1.3, 900, 820], [1.9, 1000, 700]];
function curPos(lt) {
  for (let i = 0; i < CUR.length - 1; i++) {
    const [t0, x0, y0] = CUR[i], [t1, x1, y1] = CUR[i + 1];
    if (lt <= t1) { const u = eio(seg(lt, t0, t1)); return [lerp(x0, x1, u), lerp(y0, y1, u)]; }
  }
  return CUR[CUR.length - 1].slice(1);
}
panel('computer', 0, 1340, 15.9, 17.8, lt => {
  rc.rectangle(160, 170, 1080, 760, ro('win', { fill: C.ivory, fillStyle: 'solid', strokeWidth: 4 }));
  rc.line(160, 230, 1240, 230, ro('winb', { strokeWidth: 3 }));
  [0, 1, 2].forEach(i => rc.circle(195 + i * 34, 200, 18, ro('wd' + i, { strokeWidth: 2.5 })));
  rc.rectangle(180, 250, 180, 660, ro('side', { fill: C.oat, fillStyle: 'hachure', hachureGap: 14, strokeWidth: 2 }));
  const fields = [[430, 400, 0.3], [430, 530, 0.62], [430, 660, 0.95]];
  const labels = ['Vendor', 'Amount', 'Due'];
  fields.forEach(([x, y, tc], i) => {
    T(labels[i], x, y - 20, { size: 26, color: C.slate });
    rc.rectangle(x, y - 5, 560, 64, ro('fld' + i, { strokeWidth: 3 }));
    const f = seg(lt, tc + 0.05, tc + 0.3);
    if (f > 0) drawOn('fs' + i, wavyLine(x + 20, y + 28, x + 20 + 360 - i * 60, y + 26, 16, 9, 'fs' + i), f, { strokeWidth: 3.5, stroke: C.ink });
    const rp = seg(lt, tc, tc + 0.35);
    if (rp > 0 && rp < 1) rc.circle(470, y + 30, 40 + rp * 160, ro('rip' + i, { stroke: C.clay, strokeWidth: 5 * (1 - rp) + 1 }));
  });
  rc.rectangle(780, 790, 210, 70, ro('btn', { fill: lt > 1.3 ? C.clay : C.oat, fillStyle: 'solid', strokeWidth: 3 }));
  T('Submit', 885, 838, { f: 'Hand', size: 40, align: 'center', color: lt > 1.3 ? C.ivory : C.ink });
  const bp = seg(lt, 1.3, 1.6);
  if (bp > 0 && bp < 1) rc.circle(900, 825, 40 + bp * 200, ro('rip4', { stroke: C.clay, strokeWidth: 5 * (1 - bp) + 1 }));
  // big cursor + hero surfing it
  const [cx, cy] = curPos(lt);
  withT(cx, cy, 1, 0, () => {
    rc.polygon([[0, 0], [0, 150], [36, 116], [62, 176], [90, 164], [64, 106], [112, 106]], ro('cur', { fill: C.ivory, fillStyle: 'solid', strokeWidth: 5 }));
  });
  hero(cx + 50, cy + 4, 7, { arms: 'out', shadow: false, rot: Math.sin(lt * 8) * 0.12 });
  // stat
  T('81.8%', 1300, 480, { f: 'NewsD', size: 180, color: C.clay, scale: back(seg(lt, 0.2, 0.45)) });
  T('OSWorld 2.0', 1305, 550, { f: 'SansB', size: 46, alpha: seg(lt, 0.3, 0.5) });
  T('computer use: clicks, forms, apps', 1305, 610, { f: 'Hand', size: 38, color: C.slate, alpha: seg(lt, 0.4, 0.6) });
});

// ---- P9: cost ----
panel('cost', 0, 2680, 17.8, 21.4, lt => {
  tag('03 / COST', 110, 100, seg(lt, 0, 0.2));
  const tags = [['Input · per 1M tokens', '$5', '$4'], ['Output · per 1M tokens', '$25', '$20'], ['Cache reads · per 1M', '$0.50', '$0.20']];
  tags.forEach(([lab, old, nw], i) => {
    const p = seg(lt, 0.1 + i * 0.18, 0.3 + i * 0.18);
    if (p <= 0) return;
    const y = 250 + i * 250;
    withT(130, y, back(p), -0.03 + i * 0.03, () => {
      rc.polygon([[0, 60], [50, 0], [560, 0], [560, 180], [50, 180]], ro('ptag' + i, { fill: C.ivory, fillStyle: 'solid', strokeWidth: 4 }));
      rc.circle(40, 90, 22, ro('ph' + i, { strokeWidth: 3 }));
      T(lab, 80, 52, { size: 30, color: C.slate });
      T(old, 80, 140, { f: 'NewsD', size: 76, color: C.gray });
      const ow = mw(old, 'NewsD', 76);
      drawOn('strk' + i, [[72, 118], [80 + ow * 0.5, 104], [88 + ow, 96]], seg(lt, 0.55 + i * 0.18, 0.7 + i * 0.18), { stroke: C.clay, strokeWidth: 8 });
      T('→', 110 + ow, 136, { f: 'SansB', size: 60, alpha: seg(lt, 0.65 + i * 0.18, 0.75 + i * 0.18) });
      T(nw, 190 + ow, 144, { f: 'NewsD', size: 96, scale: back(seg(lt, 0.7 + i * 0.18, 0.9 + i * 0.18)) });
    });
  });
  stamp(990, 520, '40% less', 'to run than Opus 5', seg(lt, 1.45, 2.0), 'st2');
  // coins
  const gone = Math.round(6 * eo(seg(lt, 2.3, 2.9)));
  for (let i = 0; i < 12; i++) coin(1420, 930 - i * 26, 'ca' + i, C.lgray);
  for (let i = 0; i < 12 - gone; i++) coin(1700, 930 - i * 26, 'cb' + i, C.gold);
  for (let i = 12 - gone; i < 12; i++) {
    const u = clamp((lt - 2.3 - (i - 6) * 0.08) / 0.5);
    if (u <= 0 || u >= 1) continue;
    withT(1700 + u * 500 * (i % 2 ? 1 : 0.6), 930 - i * 26 - Math.sin(u * Math.PI) * 300 + u * 200, 1, u * 8, () => coin(0, 0, 'cf' + i, C.gold));
  }
  T('Opus 5', 1420, 1010, { f: 'SansB', size: 32, align: 'center', color: C.slate });
  T('Opus 5.5', 1700, 1010, { f: 'SansB', size: 32, align: 'center', color: C.clay });
  T('half the tokens', 1560, 330, { f: 'SansB', size: 56, align: 'center', alpha: seg(lt, 2.3, 2.5) });
  T('40% fewer calls, same terminal tasks · Kiro', 1560, 385, { size: 28, align: 'center', color: C.slate, alpha: seg(lt, 2.4, 2.6) });
  const topY = 930 - (12 - gone) * 26 + 10;
  hero(1700, topY, 9, { arms: lt > 2.9 ? 'up' : 'down', shadow: false, look: -1 });
  // flipped coin
  if (lt > 2.95) {
    const u = seg(lt, 2.95, 3.4);
    withT(1760, topY - 160 - Math.sin(u * Math.PI) * 120, 1, 0, () => { ctx.scale(1, Math.abs(Math.cos(u * 18)) * 0.8 + 0.2); rc.circle(0, 0, 70, ro('flip', { fill: C.gold, fillStyle: 'solid', strokeWidth: 3 })); });
  }
});

// ---- rapid-fire cards ----
const CARDS = [
  ['66.4%', 'Terminal-Bench 4.0', 'agentic coding', C.ink, C.ivory, C.clay],
  ['81.8%', 'OSWorld 2.0', 'computer use', C.clay, C.ink, C.ivory],
  ['1846', 'GDPval-AA v2.1 Elo', 'knowledge work', C.paper, C.ink, C.clay],
  ['67.7%', "Humanity's Last Exam", 'with tools', C.sky, C.ink, C.ivory],
  ['89.0%', 'Chartography', 'reading charts, with tools', C.ink, C.ivory, C.gold],
  ['39/40', 'web-app optimizations landed', 'customer report', C.oat, C.ink, C.clay],
  ['72%', 'known bugs caught (Opus 5: 56%)', 'Deloitte', C.clay, C.ivory, C.ink],
  ['60%', 'fewer output tokens', 'Rogo', C.ink, C.ivory, C.sky],
  ['11 vs 38', 'prompts: 3 hours, not 4 days', 'Quantium', C.paper, C.ink, C.clay],
  ['85%', 'fewer attempts to slip containment', 'safety vs Opus 5', C.olive, C.ivory, C.ivory],
];
const CARD_T0 = 21.4, CARD_D = 0.42;
CARDS.forEach((cd, i) => {
  const x = 2180 + (i % 5) * 1080, y = 2680 + Math.floor(i / 5) * 660;
  panel('card' + i, x, y, CARD_T0 + i * CARD_D, CARD_T0 + (i + 1) * CARD_D, lt => {
    const [num, l1, l2, bg, fg, ac] = cd;
    const p = eo(seg(lt, 0, 0.12));
    T(num, 70, 300, { f: 'NewsD', size: 190, color: ac, scale: lerp(1.25, 1, p) });
    T(l1, 76, 380, { f: 'SansB', size: 38, color: fg, alpha: seg(lt, 0.04, 0.14) });
    T(l2, 76, 430, { f: 'Hand', size: 32, color: fg, alpha: seg(lt, 0.08, 0.18) * 0.8 });
    const poses = ['up', 'wave', 'out', 'up', 'type', 'wave', 'up', 'out', 'wave', 'up'];
    hero(830, 480 - Math.abs(Math.sin(lt * 14)) * 12, 6, { arms: poses[i], tie: i % 3 === 1, shadow: false, look: -1 });
    drawOn('cu' + i, wavyLine(76, 318, 76 + mw(num, 'NewsD', 190) * 0.95, 316, 8, 4, 'cu' + i), seg(lt, 0.1, 0.25), { stroke: fg, strokeWidth: 6 });
  }, 960, 540, cd[3]);
});

// ---------- camera ----------
const CX = (i, dx = 0) => panels[i].x + panels[i].w / 2 + dx;
const CY = (i, dy = 0) => panels[i].y + panels[i].h / 2 + dy;
const keys = [
  [0, 960, 540, 1.0, 0],
  [2.2, 960, 560, 1.1, 0, 'io'],
  [2.6, 927, 608, 22, 0, 'in'],
  [2.6, CX(1), 500, 1.4, -0.04, 'cut'],
  [3.2, CX(1), 540, 1.0, 0, 'o'],
  [5.1, CX(1), 540, 1.03, 0, 'io'],
  [5.4, CX(2), 540, 1.0, 0, 'io'],
  [7.3, CX(2, 30), 540, 1.06, 0, 'io'],
  [7.6, CX(3), 540, 1.0, 0, 'io'],
  [8.4, CX(3), 540, 1.0, 0, 'io'],
  [8.55, CX(3), 500, 1.13, 0.01, 'o'],
  [9.4, CX(3), 540, 1.06, 0, 'io'],
  [9.4, 6540 + 770, 1880, 1.25, 0.02, 'cut'],
  [9.8, 6540 + 770, 1880, 1.25, 0, 'io'],
  [10.75, 6540 + 1150, 1880, 1.25, 0, 'io'],
  [11.1, CX(4), 1880, 1.0, 0, 'io'],
  [12.0, CX(4), 1880, 1.03, 0, 'io'],
  [12.0, CX(5), 1880, 1.18, 0.03, 'cut'],
  [12.45, CX(5), 1880, 1.0, 0, 'o'],
  [13.7, CX(5), 1880, 1.05, 0, 'io'],
  [13.7, 2180 + 520, 1880, 1.65, 0, 'cut'],
  [14.55, 2180 + 520, 1880, 1.7, 0, 'io'],
  [14.85, 2180 + 1420, 1880, 1.65, 0, 'io'],
  [15.45, 2180 + 1420, 1880, 1.7, 0, 'io'],
  [15.9, CX(6), 1880, 1.0, 0, 'io'],
  [15.9, CX(7), 1880, 1.25, -0.03, 'cut'],
  [16.4, CX(7), 1880, 1.0, 0, 'o'],
  [17.8, CX(7), 1880, 1.05, 0, 'io'],
  [17.8, 560, 3220, 1.3, 0, 'cut'],
  [18.95, 600, 3220, 1.32, 0, 'io'],
  [19.25, 960, 3220, 1.0, 0, 'io'],
  [20.2, 960, 3220, 1.03, 0, 'io'],
  [20.55, 1480, 3200, 1.3, 0, 'io'],
  [21.4, 1500, 3200, 1.36, 0, 'io'],
];
CARDS.forEach((_, i) => {
  const p = panels[9 + i], t0 = CARD_T0 + i * CARD_D, r = [0.03, -0.025, 0.02, -0.03, 0.015, -0.02, 0.03, -0.015, 0.025, 0][i];
  keys.push([t0, p.x + 480, p.y + 270, 2.0, r, 'cut']);
  keys.push([t0 + CARD_D, p.x + 480, p.y + 270, 2.12, r, 'lin']);
});
const MAPC = [4230, 1940], MAPZ = 0.214;
keys.push([25.6, MAPC[0] + 2700, MAPC[1] + 1650, 2.1, 0, 'io']);
keys.push([26.9, MAPC[0], MAPC[1], MAPZ, 0, 'io']);
keys.push([30, MAPC[0], MAPC[1], MAPZ * 0.96, 0, 'lin']);

const EASE = { io: eio, in: t => t * t * t * t, o: eo, lin: t => t };
function cam(t) {
  let i = 0;
  for (let k = 0; k < keys.length; k++) if (keys[k][0] <= t) i = k;
  const a = keys[i], b = keys[i + 1];
  if (!b || b[5] === 'cut') return { x: a[1], y: a[2], z: a[3], r: a[4] };
  const u = EASE[b[5] || 'io'](seg(t, a[0], b[0]));
  // zoom interpolated in log space
  return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), z: Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u)), r: lerp(a[4], b[4], u) };
}
const SHAKES = [[3.15, 18], [4.05, 10], [5.65, 6], [6.6, 8], [8.4, 16], [10.75, 12], [11.1, 14], [12.9, 10], [19.25, 26], [19.5, 8],
  ...CARDS.map((_, i) => [CARD_T0 + i * CARD_D, 7])];
function shake(t) {
  let x = 0, y = 0, r = 0;
  for (const [t0, a] of SHAKES) {
    const d = t - t0; if (d < 0 || d > 0.5) continue;
    const e = a * Math.exp(-d * 9);
    x += Math.sin(d * 71 + t0) * e; y += Math.cos(d * 63 + t0 * 2) * e; r += Math.sin(d * 50) * e * 0.0009;
  }
  return [x, y, r];
}

// ---------- screen overlays ----------
function speedLines(v) {
  const a = clamp((v - 40) / 220) * 0.55;
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  for (let i = 0; i < 16; i++) {
    const y = rnd('sy' + i + BOIL) * H, x = rnd('sx' + i + BOIL) * W, L = 250 + rnd('sL' + i + BOIL) * 700;
    rc.line(x - L / 2, y, x + L / 2, y, ro('spd' + i, { strokeWidth: 3 + rnd('w' + i) * 4, roughness: 0.4 }));
  }
  ctx.restore();
}
function wipe(t) {
  // clay ink sweep from P9 into the cards
  const a = seg(t, 21.12, 21.4), b = seg(t, 21.4, 21.62);
  if (a <= 0 || b >= 1) return;
  const edge = (fx, k) => { const pts = []; for (let i = 0; i <= 12; i++) { const y = -80 + i * (H + 160) / 12; pts.push([fx + Math.sin(i * 1.7 + k) * 70, y]); } return pts; };
  let poly;
  if (a < 1) { const fx = lerp(-200, W + 200, eio(a)); poly = [[-400, -80], ...edge(fx, 1), [-400, H + 80]]; }
  else { const fx = lerp(-200, W + 200, eo(b)); poly = [[W + 400, -80], ...edge(fx, 2).reverse(), [W + 400, H + 80]]; poly = [[W + 400, -80], ...edge(fx, 2), [W + 400, H + 80]]; }
  rc.polygon(poly, ro('wipe', { fill: C.clay, fillStyle: 'solid', stroke: C.clayD, strokeWidth: 6, roughness: 1.5 }));
}
function trail(t) {
  const p = seg(t, 25.9, 27.2);
  if (p <= 0) return;
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 18, 17, 16, 15, 14];
  const pts = order.map(i => [panels[i].x + panels[i].w / 2, panels[i].y + panels[i].h / 2]);
  drawOn('trail', pts, p, { stroke: C.clay, strokeWidth: 30, strokeLineDash: [10, 70], roughness: 0.4 });
}
function endCard(t) {
  const a = seg(t, 27.4, 27.85);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.92 * eo(a); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); ctx.restore();
  const asm = seg(t, 27.6, 28.2);
  if (asm > 0) hero(960, 520, 16, { asm, arms: t > 28.3 ? 'wave' : 'down', blink: t > 29.3 && t < 29.4 });
  const sl = seg(t, 27.9, 28.15);
  if (sl > 0) T(TTL, 960, 730, { f: 'NewsD', size: 170, align: 'center', scale: lerp(1.6, 1, back(sl)), alpha: sl * 3 });
  drawOn('ul3', wavyLine(330, 776, 1590, 770, 14, 6, 'u3'), seg(t, 28.2, 28.5), { stroke: C.clay, strokeWidth: 10 });
  T('Out now in Claude, Claude Code and the API', 960, 860, { size: 46, align: 'center', alpha: seg(t, 28.4, 28.7) });
  T("Figures: Anthropic's Claude Opus 5.5 announcement and customer reports, Sep 22 2026.  Unofficial fan-made film.", 960, 1040,
    { size: 20, align: 'center', color: C.slate, alpha: seg(t, 28.6, 28.9), jit: 0 });
}

// ---------- frame ----------
let prevCam = null;
function frame(t) {
  NOW = t; BOIL = Math.floor(t * 12);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  const c = cam(t), [sx, sy, sr] = shake(t);
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(c.r + sr); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y);
  const hw = (W * 0.62) / c.z + 60, hh = (H * 0.75) / c.z + 60;
  const vx0 = c.x - hw, vx1 = c.x + hw, vy0 = c.y - hh, vy1 = c.y + hh;
  // dot grid
  const g = c.z > 0.45 ? 60 : 240, ds = c.z > 0.45 ? 3 : 8;
  ctx.fillStyle = 'rgba(20,20,19,0.09)';
  for (let x = Math.floor(vx0 / g) * g; x < vx1; x += g) for (let y = Math.floor(vy0 / g) * g; y < vy1; y += g) ctx.fillRect(x, y, ds, ds);
  trail(t);
  for (const p of panels) {
    if (p.x + p.w < vx0 || p.x > vx1 || p.y + p.h < vy0 || p.y > vy1) continue;
    const lt = clamp(t - p.t0, 0, p.t1 - p.t0);
    ctx.save();
    ctx.translate(p.x, p.y);
    if (c.z < 0.9) {
      rc.rectangle(-20, -20, p.w + 40, p.h + 40, ro('frame' + p.name, { strokeWidth: 3 / Math.max(c.z, 0.3), stroke: C.gray, roughness: 0.8 }));
    }
    ctx.beginPath(); ctx.rect(0, 0, p.w, p.h); ctx.clip();
    if (p.bg) { ctx.fillStyle = p.bg; ctx.fillRect(0, 0, p.w, p.h); }
    p.draw(lt);
    ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // eye blackout at end of intro
  const ebl = seg(t, 2.42, 2.6);
  if (ebl > 0 && t < 2.6) { ctx.fillStyle = `rgba(20,20,19,${ebl})`; ctx.fillRect(0, 0, W, H); }
  if (prevCam && Math.abs(prevCam.t - t + 1 / FPS) < 1e-6) {
    const v = Math.hypot(c.x - prevCam.x, c.y - prevCam.y) * c.z;
    if (v < 600) speedLines(v);
  }
  prevCam = { ...c, t };
  wipe(t);
  if (t > 26.6 && t < 27.6) T('...all on one page.', 960, 110, { f: 'Hand', size: 66, align: 'center', alpha: seg(t, 26.7, 26.95) * (1 - seg(t, 27.4, 27.6)) });
  endCard(t);
}

// ---------- main ----------
const args = process.argv.slice(2);
if (args[0] === 'still') {
  fs.mkdirSync('stills', { recursive: true });
  for (const s of args.slice(1)) {
    const t = parseFloat(s);
    prevCam = null; frame(t);
    fs.writeFileSync(`stills/f_${t.toFixed(2)}.png`, canvas.toBuffer('image/png'));
  }
} else {
  const out = args[0] || 'opus55.mp4';
  const crf = args[1] || '24';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = DUR * FPS;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    frame(i / FPS);
    const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('done', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
