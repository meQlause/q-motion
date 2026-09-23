---
name: generate
description: Build a short animated launch, explainer or data-story MP4 entirely in code, in a style the user brings (a reference image, brand kit, or agreed treatment), with sourced stats, voiceover, music and sound effects. Walks a three-step intake — narration versions first, then style anchor, then output size — before any code. No AI image or video generation; every frame is a pure function of time. Use for "make a launch video", "animate this data", "q-motion generate spec.md", or turning a storyboard into an MP4.
---

# Code-animated video

Build the video as a program: one scene description plus a clock. Every frame is
`frame(t)`, a pure function of time, so all frames stay coherent automatically.
No AI image or video generation.

---

## 0. Intake — three decisions, in order

If the user handed you a completed markdown spec, **read it first** — it is
the brief and it settles most of this section. If they did not, walk the
three decisions below in order before any code or storyboard exists. Each
answer narrows the next.

See `references/spec-template.md` for the format the answers eventually
populate.

### 0.1 Narration — write it before you time it

Ask the user for the message: product, topic, feeling, punchline. Do **not**
ask for length, scene count or aspect ratio yet — those are downstream of
the narration.

Draft **three complete narration versions** as plain paragraphs. Each is
one continuous piece of copy a voiceover would read start to finish. **No
timestamps, no scene labels, no `[music swells]` cues** — just the words.
Vary the angle across the three:

1. **Product-first** — what it is, what it does, why it matters.
2. **User-first** — the moment before, the moment after; the feeling the
   product resolves.
3. **Data-first** — a number the user cares about, and how the product
   changes it. Skip this variant only when the user has no sourced numbers
   to name.

Print all three side by side; the user picks one, or asks for a fourth in
the same shape. Do not proceed until one is chosen. Save the chosen text
— it is the ground truth every later scene time is derived from.

### 0.2 Style — the user brings it

There are no default styles in this skill. Every video's look is anchored
by something the user supplies, not by a template picked for them.

Ask, in this order:

1. **"Do you have a style reference — a still, a screengrab of a video
   you like, a brand kit, an existing motion piece?"** If yes, ask them
   to paste it or point at the file. That reference is the style anchor:
   palette, stroke, texture, motion feel, type choice all come from it.
2. **"And do you have any keyframe references — specific pictures you
   want the video to hit at specific moments?"** Ask separately from the
   style question because the answers are different: the style reference
   is a *feel* that runs through every frame; a keyframe reference is a
   *specific shot* the animation lands on. Typical keyframes: the intro
   card, the money shot (the moment the product or number is fully
   revealed), the end card. If they have any, ask them to point at each
   file and label roughly when it should land ("this is the end card",
   "this is what it looks like at 2 seconds when the counter finishes").
   Treat those pictures as fixed targets — the animation is designed to
   arrive at them, not to reinvent them.
3. If no style reference, ask them to describe the feel in a few words
   — the words a designer would use ("warm and editorial", "clean and
   futuristic", "print poster", "80s CRT", "watercolour", "isometric").
   Then propose two or three distinct treatments in plain description
   (palette, typography, motion vocabulary, one sentence each) and let
   them pick one, ask for a fourth, or hand you a reference after
   seeing the options.
4. Only once the treatment (and any keyframe pictures) are agreed,
   translate them into the drawing primitives §3 will use (canvas
   commands, gradient recipes, roughjs settings if a sketchy look was
   chosen, deterministic-hash wobble if any). Keyframe references
   become fixed frames the storyboard is planned around: `panel(name,
   x, y, t0, t1, draw)` calls at those specific moments draw toward
   the target picture.

Never assume the palette. Never assume roughjs. Never assume dark. The
style is a decision, made explicitly with the user, recorded in the spec
before any drawing code exists.

### 0.3 Size — phone or desktop

One plain question, once:

> **Where will this play — phone (portrait, 1080×1920 at 9:16) or desktop
> (landscape, 1920×1080 at 16:9)?**

Both are 30 fps by default. If the user answers "both", pick the primary
placement now and note that the other is a re-render pass at the end.
"Make it responsive" is not free — title placement, chart aspect and hero
pose all differ between the two aspect ratios.

### 0.4 Everything else the spec still needs

With narration, style and size settled, ask only for what is still open:

- The numbers the narration names, **each with a source** (or the user's
  data). Label customer or third-party claims as such.
- Brand: hex colours, licensed fonts (or open substitutes), logo files
  the user owns.
- Hero character, if any (their own, or original; never a third-party
  mascot or logo).
- Length — often implied by the narration read-through time; confirm the
  target.
- Voice — gender/accent, or no narration.

Confirm the storyboard table before writing any code. Re-rendering is
cheap; re-recording a narration track to fit a scene you have already
built is not.

## 1. Plan before code

- One unifying visual idea (e.g. everything lives on one giant page, revealed at the end)
- Storyboard table: scene, start to end seconds, what moves, which stat, camera move, sound
- Pacing for 30 s: hook 0 to 2.5 s, title by 5 s, 3 sections of 3 to 6 s, rapid
  stat cards (about 0.4 s each), end card for the last 2.5 s. For 10 s: two scenes
  of about 5 s each. For 60 s: hook, then 4 to 6 sections of 8 to 10 s, end card 3 s

## 2. Stack and setup

```
npm i @napi-rs/canvas roughjs          # canvas drawing; roughjs only if the chosen treatment uses sketched or wobbling strokes
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

## 4. Style implementation — techniques that survive any look

The style itself came from §0.2 (a reference, or a treatment the user
picked). This section names the reusable building blocks, not a look:
pull only the ones the chosen style calls for.

- **Deterministic randomness.** FNV-1a hash of a string id; **never
  `Math.random`**. Wobble, jitter, sprite scatter, dust drift — anything
  "random" is `hash(id, floor(t * k))` so the same frame renders the
  same bytes every time. Required for any organic feel; irrelevant to a
  strictly geometric one.
- **Boil / re-wobble.** For sketched or painted looks, reseed the stroke
  library 12 times a second (`seed = hash(id) + floor(t * 12) * 7919`)
  so lines shimmer.
- **Text reveal.** Left-to-right with a growing clip rect, plus optional
  ±1 px jitter for sketch styles; simple opacity or letter-spacing tighten
  for clean styles.
- **Draw-on lines.** Take the first `p` fraction of a point list and
  pass to the stroke primitive of choice.
- **Depth on flat surfaces.** Radial gradients for lights, vertical
  gradients for glass or metal, `shadowBlur` for glow, a bright 1–2 px
  rim for edges, a faded reflection under the object for a floor.
- **Light sweep.** A diagonal white-gradient band clipped to the shape,
  moving across over roughly 0.8–1.0 s.
- **Sprite hero.** A letter grid (e.g. 14×13) mapped to colours; time
  rules for blink, walk cycle, cloth flutter; stick limbs as strokes at
  pose angles; per-pixel assembly with delay and back-ease.
- **Value-driven bars.** Height proportional to the real number; grow
  with ease-out-quint, staggered ~0.2 s; count the value up in step
  with the bar.
- **Dark-gradient banding.** Whenever the chosen palette leans very dark
  with soft radial lights, add `-x264-params aq-mode=3` to the encode
  in §7. Cheap insurance against posterisation.

The `references/examples/` folder holds two working scripts that use
different subsets of these techniques — read them for how the pieces
compose, not as prescriptions:

- `handdrawn-film.mjs` — world-canvas panels, camera keyframes, sprite hero, boiled strokes
- `glow.mjs` — two-scene crossfade, glass bars, light sweep, dark-gradient encode

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
