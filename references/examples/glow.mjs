// 10s "Indonesia vs ASEAN" glass-glow data video. 1920x1080, 30fps.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'child_process';
import fs from 'fs';

const W = 1920, H = 1080, FPS = 30, DUR = 10;
const F = '/home/claude/film/fonts/';
GlobalFonts.registerFromPath(F + 'DMSans-Bold.ttf', 'SansB');
GlobalFonts.registerFromPath(F + 'DMSans-Med.ttf', 'SansM');

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const eo = t => 1 - Math.pow(1 - t, 3);
const eo5 = t => 1 - Math.pow(1 - t, 5);
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const back = t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// ---------- background ----------
function background(t) {
  ctx.fillStyle = '#010805'; ctx.fillRect(0, 0, W, H);
  const blob = (x, y, r, col) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  blob(330 + Math.sin(t * 0.4) * 60, -80, 1000, 'rgba(46,150,96,0.50)');
  blob(1880 + Math.cos(t * 0.3) * 40, -40, 700, 'rgba(34,120,78,0.38)');
  blob(960, 1180, 900, 'rgba(18,90,58,0.30)');
  blob(1150 + Math.sin(t * 0.25) * 200, 860, 520, 'rgba(30,160,100,0.10)');
  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1250);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function dust(t) {
  for (let i = 0; i < 26; i++) {
    const s = (i * 9301 + 49297) % 233280 / 233280, s2 = (i * 7411 + 1231) % 10007 / 10007;
    const x = s * W + Math.sin(t * 0.6 + i) * 20;
    const y = H - ((t * (12 + s2 * 20) + s2 * H) % H);
    const a = 0.10 + 0.15 * Math.sin(t * 1.5 + i) ** 2;
    ctx.fillStyle = `rgba(150,255,200,${a})`;
    ctx.beginPath(); ctx.arc(x, y, 1.2 + s2 * 1.8, 0, 7); ctx.fill();
  }
}
function floor(y, a, x0 = 0, x1 = W) {
  if (a <= 0) return;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(90,240,160,0)'); g.addColorStop(0.5, `rgba(120,255,180,${0.85 * a})`); g.addColorStop(1, 'rgba(90,240,160,0)');
  ctx.save(); ctx.shadowColor = 'rgba(80,255,160,0.9)'; ctx.shadowBlur = 18;
  ctx.fillStyle = g; ctx.fillRect(x0, y - 1, x1 - x0, 2.2); ctx.restore();
}

// ---------- glass bar ----------
function roundTop(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h); ctx.closePath();
}
function glassBar(x, base, w, h, a = 1, bright = 1, sweep = -1) {
  if (h <= 2 || a <= 0) return;
  const y = base - h;
  ctx.save(); ctx.globalAlpha *= a;
  // reflection
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 40, base, w + 80, 260); ctx.clip();
  const rg = ctx.createLinearGradient(0, base, 0, base + 240);
  rg.addColorStop(0, `rgba(60,200,130,${0.20 * bright})`); rg.addColorStop(1, 'rgba(20,90,60,0)');
  ctx.fillStyle = rg; ctx.fillRect(x, base, w, 240);
  ctx.restore();
  // glow + body
  const g = ctx.createLinearGradient(0, y, 0, base);
  g.addColorStop(0, `rgba(170,250,200,${0.95 * bright})`);
  g.addColorStop(0.28, `rgba(56,205,138,${0.88 * bright})`);
  g.addColorStop(0.75, 'rgba(16,110,72,0.78)');
  g.addColorStop(1, 'rgba(8,70,46,0.70)');
  ctx.save(); ctx.shadowColor = `rgba(60,240,150,${0.55 * bright})`; ctx.shadowBlur = 46;
  roundTop(x, y, w, h, 22); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  // side shading for depth
  const sg = ctx.createLinearGradient(x, 0, x + w, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0.10)'); sg.addColorStop(0.18, 'rgba(255,255,255,0)');
  sg.addColorStop(0.8, 'rgba(0,30,20,0)'); sg.addColorStop(1, 'rgba(0,30,20,0.25)');
  roundTop(x, y, w, h, 22); ctx.fillStyle = sg; ctx.fill();
  // light sweep
  if (sweep >= 0 && sweep <= 1) {
    ctx.save(); roundTop(x, y, w, h, 22); ctx.clip();
    const sx = lerp(x - w, x + w * 2, sweep);
    const lg = ctx.createLinearGradient(sx - 120, y, sx + 120, y + 200);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(230,255,240,0.35)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  // rim
  roundTop(x + 1, y + 1, w - 2, h - 1, 21);
  const rim = ctx.createLinearGradient(0, y, 0, base);
  rim.addColorStop(0, 'rgba(200,255,225,0.9)'); rim.addColorStop(1, 'rgba(90,230,160,0.35)');
  ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.stroke();
  // base glow
  ctx.save(); ctx.shadowColor = 'rgba(90,255,170,1)'; ctx.shadowBlur = 24;
  ctx.fillStyle = 'rgba(140,255,190,0.9)'; ctx.fillRect(x + 4, base - 2, w - 8, 3); ctx.restore();
  ctx.restore();
}

