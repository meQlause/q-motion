---
name: generate
description: Build a short animated launch, explainer or data-story MP4 entirely in code, in a style the user brings (a reference image, brand kit, or agreed treatment), with sourced stats, a narration that leads, and a few restrained sound effects (no music). Walks a three-step intake — narration versions first, then style anchor, then output size — before any code. No AI image or video generation; every frame is a pure function of time. Use for "make a launch video", "animate this data", "q-motion generate spec.md", or turning a storyboard into an MP4.
---

# Code-animated video

Build the video as a program: one scene description plus a clock. Every frame is
`frame(t)`, a pure function of time, so all frames stay coherent automatically.
No AI image or video generation.

The goal is a piece that feels **designed and continuous**: one line of motion
that changes shape, narrated in plain words, with sound only where
something big lands. Not a slideshow with fades, not a music bed, not an
ad-copy voiceover.

## The team

Three specialist agents ship with this plugin. Hand each its part of the
work through the Agent tool, give it the spec and whatever the earlier
agents produced, and hold its output to its own checklist. Do not write
their part yourself from scratch — their files hold the craft rules.

| Agent | Owns | Called in |
|---|---|---|
| `q-motion:narration-writer` | The three narration versions, the per-scene split, the landing words, the verbal motif | §0.1, §1 |
| `q-motion:motion-director` | The through-line, energy curve, **transition map**, entrance/exit vocabulary, the visual motif, contact-sheet and boundary-strip review | §1, §6 |
| `q-motion:sound-designer` | Which few moments get a sound, one distinct single-gesture sound for each, `mix.py`, the final mix — under the sound rules in §8 | §1, §8 |

**They make one film, not three tracks.** All three work on a single shared
**beat sheet** (`references/beat-sheet.md` → `beats.json` in the project):
one list of moments, each saying what the words, the picture and the sound
do at that instant and which of the three leads it. Its five rules are what
keep the crafts coherent:

1. **One lead per beat** — the other two support it; only the money shot
   stacks all three.
2. **One energy curve** — voice and motion build and breathe together; sound
   marks only the peaks.
3. **Carriers in more than one language** — a cut holds something in the
   picture and, ideally, a picked-up word too.
4. **Breaths line up** — the pause before the money shot is one silence in
   all three.
5. **One motif** — a shape and a phrase, stated together at the hook and
   resolved together on the end card.

Order: **words → picture → sound → coherence pass.** The narration sets the
timing, the motion director designs the cuts around it, the sound
designer marks the few moments that get a sound, and then each agent reads
the whole sheet and files requests for anything that breaks a rule. Changes to another agent's field always go
back to that agent as a request (`REQUEST → motion-director: …`); nobody
patches someone else's work silently. The sheet is frozen before any scene
code is written.

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

Have `q-motion:narration-writer` draft **three complete narration
versions** as plain paragraphs, in plain spoken language a non-native
listener follows on first hearing, with no marketing filler. Each is
one continuous piece of copy a voiceover would read start to finish. **No
timestamps, no scene labels, no `[music swells]` cues** — just the words.
Vary the angle across the three:

1. **Product-first** — what it is, what it does, why it matters.
2. **User-first** — the moment before, the moment after; the feeling the
   product resolves.
3. **Data-first** — a number the user cares about, and how the product
   changes it. Skip this variant only when the user has no sourced numbers
   to name.

Print all three side by side with the writer's stats table under each
(words, read time, longest sentence, numbers named); the user picks one, or asks for a fourth in
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
- Voice — gender/accent, or no narration. **Detect the language from the
  narration text picked in §0.1** — Indonesian ("Halo, jadwal lapangan…")
  routes to Piper (`id_ID-fajri-medium` male by default; `facebook/mms-tts-ind`
  when a female voice is requested); English routes to Kokoro (`af_heart`
  female, `am_michael` calm male, `bm_george` British male by default).
  Confirm the detected language with the user before generating — a
  mismatched engine speaks the words but pronounces them as if they were
  the other language ("Halo" spoken with English phonemes is not what
  anyone wants). Both engines share the audio pipeline in §8; the only
  difference is which loader is called.

Confirm the storyboard table before writing any code. Re-rendering is
cheap; re-recording a narration track to fit a scene you have already
built is not.

## 1. Plan before code

- One unifying visual idea (e.g. everything lives on one giant page, revealed at the end)
- Storyboard table: scene, start to end seconds, what moves, which stat, camera move, sound
- Pacing for 30 s: hook 0 to 2.5 s, title by 5 s, 3 sections of 3 to 6 s, rapid
  stat cards (about 0.4 s each), end card for the last 2.5 s. For 10 s: two scenes
  of about 5 s each. For 60 s: hook, then 4 to 6 sections of 8 to 10 s, end card 3 s
