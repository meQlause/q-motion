# Synthesized music bed + sound effects + narration, synced to the film's timeline.
import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt

SR = 48000; DUR = 30.0; N = int(SR * DUR)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def env(n, a=0.005, r=0.2):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    e *= np.exp(-np.arange(n) / (r * SR)); return e
def place(buf, sig, t, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(sig))
    if j > i: buf[i:j] += sig[: j - i] * g
def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)
def lp(x, f):
    return sosfilt(butter(2, f, btype='low', fs=SR, output='sos'), x)
def sine(f, d, ph=0):
    tt = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * f * tt + ph)

# ---------- music ----------
music = np.zeros(N)
BPM = 104; beat = 60 / BPM
def midi(m): return 440 * 2 ** ((m - 69) / 12)
chords = [[48, 55, 59, 64, 67], [45, 52, 55, 60, 64], [41, 48, 52, 57, 64], [43, 50, 55, 59, 62]]  # Cmaj7 Am7 Fmaj7 G
bar = 4 * beat
nb = int(DUR / bar) + 1
for b in range(nb):
    ch = chords[b % 4]; t0 = b * bar
    if t0 > 29.5: break
    d = min(bar * 1.15, DUR - t0)
    n = int(d * SR); tt = np.arange(n) / SR
    e = np.minimum(1, tt / 0.35) * np.minimum(1, (d - tt) / 0.4)
    s = sum(np.sin(2 * np.pi * midi(m) * tt) * (0.6 if m < 50 else 0.35) + 0.08 * np.sin(4 * np.pi * midi(m) * tt) for m in ch)
    place(music, s * e * 0.10, t0)
# plucked arpeggio from the title onwards
arp = [0, 2, 3, 1]
for k in range(int(DUR / (beat / 2))):
    t0 = k * beat / 2
    if t0 < 2.6 or t0 > 27.4: continue
    ch = chords[int(t0 / bar) % 4]
    m = ch[1 + arp[k % 4]] + 12
    s = (sine(midi(m), 0.4) + 0.3 * sine(midi(m) * 2, 0.4)) * env(int(0.4 * SR), 0.003, 0.09)
    place(music, s, t0, 0.07)
# kick + hat from BUILD, busier during rapid cards
for k in range(int(DUR / beat) + 1):
    t0 = k * beat
    if 5.4 <= t0 < 25.6:
        kd = int(0.25 * SR); tt = np.arange(kd) / SR
        kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14)
        place(music, kick, t0, 0.35)
    for h in ([0.5] if t0 < 21.4 else [0.25, 0.5, 0.75]):
        th = t0 + h * beat
        if 5.4 <= th < 25.6:
            place(music, bp(rng.standard_normal(int(0.05 * SR)), 6000, 12000) * env(int(0.05 * SR), 0.001, 0.015), th, 0.12)
# final resolving chord
d = 2.3; tt = np.arange(int(d * SR)) / SR
s = sum(np.sin(2 * np.pi * midi(m) * tt) for m in [48, 55, 60, 64, 71]) * np.minimum(1, tt / 0.05) * np.exp(-tt * 1.1)
place(music, s, 27.7, 0.11)

# ---------- sound effects ----------
sfx = np.zeros(N)
def whoosh(t0, d, lo=300, hi=3000, g=0.5, rise=True):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); seg = 1024
    for i in range(0, n, seg):
        u = i / n; f = lo + (hi - lo) * (u if rise else 1 - u)
        out[i:i + seg] = bp(x[i:i + seg], max(50, f * 0.6), min(20000, f * 1.4))[: len(out[i:i + seg])]
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    place(sfx, out * e, t0, g)
def thump(t0, g=0.8):
    kd = int(0.45 * SR); tt = np.arange(kd) / SR
    s = np.sin(2 * np.pi * (45 + 120 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 7)
    s += lp(rng.standard_normal(kd), 1800) * np.exp(-tt * 25) * 0.6
    place(sfx, s, t0, g)
def pop(t0, f=900, g=0.35):
    d = 0.08; tt = np.arange(int(d * SR)) / SR
    place(sfx, np.sin(2 * np.pi * f * (1 + 2 * tt / d) * tt) * np.exp(-tt * 50), t0, g)
def tick(t0, g=0.25, f=2400):
    place(sfx, sine(f, 0.03) * env(int(0.03 * SR), 0.0005, 0.006), t0, g)
def bell(t0, f, g=0.3, dec=0.6):
    d = 1.5; tt = np.arange(int(d * SR)) / SR
    s = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 4)) * np.exp(-tt / dec)
    place(sfx, s, t0, g)