// ---------- text ----------
function text(str, x, y, o = {}) {
  const { f = 'SansM', size = 40, color = '#EAF7EF', align = 'left', alpha = 1, spacing = 0, glow = 0, fill = null, blurIn = 0 } = o;
  if (alpha <= 0) return 0;
  ctx.save(); ctx.globalAlpha *= clamp(alpha);
  ctx.font = `${size}px ${f}`; ctx.textBaseline = 'alphabetic';
  const chars = [...str];
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  if (glow) { ctx.shadowColor = `rgba(90,255,170,${glow})`; ctx.shadowBlur = size * 0.35; }
  ctx.fillStyle = fill ? fill(cx, total) : color;
  if (spacing === 0) { ctx.textAlign = 'left'; ctx.fillText(str, cx, y); }
  else chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + spacing; });
  ctx.restore();
  return total;
}
const white = (y0, y1) => () => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#C6F8DA'); return g; };
const mint = (y0, y1) => () => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#C9FFDF'); g.addColorStop(0.55, '#5FE3A0'); g.addColorStop(1, '#23B676'); return g; };

// ---------- scene A: 10% below ASEAN ----------
function sceneA(t, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const base = 812;
  floor(base, seg(t, 0.1, 0.8), 650, W);
  // big number
  const np = seg(t, 0.25, 1.15);
  const n = Math.round(10 * eo(np));
  const sc = lerp(0.86, 1, eo5(seg(t, 0.25, 0.9)));
  if (np > 0) {
    ctx.save(); ctx.translate(560, 540); ctx.scale(sc, sc); ctx.translate(-560, -540);
    text(n + '%', 222, 624, { f: 'SansB', size: 385, alpha: seg(t, 0.25, 0.55), glow: 0.45, fill: mint(330, 630), spacing: -10 });
    ctx.restore();
  }
  // BELOW ASEAN with letter-spaced reveal
  const bp = seg(t, 0.9, 1.5);
  if (bp > 0) {
    const sp = lerp(40, 22, eo(bp));
    const w1 = text('BELOW ', 232, 720, { f: 'SansM', size: 82, alpha: eo(bp), spacing: sp, color: '#F2FBF5' });
    text('ASEAN', 232 + w1 + sp, 720, { f: 'SansM', size: 82, alpha: eo(seg(t, 1.05, 1.6)), spacing: sp, fill: mint(650, 720), glow: 0.3 });
  }
  // bars
  const H2 = 520, H1 = H2 * 28.6 / 31.8;
  const p1 = eo5(seg(t, 0.55, 1.7)), p2 = eo5(seg(t, 0.75, 1.95));
  const sw = seg(t, 3.2, 4.1);
  glassBar(1092, base, 226, H1 * p1, 1, 1.05, sw);
  glassBar(1444, base, 226, H2 * p2, 1, 0.85, sw - 0.15);
  const v1 = (28.6 * p1).toFixed(1) + 'K', v2 = (31.8 * p2).toFixed(1) + 'K';
  text(v1, 1205, base - H1 * p1 - 40, { f: 'SansM', size: 48, align: 'center', alpha: seg(t, 0.8, 1.1) });
  text(v2, 1557, base - H2 * p2 - 40, { f: 'SansM', size: 48, align: 'center', alpha: seg(t, 1.0, 1.3) });
  text('Indonesia', 1205, base + 60, { size: 36, align: 'center', alpha: seg(t, 0.6, 0.9), color: '#D5E8DC' });
  text('ASEAN Average', 1557, base + 60, { size: 36, align: 'center', alpha: seg(t, 0.8, 1.1), color: '#D5E8DC' });
  // gap bracket: dashed line from Indonesia top to ASEAN level
  const gp = seg(t, 2.1, 2.7);
  if (gp > 0) {
    const yA = base - H2, yI = base - H1;
    ctx.save(); ctx.globalAlpha *= gp;
    ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(150,255,200,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(1444, yA); ctx.lineTo(1444 - (1444 - 1318) * eo(gp), yA); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowColor = 'rgba(90,255,170,0.9)'; ctx.shadowBlur = 14; ctx.strokeStyle = '#9CF5C4'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(1070, yA); ctx.lineTo(1070, yI); ctx.moveTo(1060, yA); ctx.lineTo(1080, yA); ctx.moveTo(1060, yI); ctx.lineTo(1080, yI); ctx.stroke();
    ctx.restore();
    text('-10%', 1052, (yA + yI) / 2 + 12, { f: 'SansB', size: 34, align: 'right', alpha: gp, color: '#9CF5C4', glow: 0.5 });
  }
  ctx.restore();
}

// ---------- scene B: rankings ----------
const RANKS = [['21', 'st', ['Labor Market']], ['50', 'th', ['Business', 'Efficiency']], ['53', 'rd', ['Productivity &', 'Efficiency']], ['55', 'th', ['Management', 'Practices']]];
const RH = [542, 500, 470, 458];
function sceneB(t, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const base = 828;
  floor(base, seg(t, 0, 0.5));
  RANKS.forEach(([num, suf, lab], i) => {
    const x = 265 + i * 376, w = 268;
    const p = eo5(seg(t, 0.15 + i * 0.22, 1.05 + i * 0.22));
    const h = RH[i] * p;
    const sw = seg(t, 2.6 + i * 0.12, 3.4 + i * 0.12);
    glassBar(x, base, w, h, 1, 1.05 - i * 0.07, sw);
    // content rides with the bar top
    const top = base - h;
    const tp = seg(t, 0.55 + i * 0.22, 0.95 + i * 0.22);
    if (tp > 0) {
      const sc = lerp(0.7, 1, back(tp));
      const nw = (() => { ctx.font = '150px SansB'; return ctx.measureText(num).width; })();
      ctx.font = '62px SansB'; const sw2 = ctx.measureText(suf).width;
      const cx = x + w / 2, ny = top + 190;
      ctx.save(); ctx.translate(cx, ny - 50); ctx.scale(sc, sc); ctx.translate(-cx, -(ny - 50));
      const x0 = cx - (nw + sw2 + 4) / 2;
      text(num, x0, ny, { f: 'SansB', size: 150, alpha: tp, fill: white(ny - 110, ny), glow: 0.35, spacing: -4 });
      text(suf, x0 + nw + 4, ny - 62, { f: 'SansB', size: 62, alpha: tp, fill: white(ny - 110, ny - 62), glow: 0.3 });
      ctx.restore();
      lab.forEach((l, k) => text(l, cx, ny + 62 + k * 40, { size: 35, align: 'center', alpha: seg(t, 0.7 + i * 0.22, 1.0 + i * 0.22), color: '#EAF7EF' }));
    }
  });
  ctx.restore();
}

// ---------- frame ----------
function frame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  background(t); dust(t);
  // scene A 0 - 5.6, scene B 5.4 - 10
  const aA = 1 - seg(t, 5.2, 5.7), aB = seg(t, 5.45, 5.95);
  // camera: slow push, then lateral glide on the transition
  const zA = lerp(1.0, 1.045, eio(seg(t, 0, 5.7))), xA = -eio(seg(t, 5.2, 5.8)) * 220;
  ctx.save(); ctx.translate(W / 2 + xA, H / 2); ctx.scale(zA, zA); ctx.translate(-W / 2, -H / 2);
  sceneA(t, aA); ctx.restore();
  const tb = t - 5.45;
  const zB = lerp(1.06, 1.0, eo(seg(tb, 0, 1.2))) * lerp(1, 1.025, seg(tb, 1.2, 4.55)), xB = (1 - eo(seg(tb, 0, 0.7))) * 220;
  ctx.save(); ctx.translate(W / 2 + xB, H / 2); ctx.scale(zB, zB); ctx.translate(-W / 2, -H / 2);
  sceneB(Math.max(0, tb), aB); ctx.restore();
  // fade in / out
  const f = Math.max(1 - seg(t, 0, 0.35), seg(t, 9.55, 10));
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
}

const args = process.argv.slice(2);
if (args[0] === 'still') {
  fs.mkdirSync('stills', { recursive: true });
  for (const s of args.slice(1)) { frame(parseFloat(s)); fs.writeFileSync(`stills/g_${s}.png`, canvas.toBuffer('image/png')); }
} else {
  const out = args[0] || 'glow.mp4';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-x264-params', 'aq-mode=3', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < DUR * FPS; i++) {
    frame(i / FPS);
    const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('done', out);
}
