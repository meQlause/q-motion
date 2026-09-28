# The beat sheet — one timeline, three crafts

The narration writer, the motion director and the music composer do not work
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
    "words":   "one page",
    "music":   "D – F# – A – E (rising, unresolved until the end card)"
  },
  "tempo": { "bpm": 112, "offset": 0.08 },
  "energy": [[0, 2], [5, 3], [9, 4], [11.2, 5], [14, 3], [27, 2]],
  "beats": [
    {
      "id": "hook",        "t": 0.00, "kind": "start",   "lead": "picture",
      "words": "(silent)",  "picture": "ink dot lands on blank page",
      "sound": "single felt note, motif note 1",          "carrier": null
    },
    {
      "id": "title",       "t": 2.40, "kind": "cut",     "lead": "words",
      "words": "lands on 'page'",
      "picture": "dot becomes the full stop of the title",
      "sound": "riser ends on cut, pad enters",
      "carrier": { "picture": "ink dot", "sound": "felt note sustains through the cut" }
    },
    {
      "id": "reveal-42",   "t": 11.77, "kind": "accent", "lead": "picture",
      "words": "silent for 0.6 s, then 'almost half'",
      "picture": "camera pushes into the bar; 42% lands",
      "sound": "one-beat gap, full band on the downbeat", "carrier": null
    }
  ]
}
```

| Field | Owner | Meaning |
|---|---|---|
| `idea`, `energy` | motion director (agreed with all three) | The unifying visual idea and the shared intensity curve, 1 (calm) → 5 (peak) |
| `motif` | one entry per craft | The same idea in three languages: a shape, a phrase and a melody |
| `tempo` | music composer | The beat grid, fitted to the beats |
| `t` of a `cut` | motion director | The cut frame. The composer may **request** a move to land it on the grid |
| `t` of an `accent` | whoever leads it | A moment inside a scene: a reveal, a number landing, a stamp |
| `words` | narration writer | The landing word, or `(silent)` and for how long |
| `picture`, `carrier.picture` | motion director | What the eye sees and what survives the cut |
| `sound`, `carrier.sound` | music composer | The musical device and the sound that bridges the cut |
| `lead` | agreed per beat | Which craft carries this moment (see §2) |

`kind` is one of `start`, `cut` (a scene boundary), `accent` (a moment
inside a scene), `breath` (a planned pause) or `button` (the final frame).

## 2. The five coherence rules

**1. One lead per beat.** Every beat names the craft that carries it. The
other two support it; they do not compete with it.

| Lead | Words | Picture | Music |
|---|---|---|---|
| `words` | The key word lands here | Holds or moves slowly; the key word or number is on screen | Ducks and leaves the voice band open; no new melodic idea |
| `picture` | Silent, or finishes the sentence just before the beat | The big move, the reveal | Supports with a hit, riser or gap timed to the frame |
| `music` | Silent | Moves in the music's rhythm (cuts, staggers on the grid) | Is the main event: a drop, a motif statement, the button |

Only the money shot may stack all three at full strength, and only once.

**2. One energy curve.** All three read the same `energy` list. At level 5
the picture has the fastest transitions, the music has its fullest
arrangement and the narration has its shortest, strongest sentence. At
level 1–2 all three breathe together: slower moves, sparse music, longer
pauses between lines. A calm voice over a frantic picture is incoherent.

**3. Carriers in more than one language.** Every `cut` has a visual carrier
(the motion director's rule). The best cuts also carry across in sound (a
note that holds through the cut) or in words (the next line picks up the
word the last line ended on). A cut that changes picture, harmony and topic
all at once, with nothing held, is a slide change, however well animated.

**4. Breaths line up.** When the voice pauses, the picture holds or makes one
clean move, and the music fills the space or lets it stay empty on purpose.
The silence before the money shot is **one** silence: the voice stops, the
music gaps and the picture winds up, all at once.

**5. One motif, stated and resolved together.** The `motif` is the same idea
in three forms. The hook states all three (the dot appears, the phrase is
said, the melody plays unresolved). The end card resolves all three at once
(the dot completes the picture, the phrase comes back, the melody resolves on
the button). This is what makes a short film feel written rather than
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
3. **Music composer** — fits `tempo` to the cuts and accents, fills `sound`
   and `carrier.sound` on every beat and sets the musical half of the motif.
   Beats that miss the grid by more than one frame go back to their owner as
   move requests.
4. **Coherence pass** — each agent reads the whole sheet, not just its own
   fields, and checks the five rules. Every conflict is written as a request
   to the owner of that field:

   ```
   REQUEST → motion-director: beat "title" t 2.40 → 2.46 (lands on the beat at 112 bpm)
   REQUEST → narration-writer: beat "reveal-42" — end the sentence 0.6 s before; picture leads
   ```

   The owner accepts or refuses with a reason. Repeat until there are no
   open requests; then the sheet is frozen and code starts.

## 4. Proving it — the sync check

After the render and the mix, check every beat against what actually came
out, not against the plan:

| Beat | Planned t | Cut frame | Word start | Music hit | Worst miss |
|---|---|---|---|---|---|
| title | 2.46 | 2.467 | 2.43 | 2.46 | 1 frame |

- **Cut frame** — from the panel and camera keyframes in the scene code.
- **Word start** — synthesise the line up to (but not including) the
  landing word, trim its trailing silence, and add its length to the
  clip's start time. That estimate is good to a frame or two.
- **Music hit** — from the composer's hit report.

Anything off by more than one frame for a `cut` or `accent`, or a landing
word more than three frames away from its beat, goes back to the owner.