def scratch(t0, d, g=0.18):
    n = int(d * SR); x = bp(rng.standard_normal(n), 2500, 7000)
    am = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * np.arange(n) / SR))
    place(sfx, x * am * np.minimum(1, np.linspace(0, 8, n)) * np.minimum(1, np.linspace(8, 0, n)), t0, g)

scratch(0.05, 0.8)                      # pencil scribble
pop(1.12, 500, 0.5)                     # ink dot pops
pent = [72, 74, 76, 79, 81, 84]
for i in range(14): pop(1.12 + i * 0.04, midi(pent[i % 6]), 0.12)   # pixels assemble
bell(1.95, midi(84), 0.12, 0.3)
whoosh(2.25, 0.4, 200, 4000, 0.55)      # into the eye
thump(3.12, 0.9)                        # title slam
whoosh(3.2, 0.5, 400, 1600, 0.2)        # underline draw
for i in range(4): pop(3.3 + i * 0.05, midi(88 + i * 2), 0.07)       # sparkles
whoosh(5.1, 0.32, 300, 2500, 0.45)      # whip to BUILD
thump(4.05, 0.35)                       # hero lands on 5.5
for i in range(12): tick(5.6 + i * 0.1, 0.07, 1800 + i * 90)       # typing / bars
whoosh(7.3, 0.32, 300, 2500, 0.45)      # whip to migration
for i in range(26): tick(7.6 + i * 0.032, 0.09, 2000 + i * 20)     # counter
bell(8.45, midi(79), 0.25); thump(8.42, 0.5)
x = lp(rng.standard_normal(int(1.1 * SR)), 900) * np.sin(np.pi * np.linspace(0, 1, int(1.1 * SR)))
place(sfx, x, 9.65, 0.45)               # rocket rumble
whoosh(9.7, 1.05, 200, 1200, 0.25)
for i in range(10): pop(10.75 + i * 0.03, midi(pent[i % 6] + 12), 0.12)  # confetti
thump(11.1, 0.7)                        # 30% faster stamp
tt = np.arange(int(0.9 * SR)) / SR      # dial boing
place(sfx, np.sin(2 * np.pi * (220 + 180 * np.sin(tt * 18) * np.exp(-tt * 4)) * tt) * np.exp(-tt * 3), 12.25, 0.18)
thump(12.9, 0.35)
whoosh(14.55, 0.3, 400, 2600, 0.35)     # pan to data
for i in range(3): pop(14.85 + i * 0.07, midi(76 + i * 3), 0.1)
for tc in [0.3, 0.62, 0.95, 1.3]: tick(15.9 + tc, 0.4, 1200); tick(15.9 + tc + 0.012, 0.25, 900)  # clicks
for i in range(3): pop(18.05 + i * 0.18, 700, 0.15)                # price tags
for i in range(3): scratch(18.35 + i * 0.18, 0.15, 0.12)           # strike old prices
thump(19.25, 1.0)                       # 40% less stamp
for i in range(6): bell(20.1 + i * 0.08, 2200 + rng.random() * 800, 0.08, 0.15)  # coins
bell(20.8, 1800, 0.12, 0.2)
whoosh(21.1, 0.45, 300, 3500, 0.55)     # ink wipe
for i in range(10): thump(21.4 + i * 0.42, 0.22); tick(21.4 + i * 0.42, 0.2, 3000)
whoosh(25.6, 1.3, 3000, 250, 0.35)      # pull out
bell(27.9, midi(72), 0.22, 0.9); bell(27.95, midi(79), 0.15, 0.9)

# ---------- voice ----------
vo = np.zeros(N)
for t0, f in json.load(open('vo.json')):
    a, sr = sf.read(f)
    a = resample_poly(a, SR, sr)
    place(vo, a, t0, 1.0)
# duck music + sfx under narration
act = np.abs(vo) > 0.01
k = int(0.12 * SR)
act = np.convolve(act.astype(float), np.ones(k) / k, mode='same') > 0.02
duck = np.where(act, 0.45, 1.0)
duck = np.convolve(duck, np.ones(int(0.08 * SR)) / int(0.08 * SR), mode='same')

mix = music * duck * 0.9 + sfx * (0.4 + 0.6 * duck) * 0.55 + vo * 1.0
fade = np.minimum(1, (DUR - t_all) / 0.6)
mix *= fade
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= max(1e-6, np.abs(mix).max()) / 0.89
sf.write('soundtrack.wav', mix.astype(np.float32), SR)
print('peak ok, seconds', len(mix) / SR)