- **Narration split.** `q-motion:narration-writer` splits the chosen text
  into one line per scene and marks the word each scene's picture must
  land on.
- **Transition map.** `q-motion:motion-director` designs every scene
  boundary before any drawing code: the **carrier** (what survives the cut
  and becomes part of the next scene), the technique (shape match,
  element hand-off, camera through, continuous pan, content mask, match cut,
  colour carry, hard cut), its length in frames (6–12 at 30 fps),
  motion direction, and whether its landing is a sound candidate. A
  boundary with no carrier is not designed yet. A plain crossfade between unrelated scenes is
  not a transition.
- **Beat sheet.** The writer's landing words and the director's cuts go
  into `beats.json` (`references/beat-sheet.md`); the sound designer adds
  the few sounds (every other beat is `(silent)`), then all three run the
  coherence pass until no requests are open.
- Record it all in the spec (`references/spec-template.md` has the tables)
  and confirm it with the user alongside the storyboard.

## 2. Stack and setup

```
npm i @napi-rs/canvas roughjs          # canvas drawing; roughjs only if the chosen treatment uses sketched or wobbling strokes
pip install fonttools soundfile scipy numpy
pip install kokoro-onnx                # English narration engine
pip install piper-tts                  # Indonesian (and other non-English) narration engine
```

`ffmpeg` must be on `PATH`. Check all four (npm deps, both TTS engines,
ffmpeg) before planning a long render — finding out after building 1800
frames is an avoidable afternoon. Install **only the TTS engine the chosen
narration language actually needs**; if the narration is English-only, skip
the `piper-tts` line, and vice versa.

- Fonts: TTFs from `raw.githubusercontent.com/google/fonts/main/ofl/<family>/`.
  Make static weights from variable fonts:
  `fonttools varLib.instancer Font[wght].ttf wght=500 -o Font-Med.ttf`.
  Register with `GlobalFonts.registerFromPath`.
- **English voice (Kokoro):** `kokoro-v1.0.int8.onnx` and `voices-v1.0.bin`
  from `github.com/thewh1teagle/kokoro-onnx/releases` (model-files-v1.0).
  Voices: `af_heart` (warm female), `am_michael` (calm male),
  `bm_george` (British male).
- **Indonesian voice (Piper):** ONNX model + config from
  `huggingface.co/rhasspy/piper-voices/tree/main/id/id_ID`. Voices:
  `id_ID-fajri-medium` (male, warm). Grab both files:

  ```
  curl -L -O https://huggingface.co/rhasspy/piper-voices/resolve/main/id/id_ID/fajri/medium/id_ID-fajri-medium.onnx
  curl -L -O https://huggingface.co/rhasspy/piper-voices/resolve/main/id/id_ID/fajri/medium/id_ID-fajri-medium.onnx.json
  ```

  For a second voice or a female choice, `facebook/mms-tts-ind` on
  HuggingFace via `transformers.VitsModel` is the drop-in fallback; ships
  as one small model and needs no separate `.json`.

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
- For simple two-scene pieces, skip the world canvas — but still carry
  something across: keep one element on screen while the scene rebuilds
  around it, or grow a shape from scene one into the mask for scene two.
  Alpha crossfade only when both scenes share layout (same positions,
  different data)
- **Overlap scenes.** Let scene N+1's first element start 3–6 frames before
  scene N's last one settles; `panel` time ranges overlap across a
  boundary instead of butting end to start
