# Soundtrack for the 20 s q-motion reel: narration + sound design only.
# No music bed. Every effect is soft, short and tied to something moving on
# screen, panned with its motion, and placed in one small shared room.
# Palette: muted key clicks, airy whooshes, felt thumps, a pencil scratch,
# a glass swipe - nothing bright or bell-like.
import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt, fftconvolve

SR = 48000; DUR = 20.0; N = int(SR * DUR); T = np.arange(N) / SR
rng = np.random.default_rng(5)
def lp(x, f): return sosfilt(butter(2, f, btype='low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, btype='high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)
def tt(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))

L = np.zeros(N); R = np.zeros(N)
def place(sig, t0, g=1.0, pan=0.0):
    """pan: -1 left .. 1 right, a number or (start, end) for a sweep."""
    n = len(sig); p = np.linspace(*pan, n) if isinstance(pan, tuple) else np.full(n, pan)
    a = (p + 1) * np.pi / 4
    i = int(round(t0 * SR)); j = min(N, i + n)
    if j > i:
        L[i:j] += (sig * np.cos(a) * g)[:j - i]; R[i:j] += (sig * np.sin(a) * g)[:j - i]

# ---------- the palette ----------
def key(g=1.0, pan=0.0, t0=0.0):
    # muted keyboard click: short filtered noise + a small low body
    t = tt(0.05); x = bp(noise(0.05), 1800 + rng.random() * 900, 6000) * np.exp(-t * 160)
    x += np.sin(2 * np.pi * (180 + rng.random() * 40) * t) * np.exp(-t * 90) * 0.5
    place(x, t0, 0.05 * g * (0.8 + 0.4 * rng.random()), pan)
def air(t0, d, g, lo, hi, pan=0.0):
    # airy whoosh: noise through a band that rises then falls, soft in and out
    n = int(d * SR); x = noise(d); out = np.zeros(n); sg = 512
    for i in range(0, n, sg):
        u = i / n; f = lo + (hi - lo) * np.sin(np.pi * u) ** 1.5
        out[i:i + sg] = bp(x[max(0, i - 2048):i + sg], f * 0.55, min(20000, f * 1.5))[-len(out[i:i + sg]):]
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    place(out * env, t0, g, pan)
def thump(t0, g, f=62, pan=0.0):
    # felt thump: soft pitched body, no click
    t = tt(0.5); s = np.sin(2 * np.pi * (f + f * 0.6 * np.exp(-t * 30)) * t) * np.exp(-t * 11)
    s += lp(noise(0.5), 400) * np.exp(-t * 25) * 0.25
    place(s * np.minimum(1, t / 0.004), t0, g, pan)
def tap(t0, g, f=320, pan=0.0):
    # soft wooden tap: damped mid tone + a breath of noise
    t = tt(0.18); s = np.sin(2 * np.pi * f * t) * np.exp(-t * 40) + bp(noise(0.18), 800, 3000) * np.exp(-t * 120) * 0.4
    place(s * np.minimum(1, t / 0.002), t0, g, pan)
def scratch(t0, d, g, pan=0.0):
    # pencil on paper: band-passed noise with a 9 Hz stroke rhythm
    t = tt(d); x = bp(noise(d), 2500, 7000) * (0.45 + 0.55 * np.abs(np.sin(2 * np.pi * 9 * t)))
    place(x * np.sin(np.pi * t / d) ** 0.7, t0, g, pan)
def glass(t0, d, g, pan=0.0):
    # glass swipe: a thin high band gliding upward, very quiet
    n = int(d * SR); x = noise(d); out = np.zeros(n); sg = 512
    for i in range(0, n, sg):
        f = 4500 + 4000 * (i / n)
        out[i:i + sg] = bp(x[max(0, i - 2048):i + sg], f * 0.92, f * 1.08)[-len(out[i:i + sg]):]
    place(out * np.sin(np.pi * np.linspace(0, 1, n)), t0, g, pan)
def grain(t0, g, pan=0.0):
    # pixel: a tiny cluster of low-passed square grains
    for k in range(5):
        t = tt(0.02); f = 700 + 300 * rng.random()
        place(lp(np.sign(np.sin(2 * np.pi * f * t)), 2500) * np.exp(-t * 200), t0 + k * 0.022, g * (1 - k * 0.12), pan)

# ---------- 0 - 3: the spec is typed ----------
# key clicks follow film.mjs: TYPE0 0.55, 0.03 s per char, 0.13 s between lines; the caret moves left -> right
lens = [len('# launch.md'), len('message: Ship day.'), len('length:  20s'), len('style:   yours')]
tc = 0.55
for L_ in lens:
    for c in range(L_):
        if c % 2 == 0 or rng.random() < 0.3: key(1.0, -0.35 + 0.5 * c / 18, tc + c * 0.03)
    tc += L_ * 0.03 + 0.13
