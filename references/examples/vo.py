import json, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("/home/claude/film/tts/kokoro.onnx", "/home/claude/film/tts/voices.bin")
L = [(0.3, "Indonesia sits ten percent below ASEAN."),
     (2.85, "Twenty-eight point six, versus thirty-one point eight."),
     (6.0,  "Twenty-first on labor."),
     (7.65, "Fiftieth and below on efficiency.")]
out = []
for i, (t, s) in enumerate(L):
    a, sr = k.create(s, voice="am_michael", speed=1.18, lang="en-us")
    f = f"vo_{i}.wav"; sf.write(f, a, sr); out.append([t, f]); print(f"{t:5.2f}-{t+len(a)/sr:5.2f}  {s}")
json.dump(out, open("vo.json", "w"))