- **Motion blur for free.** Frames are pure, so average `frame(t)` at 4–8
  sub-times inside a 180° shutter on fast camera moves and transition
  frames (see the motion director's §4)

See `references/examples/handdrawn-film.mjs` for the full world-canvas pattern and
`references/examples/glow.mjs` for the simpler two-scene one.

## 4. Style implementation — techniques that survive any look

The style itself came from §0.2 (a reference, or a treatment the user
picked). This section names the reusable building blocks, not a look:
pull only the ones the chosen style calls for. Anything the style anchor
does not contain — default glow, particle dust, purple gradients,
scale-up fade-ins on every element, everything centered — is off the
table; the motion director's §5 has the full banned list.

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
  Speed lines when camera velocity exceeds about 40 px per frame (sketch
  styles; otherwise use motion blur)
- Arrivals ease-out expo/quint, departures ease-in, camera moves an
  asymmetric in-out. Never linear for anything that starts or stops
- **Velocity continuity.** A camera move or object that carries through a
  cut is one eased curve split at the cut, not two eases that each stop
  at zero speed — a stop on the cut is what makes it feel like a slide
  change
- Stagger siblings 2–4 frames apart; text holds at least
  `0.4 s + words / 3.5` after it arrives

## 6. QA before the full render

- Add a `still` mode that renders chosen times to PNG; stitch them into a contact
  sheet (Pillow) and **look at it**
- Check overlaps (labels vs lines), contrast (text on bars), text leaving the frame,
  wrong numbers
- **Boundary strips.** A contact sheet cannot show a transition. For each
  boundary, render frames at cut −6, −3, 0, +3, +6 into one strip. Frame 0
  must look like a designed frame, not two slides blended; a carrier must be
  visible in every frame; nothing empty for more than 2 frames
- Hand the contact sheet and strips to `q-motion:motion-director` for
  review; apply its frame-level fixes
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

- **Narration engine, routed by language** (see §0.4):

  ```python
  # narration.py — one loader function, two engines
  def synth(line: str, out_wav: str, lang: str, voice: str) -> None:
      if lang == 'en':
          from kokoro_onnx import Kokoro
          k = Kokoro('kokoro-v1.0.int8.onnx', 'voices-v1.0.bin')
          samples, sr = k.create(line, voice=voice, speed=1.15, lang='en-us')
      elif lang == 'id':
          from piper import PiperVoice
          v = PiperVoice.load(f'{voice}.onnx')  # e.g. 'id_ID-fajri-medium'
          with open(out_wav, 'wb') as f:
              v.synthesize(line, f, length_scale=0.87)  # ~1.15x speed
          return
      else:
          raise ValueError(f'no engine configured for lang={lang!r}')
      import soundfile as sf
      sf.write(out_wav, samples, sr)
  ```

  Never call both engines on the same line. Never let one engine speak a
  language it does not know — the result is real audio of pretend words.
- **Narration timing:** one TTS clip per line. Print each clip's start,
  end and duration; shorten words or move start times until no lines overlap
  and each sits inside its scene.
- **Sound rules** — owned by `q-motion:sound-designer`
  (`agents/sound-designer.md` has the full rules and building blocks). The
  narration leads; sound design is restraint:
  - **Banned:** music of any kind (beds, pads, scores, drones, stingers);
    wind / air / whoosh / swoosh / risers; thumps, booms, impacts, hits;
    repeated or reused sounds (per-character typing clicks, counter ticks,
    multi-click patterns, one generator used for several moments); bells,
    chimes, "ting".
  - **Only the big moments** — a scene change where something lands, and
    the end card. About five sounds in 20 s, five to seven in 30 s, at most
    ten in 60 s. Everything else is silent.
  - **One gesture each, a different material each** (metal, wood, plastic,
    water, paper…), chosen for what the moment means in the film's own
    subject — e.g. a camera shutter as the first frame appears, a keycap
    bottoming out as the cursor lands.
  - **Quiet and exact:** about 10 dB under the voice peak, never on a
    landing word, within one frame of the picture event; the breath before
    the end card is silent; one short shared room reverb.
  - If the user asks for music, say it is outside q-motion's sound rules
    and can be laid in an editor afterwards.
- **Mix:** voice centre and untouched (no bed, so no ducking), effects
  placed and panned toward where their element lands, soft-clip with
  `tanh`, normalise peak to 0.89, then loudness-normalise the mux to about
  -14 LUFS for social, -16 LUFS for web (`loudnorm=I=-14:TP=-1:LRA=11`,
  check with `ffmpeg -af ebur128`). Print every effect's distance to its
  picture event in frames; anything over one frame is a bug
- **Sync check** before the mux: for every beat in `beats.json`, compare the
  planned time with the real cut frame, the real start of the landing word
  and the real effect onset (method in `references/beat-sheet.md` §4). Print
  the table; any cut or accent more than one frame out, or a landing word
  more than three frames out, goes back to its owner
- **Mux** without re-encoding video:

```
ffmpeg -i video.mp4 -i soundtrack.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart final.mp4
```

Working audio scripts: `promo/reel-20s/mix.py` is the reference for the
current sound rules (narration plus five single, distinct effects). The
two `vo.py` narration generators in `references/examples/` show the TTS
side (English via Kokoro; for Indonesian, swap the loader for the Piper
block in the routing snippet above). `references/examples/handdrawn-mix.py`
and `mix10.py` predate the sound rules — read them only for the pipeline
(placing clips, stereo, normalising), never for their music or effects.

## 9. Honesty and brand rules

- Every on-screen number traces to a source or to data the user supplied. If what a
  metric measures is unknown, the narration must not name it
- Use only logos, mascots and fonts the user owns or that are openly licensed;
  otherwise use original designs and close open fonts, and say so
- If it imitates another company's branding, add an "unofficial" line on the end card

## 10. Deliver

Send the MP4 with resolution, fps, length and file size. List sources. Offer the
project as a zip for editing.
