# Score, sound design and narration for the 20 s q-motion reel.
# 120 bpm, D major. Every cut (3, 7, 10.5, 14, 17) sits on the beat grid.
# Palette follows the picture: clean, precise, digital - plucks, a sub kick,
# tick hats that echo the typing, one warm filtered pad. No piano arps.
# Motif: D5 F#5 A5 E5 at the hook (left open), D5 F#5 A5 D6 on the end card.
import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt

SR = 48000; DUR = 20.0; N = int(SR * DUR); T = np.arange(N) / SR
BEAT = 0.5
rng = np.random.default_rng(7)
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def place(buf, sig, t0, g=1.0):
    i = int(round(t0 * SR)); j = min(len(buf), i + len(sig))
    if j > i: buf[i:j] += sig[:j - i] * g
def lp(x, f): return sosfilt(butter(2, f, btype='low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, btype='high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)
def tt(d): return np.arange(int(d * SR)) / SR

music = np.zeros(N); sfx = np.zeros(N)

# ---------- instruments ----------
def pluck(m, d=0.6, bright=4000):
    t = tt(d); f = midi(m)
    tri = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
    sq = np.sign(np.sin(2 * np.pi * f * 2 * t)) * 0.15
    return lp((tri + sq) * np.exp(-t * 7) * np.minimum(1, t / 0.003), bright)
def pad(notes, t0, d, g, cutoff=1400):
    t = tt(d); e = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.3)
    s = sum(np.sign(np.sin(2 * np.pi * midi(m) * t)) * 0.3 + np.sin(2 * np.pi * midi(m) * 1.003 * t) for m in notes)
    place(music, lp(s, cutoff) * e, t0, g)
def kick(t0, g=0.55):
    t = tt(0.4); s = np.sin(2 * np.pi * (45 * t + 90 / 22 * (1 - np.exp(-t * 22)))) * np.exp(-t * 8)
    place(music, s, t0, g)
def hat(t0, g=0.05):
    n = int(0.05 * SR); place(music, hp(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / (0.01 * SR)), t0, g)
def bass(m, t0, d, g=0.16):
    t = tt(d); f = midi(m)
    s = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 3) * np.minimum(1, t / 0.005) * np.minimum(1, (d - t) / 0.02)
    place(music, s, t0, g)

# ---------- sfx ----------
def tick(t0, g=0.05, f=2400):
    t = tt(0.03); place(sfx, np.sin(2 * np.pi * f * t) * np.exp(-t * 180), t0, g)
def whoosh(t0, d, g, lo=400, hi=5000):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); sg = 1024
    for i in range(0, n, sg):
        f = lo + (hi - lo) * np.sin(np.pi * i / n)
        out[i:i + sg] = bp(x[i:i + sg], f * 0.6, min(20000, f * 1.4))[:len(out[i:i + sg])]
    place(sfx, out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2, t0, g)
def riser(t_end, d, g):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); sg = 1024
    for i in range(0, n, sg):
        f = 300 + 4000 * (i / n) ** 2
        out[i:i + sg] = bp(x[i:i + sg], f * 0.7, min(20000, f * 1.3))[:len(out[i:i + sg])]
    place(sfx, out * np.linspace(0, 1, n) ** 2, t_end - d, g)
def hit(t0, g):
    t = tt(1.0); s = np.sin(2 * np.pi * (40 + 80 * np.exp(-t * 20)) * t) * np.exp(-t * 4)
    s += lp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 14) * 0.35
    place(sfx, s, t0, g)
def bell(t0, m, g):
    t = tt(1.4); f = midi(m)
    s = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 5)) * np.exp(-t * 2.5)
    place(sfx, s * np.minimum(1, t / 0.003), t0, g)

# ---------- 0 - 3: the spec is written ----------
for t0, m in [(0.0, 74), (0.25, 78), (0.5, 81), (1.0, 76)]:            # motif, left open on E
    place(music, pluck(m, 0.9 if m == 76 else 0.5), t0, 0.16)
pad([50, 57, 62, 66], 0.0, 3.1, 0.035, 900)
# typing ticks follow film.mjs: TYPE0 0.55, 0.03 s/char, 0.13 s between lines
lens = [len('# launch.md'), len('message: Ship day.'), len('length:  20s'), len('style:   yours')]
tc = 0.55
for L in lens:
    for c in range(0, L, 2): tick(tc + c * 0.03, 0.035, 2200 + 400 * rng.random())
    tc += L * 0.03 + 0.13
riser(3.0, 0.55, 0.14)

# ---------- 3 - 7: the video, built in code ----------
hit(3.0, 0.35)
pad([50, 57, 62, 66, 69], 3.0, 4.0, 0.032, 1300)                         # D
for b in range(8):
    t0 = 3.0 + b * BEAT
    if b % 2 == 0: kick(t0, 0.45)
    bass(38, t0, 0.24); bass(38, t0 + 0.25, 0.22, 0.10)
