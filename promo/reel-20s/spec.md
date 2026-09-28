# q-motion reel — video spec

| | |
|---|---|
| Message | Write a spec; q-motion turns it into a finished video, made in code. |
| Length | 20 s |
| Format | 1080x1920, 30 fps, 9:16 (phone) |
| Style | editor-meets-poster: warm off-black, cream type, one orange accent; flat, crisp, no glow |
| Voice | am_michael (Kokoro, English) |
| Target size | under 4 MB (actual: 1.3 MB) |

## Brand

| | |
|---|---|
| Colours | `#0E0D0C` background · `#F2EDE4` ink · `#6F6A62` dim · `#FF5B24` accent |
| Fonts | Space Grotesk 500/700, JetBrains Mono 500/700 (both OFL, Google Fonts) |
| Logo | none — the wordmark is set in Space Grotesk |

## Numbers

| Figure | Means | Source |
|---|---|---|
| 42% | example value inside the demo spec | illustrative — not a claim |
| 1080×1920 · 30 fps | the reel's own format | this spec |

## Beats

| | |
|---|---|
| Idea | the orange caret is the whole film: it writes the spec, becomes the video frame, the square in every frame, the bar, the timeline, and the caret after the wordmark |
| Motif | picture: orange caret · words: "Q-motion" · music (synth lead): D5 F#5 A5 E5 (open) → D5 F#5 A5 D6 (resolved) |
| Energy | 0 s: 2 · 3 s: 3 · 7 s: 3 · 10.5 s: 4 · 14 s: 5 · 16.5 s: 0 · 17 s: 2 |

| # | Scene | t0 → t1 | Lead | Words (lands on) | Picture | Sound |
|---|---|---|---|---|---|---|
| 1 | Write | 0 → 3.0 | picture | "say" | caret blinks, types a 4-line `launch.md` spec | Dmaj9 fades in, lead states the motif (left open on E) |
| 2 | Render | 3.0 → 7.0 | words | "code" | caret grows into the 9:16 frame; the mini-film plays; its code slides in, a marker steps through it | Bm9 — C#5 on top holds across the cut |
| 3 | frame(t) | 7.0 → 10.5 | picture | "drifts" | frame shrinks into a filmstrip; a second render slides in identical; orange scan line | Gmaj7#11 — C#5 still held, strings open up |
| 4 | Exact / yours | 10.5 → 14.0 | picture | "exact", "yours" | one frame's square becomes a bar; counter lands on 42%; bar re-skins sketch → glass → pixel, number unchanged | Em9, swell into the cut |
| 5 | One film | 14.0 → 17.0 | music | "one film" | bar lays down into the picture track; words and music tracks join; playhead; all three collapse into one line | A13sus → A7 at 15.5, octave shimmer; then 0.5 s breath |
| 6 | End card | 17.0 → 20.0 | all | "Get the film" | line contracts into the caret and wipes on the wordmark; tagline, command, repo | Dadd9 home, lead resolves the motif on D6, long release |

## Transitions

| Boundary | Cut | Carrier | Technique | Frames |
|---|---|---|---|---|
| 1 → 2 | 3.0 | caret | shape match — caret grows into the video frame | 13 |
| 2 → 3 | 7.0 | video frame | element hand-off — frame shrinks into filmstrip cell 0 | 13 |
| 3 → 4 | 10.5 | orange square | shape match — a frame's square becomes the bar | 15 |
| 4 → 5 | 14.0 | bar | shape match — bar lays down into the picture track | 13 |
| 5 → 6 | 17.0 | orange line | line contracts into the caret, wiping on the wordmark | 18 |

## Narration

| Scene | Start | Line |
|---|---|---|
| 1 | 0.60 | Write down what you want to say. |
| 2 | 3.25 | Q-motion turns it into a video, built entirely in code. |
| 3 | 7.20 | Every frame is a function of time, so nothing drifts. |
| 4 | 10.62 | Your numbers stay exact. Your style stays yours. |
| 5 | 14.15 | Words, picture and music, made as one film. |
| 6 | 17.35 | Q-motion. Write the spec. Get the film. |

## Music

Music and voice only — no sound effects.

| | |
|---|---|
| Style | elegant legato strings/choir: five voices gliding chord to chord (true voice leading), soft sine lead, long stereo reverb. No drums, plucks or bells |
| Harmony | Dmaj9 → Bm9 (3) → Gmaj7#11 (7) → Em9 (10.5) → A13sus (14) → A7 (15.5) → breath (16.5) → Dadd9 (17); chords change exactly on the cuts |
| Motif | lead: D5 F#5 A5 E5 at the hook, D5 F#5 A5 D6 on the end card |
| Mix | swell into each cut; music ducked 4 dB under the voice with a 1.2–3.8 kHz carve; −14 LUFS integrated |

## Build

```
npm i @napi-rs/canvas
pip install kokoro-onnx soundfile scipy numpy fonttools
# fonts/  SG-Bold.ttf SG-Med.ttf JB-Med.ttf JB-Bold.ttf  (static instances of Space Grotesk / JetBrains Mono)
# models/ kokoro-v1.0.int8.onnx voices-v1.0.bin
python3 vo.py && python3 mix.py && node film.mjs video.mp4
ffmpeg -i video.mp4 -i soundtrack.wav -map 0:v -map 1:a -c:v copy \
  -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 160k -shortest -movflags +faststart q-motion-reel-20s.mp4
```

`node film.mjs still 3.1 10.5 17.3` renders single frames to `stills/` for review.

## Out of scope

Performance claims, comparisons with other tools, any third-party logos.
