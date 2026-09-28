// q-motion — 20 s portrait promo. 1080x1920, 30 fps.
// One idea: the orange caret. It writes the spec, becomes the video frame,
// the moving square in every frame, the bar, the timeline, and finally the
// caret after the wordmark.
//   node film.mjs still 1.2 5 9.5     -> stills/f_<t>.png
//   node film.mjs [out.mp4]           -> full render
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'child_process';
import fs from 'fs';

const W = 1080, H = 1920, FPS = 30, DUR = 20;
const F = new URL('./fonts/', import.meta.url).pathname;
GlobalFonts.registerFromPath(F + 'SG-Bold.ttf', 'GroB');
GlobalFonts.registerFromPath(F + 'SG-Med.ttf', 'GroM');
GlobalFonts.registerFromPath(F + 'JB-Med.ttf', 'Mono');
GlobalFonts.registerFromPath(F + 'JB-Bold.ttf', 'MonoB');

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// ---------- palette ----------
const BG = '#0E0D0C', INK = '#F2EDE4', DIM = '#6F6A62', FAINT = '#2A2825', OR = '#FF5B24', PANEL = '#1A1917';

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const eo = t => 1 - Math.pow(1 - t, 3);
const eo5 = t => 1 - Math.pow(1 - t, 5);
const ei = t => t * t * t;
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const back = t => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const lerpRect = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

// ---------- cuts ----------
const CUT = [3.0, 7.0, 10.5, 14.0, 17.0];
const M = 90; // safe margin

// ---------- primitives ----------
function rect(x, y, w, h, col, a = 1) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.restore(); }
function txt(s, x, y, { f = 'GroB', size = 60, color = INK, align = 'left', alpha = 1 } = {}) {
  if (alpha <= 0) return 0;
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.font = `${size}px ${f}`; ctx.textAlign = align; ctx.fillStyle = color;
  ctx.fillText(s, x, y); const w = ctx.measureText(s).width; ctx.restore(); return w;
}
const width = (s, f, size) => { ctx.font = `${size}px ${f}`; return ctx.measureText(s).width; };
// Runs of [text, colour] on one baseline.
function runs(parts, x, y, f, size, alpha = 1) { let cx = x; for (const [s, c] of parts) { txt(s, cx, y, { f, size, color: c, alpha }); cx += width(s, f, size); } return cx - x; }

// Headline: each line slides up out of its own mask; exits upward (ease-in).
function headline(lines, t, tIn, tOut, size = 92, y0 = 400) {
  const maxW = Math.max(...lines.map(l => l.reduce((a, [s]) => a + width(s, 'GroB', size), 0)));
  const sz = maxW > W - 2 * M ? size * (W - 2 * M) / maxW : size;
  lines.forEach((parts, i) => {
    const y = y0 + i * sz * 1.12;
    const pin = eo5(seg(t, tIn + i * 0.09, tIn + i * 0.09 + 0.5));
    const pout = ei(seg(t, tOut + i * 0.05, tOut + i * 0.05 + 0.28));
    if (pin <= 0 || pout >= 1) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - sz * 1.0, W, sz * 1.28); ctx.clip();
    runs(parts, M, y + (1 - pin) * sz * 1.2 - pout * sz * 1.25, 'GroB', sz);
    ctx.restore();
  });
}

// ---------- chrome: frame counter, time, timeline ----------
function chrome(t) {
  const f = Math.round(t * FPS);
  txt(`frame ${String(f).padStart(3, '0')}`, M, 150, { f: 'Mono', size: 30, color: DIM });
  txt(`t = ${t.toFixed(2)}s`, W - M, 150, { f: 'Mono', size: 30, color: DIM, align: 'right' });
  const y = 1800, x0 = M, x1 = W - M;
  rect(x0, y, x1 - x0, 2, FAINT);
  for (const c of CUT) rect(lerp(x0, x1, c / DUR) - 1, y - 8, 2, 18, FAINT);
  const px = lerp(x0, x1, t / DUR);
  rect(x0, y, px - x0, 2, DIM);
  rect(px - 5, y - 13, 10, 28, OR);
}

