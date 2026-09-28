# Narration: one Kokoro clip per line, placed inside its scene. English -> Kokoro.
import json, soundfile as sf
from kokoro_onnx import Kokoro

VOICE = 'am_michael'
LINES = [  # (start s, text) - each must end before its scene's cut
    (0.60,  "Write down what you want to say."),
    (3.25,  "Q-motion turns it into a video, built entirely in code."),
    (7.20,  "Every frame is a function of time, so nothing drifts."),
    (10.62, "Your numbers stay exact. Your style stays yours."),
    (14.15, "Words, picture and music, made as one film."),
    (17.35, "Q-motion. Write the spec. Get the film."),
]
CUTS = [3.0, 7.0, 10.5, 14.0, 17.0, 20.0]

k = Kokoro('models/kokoro-v1.0.int8.onnx', 'models/voices-v1.0.bin')
out = []
for i, (t0, line) in enumerate(LINES):
    s, sr = k.create(line, voice=VOICE, speed=1.15, lang='en-us')
    f = f'vo_{i}.wav'; sf.write(f, s, sr); out.append([t0, f])
    end = t0 + len(s) / sr
    print(f'{i}  {t0:5.2f} -> {end:5.2f}  ({len(s)/sr:4.2f}s)  cut {CUTS[i]:5.2f}  {"OK" if end < CUTS[i] else "OVER"}  {line}')
json.dump(out, open('vo.json', 'w'))
