---
name: generate
description: Build a short animated launch, explainer or data-story MP4 entirely in code — hand-drawn or glowing-glass style — from a markdown video spec, with sourced stats, voiceover, music and sound effects. No AI image or video generation; every frame is a pure function of time. Use for "make a launch video", "animate this data", "q-motion generate spec.md", or turning a storyboard into an MP4.
---

# Code-animated video

Build the video as a program: one scene description plus a clock. Every frame is
`frame(t)`, a pure function of time, so all frames stay coherent automatically.
No AI image or video generation.

---

## 0. The spec

If the user named a markdown file, **read it first** — it is the brief. See
`references/spec-template.md` for the format and write one with the user if they
have no spec yet.

Ask only for what the spec does not already settle:

- Topic or product, one-line message
- The numbers to show, each with a source (or the user's own images or data).
  Label customer or third-party claims as such
- Style: hand-drawn sketch, glowing glass on dark (§4b), or a reference image to match
- Brand: colours (hex), fonts (licensed files, or open substitutes), logo files the user owns
- Hero character, if any (the user's own, or an original one; never a third-party mascot or logo)
- Length, aspect ratio (default 16:9, 1920x1080, 30 fps), target file size
- Voice: gender/accent, or no narration

Confirm the storyboard table before writing any code. Re-rendering is cheap;
re-recording a narration track to fit a scene you have already built is not.

## 1. Plan before code

- One unifying visual idea (e.g. everything lives on one giant page, revealed at the end)
- Storyboard table: scene, start to end seconds, what moves, which stat, camera move, sound
- Pacing for 30 s: hook 0 to 2.5 s, title by 5 s, 3 sections of 3 to 6 s, rapid
  stat cards (about 0.4 s each), end card for the last 2.5 s. For 10 s: two scenes
  of about 5 s each. For 60 s: hook, then 4 to 6 sections of 8 to 10 s, end card 3 s

## 2. Stack and setup

```
npm i @napi-rs/canvas roughjs          # canvas drawing + sketchy lines (roughjs only for hand-drawn)
pip install fonttools kokoro-onnx soundfile scipy numpy
```

`ffmpeg` must be on `PATH`. Check all three before planning a long render —
finding out after building 1800 frames is an avoidable afternoon.

- Fonts: TTFs from `raw.githubusercontent.com/google/fonts/main/ofl/<family>/`.
  Make static weights from variable fonts:
  `fonttools varLib.instancer Font[wght].ttf wght=500 -o Font-Med.ttf`.
  Register with `GlobalFonts.registerFromPath`
- Voice (Kokoro): `kokoro-v1.0.int8.onnx` and `voices-v1.0.bin` from
  `github.com/thewh1teagle/kokoro-onnx/releases` (model-files-v1.0).
  Voices: `af_heart` (warm female), `am_michael` (calm male), `bm_george`
  (British male). English only

## 3. Architecture (one script)

- Scenes are panels on one big world canvas (e.g. 1920x1080 each).
  `panel(name, x, y, t0, t1, draw)`; `draw(lt)` gets `lt = clamp(t - t0, 0, t1 - t0)`,
  so unseen panels hold their first or final state
- Reusable object functions: hero, text, bars, stamp, confetti, cards. Scenes call
  them with settings
- Camera keyframes `[t, x, y, zoom, rotation, ease]`: interpolate between the last
  key at or before `t` and the next; an ease of `'cut'` means hold (hard cut).
  Interpolate zoom in log space
- Screen shake: `[time, amplitude]` impulses,
  `offset = sum(amp * exp(-9*dt) * sin(fast))`
- For simple two-scene pieces, skip the world canvas: crossfade scenes with alpha
  plus a small lateral slide and zoom

See `references/examples/handdrawn-film.mjs` for the full world-canvas pattern and
`references/examples/glow.mjs` for the simpler two-scene one.

## 4a. Hand-drawn style

- Deterministic randomness: FNV hash of a string id; **never `Math.random`**
- Boil: roughjs `seed = hash(id) + floor(t*12) * 7919`, so lines re-wobble 12 times a second
- Text jitters ±1 px per boil step; reveal left to right with a growing clip rect
- Draw-on lines: take the first `p` fraction of a point list and pass it to `rc.curve`
- Sprite hero: a letter grid (e.g. 14x13) mapped to colours; time rules for blink,
  run cycle, scarf flutter; stick arms as rough lines at pose angles; pixel assembly
  with per-pixel delay and back easing

## 4b. Glowing glass on dark style

- Background: near-black green (`#010805`) plus large soft radial gradients
  (top-left and top-right light), a floor glow, a vignette, a few slow drifting dust dots
- Glass bar: rounded-top path; vertical gradient light mint (top) to mid green to
  dark translucent (bottom); `shadowBlur` about 46 in green for the outer glow;
  left-edge white and right-edge dark horizontal gradient for depth; 2 px bright rim;
  a glowing baseline strip; a faded reflection below the floor line
- Light sweep: a diagonal white gradient band clipped to the bar, moving across over about 0.9 s
- Text: bold geometric sans (DM Sans Bold). Big numbers with a vertical gradient fill
  and a soft green shadow glow. Numbers on bright bars use white to pale mint for
  contrast. Letter-spaced captions whose spacing tightens as they fade in
- Motion: bars grow with ease-out-quint, staggered about 0.2 s; values count up with
  the bar; bar height proportional to the real value
- Encode with `-x264-params aq-mode=3` to limit banding in dark gradients

## 5. Common motion math

- `seg(t,a,b) = clamp((t-a)/(b-a))`, `lerp`, ease-out cubic/quint, in-out cubic,
  back (overshoot), elastic for needles and pops
- Counters: `value * ease(seg(...))`. Stamps: scale 2.6 to 1 plus a shake.
  Speed lines when camera velocity exceeds about 40 px per frame

## 6. QA before the full render

- Add a `still` mode that renders chosen times to PNG; stitch them into a contact
  sheet (Pillow) and **look at it**
- Check overlaps (labels vs lines), contrast (text on bars), text leaving the frame,
  wrong numbers
- Fix, then re-check only the affected frames

> Rendering 1800 frames to discover a label sits outside the frame costs an hour.
> The contact sheet costs twenty seconds.

## 7. Render and compress

- Loop over frames: `frame(i/FPS)`, `getImageData`, write RGBA to ffmpeg stdin
  (respect `'drain'`)

```
ffmpeg -f rawvideo -pix_fmt rgba -s 1920x1080 -r 30 -i - \
  -c:v libx264 -preset slow -tune animation -crf 22..24 \
  -pix_fmt yuv420p -movflags +faststart out.mp4
```

- To shrink: re-encode with `-preset veryslow -crf 28..29`, then extract frames from
  the result to confirm sharpness

## 8. Audio

- **Narration:** one TTS clip per line (speed about 1.15). Print each clip's start,
  end and duration; shorten words or move start times until no lines overlap and each
  sits inside its scene
- **Music** (synthesised, copyright-free). Upbeat: 4-chord pad, 8th-note arpeggio,
  kick (pitch-drop sine) and hats (band-passed noise). Dark or cinematic: detuned
  minor pad through a low-pass, sub-bass heartbeat pulse, faint high shimmer ticks
- **SFX recipes:** whoosh or riser = noise through a sweeping band-pass; hit or thump
  = pitch-drop sine + low-passed noise; pop = fast chirp; tick = 30 ms sine; glass or
  bell = sine + upper partials with decay; scratch = band-passed noise with 9 Hz
  modulation. Place each on the exact scene event times
- **Mix:** duck music to about 45 to 50% while the voice is active (smoothed envelope),
  soft-clip with `tanh`, fade out 0.5 s, normalise peak to 0.89. Target about
  -16 LUFS (`ffmpeg -af ebur128`)
- **Mux** without re-encoding video:

```
ffmpeg -i video.mp4 -i soundtrack.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart final.mp4
```

Working audio scripts: `references/examples/handdrawn-mix.py` (music bed, SFX and
narration synced to a 30 s film), `references/examples/mix10.py` (dark cinematic bed
for a 10 s data piece), and the two `vo.py` narration generators.

## 9. Honesty and brand rules

- Every on-screen number traces to a source or to data the user supplied. If what a
  metric measures is unknown, the narration must not name it
- Use only logos, mascots and fonts the user owns or that are openly licensed;
  otherwise use original designs and close open fonts, and say so
- If it imitates another company's branding, add an "unofficial" line on the end card

## 10. Deliver

Send the MP4 with resolution, fps, length and file size. List sources. Offer the
project as a zip for editing.