// ---------- the mini film (what q-motion renders), in a 180x320 box ----------
const sq = tau => ({ x: 88 + 52 * Math.sin(tau * 1.25), y: 170 + 34 * Math.sin(tau * 2.1 + 0.6), s: 22 });
function mini(x, y, w, tau, a = 1, hideSquare = false) {
  if (a <= 0) return;
  const k = w / 180;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.rect(0, 0, 180, 320); ctx.clip();
  ctx.fillStyle = PANEL; ctx.fillRect(0, 0, 180, 320);
  const tp = eo5(seg(tau, 0.2, 0.9));
  txt('Ship day.', 16, 62 + (1 - tp) * 18, { size: 30, alpha: tp });
  const bp = eo5(seg(tau, 1.0, 2.2));
  rect(16, 292 - 70 * bp, 34, 70 * bp, INK, 0.9);
  txt('42%', 58, 290, { f: 'MonoB', size: 16, color: DIM, alpha: seg(tau, 1.6, 2.0) });
  if (!hideSquare) { const s = sq(tau); rect(s.x - s.s / 2, s.y - s.s / 2, s.s, s.s, OR); }
  ctx.restore();
}

// ---------- scene 1: write the spec (0 - 3.0) ----------
const SPEC = [
  [['# ', OR], ['launch.md', INK]],
  [['message: ', DIM], ['Ship day.', INK]],
  [['length:  ', DIM], ['20s', INK]],
  [['style:   ', DIM], ['yours', INK]],
];
const SPEC_Y = 860, SPEC_LH = 92, SPEC_SZ = 56, SPEC_X = 170;
const TYPE0 = 0.55, DT = 0.03, LPAUSE = 0.13;
function specTyped(t) {
  // returns per-line visible char counts and caret position
  let tt = TYPE0, out = [], cx = SPEC_X, cy = SPEC_Y;
  SPEC.forEach((parts, li) => {
    const full = parts.map(p => p[0]).join('');
    const n = clamp(Math.floor((t - tt) / DT) + 1, 0, full.length);
    out.push(n);
    if (t >= tt) { cy = SPEC_Y + li * SPEC_LH; cx = SPEC_X + width(full.slice(0, n), 'Mono', SPEC_SZ); }
    tt += full.length * DT + LPAUSE;
  });
  return { counts: out, cx, cy, end: tt };
}
function scene1(t) {
  const st = specTyped(t);
  SPEC.forEach((parts, li) => {
    // exit: lines slide left, staggered, ease-in
    const pe = ei(seg(t, 2.72 + li * 0.04, 3.05 + li * 0.04));
    if (pe >= 1) return;
    const y = SPEC_Y + li * SPEC_LH;
    const dx = -pe * 1100;
    txt(String(li + 1), M + dx, y, { f: 'Mono', size: 34, color: FAINT, alpha: seg(t, 0.3, 0.6) });
    let n = st.counts[li], cx = SPEC_X + dx;
    for (const [s, c] of parts) {
      const vis = s.slice(0, Math.max(0, n)); n -= s.length;
      if (vis) { txt(vis, cx, y, { f: 'Mono', size: SPEC_SZ, color: c }); cx += width(vis, 'Mono', SPEC_SZ); }
    }
  });
}
// caret during scene 1 and the grow into the video frame
const FRAME_R = [M, 790, 400, 711];
function caretS1S2(t) {
  if (t >= 3.22) return; // scene 2 owns the filled frame from here
  const st = specTyped(t);
  let r = t < TYPE0 ? [SPEC_X, SPEC_Y - 46, 30, 58] : [st.cx + 6, st.cy - 46, 30, 58];
  const g = eio(seg(t, 2.78, 3.22));
  if (g > 0) { const end = specTyped(2.78); r = lerpRect([end.cx + 6, end.cy - 46, 30, 58], FRAME_R, g); }
  const typing = t > TYPE0 && t < st.end;
  if (typing || g > 0 || Math.floor(t * 2) % 2 === 0) rect(...r, OR);
}

