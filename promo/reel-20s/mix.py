# Soundtrack for the 20 s q-motion reel: narration first.
# No music, no wind/swoosh, no thumps (all banned). Five small mechanical
# sounds from the film's own world mark the big moments; the voice leads.
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

# ---------- the palette: small mechanical sounds from the film's own world ----------
def modal(freqs, decays, amps, d=0.12):
    # a struck object: a few damped inharmonic partials
    t = tt(d)
    return sum(a * np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t * k) for f, k, a in zip(freqs, decays, amps))
def click(bright=1.0, body=1.0, d=0.06):
    # one soft mechanical click: a tiny noise transient plus its resonance
    t = tt(d)
    x = bp(noise(d), 1200, 5500) * np.exp(-t * 420) * 0.6 * bright
    x += modal([1850 * bright, 3100 * bright, 740 * body], [180, 260, 120], [0.35, 0.18, 0.3], d)
    return lp(x, 6500) * np.minimum(1, t / 0.0008)

def shutter(t0, g, pan=0.0):
    # camera shutter: open click, a breath of mechanism, a lower close click
    place(click(1.1, 1.0), t0, g, pan)
    t = tt(0.05); place(bp(noise(0.05), 2500, 6000) * np.exp(-t * 60) * 0.15, t0 + 0.012, g, pan)
    place(click(0.8, 0.9), t0 + 0.065, g * 0.8, pan)
def sprocket(t0, g, pan=(0.0, -0.4)):
    # film advancing: three quick soft sprocket clicks, easing off
    for k in range(3):
        p = pan[0] + (pan[1] - pan[0]) * k / 2
        place(click(0.9 - 0.06 * k, 0.8), t0 + k * 0.045, g * (1 - 0.22 * k), p)
def pop(t0, g, pan=0.0):
    # a small soft pop: fast upward pitch glide, rounded off
    t = tt(0.09); f = 260 + 520 * (1 - np.exp(-t * 90))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 55) * np.minimum(1, t / 0.002)
    place(lp(s, 3000), t0, g, pan)
def latch(t0, g, pan=0.0):
    # click-lock: a catch, then the lock seating, with a short metallic tail
    place(click(1.0, 0.7), t0, g * 0.7, pan)
    place(click(1.25, 1.1) + modal([2350, 4720], [45, 70], [0.12, 0.05], 0.12)[:int(0.06 * SR)], t0 + 0.028, g, pan)
def enter_key(t0, g, pan=0.0):
    # a mechanical Enter keypress: switch click, bottom-out, and the return stroke
    place(click(1.05, 1.0), t0, g, pan)
    t = tt(0.04); place(modal([420, 980], [140, 200], [0.5, 0.25], 0.04) * np.minimum(1, t / 0.001), t0 + 0.012, g * 0.8, pan)
    place(click(0.9, 0.8), t0 + 0.11, g * 0.45, pan)

# ---------- the big moments only ----------
# No music, no wind or swoosh, no thumps (banned). Everything else stays
# silent so the narration carries the film.
shutter(3.20, 0.22)                                     # 3.2  the spec becomes a picture: frame appears
sprocket(7.05, 0.16)                                    # 7.0  the frame advances into the filmstrip
pop(10.80, 0.20, -0.3)                                  # 10.8 the bar lands
latch(16.68, 0.22)                                      # 16.7 three tracks lock into one line
# 16.7 - 17.0: silence - the breath before the end card
enter_key(17.52, 0.24, 0.3)                             # 17.5 caret lands: Enter - generate

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
fx_gain = 1.2
st = np.stack([vo + L * fx_gain, vo + R * fx_gain], 1)
st *= np.minimum(1, (DUR - T) / 0.3)[:, None]
st = np.tanh(st * 1.05) / np.tanh(1.05)
st /= np.abs(st).max() / 0.89
sf.write('soundtrack.wav', st.astype(np.float32), SR)
fx = np.abs(np.stack([L, R], 1) * fx_gain).max(); vpk = np.abs(vo).max()
print(f'ok  fx peak {20*np.log10(fx/vpk):+.1f} dB relative to voice peak')
