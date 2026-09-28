# Soundtrack for the 20 s q-motion reel: narration first.
# No music. Only the big moments get a sound - a soft swoosh or felt thump
# on each scene change and the end card - so nothing competes with the voice.
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

# ---------- two sounds ----------
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

# ---------- the big moments only: the five scene changes + the end card ----------
# Everything else stays silent so the narration carries the film.
air(2.78, 0.44, 0.10, 300, 1800, (-0.2, 0.0))          # 3.0  caret grows into the video frame
thump(3.20, 0.32)                                       #      frame lands
air(6.85, 0.45, 0.08, 400, 2200, (0.0, -0.5))           # 7.0  frame shrinks into the filmstrip
thump(10.80, 0.26, 70, -0.3)                            # 10.5 square becomes the bar, bar lands
air(13.80, 0.50, 0.08, 300, 1800, (-0.5, 0.2))          # 14.0 bar lays down into a track
thump(16.68, 0.24, 58)                                  # 16.7 three tracks collapse into one line
# 16.7 - 17.0: silence - the breath before the end card
air(17.00, 0.60, 0.09, 500, 3000, (-0.7, 0.4))          # 17.0 line contracts, wordmark wipes on
thump(17.52, 0.32, 55, 0.3)                             #      caret lands

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