// ---------- scene 2: the video, built in code (3.0 - 7.0) ----------
const CODE = [
  [['frame', INK], ['(', DIM], ['t', OR], [') {', DIM]],
  [['  bg', INK], ['()', DIM]],
  [['  title', INK], ['(', DIM], ['"Ship day."', DIM], [', ', DIM], ['t', OR], [')', DIM]],
  [['  square', INK], ['(', DIM], ['path', INK], ['(', DIM], ['t', OR], ['))', DIM]],
  [['  bar', INK], ['(', DIM], ['42', INK], [', ', DIM], ['t', OR], [')', DIM]],
  [['}', DIM]],
];
const tau2 = t => t - 3.25; // mini-film time while it plays in scene 2
function frameBox(t) {
  // scene 2 frame rectangle; shrinks into strip cell 0 at 7.0
  const p = eio(seg(t, 6.85, 7.3));
  return lerpRect(FRAME_R, cellRect(0, 0, 7.3), p);
}
function scene2(t) {
  if (t < 3.15 || t > 7.35) return;
  const [x, y, w, h] = frameBox(t);
  const tau = Math.min(tau2(t), tau2(6.85));
  mini(x, y, w, tau, 1);
  // the orange fill fades out to reveal the frame's contents
  rect(x, y, w, h, OR, 1 - eo(seg(t, 3.22, 3.6)));
  ctx.save(); ctx.strokeStyle = OR; ctx.lineWidth = lerp(4, 3, seg(t, 6.85, 7.3)); ctx.strokeRect(x, y, w, h); ctx.restore();
  txt('1080×1920 · 30 fps', x, y + h + 48, { f: 'Mono', size: 26, color: DIM, alpha: seg(t, 3.7, 4.0) * (1 - seg(t, 6.7, 6.9)) });
  // code pane
  CODE.forEach((parts, i) => {
    const pin = eo5(seg(t, 5.1 + i * 0.07, 5.6 + i * 0.07));
    const pout = ei(seg(t, 6.7 + i * 0.03, 7.0 + i * 0.03));
    if (pin <= 0 || pout >= 1) return;
    const ly = 880 + i * 58;
    const dx = (1 - pin) * 260 + pout * 700;
    runs(parts, 540 + dx, ly, 'Mono', 31, pin);
    // execution marker steps down the code
    const step = Math.floor((t - 5.9) / 0.14);
    if (step === i - 1 && t > 5.9 && t < 6.75) rect(518 + dx, ly - 26, 5, 34, OR);
  });
}

// ---------- scene 3: every frame is frame(t) (7.0 - 10.5) ----------
const PITCH = 202, CW = 180, CH = 320, STRIP_Y = [760, 1200];
const cellTau = i => tau2(6.85) + i * 0.33;
function stripOffset(t) { return -Math.max(0, t - 7.3) * 70; }
function cellRect(strip, i, t) { return [M + i * PITCH + stripOffset(t), STRIP_Y[strip], CW, CH]; }
const CHOSEN = 2;
function scene3(t) {
  if (t < 6.9 || t > 10.9) return;
  const fall = eo(seg(t, 10.1, 10.45)), fade = seg(t, 10.1, 10.32);
  for (let s = 0; s < 2; s++) {
    const sIn = s === 0 ? 1 : eo5(seg(t, 8.75, 9.35));
    if (sIn <= 0) continue;
    const lab = s === 0 ? 'render 1' : 'render 2';
    txt(lab, M, STRIP_Y[s] - 26, { f: 'Mono', size: 28, color: DIM, alpha: (s === 0 ? seg(t, 7.3, 7.6) : sIn) * (1 - fade) });
    for (let i = 0; i < 7; i++) {
      if (s === 0 && i === 0 && t < 7.3) continue; // still the scene-2 frame
      let [x, y, w, h] = cellRect(s, i, t);
      const enter = s === 0 ? eo5(seg(t, 7.0 + i * 0.06, 7.5 + i * 0.06)) : sIn;
      x += (1 - enter) * (s === 0 ? 900 : 1100);
      if (x > W + 20 || x + w < -20) continue;
      const chosen = s === 0 && i === CHOSEN;
      const fy = chosen ? 0 : fall * (140 + i * 12);
      const a = chosen ? 1 - seg(t, 10.3, 10.5) : 1 - fade;
      mini(x, y + fy, w, cellTau(i), a, chosen && t > 10.3);
      // scan line: cells light up as the line passes
      const scanX = lerp(M - 40, W - M + 40, eio(seg(t, 9.35, 10.1)));
      const lit = t > 9.35 && t < 10.3 && Math.abs(scanX - (x + w / 2)) < 120 ? 1 - Math.abs(scanX - (x + w / 2)) / 120 : 0;
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = lit > 0 ? OR : FAINT; ctx.lineWidth = 2 + lit * 2; ctx.strokeRect(x, y + fy, w, h); ctx.restore();
      txt(`#${String(Math.round(cellTau(i) * FPS)).padStart(3, '0')}`, x, y + fy + h + 40, { f: 'Mono', size: 24, color: lit > 0.3 ? OR : DIM, alpha: a * enter });
    }
  }
  // scan line
  const sp = seg(t, 9.35, 10.1);
  if (sp > 0 && sp < 1) { const sx = lerp(M - 40, W - M + 40, eio(sp)); rect(sx - 2, STRIP_Y[0] - 40, 4, STRIP_Y[1] + CH + 60 - STRIP_Y[0] + 40, OR); }
  txt('same t, same frame. every render.', M, 1650, { f: 'Mono', size: 30, color: INK, alpha: seg(t, 9.6, 9.9) * (1 - seg(t, 10.2, 10.4)) });
}

