# Electronic score, sound design and narration for the 20 s q-motion reel.
# 120 bpm, D major. Every cut (3, 7, 10.5, 14, 17) sits on the beat grid.
# Palette: four-on-the-floor kick with sidechain pump, detuned saw bass,
# supersaw chords, a filtered 16th arp, claps, noise risers. No plucks,
# no bells, no piano.
# Motif (synth lead): D5 F#5 A5 E5 at the hook (left open),
# D5 F#5 A5 D6 on the end card (resolved).
import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt, fftconvolve

SR = 48000; DUR = 20.0; N = int(SR * DUR); T = np.arange(N) / SR
BEAT = 0.5; S16 = BEAT / 4
rng = np.random.default_rng(7)
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def place(buf, sig, t0, g=1.0):
    i = int(round(t0 * SR)); j = min(len(buf), i + len(sig))
    if j > i: buf[i:j] += sig[:j - i] * g
def lp(x, f): return sosfilt(butter(2, f, btype='low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, btype='high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)
def tt(d): return np.arange(int(d * SR)) / SR
def saw(f, t, ph=0.0): return 2 * ((f * t + ph) % 1) - 1
def sweep_lp(x, f0, f1, blk=512):
    # block-wise moving low-pass (exponential sweep f0 -> f1)
    out = np.zeros_like(x); n = len(x)
    for i in range(0, n, blk):
        f = f0 * (f1 / f0) ** (i / max(1, n - 1))
        out[i:i + blk] = lp(x[max(0, i - 2048):i + blk], min(f, SR / 2.2))[-len(x[i:i + blk]):]
    return out

drums = np.zeros(N); bassb = np.zeros(N); synth = np.zeros(N); lead = np.zeros(N); sfx = np.zeros(N)

# ---------- instruments ----------
def supersaw(notes, d, voices=5, spread=0.012):
    t = tt(d); s = np.zeros(len(t))
    for m in notes:
        for v in range(voices):
            det = 1 + spread * (v - (voices - 1) / 2) / ((voices - 1) / 2)
            s += saw(midi(m) * det, t, rng.random())
    return s / (len(notes) * voices) * 3
def chord_pad(notes, t0, d, g, f0, f1):
    s = supersaw(notes, d); env = np.minimum(1, tt(d) / 0.08) * np.minimum(1, (d - tt(d)) / 0.12)
    place(synth, sweep_lp(s, f0, f1) * env, t0, g)
def stab(notes, t0, g, cutoff=3200, d=0.18):
    s = supersaw(notes, d); t = tt(d)
    place(synth, lp(s, cutoff) * np.exp(-t * 14) * np.minimum(1, t / 0.002), t0, g)
def kick(t0, g=0.8):
    t = tt(0.35); s = np.sin(2 * np.pi * (48 * t + 110 / 28 * (1 - np.exp(-t * 28)))) * np.exp(-t * 7)
    s += hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * 0.3   # click
    place(drums, np.tanh(s * 1.5), t0, g)
def clap(t0, g=0.28):
    n = int(0.22 * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 900, 6000)
    e = np.exp(-t * 22) + sum(np.exp(-np.maximum(0, t - k) * 90) * (t >= k) * 0.6 for k in (0.008, 0.017))
    place(drums, x * e, t0, g)
def hat(t0, g=0.06, open_=False):
    d = 0.18 if open_ else 0.04; n = int(d * SR)
    place(drums, hp(rng.standard_normal(n), 8000) * np.exp(-np.arange(n) / ((0.05 if open_ else 0.008) * SR)), t0, g)
def bass_note(m, t0, d, g=0.3, cutoff=600):
    t = tt(d); f = midi(m)
    s = saw(f, t) + saw(f * 1.006, t, 0.3) + np.sin(2 * np.pi * f / 2 * t) * 1.2
    env = np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.01)
    place(bassb, lp(s * env, cutoff) * np.exp(-t * 2), t0, g)
def lead_note(m, t0, d, g=0.2, prev=None, glide=0.04):
    t = tt(d); f1 = midi(m); f0 = midi(prev) if prev else f1
    f = f1 + (f0 - f1) * np.exp(-t / glide)
    ph = np.cumsum(f) / SR
    s = (2 * (ph % 1) - 1) + 0.6 * np.sign(np.sin(2 * np.pi * ph * 1.003))
    env = np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.05)
    cut = 900 + 3500 * np.exp(-t * 6)
    place(lead, sweep_lp(s * env, cut[0], cut[-1]), t0, g)
def arp(notes, t0, t1, g, f0, f1):
    n_steps = int(round((t1 - t0) / S16)); pat = notes + notes[-2:0:-1]
    buf = np.zeros(int((t1 - t0) * SR) + SR)
    for k in range(n_steps):
        t = tt(S16 * 0.9); s = saw(midi(pat[k % len(pat)]), t) * np.exp(-t * 18)
        place(buf, s, k * S16)
    place(synth, sweep_lp(buf[:int((t1 - t0) * SR)], f0, f1), t0, g)

