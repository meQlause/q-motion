# Soundtrack for the 20 s q-motion reel: narration first.
# No music, no wind/swoosh, no thumps, no repeated or reused sounds (all
# banned). Five single sounds, each a different material, mark the big
# moments; the voice leads.
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

# ---------- the palette: five sounds, each one gesture, each its own material ----------
# Nothing is reused or repeated: no shared click, no multi-hit patterns.
def partials(freqs, decays, amps, d):
    t = tt(d)
    return sum(a * np.sin(2 * np.pi * f * t + 0.7 * i) * np.exp(-t * k) for i, (f, k, a) in enumerate(zip(freqs, decays, amps)))

def shutter(t0, g, pan=0.0):
    # metal - a camera shutter: one crisp snap, a short spring buzz underneath
    d = 0.07; t = tt(d)
    snap = hp(noise(d), 2500) * np.exp(-t * 380)
    spring = partials([3300, 5200], [120, 160], [0.25, 0.12], d)
    place(lp(snap * 0.7 + spring, 9000) * np.minimum(1, t / 0.0005), t0, g, pan)
def woodblock(t0, g, pan=0.0):
    # wood - a small hollow block: warm knock, gone in a tenth of a second
    d = 0.14; t = tt(d)
    s = partials([880, 2410, 3960], [55, 95, 140], [1.0, 0.35, 0.12], d)
    s += lp(noise(d), 3000) * np.exp(-t * 400) * 0.3
    place(s * np.minimum(1, t / 0.001), t0, g, pan)
def pop(t0, g, pan=0.0):
    # air in water - a small soft pop: fast upward pitch glide, rounded off
    t = tt(0.09); f = 260 + 520 * (1 - np.exp(-t * 90))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 55) * np.minimum(1, t / 0.002)
    place(lp(s, 3000), t0, g, pan)
def lock(t0, g, pan=0.0):
    # heavy metal - a latch seating: one dull strike with a low metallic ring
    d = 0.35; t = tt(d)
    s = partials([610, 1487, 2760, 4130], [18, 26, 40, 60], [0.5, 0.35, 0.2, 0.08], d)
    s += bp(noise(d), 800, 4000) * np.exp(-t * 250) * 0.5
    place(lp(s, 7000) * np.minimum(1, t / 0.0008), t0, g, pan)
def enter_key(t0, g, pan=0.0):
    # plastic - a keycap bottoming out: short, round, a touch hollow
    d = 0.06; t = tt(d)
    s = partials([420, 1150, 2600], [110, 160, 300], [0.6, 0.3, 0.15], d)
    s += bp(noise(d), 1500, 5000) * np.exp(-t * 500) * 0.35
    place(s * np.minimum(1, t / 0.0008), t0, g, pan)

# ---------- the big moments only ----------
# Banned: music, wind or swoosh, thumps, repeated or reused sounds.
# Everything else stays silent so the narration carries the film.
shutter(3.20, 0.18)                                     # 3.2  the spec becomes a picture: frame appears
woodblock(7.10, 0.16, -0.2)                             # 7.1  the frame settles into the filmstrip
pop(10.80, 0.20, -0.3)                                  # 10.8 the bar lands
lock(16.70, 0.16)                                       # 16.7 three tracks lock into one line
# 16.7 - 17.0: silence - the breath before the end card
enter_key(17.52, 0.26, 0.3)                             # 17.5 caret lands: Enter - generate

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