air(2.72, 0.45, 0.10, 500, 2600, (0.0, -0.7))          # spec lines slide out left
air(2.78, 0.44, 0.14, 300, 1800, (-0.2, 0.0))          # caret grows into the frame
thump(3.20, 0.45)                                       # frame lands

# ---------- 3 - 7: the video, built in code ----------
air(5.10, 0.55, 0.07, 900, 3500, (0.8, 0.3))            # code slides in from the right
for i in range(5): key(0.7, 0.35, 5.9 + i * 0.14)       # execution marker steps down the code
air(6.70, 0.40, 0.06, 900, 3500, (0.3, 0.9))            # code exits right
air(6.85, 0.45, 0.12, 400, 2200, (0.0, -0.5))           # frame shrinks into the strip

# ---------- 7 - 10.5: every frame is frame(t) ----------
for i in range(1, 6): tap(7.05 + i * 0.06 + 0.35, 0.05, 300 + i * 15, 0.9 - i * 0.2)   # cells settle
air(8.75, 0.60, 0.10, 500, 2800, (0.9, -0.2))           # render 2 slides in from the right
glass(9.35, 0.75, 0.05, (-0.8, 0.8))                    # scan line, left -> right
tap(9.95, 0.07, 360, 0.6)                               # "same frame"

# ---------- 10.5 - 14: exact numbers, your style ----------
air(10.10, 0.40, 0.08, 250, 1200, (0.0, 0.0))           # other cells drop away
air(10.30, 0.50, 0.08, 400, 2000, (0.2, -0.6))          # square flies to the bar
thump(10.80, 0.35, 70, -0.5)                            # bar base lands
# counter 0 -> 42 with ease-out-quint: one soft click per 3 units, spacing widens as it slows
eo5 = lambda u: 1 - (1 - u) ** 5
us = np.linspace(0, 1, 4000); vals = 42 * eo5(us)
for v in range(3, 42, 3):
    u = us[np.searchsorted(vals, v)]; key(0.8, 0.1, 10.8 + u * 0.9)
tap(11.70, 0.12, 260, 0.1)                              # 42 lands
scratch(12.25, 0.38, 0.05, -0.5)                        # sketch
glass(12.70, 0.40, 0.06, (-0.6, -0.3))                  # glass
grain(13.15, 0.05, -0.5)                                # pixel
tap(13.60, 0.06, 300, -0.5)                             # back to flat
air(13.72, 0.35, 0.06, 600, 2400, (0.0, -0.8))          # counter exits left
air(13.80, 0.50, 0.12, 300, 1800, (-0.5, 0.2))          # bar lays down into a track

# ---------- 14 - 17: words, picture, music -> one film ----------
air(14.20, 0.55, 0.07, 1200, 4500, (-0.8, 0.8))         # words track wipes on
air(14.95, 0.55, 0.07, 700, 3000, (-0.8, 0.8))          # music track wipes on
glass(14.35, 1.85, 0.025, (-0.8, 0.8))                  # playhead crosses
air(16.20, 0.50, 0.12, 300, 1600, (0.0, 0.0))           # three tracks collapse into one line
thump(16.68, 0.30, 58)
# 16.7 - 17.0: silence - the breath before the end card

# ---------- 17 - 20: end card ----------
air(17.00, 0.60, 0.12, 500, 3000, (-0.7, 0.4))          # line contracts, wordmark wipes on
thump(17.52, 0.40, 55, 0.4)                             # caret lands
air(17.85, 0.40, 0.035, 1500, 5000, -0.3)               # "Write the spec."
air(18.85, 0.40, 0.035, 1500, 5000, -0.3)               # "Get the film."
key(0.8, -0.2, 19.15)                                   # command line appears

# ---------- one small room for all effects ----------
def ir(seed, sec=0.9, decay=7.0):
    r = np.random.default_rng(seed); t = np.arange(int(sec * SR)) / SR
    x = lp(r.standard_normal(len(t)) * np.exp(-t * decay), 6000); return x / np.abs(x).sum() * 6
L = L + fftconvolve(L, ir(1))[:N] * 0.35
R = R + fftconvolve(R, ir(2))[:N] * 0.35

# ---------- narration + mix ----------
vo = np.zeros(N)
for t0, f in json.load(open('vo.json')):
    a, sr = sf.read(f)
    if a.ndim > 1: a = a.mean(1)
    a = resample_poly(a, SR, sr); i = int(t0 * SR); vo[i:i + len(a)] += a[:N - i]
fx_gain = 1.6
st = np.stack([vo + L * fx_gain, vo + R * fx_gain], 1)
st *= np.minimum(1, (DUR - T) / 0.3)[:, None]
st = np.tanh(st * 1.05) / np.tanh(1.05)
st /= np.abs(st).max() / 0.89
sf.write('soundtrack.wav', st.astype(np.float32), SR)
fx = np.abs(np.stack([L, R], 1) * fx_gain).max(); vpk = np.abs(vo).max()
print(f'ok  fx peak {20*np.log10(fx/vpk):+.1f} dB relative to voice peak')