# ---------- sfx ----------
def tick(t0, g=0.05, f=2400):
    t = tt(0.03); place(sfx, np.sin(2 * np.pi * f * t) * np.exp(-t * 180), t0, g)
def whoosh(t0, d, g, lo=400, hi=5000):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); sg = 1024
    for i in range(0, n, sg):
        f = lo + (hi - lo) * np.sin(np.pi * i / n)
        out[i:i + sg] = bp(x[i:i + sg], f * 0.6, min(20000, f * 1.4))[:len(out[i:i + sg])]
    place(sfx, out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2, t0, g)
def riser(t_end, d, g, lo=300, hi=6000):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); sg = 1024
    for i in range(0, n, sg):
        f = lo + (hi - lo) * (i / n) ** 2
        out[i:i + sg] = bp(x[i:i + sg], f * 0.7, min(20000, f * 1.3))[:len(out[i:i + sg])]
    place(sfx, out * np.linspace(0, 1, n) ** 2, t_end - d, g)
def impact(t0, g):
    t = tt(1.4); s = np.sin(2 * np.pi * (35 + 90 * np.exp(-t * 16)) * t) * np.exp(-t * 3)
    s += lp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 9) * 0.5
    place(sfx, s, t0, g)
def zap(t0, g, f0=3000, f1=200, d=0.12):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 40)
    place(sfx, np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 25), t0, g)

def kicks(t0, t1, g=0.8):
    for k in range(int(round((t1 - t0) / BEAT))): kick(t0 + k * BEAT, g)
def offbass(m, t0, t1, g=0.28, cutoff=600):
    for k in range(int(round((t1 - t0) / BEAT))):
        bass_note(m, t0 + k * BEAT + BEAT / 2, BEAT / 2 * 0.9, g, cutoff)

D  = [62, 66, 69, 73]; Bm = [59, 62, 66, 69]; G = [55, 59, 62, 66]; A = [57, 61, 64, 69]; D2 = [62, 66, 69, 74]

# ---------- 0 - 3: the spec is written (energy 2) ----------
chord_pad([50, 57, 62, 66], 0.0, 3.0, 0.22, 350, 1600)                      # filter opens under the typing
prev = None
for t0, m, d in [(0.0, 74, 0.25), (0.25, 78, 0.25), (0.5, 81, 0.5), (1.0, 76, 1.2)]:   # motif, open on E
    lead_note(m, t0, d, 0.16, prev); prev = m
lens = [len('# launch.md'), len('message: Ship day.'), len('length:  20s'), len('style:   yours')]
tc = 0.55
for L in lens:   # typing ticks follow film.mjs: TYPE0 0.55, 0.03 s/char, 0.13 s between lines
    for c in range(0, L, 2): tick(tc + c * 0.03, 0.03, 2200 + 400 * rng.random())
    tc += L * 0.03 + 0.13
for k in range(4): hat(1.0 + k * 0.5 + 0.25, 0.03)
riser(3.0, 1.0, 0.18)

# ---------- 3 - 7: the video, built in code (energy 3) ----------
impact(3.0, 0.4)
kicks(3.0, 7.0)
offbass(38, 3.0, 7.0)
chord_pad(D, 3.0, 4.0, 0.16, 900, 1400)
for k in range(8): hat(3.0 + k * BEAT + BEAT / 2, 0.05)
for i in range(5): tick(5.9 + i * 0.14, 0.05, 3200)                          # execution marker steps the code
whoosh(6.75, 0.6, 0.16, 800, 6000)                                           # frame shrinks into the strip

# ---------- 7 - 10.5: every frame is frame(t) (energy 3-4) ----------
kicks(7.0, 10.5)
offbass(35, 7.0, 10.5)
chord_pad(Bm, 7.0, 3.5, 0.13, 1000, 1500)
arp([71, 74, 78, 83], 7.0, 10.5, 0.10, 700, 2600)
for k in range(7):
    hat(7.0 + k * BEAT + BEAT / 2, 0.05)
    if k % 2 == 1: clap(7.0 + k * BEAT)
whoosh(8.75, 0.6, 0.12, 600, 4000)                                           # render 2 slides in
whoosh(9.35, 0.75, 0.12, 2500, 9000)                                         # scan line

# ---------- 10.5 - 14: exact numbers, your style (energy 4) ----------
impact(10.5, 0.3)
kicks(10.5, 14.0)
offbass(31, 10.5, 14.0, cutoff=800)
chord_pad(G, 10.5, 3.5, 0.13, 1200, 2000)
arp([67, 71, 74, 79], 10.5, 14.0, 0.11, 1200, 4000)
for k in range(7):
    hat(10.5 + k * BEAT + BEAT / 2, 0.06, open_=True)
    if k % 2 == 1: clap(10.5 + k * BEAT)
for i in range(9): zap(10.8 + i * 0.1, 0.025, 1500 + i * 250, 800 + i * 120, 0.05)  # counter climbs
stab(D2, 11.7, 0.22, 4000, 0.3)                                              # 42 lands
for t0, ch in [(12.25, G), (12.7, A), (13.15, Bm)]:                          # style flips
    stab(ch, t0, 0.2); zap(t0, 0.04)
