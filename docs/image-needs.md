# Image needs

The shot list for LabScope's organ renders, and the rules a new one has to follow to sit correctly
in the interface. The visual identity these serve is [§9.1 of the product
vision](product-vision.md#91-visual-identity).

Nothing in the app depends on these files existing. A missing render falls back to a monogram in its
tinted well (`src/ui/PanelArt.tsx`), so the layout is complete today and gets better as files land.

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
- **PNG**, 8-bit, ideally under ~250KB after compression. They are lazy-loaded but there can be a
  dozen on the results grid at once.

## Already supplied

These came with the design direction and are exactly right as reference for everything below.

| Slug | Subject | Used for |
| --- | --- | --- |
| `torso` | The full organ ensemble | Default: any heading that names no organ, and the empty state |
| `lungs` | Lungs with trachea and bronchi | Respiratory, blood gas |
| `thyroid` | Thyroid gland | Thyroid function, TSH, FT3/FT4 |
| `stomach` | Stomach with duodenum | Gastro, digestive, H. pylori, pancreatic |
| `kidneys` | Pair of kidneys | Renal, urea, creatinine, electrolytes |
| `liver` | Liver with gallbladder | Liver, hepatic, bilirubin, transaminases |
| `heart` | Heart | Lipids, cholesterol, cardiac markers |

**These files are not in the repo yet.** They need saving to `public/organs/` at the slugs above
before any of them show up.

## Still needed

Ordered by how often the gap will actually be hit. The first two matter most: haematology and
general biochemistry are on almost every report, and both currently fall through to `torso`.

1. **`blood`** — a small group of filled blood collection tubes, or a single tube with the same
   painterly treatment. For haematology, CBC, ESR, coagulation. The most common panel on any report
   and the one with no organ.
2. **`chemistry`** — a general biochemistry object: a rack of tubes, or a simple vessel. For
   "Biochemistry", "General profile", "Metabolic panel". Should read as *the lab*, not as an organ,
   since these panels span the body.
3. **`pancreas`** — currently borrows `stomach`. For glucose, HbA1c, amylase, lipase, and the
   diabetes-related panels, which are common enough to deserve their own object.
4. **`bone`** — a vertebra or a section of long bone. For calcium, phosphate, vitamin D, ALP,
   parathyroid — a very common cluster with nowhere sensible to sit today.
5. **`immune`** — a lymph node cluster or spleen. For immunology, allergy panels, autoantibodies,
   inflammatory markers.
6. **`urine`** — a specimen container. For urinalysis, which is a distinct specimen type rather than
   an organ, and currently lands on `kidneys` by keyword.
7. **`empty-state`** — the ensemble again, but sparser and quieter: fewer organs, more cream, no
   focal point. Shown when there are no reports at all, where `torso` currently reads as
   unintentionally dramatic for a screen that says "nothing here yet".

## Variants worth having later

Not needed for the current build; worth batching in whenever the next set is generated.

- **A "watching" variant of each organ.** The card that needs attention currently signals with a
  terracotta well tint and a 2px outline. A render lit slightly warmer, with a soft terracotta rim,
  would carry that without shouting — the tone is *attention*, never *alarm*, and it must never be
  the only signal (§9, principle 1).
- **A 2× set at 2048px** for the hero, which renders up to 320px and will look soft on a retina
  display at the current size.
- **Wide crops (16:9)** of `torso` for the eventual shareable one-pager PDF (§10).
