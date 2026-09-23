import sys, json, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("kokoro.onnx", "voices.bin")
voice = sys.argv[1]; speed = float(sys.argv[2])
LINES = [
 (0.30, "Every big idea starts as a dot."),
 (2.75, "Introducing Claude Opus five point five."),
 (5.50, "It builds. Sixty-six point four on Terminal-Bench."),
 (8.20, "Six hundred eighty thousand lines, in a day."),
 (10.95,"Hours, not days."),
 (12.10,"And it's not just code."),
 (13.80,"Deals. Data. Even your desktop."),
 (17.90,"Forty percent cheaper to run."),
 (19.85,"Four dollars in. Twenty out."),
 (21.90,"And the numbers keep coming."),
 (25.90,"All on one page."),
 (27.60,"Claude Opus five point five. Out now."),
]
out=[]
for i,(t,txt) in enumerate(LINES):
    a, sr = k.create(txt, voice=voice, speed=speed, lang="en-us")
    f=f"vo_{i:02d}.wav"; sf.write(f, a, sr); d=len(a)/sr
    out.append((t,f)); print(f"{i:2d} {t:5.2f}-{t+d:5.2f} ({d:.2f})  {txt}")
json.dump(out, open("vo.json","w"))