// ---------- scene 4: exact numbers, your style (10.5 - 14.0) ----------
const BASE = 1520, BAR_W = 260, FULL = 800;
function chosenSquareRect(t) {
  const [x, y, w] = cellRect(0, CHOSEN, t); const k = w / 180; const s = sq(cellTau(CHOSEN));
  return [x + (s.x - s.s / 2) * k, y + (s.y - s.s / 2) * k, s.s * k, s.s * k];
}
function barRect(t) {
  const v = eo5(seg(t, 10.8, 11.7));
  const h = lerp(40, FULL * 0.42, v);
  return [M, BASE - h, BAR_W, h];
}
const TRACK_PIC = [M, 1060, W - 2 * M, 100];
function morphBar(t) {
  // square -> bar (10.3 - 10.8), bar -> picture track (13.8 - 14.25)
  if (t < 10.3 || t > 14.3) return null;
  const sqR = chosenSquareRect(10.3);
  const p1 = eio(seg(t, 10.3, 10.8));
  let r = lerpRect(sqR, [M, BASE - 40, BAR_W, 40], p1);
  if (t >= 10.8) r = barRect(t);
  const p2 = eio(seg(t, 13.8, 14.25));
  if (p2 > 0) r = lerpRect(barRect(13.8), TRACK_PIC, p2);
  return r;
}
const STYLES = [['flat', 11.5], ['sketch', 12.25], ['glass', 12.7], ['pixel', 13.15], ['flat', 13.6]];
function styleAt(t) { let s = 'flat'; for (const [n, t0] of STYLES) if (t >= t0) s = n; return s; }
function drawBar(r, style, t) {
  const [x, y, w, h] = r;
  if (style === 'flat') { rect(x, y, w, h, OR); return; }
  if (style === 'sketch') {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = OR; ctx.lineWidth = 5;
    for (let k = -h; k < w; k += 26) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); ctx.stroke(); }
    ctx.restore();
    const boil = Math.floor(t * 12);
    const j = (id) => (hash(id + boil) - 0.5) * 9;
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + j('a'), y + h + j('b')); ctx.lineTo(x + j('c'), y + j('d')); ctx.lineTo(x + w + j('e'), y + j('f')); ctx.lineTo(x + w + j('g'), y + h + j('h'));
    ctx.stroke(); ctx.restore(); return;
  }
  if (style === 'glass') {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#FFB08C'); g.addColorStop(0.35, OR); g.addColorStop(1, '#6B1E06');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const sg = ctx.createLinearGradient(x, 0, x + w, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0.28)'); sg.addColorStop(0.22, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
    rect(x, y, w, 3, '#FFE2D4'); return;
  }
  if (style === 'pixel') {
    const c = 26;
    for (let yy = y + h - c; yy > y - c; yy -= c) for (let xx = x; xx < x + w; xx += c) {
      const top = Math.max(yy, y); const hh = yy + c - top - 3; if (hh <= 0) continue;
      rect(xx, top, Math.min(c - 3, x + w - xx), hh, hash(`${xx},${yy}`) > 0.15 ? OR : '#B53D12');
    }
  }
}
function scene4(t) {
  if (t < 10.3 || t > 14.3) return;
  const out = ei(seg(t, 13.72, 14.02));
  // 100% guide
  const ga = seg(t, 10.7, 11.0) * (1 - out);
  if (ga > 0) {
    ctx.save(); ctx.globalAlpha *= ga; ctx.setLineDash([10, 10]); ctx.strokeStyle = FAINT; ctx.lineWidth = 2;
    ctx.strokeRect(M, BASE - FULL, BAR_W, FULL); ctx.restore();
    txt('100%', M + BAR_W + 20, BASE - FULL + 28, { f: 'Mono', size: 26, color: DIM, alpha: ga });
  }
  rect(M - 20, BASE, W - 2 * M + 40, 2, FAINT, seg(t, 10.6, 10.9) * (1 - out));
  // counter rides next to the bar
  const v = Math.round(42 * eo5(seg(t, 10.8, 11.7)));
  const cp = seg(t, 10.75, 10.95);
  const cx = 410 - out * 700;
  if (cp > 0) {
    const w = txt(String(v), cx, BASE - 8, { size: 300, alpha: cp });
    txt('%', cx + w + 6, BASE - 8, { size: 150, color: OR, alpha: cp });
  }
  txt('from your spec', cx + 6, BASE + 64, { f: 'Mono', size: 28, color: DIM, alpha: seg(t, 11.3, 11.6) * (1 - out) });
  // style chips
  const cur = styleAt(t);
  let x = M;
  ['sketch', 'glass', 'pixel'].forEach((n, i) => {
    const a = eo5(seg(t, 12.05 + i * 0.07, 12.4 + i * 0.07)) * (1 - out);
    if (a <= 0) return;
    const w = width(n, 'Mono', 30) + 36;
    const y = 1660 + (1 - a) * 30;
    const on = cur === n;
    ctx.save(); ctx.globalAlpha *= a;
    if (on) rect(x, y - 36, w, 52, OR); else { ctx.strokeStyle = FAINT; ctx.lineWidth = 2; ctx.strokeRect(x, y - 36, w, 52); }
    ctx.restore();
    txt(n, x + 18, y, { f: 'Mono', size: 30, color: on ? BG : DIM, alpha: a });
    x += w + 16;
  });
}

