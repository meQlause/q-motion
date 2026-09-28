# The beat sheet — one timeline, three crafts

The narration writer, the motion director and the sound designer do not work
on three tracks that happen to share a length. They work on **one list of
moments**. Each moment is something the viewer should feel, and each craft
says how it delivers that moment. That list is the beat sheet.

It lives in the project as `beats.json` (the source of truth scripts read)
and is mirrored as the **Beats** table in the spec for the user to read.

If a moment is not in the beat sheet, no craft may accent it. If it is in the
beat sheet, all three crafts know about it.

---

## 1. Format

```json
{
  "fps": 30,
  "idea": "everything lives on one notebook page, revealed at the end",
  "motif": {
    "picture": "the ink dot",
    "words":   "one page"
  },
  "energy": [[0, 2], [5, 3], [9, 4], [11.2, 5], [14, 3], [27, 2]],
  "beats": [
    {
      "id": "hook",        "t": 0.00, "kind": "start",   "lead": "picture",
      "words": "(silent)",  "picture": "ink dot lands on blank page",
      "sound": "(silent)",                                "carrier": null
    },
    {
      "id": "title",       "t": 2.40, "kind": "cut",     "lead": "words",
      "words": "lands on 'page'",
      "picture": "dot becomes the full stop of the title",
      "sound": "(silent) - the voice carries this cut",
      "carrier": { "picture": "ink dot", "words": "'page' picked up by the next line" }
    },
    {
      "id": "reveal-42",   "t": 11.77, "kind": "accent", "lead": "picture",
      "words": "silent for 0.6 s, then 'almost half'",
      "picture": "camera pushes into the bar; 42% lands",
      "sound": "nib touching paper as the bar lands (paper, 90 ms)", "carrier": null
    }
  ]
}
```

| Field | Owner | Meaning |
|---|---|---|
| `idea`, `energy` | motion director (agreed with all three) | The unifying visual idea and the shared intensity curve, 1 (calm) → 5 (peak) |
| `motif` | writer + director | The same idea in two languages: a shape and a phrase |
| `t` of a `cut` | motion director | The cut frame. The sound designer may **request** a move off a landing word |
| `t` of an `accent` | whoever leads it | A moment inside a scene: a reveal, a number landing, a stamp |
| `words` | narration writer | The landing word, or `(silent)` and for how long |
| `picture`, `carrier.picture` | motion director | What the eye sees and what survives the cut |
| `sound` | sound designer | The one sound on this beat, or `(silent)` — most beats are silent (rules in `agents/sound-designer.md`) |
| `lead` | agreed per beat | Which craft carries this moment (see §2) |

`kind` is one of `start`, `cut` (a scene boundary), `accent` (a moment
inside a scene), `breath` (a planned pause) or `button` (the final frame).

## 2. The five coherence rules

**1. One lead per beat.** Every beat names the craft that carries it. The
other two support it; they do not compete with it.

| Lead | Words | Picture | Sound |
|---|---|---|---|
| `words` | The key word lands here | Holds or moves slowly; the key word or number is on screen | Silent |
| `picture` | Silent, or finishes the sentence just before the beat | The big move, the reveal | At most one short sound on the frame the element lands, if the beat is a big moment |

Sound never leads a beat. There is no music to lead one.

**2. One energy curve.** All three read the same `energy` list. At level 5
the picture has the fastest transitions and the narration has its
shortest, strongest sentence. At level 1–2 they breathe together: slower
moves, longer pauses between lines. Sound does not follow the curve up —
it only marks the few landings, at the same quiet level throughout. A calm voice over a frantic picture is incoherent.

**3. Carriers in more than one language.** Every `cut` has a visual carrier
(the motion director's rule). The best cuts also carry across in words (the
next line picks up the word the last line ended on). A cut that changes
picture and topic
all at once, with nothing held, is a slide change, however well animated.

**4. Breaths line up.** When the voice pauses, the picture holds or makes one
clean move, and there is no sound. The silence before the money shot (or
the end card) is **one** silence: the voice stops, nothing is heard, and
the picture winds up, all at once.

**5. One motif, stated and resolved together.** The `motif` is the same idea
in two forms. The hook states both (the dot appears, the phrase is said).
The end card resolves both at once (the dot completes the picture, the
phrase comes back). A sound may mark the resolution, once. This is what makes a short film feel written rather than
assembled.

## 3. Building it — words, then picture, then sound, then one pass together

1. **Narration writer** — after the user picks a version, splits it into
   scene lines and adds a beat for each landing word, with `lead: words`
   where the words must carry the moment. Proposes the verbal half of the
   motif.
2. **Motion director** — sets `idea`, `energy` and every `cut`, adds
   `picture` accents, fills `picture` and `carrier.picture` on every beat,
   and marks the beats the picture should lead. Proposes the visual half of
   the motif.
3. **Sound designer** — picks the few big landings that get a sound (about
   five in 20 s), writes one distinct sound into each of those beats'
   `sound`, and `(silent)` into every other beat. A landing that sits on a
   key word goes back to its owner as a move request.
4. **Coherence pass** — each agent reads the whole sheet, not just its own
   fields, and checks the five rules. Every conflict is written as a request
   to the owner of that field:

   ```
   REQUEST → motion-director: beat "reveal-42" t 11.77 → 11.60 (bar lands on the word 'half'; land it in the gap before)
   REQUEST → narration-writer: beat "reveal-42" — end the sentence 0.6 s before; picture leads
   ```

   The owner accepts or refuses with a reason. Repeat until there are no
   open requests; then the sheet is frozen and code starts.

## 4. Proving it — the sync check

After the render and the mix, check every beat against what actually came
out, not against the plan:

| Beat | Planned t | Cut frame | Word start | Effect onset | Worst miss |
|---|---|---|---|---|---|
| reveal-42 | 11.77 | 11.767 | 11.20 | 11.77 | 0 frames |

- **Cut frame** — from the panel and camera keyframes in the scene code.
- **Word start** — synthesise the line up to (but not including) the
  landing word, trim its trailing silence, and add its length to the
  clip's start time. That estimate is good to a frame or two.
- **Effect onset** — from the sound designer's check report (`—` for silent beats).

Anything off by more than one frame for a `cut` or `accent`, or a landing
word more than three frames away from its beat, goes back to the owner.
