# Score and narration for the 20 s q-motion reel. Music and voice only.
# An elegant legato string/choir bed: five voices that glide from chord to
# chord (true voice leading, one continuous line per voice), a soft sine
# lead for the motif, a long stereo reverb. No drums, no plucks, no SFX.
#
# Harmony (chords change exactly on the cuts):
#   0    Dmaj9      3    Bm9        7    Gmaj7#11
#   10.5 Em9        14   A13sus -> A7 (15.5)
#   16.5 breath     17   Dadd9 (home)
# The C#5 on top holds through the first three chords - the common tone
# that carries across the first two cuts.
# Motif (lead): D5 F#5 A5 E5 at the hook (left open),
#               D5 F#5 A5 D6 on the end card (resolved).
import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt, fftconvolve

SR = 48000; DUR = 20.0; N = int(SR * DUR); T = np.arange(N) / SR
rng = np.random.default_rng(11)
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def lp(x, f): return sosfilt(butter(2, f, btype='low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, btype='high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)
def smooth(x, sec):
    k = max(1, int(sec * SR)); return np.convolve(x, np.ones(k) / k, mode='same')
def varlp(x, cutoff, blk=1024):
    # low-pass whose cutoff follows a per-sample curve (block-wise, warmed up)
    out = np.zeros_like(x)
    for i in range(0, len(x), blk):
        f = float(np.clip(cutoff[min(i + blk // 2, len(x) - 1)], 80, SR / 2.3))
        out[i:i + blk] = lp(x[max(0, i - 4096):i + blk], f)[-len(x[i:i + blk]):]
    return out

#            t0     bass  v1  v2  v3  v4
CHORDS = [(0.0,  [38, 57, 64, 66, 73]),   # Dmaj9     D2 | A3 E4 F#4 C#5
          (3.0,  [35, 57, 62, 66, 73]),   # Bm9       B1 | A3 D4 F#4 C#5
          (7.0,  [31, 59, 62, 66, 73]),   # Gmaj7#11  G1 | B3 D4 F#4 C#5
          (10.5, [40, 55, 62, 66, 71]),   # Em9       E2 | G3 D4 F#4 B4
          (14.0, [33, 55, 62, 64, 71]),   # A13sus    A1 | G3 D4 E4 B4
          (15.5, [33, 55, 61, 64, 69]),   # A7        A1 | G3 C#4 E4 A4
          (17.0, [38, 54, 57, 64, 66])]   # Dadd9     D2 | F#3 A3 E4 F#4
GLIDE = 0.14   # seconds of portamento on each voice change

def pitch_curve(v):
    m = np.zeros(N)
    for k, (t0, ch) in enumerate(CHORDS):
        t1 = CHORDS[k + 1][0] if k + 1 < len(CHORDS) else DUR
        m[int(t0 * SR):int(t1 * SR)] = ch[v]
    return smooth(m, GLIDE)          # linear glide centred on the cut

# Shared dynamics: gentle swell into each cut, a breath before the end card.
def dyn():
    a = np.full(N, 0.8)
    a *= np.minimum(1, T / 1.2)                                      # fade in
    for c in [3.0, 7.0, 10.5, 14.0]:
        a += 0.18 * np.exp(-((T - c + 0.25) / 0.6) ** 2)             # swell peaking just before the cut
    a[(T >= 14.0) & (T < 16.5)] *= 1.12                              # fullest section
    breath = np.clip((16.55 - T) / 0.3, 0, 1) + np.clip((T - 17.0) / 0.12, 0, 1)
    a *= np.where((T > 16.25) & (T < 17.12), np.clip(breath, 0, 1), 1)
    a *= np.where(T > 18.0, np.clip((DUR - T) / 2.0, 0, 1) ** 0.7, 1)  # long release
    return a
DYN = dyn()

# Brightness follows the energy curve: dark at the hook, open at 14 s, soft on the end card.
BRIGHT = np.interp(T, [0, 3, 7, 10.5, 14, 16.5, 17, 20], [650, 900, 1100, 1300, 1900, 1900, 1400, 900])

def string_voice(v, gain, octave=0):
    m = pitch_curve(v) + 12 * octave
    f = 440 * 2 ** ((m - 69) / 12)
    out = np.zeros(N)
    for d, ph0 in [(-0.0025, 0.1), (0.0, 0.5), (0.0031, 0.8)]:       # three detuned saws, slow drift
        lfo = 1 + d + 0.0012 * np.sin(2 * np.pi * (0.13 + 0.05 * v) * T + ph0 * 6)
        ph = np.cumsum(f * lfo) / SR + ph0
        out += 2 * (ph % 1) - 1
    ph = np.cumsum(f * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * T) * np.clip((T % 3.5) / 1.5, 0, 1))) / SR
    sine = np.sin(2 * np.pi * ph)                                   # warm core with a little vibrato
    tone = varlp(out / 3, BRIGHT * (1.25 if v == 4 else 1.0)) * 0.7 + sine * 0.55
    return tone * gain

music = np.zeros(N)
music += string_voice(0, 0.30)                                      # bass
music += np.sin(2 * np.pi * np.cumsum(440 * 2 ** ((pitch_curve(0) - 12 - 69) / 12)) / SR) * 0.22   # sub, octave down
for v, g in [(1, 0.15), (2, 0.14), (3, 0.14), (4, 0.13)]:
    music += string_voice(v, g)
# octave shimmer on the top voice for the fullest section and the landing
shimmer = string_voice(4, 0.07, octave=1)
music += shimmer * np.interp(T, [0, 13.5, 14.2, 16.5, 17, 18, 20], [0, 0, 1, 1, 0.6, 0.6, 0])
music *= DYN

# ---------- motif lead: soft sine with breathy attack ----------
lead = np.zeros(N)
def lead_line(notes):
    # notes: (t0, midi, dur); legato glide between consecutive notes
    mm = np.full(N, float(notes[0][1])); amp = np.zeros(N)
    for t0, m, d in notes:
        i, j = int(t0 * SR), int((t0 + d) * SR)
        mm[i:] = m; amp[i:j] = 1          # hold each pitch until the next note
    mm = smooth(mm, 0.06)
    env = smooth(amp, 0.12)
    f = 440 * 2 ** ((mm - 69) / 12) * (1 + 0.004 * np.sin(2 * np.pi * 5.0 * T))
    ph = np.cumsum(f) / SR
    tone = np.sin(2 * np.pi * ph) + 0.25 * np.sin(4 * np.pi * ph) + 0.08 * np.sin(6 * np.pi * ph)
    air = bp(rng.standard_normal(N), 1500, 5000) * 0.03
    return (tone + air) * env
lead += lead_line([(0.30, 74, 0.45), (0.75, 78, 0.45), (1.20, 81, 0.55), (1.75, 76, 1.10)]) * 0.10
lead += lead_line([(17.05, 74, 0.40), (17.45, 78, 0.40), (17.85, 81, 0.50), (18.35, 86, 1.45)]) * 0.11

# ---------- space: long decorrelated stereo reverb ----------
def ir(seed, sec=3.2, decay=2.0):
    r = np.random.default_rng(seed); t = np.arange(int(sec * SR)) / SR
    x = r.standard_normal(len(t)) * np.exp(-t * decay)
    x = lp(x, 5000) * (1 - np.exp(-t / 0.02)); return x / np.abs(x).sum() * 18
IRL, IRR = ir(1), ir(2)
dry = music + lead
wetL = fftconvolve(hp(dry, 180), IRL)[:N]; wetR = fftconvolve(hp(dry, 180), IRR)[:N]
L = dry * 0.85 + wetL * 0.45
R = dry * 0.85 + wetR * 0.45

# ---------- narration + mix ----------
vo = np.zeros(N)
for t0, f in json.load(open('vo.json')):
    a, sr = sf.read(f)
    if a.ndim > 1: a = a.mean(1)
    a = resample_poly(a, SR, sr); i = int(t0 * SR); vo[i:i + len(a)] += a[:N - i]
act = smooth((np.abs(vo) > 0.01).astype(float), 0.25) > 0.02
duck = smooth(np.where(act, 10 ** (-4 / 20), 1.0), 0.15)               # gentle -4 dB, slow
carve = lambda x: x - bp(x, 1200, 3800) * (1 - duck) * 1.2             # clear the voice band
L = carve(L) * duck; R = carve(R) * duck
mL = L * 0.9 + vo * 1.15; mR = R * 0.9 + vo * 1.15
st = np.stack([mL, mR], 1)
st *= np.minimum(1, T / 0.02)[:, None]
st = np.tanh(st * 1.1) / np.tanh(1.1)
st /= np.abs(st).max() / 0.89
sf.write('soundtrack.wav', st.astype(np.float32), SR)
print('ok  peak-normalised; chord changes at', [c[0] for c in CHORDS])
