# q-motion

A Claude Code plugin for building short animated videos **entirely in code**.

Write a markdown spec. Get an MP4 in a style you supply — a reference image,
a brand kit, or an agreed treatment — with synthesised score, sound design
and narration.

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

`roughjs` is only needed when the agreed style uses sketched or wobbling
strokes; the Python audio stack only if you want music, sound design or
narration. Check all three before planning a long render — finding out
after 1800 frames is an avoidable afternoon.

## The spec

`references/spec-template.md` defines the format: message, length, format, style,
brand, **every number with its source**, a storyboard table, and the narration
line per scene.

Settle it before writing code. Re-rendering is cheap; re-recording a narration
track to fit a scene you already built is not.

## Style comes from you

There are no template looks in this plugin. Every video is anchored by
something you supply — a reference still, a brand kit, an existing motion
piece you want matched, or a treatment you describe and pick from three
options the skill proposes back.

The skill's job is to translate that anchor into the drawing primitives
listed in `skills/generate/SKILL.md` §4 (deterministic-hash wobble,
boiled strokes, gradient recipes, light sweeps, sprite grids, value-driven
bars, dark-gradient encode) — pulling only the pieces the chosen look
actually needs.

The `references/examples/` folder holds two working scripts that use
different subsets of those primitives — `handdrawn-film.mjs` (world
canvas, sprite hero, boiled strokes) and `glow.mjs` (glass bars,
light sweep, dark encode). Read them as patterns, not as styles to
pick from.

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
