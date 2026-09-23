# Dark cinematic bed + UI sound design + narration for the 10s glow video.
import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt

SR = 48000; DUR = 10.0; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(3)
def place(buf, sig, t0, g=1.0):
    i = int(t0 * SR); j = min(len(buf), i + len(sig))
    if j > i: buf[i:j] += sig[:j - i] * g
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, btype='low', fs=SR, output='sos'), x)
def midi(m): return 440 * 2 ** ((m - 69) / 12)

music = np.zeros(N)
# pad: Am9 -> Fmaj7 (switch with the scene change), detuned sines, slow swell
def pad(notes, t0, d, g):
    n = int(d * SR); tt = np.arange(n) / SR
    e = np.minimum(1, tt / 1.2) * np.minimum(1, (d - tt) / 1.0)
    s = sum(np.sin(2 * np.pi * midi(m) * tt) + np.sin(2 * np.pi * midi(m) * 1.004 * tt) for m in notes)
    place(music, lp(s, 2200) * e, t0, g)
pad([45, 52, 57, 60, 64, 71], 0.0, 6.2, 0.045)
pad([41, 48, 53, 57, 64, 67], 5.2, 4.8, 0.045)
# sub pulse (heartbeat) from 1.0s
for k in range(40):
    t0 = 1.0 + k * 0.577
    if t0 > 9.4: break
    tt = np.arange(int(0.35 * SR)) / SR
    place(music, np.sin(2 * np.pi * (48 + 40 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9), t0, 0.22)
# soft shimmer ticks on off-beats
for k in range(40):
    t0 = 1.29 + k * 0.577
    if t0 > 9.3: break
    x = bp(rng.standard_normal(int(0.06 * SR)), 7000, 13000) * np.exp(-np.arange(int(0.06 * SR)) / (0.012 * SR))
    place(music, x, t0, 0.05)

sfx = np.zeros(N)
def riser(t0, d, g):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); sg = 1024
    for i in range(0, n, sg):
        f = 300 + 3500 * (i / n) ** 2
        out[i:i + sg] = bp(x[i:i + sg], f * 0.7, min(20000, f * 1.3))[:len(out[i:i + sg])]
    place(sfx, out * np.linspace(0, 1, n) ** 2, t0, g)
def hit(t0, g):
    n = int(1.2 * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * (40 + 70 * np.exp(-tt * 18)) * tt) * np.exp(-tt * 3.5)
    s += lp(rng.standard_normal(n), 2500) * np.exp(-tt * 12) * 0.4
    place(sfx, s, t0, g)
def glass(t0, f, g):
    n = int(1.4 * SR); tt = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.01 * tt) * np.exp(-tt * 3) + 0.25 * np.sin(2 * np.pi * f * 3.9 * tt) * np.exp(-tt * 6)) * np.exp(-tt * 2.2)
    place(sfx, s * np.minimum(1, tt / 0.004), t0, g)
def swoosh(t0, d, g, lo=600, hi=5000):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); sg = 1024
    for i in range(0, n, sg):
        f = lo + (hi - lo) * np.sin(np.pi * i / n)
        out[i:i + sg] = bp(x[i:i + sg], f * 0.6, min(20000, f * 1.4))[:len(out[i:i + sg])]
    place(sfx, out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2, t0, g)

riser(0.0, 0.3, 0.2)
hit(0.3, 0.7)                                # big 10% lands
swoosh(0.6, 1.2, 0.18, 300, 2200)            # bars rising
glass(1.1, midi(81), 0.10); glass(1.35, midi(84), 0.10)   # values appear
glass(2.2, midi(88), 0.07)                   # -10% bracket
swoosh(3.2, 0.9, 0.10, 2000, 8000)           # light sweep
riser(4.7, 0.7, 0.25); swoosh(5.2, 0.7, 0.35, 400, 4000)  # transition
hit(5.6, 0.5)
for i, m in enumerate([76, 79, 81, 84]):     # four cards
    glass(5.45 + 0.55 + i * 0.22, midi(m), 0.09)
swoosh(8.05, 1.0, 0.1, 2000, 8000)           # card sweep
glass(9.2, midi(69), 0.08)

vo = np.zeros(N)
for t0, f in json.load(open('vo.json')):
    a, sr = sf.read(f); place(vo, resample_poly(a, SR, sr), t0)
act = np.abs(vo) > 0.01; k = int(0.12 * SR)
act = np.convolve(act.astype(float), np.ones(k) / k, mode='same') > 0.02
duck = np.convolve(np.where(act, 0.5, 1.0), np.ones(int(0.1 * SR)) / int(0.1 * SR), mode='same')
mix = music * duck + sfx * (0.5 + 0.5 * duck) * 0.8 + vo
mix *= np.minimum(1, (DUR - t) / 0.5) * np.minimum(1, t / 0.02)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix /= np.abs(mix).max() / 0.89
sf.write('soundtrack.wav', mix.astype(np.float32), SR)
print('ok')
