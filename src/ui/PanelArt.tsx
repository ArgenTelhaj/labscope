import { useState } from 'react'

/**
 * Panel artwork.
 *
 * The renders are decoration, and this file is the only place that treats a
 * printed heading as anything other than text. It is deliberately shallow: a
 * keyword in the heading picks a picture, and a heading it does not recognise
 * gets the general render. It never changes what a value means, never reorders
 * anything, and is never the only way to tell two panels apart — the printed
 * heading is always shown beside it. The images are marked decorative to
 * screen readers for the same reason.
 *
 * Files are dropped into `public/organs/`; docs/image-needs.md is the brief
 * they are rendered to. Until a file exists a monogram stands in, so nothing
 * here can break a layout.
 */

export type Tone = 'calm' | 'accent'

/**
 * Ordered: the first keyword found in the heading wins, so specific patterns
 * sit above general ones.
 */
const ART: Array<[RegExp, string]> = [
  [/thyroid|tiroid|tsh|ft3|ft4/, 'thyroid'],
  [/lipid|cholesterol|kolesterol|triglicer|cardiac|heart|zemr|troponin/, 'heart'],
  [/pancrea|pankrea|glucose|glicem|hba1c|diabet|amylase|amilaz|lipase|lipaz/, 'pancreas'],
  [/urin/, 'urine'],
  [/renal|kidney|veshk|urea|creatinin|kreatinin|electrolyte|elektrolit/, 'kidneys'],
  [/liver|hepatic|melci|bilirub|transaminaz|\bggt\b|\balt\b|\bast\b/, 'liver'],
  [/lung|respirat|blood gas|pulmon|frymemarrj/, 'lungs'],
  [/gastr|stomach|stomak|digest|tretj|pylori/, 'stomach'],
  [/calcium|kalcium|phosph|fosfor|vitamin d|25-oh|parathyroid|\bpth\b|\balp\b|alkaline phosphat|kock/, 'bone'],
  [/immun|allerg|antibod|antitrup|autoimmun|rheumat|reumat|\bige\b|complement/, 'immune'],
  [/haematolog|hematolog|\bcbc\b|blood count|gjakut|coagul|koagul|sedimentation|\besr\b/, 'blood'],
  [/biochem|biokim|metabolic|metabolik|chemistry|general profile/, 'chemistry'],
]

/** The general-purpose render: the whole set, for a heading with no organ. */
const DEFAULT_SLUG = 'torso'

function artFor(label: string): string {
  const text = label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')

  for (const [pattern, slug] of ART) {
    if (pattern.test(text)) return slug
  }
  return DEFAULT_SLUG
}

function monogram(label: string): string {
  const letter = label.trim().charAt(0).toUpperCase()
  return /[A-Z0-9]/.test(letter) ? letter : '·'
}

/** The square tinted well used at the top of a panel card. */
export function PanelWell({ label, tone = 'calm' }: { label: string; tone?: Tone }) {
  return (
    <div className={`well${tone === 'accent' ? ' well--terracotta' : ''}`}>
      <Art label={label} className="well__img" fallbackClassName="well__mark" />
    </div>
  )
}

/**
 * The large object in the hero, centred inside its layered circles. The
 * callout is pinned to the object rather than to the page, so it travels with
 * the art when the hero stacks on a phone.
 */
export function MastheadArt({
  label,
  callout,
  slug,
}: {
  label: string
  callout?: string
  /** Overrides the keyword match, for a screen that has no heading to read. */
  slug?: string
}) {
  return (
    <div className="masthead__art">
      <span className="masthead__halo masthead__halo--1" aria-hidden />
      <span className="masthead__halo masthead__halo--2" aria-hidden />
      <span className="masthead__halo masthead__halo--3" aria-hidden />
      <Art label={label} slug={slug} className="masthead__img" fallbackClassName="masthead__mark" />
      {callout && (
        <span className="masthead__callout">
          <span className="chip__dot" />
          {callout}
        </span>
      )}
    </div>
  )
}

function Art({
  label,
  slug,
  className,
  fallbackClassName,
}: {
  label: string
  slug?: string
  className: string
  fallbackClassName: string
}) {
  const [missing, setMissing] = useState(false)

  if (missing) {
    return (
      <span className={fallbackClassName} aria-hidden>
        {monogram(label)}
      </span>
    )
  }

  return (
    <img
      className={className}
      src={`/organs/${slug ?? artFor(label)}.png`}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setMissing(true)}
    />
  )
}