riser(14.0, 1.0, 0.16, 400, 8000)
whoosh(13.7, 0.55, 0.12, 500, 5000)                                          # bar lays down into a track

# ---------- 14 - 16.5: the drop, one film (energy 5) ----------
impact(14.0, 0.45)
kicks(14.0, 16.5, 0.85)
offbass(33, 14.0, 16.5, 0.32, 1100)
chord_pad(A, 14.0, 2.5, 0.10, 2500, 5000)
arp([69, 73, 76, 81], 14.0, 16.5, 0.12, 2500, 6000)
for k in range(5):
    t0 = 14.0 + k * BEAT
    stab(A, t0 + BEAT / 2, 0.14, 4500)
    if k % 2 == 1: clap(t0, 0.32)
    for s in range(4): hat(t0 + s * S16, 0.05 if s == 2 else 0.025, open_=(s == 2))
riser(16.5, 0.9, 0.14, 600, 9000)
# 16.5 - 17.0: silence in every instrument - the breath before the end card

# ---------- 17 - 20: end card, motif resolves (energy 2) ----------
impact(17.0, 0.55); kick(17.0, 0.9)
prev = None
for t0, m, d in [(17.0, 74, 0.25), (17.25, 78, 0.25), (17.5, 81, 0.5), (18.0, 86, 1.9)]:
    lead_note(m, t0, d, 0.18, prev); prev = m
chord_pad([50, 57, 62, 66, 69, 74], 17.0, 3.0, 0.2, 3000, 500)               # filter closes as it rings out
bass_note(38, 17.0, 2.9, 0.3, 300)
for t0 in [17.9, 18.9, 19.9]: tick(t0, 0.03, 2000)                           # caret blinks

# ---------- bus processing ----------
# sidechain pump: everything melodic ducks on each kick
pump = np.ones(N)
for k in range(int(DUR / BEAT)):
    t0 = k * BEAT
    if 3.0 <= t0 < 16.5 or t0 == 17.0:
        i = int(t0 * SR); n = int(BEAT * SR); x = np.arange(n) / n
        pump[i:i + n] = np.minimum(pump[i:i + n], 0.35 + 0.65 * np.minimum(1, x / 0.55) ** 1.5)
# feedback delay (dotted 8th) and a short noise-IR reverb on the lead and synths
def delay(x, dt, fb, mix):
    out = x.copy(); d = int(dt * SR); tap = x.copy()
    for _ in range(5):
        tap = np.concatenate([np.zeros(d), tap[:-d]]) * fb; out += tap * mix / fb
    return out
ir_t = tt(1.6); ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2); ir = lp(ir, 6000); ir /= np.abs(ir).sum() / 12
def verb(x, wet): return x + fftconvolve(x, ir)[:len(x)] * wet
lead_fx = verb(delay(lead, 0.375, 0.35, 0.5), 0.25)
synth_fx = verb(synth, 0.18)
music = drums + (bassb + synth_fx) * pump + lead_fx * (0.6 + 0.4 * pump)
# end on silence 16.5-17.0: cut any tails into the breath
gap = (T >= 16.5) & (T < 17.0)
music[gap] *= np.clip((16.56 - T[gap]) / 0.06, 0, 1)

# ---------- narration + mix ----------
vo = np.zeros(N)
for t0, f in json.load(open('vo.json')):
    a, sr = sf.read(f)
    if a.ndim > 1: a = a.mean(1)
    place(vo, resample_poly(a, SR, sr), t0)
act = (np.abs(vo) > 0.01).astype(float)
k = int(0.25 * SR); act = np.convolve(act, np.ones(k) / k, mode='same') > 0.02
duck = np.where(act, 10 ** (-6 / 20), 1.0)
duck = np.convolve(duck, np.ones(int(0.08 * SR)) / int(0.08 * SR), mode='same')
music_v = music - bp(music, 1000, 4000) * (1 - duck) * 1.4                   # carve the voice band
mix = (music_v * duck + sfx * (0.6 + 0.4 * duck)) * 0.8 + vo * 1.15
mix *= np.minimum(1, T / 0.01) * np.minimum(1, (DUR - T) / 0.35)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= np.abs(mix).max() / 0.89
# stereo: synths and lead wide, drums/bass/voice centred
side = hp((synth_fx * pump + lead_fx * 0.5) * duck, 250) * 0.18
side = np.concatenate([np.zeros(int(0.012 * SR)), side[:-int(0.012 * SR)]])   # Haas offset
st = np.stack([mix + side, mix - side], 1)
st /= np.abs(st).max() / 0.89
sf.write('soundtrack.wav', st.astype(np.float32), SR)

for c in [3.0, 7.0, 10.5, 14.0, 17.0]:
    print(f'cut {c:5.2f}  beat {c / BEAT:5.1f}  off-grid {abs(c / BEAT - round(c / BEAT)) * BEAT * 30:.1f} frames')
print('ok')
