# Video spec format

The markdown file `/q-motion:generate` reads as its brief. Settle it before
writing code — re-rendering is cheap, re-recording narration to fit a scene you
already built is not.

Anything left out becomes a question. Anything wrong becomes a re-render.

---

## Template

```markdown
# <title> — video spec

| | |
|---|---|
| Message | <the one sentence the viewer should leave with> |
| Length | 60 s |
| Format | 1920x1080, 30 fps, 16:9 |
| Style | glowing glass on dark · hand-drawn sketch |
| Voice | af_heart · am_michael · bm_george · none |
| Target size | under 8 MB |

## Brand

| | |
|---|---|
| Colours | `#010805` background · `#7FE7B0` accent · `#FFFFFF` text |
| Fonts | DM Sans Bold (open) |
| Logo | `assets/logo.svg` — owned |

## Numbers

Every figure that appears on screen, with where it came from.

| Figure | Means | Source |
|---|---|---|
| 42% | share of X in Y | <url or "customer supplied"> |
| 3.2× | improvement over baseline | <url> |

## Storyboard

| # | Scene | t0 → t1 | What moves | Stat | Camera | Sound |
|---|---|---|---|---|---|---|
| 1 | Hook | 0 → 2.5 | logo assembles from pixels | — | push in | riser + hit |
| 2 | Title | 2.5 → 5 | title draws on left to right | — | hold | whoosh |
| 3 | ... | | | | | |
| n | End card | 57 → 60 | url fades up | — | pull back | bell |

## Narration

One line per scene, with the scene it must sit inside.

| Scene | Line |
|---|---|
| 1 | <spoken text> |
| 2 | <spoken text> |

## Out of scope

<what this video deliberately does not say or show>
```

---

## Rules

**One unifying visual idea.** Everything lives on one giant page revealed at the
end, or one character walks through each section, or one bar chart rebuilds
itself four times. Without it, a sequence of nice scenes still feels like a
slideshow.

**Every number has a source column.** If a figure has no source, it does not go
on screen. If what a metric measures is unknown, the narration must not name it.

**Narration is written to the scene, not the other way round.** A line that runs
long forces a scene to stretch, which breaks the pacing you already approved.
Count roughly 2.5 words per second at speed 1.15, then verify against the real
clip durations.

**Pacing targets.**

| Length | Shape |
|---|---|
| 10 s | two scenes, about 5 s each |
| 30 s | hook 0–2.5, title by 5, three sections of 3–6, rapid stat cards ~0.4 each, end card last 2.5 |
| 60 s | hook, then four to six sections of 8–10, end card 3 |

**Own what you show.** Logos, mascots and fonts must be the user's or openly
licensed. Otherwise use original designs and close open substitutes, and say so
on delivery. Anything imitating another company's branding carries an
"unofficial" line on the end card.
