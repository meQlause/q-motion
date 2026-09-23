# q-motion

A Claude Code plugin for building short animated videos **entirely in code**.

Write a markdown spec. Get an MP4 — hand-drawn or glowing glass, with synthesised
score, sound design and narration.

```
/q-motion:generate launch-video.md
```

---

## Why code, not generation

Every frame is `frame(t)` — a pure function of time. Nothing is generated frame
by frame, so nothing drifts between frames: a logo that lands at 2.4 s lands at
exactly 2.4 s, a counter that reads 42% reads 42%, and re-rendering after a note
changes only what you changed.

That also means the numbers on screen are the numbers you put in the spec. No
model invented them.

## Install

```
/plugin marketplace add meQlause/q-motion
/plugin install q-motion@q-motion
```

## Requirements

| | |
|---|---|
| `ffmpeg` | on `PATH` — the render pipeline and the mux |
| Node | `npm i @napi-rs/canvas roughjs` |
| Python | `pip install fonttools kokoro-onnx soundfile scipy numpy` |

`roughjs` is only needed for the hand-drawn style; the Python audio stack only if
you want music, sound design or narration. Check all three before planning a long
render — finding out after 1800 frames is an avoidable afternoon.

## The spec

`references/spec-template.md` defines the format: message, length, format, style,
brand, **every number with its source**, a storyboard table, and the narration
line per scene.

Settle it before writing code. Re-rendering is cheap; re-recording a narration
track to fit a scene you already built is not.

## Two styles

**Hand-drawn.** Roughjs strokes that re-wobble twelve times a second, text that
jitters ±1 px, lines that draw themselves on, a sprite hero assembled pixel by
pixel. Randomness is a hash of a string id, never `Math.random` — so the wobble
is identical on every re-render.

**Glowing glass on dark.** Near-black green, large soft radial lights, translucent
bars with a green outer glow and a bright rim, a diagonal light sweep, numbers
that count up as the bar grows. Encoded with `aq-mode=3` to stop the dark
gradients banding.

## What ships

```
skills/generate/SKILL.md       the method: plan, architecture, motion math, QA, render, audio
references/spec-template.md    the video spec format
references/examples/
  handdrawn-film.mjs           a full 30 s film — world canvas, camera keyframes, sprite hero
  glow.mjs                     a 10 s data piece — the simpler two-scene crossfade
  handdrawn-mix.py             music bed, SFX and narration synced to the film's timeline
  mix10.py                     dark cinematic bed and UI sound design
  handdrawn-vo.py  vo.py       narration generators
```

The examples are working scripts, not snippets — read `glow.mjs` first, it is the
whole pattern in 241 lines.

## Honesty rules

Every on-screen number traces to a source or to data you supplied. If what a
metric measures is unknown, the narration does not name it. Logos, mascots and
fonts must be yours or openly licensed. Anything imitating another company's
branding carries an "unofficial" line on the end card.

## Licence

MIT