// ---------- scene 5: words, picture, music -> one film (14.0 - 17.0) ----------
const TRACKS = [['words', 900], ['picture', 1060], ['music', 1220]];
function collapse(t) { return eio(seg(t, 16.2, 16.7)); }
function trackRect(i, t) {
  const r = [M, TRACKS[i][1], W - 2 * M, 100];
  return lerpRect(r, [M, 1095, W - 2 * M, 10], collapse(t));
}
function scene5(t) {
  if (t < 13.9 || t > 17.05) return;
  const c = collapse(t);
  const reveal = [eo5(seg(t, 14.2, 14.75)), 1, eo5(seg(t, 14.95, 15.5))];
  TRACKS.forEach(([name, _], i) => {
    const [x, y, w, h] = trackRect(i, t);
    txt(name, M, TRACKS[i][1] - 18, { f: 'Mono', size: 26, color: DIM, alpha: (i === 1 ? seg(t, 14.3, 14.6) : reveal[i]) * (1 - c * 3) });
    if (i === 1) { if (t < 14.25) return; }
    const rw = w * reveal[i];
    if (rw <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, rw, h); ctx.clip();
    if (c > 0.6) { rect(x, y, w, h, OR); ctx.restore(); return; }
    if (i === 0) { // word pills
      let px = x;
      for (let k = 0; px < x + w; k++) { const pw = 50 + hash('w' + k) * 110; rect(px, y + 22, pw, h - 44, INK, 0.85 * (1 - c)); px += pw + 14; }
      rect(x, y, w, h, OR, c);
    } else if (i === 1) { // picture tiles, each with its square
      rect(x, y, w, h, OR);
      for (let k = 0; k * 100 < w; k++) {
        rect(x + k * 100 + 4, y + 4, 92, h - 8, PANEL, 1 - c * 1.6);
        const s = sq(k * 0.33);
        rect(x + k * 100 + 4 + (s.x / 180) * 92 - 7, y + 4 + (s.y / 320) * 92 - 7, 14, 14, OR, 1 - c * 1.6);
      }
    } else { // music waveform
      for (let k = 0; k * 10 < w; k++) {
        const amp = 0.25 + 0.75 * Math.abs(Math.sin(k * 0.31) * 0.6 + (hash('m' + k) - 0.5) * 0.8);
        const bh = (h - 16) * clamp(amp);
        rect(x + k * 10, y + h / 2 - bh / 2, 6, bh, INK, 0.85 * (1 - c));
      }
      rect(x, y, w, h, OR, c);
    }
    ctx.restore();
  });
  // playhead across all three
  const pp = seg(t, 14.35, 16.2);
  if (pp > 0 && pp < 1) {
    const px = lerp(M, W - M, eio(pp));
    rect(px - 2, 870, 4, 1360 - 870, INK);
    rect(px - 9, 850, 18, 18, INK);
  }
}