for i in range(5): tick(5.9 + i * 0.14, 0.05, 3200)                       # execution marker steps the code
whoosh(6.8, 0.55, 0.16, 800, 6000)                                          # frame shrinks into the strip

# ---------- 7 - 10.5: every frame is frame(t) ----------
pad([47, 54, 59, 62, 66], 7.0, 3.55, 0.032, 1500)                          # Bm
for b in range(7):
    t0 = 7.0 + b * BEAT
    if b % 2 == 0: kick(t0)
    hat(t0 + 0.25)
    bass(35, t0, 0.24); bass(47, t0 + 0.25, 0.2, 0.08)
whoosh(8.75, 0.6, 0.12, 600, 4000)                                          # render 2 slides in
whoosh(9.35, 0.75, 0.10, 2500, 9000)                                        # scan line
for t0, m in [(9.5, 78), (9.75, 81)]: place(music, pluck(m, 0.4, 5000), t0, 0.08)

# ---------- 10.5 - 14: exact numbers, your style ----------
hit(10.5, 0.3)
pad([43, 50, 55, 59, 62], 10.5, 3.55, 0.032, 1600)                         # G
for b in range(7):
    t0 = 10.5 + b * BEAT
    if b % 2 == 0: kick(t0)
    hat(t0 + 0.25)
    bass(31, t0, 0.24); bass(43, t0 + 0.25, 0.2, 0.08)
for i in range(9): tick(10.8 + i * 0.1, 0.04, 1600 + i * 180)             # counter climbs
bell(11.7, 86, 0.10)                                                        # 42 lands
for t0, m in [(12.25, 81), (12.7, 83), (13.15, 85)]:                        # style flips
    place(music, pluck(m, 0.35, 6000), t0, 0.12); tick(t0, 0.05, 4000)
whoosh(13.7, 0.55, 0.14, 500, 5000)                                         # bar lays down into a track

# ---------- 14 - 17: one film ----------
pad([45, 52, 57, 61, 64], 14.0, 2.55, 0.036, 2200)                         # A, filter opens
for b in range(5):
    t0 = 14.0 + b * BEAT
    kick(t0, 0.5)
    hat(t0 + 0.25, 0.06); hat(t0 + 0.125, 0.03); hat(t0 + 0.375, 0.03)
    bass(33, t0, 0.24); bass(45, t0 + 0.25, 0.2, 0.09)
for t0, m in [(14.2, 76), (14.95, 81)]: place(music, pluck(m, 0.4), t0, 0.1)  # words / music tracks enter
riser(16.5, 0.35, 0.12)
# 16.5 - 17.0: silence - the breath before the end card

# ---------- 17 - 20: end card, motif resolves ----------
hit(17.0, 0.45)
for t0, m in [(17.0, 74), (17.25, 78), (17.5, 81), (18.0, 86)]:
    place(music, pluck(m, 2.2 if m == 86 else 0.6), t0, 0.17)
pad([50, 57, 62, 66, 69, 74], 17.0, 3.0, 0.04, 1800)                       # D, rings out
bass(38, 17.0, 2.9, 0.2)
for k, t0 in enumerate([17.9, 18.9, 19.9]): tick(t0, 0.03, 2000)          # caret blinks

# ---------- narration + mix ----------
vo = np.zeros(N)
for t0, f in json.load(open('vo.json')):
    a, sr = sf.read(f)
    if a.ndim > 1: a = a.mean(1)
    place(vo, resample_poly(a, SR, sr), t0)
act = (np.abs(vo) > 0.01).astype(float)
k = int(0.25 * SR); act = np.convolve(act, np.ones(k) / k, mode='same') > 0.02
duck = np.where(act, 10 ** (-5 / 20), 1.0)
duck = np.convolve(duck, np.ones(int(0.08 * SR)) / int(0.08 * SR), mode='same')
music_v = music - bp(music, 1000, 4000) * (1 - duck) * 1.4               # carve the voice band
mix = (music_v * duck + sfx * (0.6 + 0.4 * duck)) * 0.9 + vo * 1.1
mix *= np.minimum(1, T / 0.01) * np.minimum(1, (DUR - T) / 0.35)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= np.abs(mix).max() / 0.89
# light stereo: music a touch wide, voice centred
side = lp(hp(music_v * duck, 200), 8000) * 0.12
st = np.stack([mix + side, mix - side], 1)
st /= np.abs(st).max() / 0.89
sf.write('soundtrack.wav', st.astype(np.float32), SR)

# every accent vs its cut, in frames
for c in [3.0, 7.0, 10.5, 14.0, 17.0]:
    print(f'cut {c:5.2f}  beat {c / BEAT:5.1f}  off-grid {abs(c / BEAT - round(c / BEAT)) * BEAT * 30:.1f} frames')
print('ok')
