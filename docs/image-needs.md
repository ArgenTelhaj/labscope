# Image needs

LabScope's organ renders, and the rules a new one has to follow to sit correctly in the interface.
The visual identity these serve is [§9.1 of the product
vision](product-vision.md#91-visual-identity).

Nothing in the app depends on these files existing. A missing render falls back to a monogram in its
tinted well (`src/ui/PanelArt.tsx`), so a slug can be added to the match table before its picture
exists.

## Where they go

```
public/organs/<slug>.png
```

Referenced as `/organs/<slug>.png`. Add the file and it appears — there is no manifest to update
and no build step. A new *slug* needs one line in the `ART` table in
[`src/ui/PanelArt.tsx`](../src/ui/PanelArt.tsx), which is the only place a printed heading is
matched to a picture.

## Rendering spec

Everything below is what makes a render composite correctly, not just look nice in isolation.

- **Square, 1024×1024**, subject centred with generous breathing room — roughly 15% margin on every
  side. The well crops nothing, so a tight crop reads as cramped.
- **Cream background, `#f5ead8`.** Not white, not transparent. The app composites with
  `mix-blend-mode: multiply`, which drops the cream ground onto whatever tint the well is using; a
  white background will read as a pale box, and a transparent PNG will lose the soft cast shadow.
- **Warm studio lighting from the upper left**, one soft cast shadow falling lower-right onto the
  cream. Consistent across the set — a render lit from the other side is immediately obvious in a
  grid of three.
- **Painterly matte finish.** Semi-realistic, not clinical-textbook and not glossy. Terracotta and
  ochre body, sage accents for the connective structures — veins, ducts, bronchi, vessels.
- **No text, no labels, no scale bars, no pointers.** These are objects, not diagrams.
- **Anatomically plausible but not gory.** The audience is an anxious person checking their own
  results. Aim for "beautiful anatomical model on a shelf", not "specimen".
- **PNG**, 8-bit. The set in the repo lands at 140–330KB each after preparation. They are
  lazy-loaded but there can be a dozen on the results grid at once.

## Preparing a render for the repo

Generated renders come out as ~1MB 24-bit PNGs carrying fine film grain, which survives palette
reduction and roughly doubles the file size for detail no one sees — nothing here is displayed
above 320 CSS px. [`tools/pack-organs.py`](../tools/pack-organs.py) applies a radius-3 median and
an adaptive 128-colour palette, which halves the file without touching the painterly forms:

```
python3 tools/pack-organs.py <source.png> public/organs/<slug>.png …
```

It needs Pillow, which is not a project dependency — install it in a throwaway virtualenv.

## The set

All fourteen are in `public/organs/`.

| Slug | Subject | Used for |
| --- | --- | --- |
| `torso` | The full organ ensemble | Default: any heading that names no organ |
| `lungs` | Lungs with trachea and bronchi | Respiratory, blood gas |
| `thyroid` | Thyroid gland | Thyroid function, TSH, FT3/FT4 |
| `stomach` | Stomach with duodenum | Gastro, digestive, H. pylori |
| `kidneys` | Pair of kidneys | Renal, urea, creatinine, electrolytes |
| `liver` | Liver with gallbladder | Liver, hepatic, bilirubin, transaminases |
| `heart` | Heart | Lipids, cholesterol, cardiac markers |
| `pancreas` | Pancreas with duodenum | Glucose, HbA1c, amylase, lipase, diabetes panels |
| `blood` | Filled collection tubes | Haematology, CBC, ESR, coagulation |
| `chemistry` | A stoppered flask | Biochemistry, general profile, metabolic panel |
| `bone` | A vertebra in section | Calcium, phosphate, vitamin D, ALP, parathyroid |
| `immune` | A lymph node cluster | Immunology, allergy, autoantibodies |
| `urine` | A specimen container | Urinalysis — matched above `kidneys`, which it used to fall to |
| `empty-state` | The ensemble, sparse and quiet | The results screen with no reports at all |

`empty-state` is not keyword-matched: `MastheadArt` takes a `slug` prop for a screen that has no
heading to read, and the empty results screen passes it explicitly.

## Known deviations

- The seven organ renders (`torso`, `lungs`, `thyroid`, `stomach`, `kidneys`, `liver`, `heart`)
  sit on a background that is darker than the specified `#f5ead8` and carries a soft vignette —
  corners sample between `#d0be95` and `#ebe1c6`. Under `mix-blend-mode: multiply` this reads as a
  slightly darker, unevenly lit well than the seven object renders, which are within a shade of
  spec. Worth re-rendering or flattening the ground the next time the set is touched.

## Variants worth having later

Not needed for the current build; worth batching in whenever the next set is generated.

- **A "watching" variant of each organ.** The card that needs attention currently signals with a
  terracotta well tint and a 2px outline. A render lit slightly warmer, with a soft terracotta rim,
  would carry that without shouting — the tone is *attention*, never *alarm*, and it must never be
  the only signal (§9, principle 1).
- **A 2× set at 2048px** for the hero, which renders up to 320px and will look soft on a retina
  display at the current size.
- **Wide crops (16:9)** of `torso` for the eventual shareable one-pager PDF (§10).