// ---------- scene 6: end card (17.0 - 20.0) ----------
const WM_SZ = 180, WM_Y = 1160;
function endCard(t) {
  if (t < 16.95) return;
  const wmW = width('q-motion', 'GroB', WM_SZ);
  const cx = M + wmW + 14, cw = 36, ch = 150, cy = WM_Y - 136;
  // line from scene 5 contracts into the caret; its left edge wipes the wordmark on
  const pl = eo5(seg(t, 17.0, 17.6)), pr = eo5(seg(t, 17.0, 17.45)), ph = back(seg(t, 17.3, 17.65));
  const left = lerp(M, cx, pl), right = lerp(W - M, cx + cw, pr);
  const top = lerp(1095, cy, ph), bot = lerp(1105, cy + ch, ph);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, left, H); ctx.clip();
  txt('q-motion', M, WM_Y, { size: WM_SZ });
  ctx.restore();
  const blink = t < 17.9 || Math.floor((t - 17.9) * 2) % 2 === 0;
  if (blink) rect(left, top, right - left, bot - top, OR);
  // tagline, same mask entrance as the headlines
  headline([[['Write the spec.', INK]]], t, 17.85, 99, 64, 1300);
  headline([[['Get the film.', OR]]], t, 18.85, 99, 64, 1375);
  runs([['/q-motion:generate ', OR], ['spec.md', INK]], M, 1540, 'Mono', 34, seg(t, 19.15, 19.45));
  txt('github.com/meQlause/q-motion', M, 1600, { f: 'Mono', size: 28, color: DIM, alpha: seg(t, 19.3, 19.6) });
}

// ---------- frame ----------
function frame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  rect(0, 0, W, H, BG);
  chrome(t);
  // headlines, timed to the narration
  if (t < 3.1) headline([[['Write down what', INK]], [['you want to ', INK], ['say.', OR]]], t, 0.55, 2.7);
  else if (t < 7.1) headline([[['Get a video,', INK]], [['built in ', INK], ['code.', OR]]], t, 3.35, 6.72);
  else if (t < 10.6) headline([[['Every frame is a', INK]], [['function of ', INK], ['time.', OR]]], t, 7.25, 10.2);
  else if (t < 14.1) headline([[['Your numbers.', INK]], [['Your ', INK], ['style.', OR]]], t, 10.7, 13.7);
  else if (t < 17.1) headline([[['Words, picture,', INK]], [['music. ', INK], ['One film.', OR]]], t, 14.2, 16.65);
  scene1(t);
  scene2(t);
  caretS1S2(t);
  scene3(t);
  scene4(t);
  const r = morphBar(t);
  if (r) drawBar(r, t < 13.8 ? styleAt(t) : 'flat', t);
  scene5(t);
  endCard(t);
}

const args = process.argv.slice(2);
if (args[0] === 'still') {
  fs.mkdirSync('stills', { recursive: true });
  for (const s of args.slice(1)) { frame(parseFloat(s)); fs.writeFileSync(`stills/f_${s}.png`, canvas.toBuffer('image/png')); }
} else {
  const out = args[0] || 'video.mp4';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < DUR * FPS; i++) {
    frame(i / FPS);
    const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('done', out);
}
