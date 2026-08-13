/**
 * Placeholder icon set: one stroke weight, one grid, no brand. Swap for a real
 * set later — every icon here takes `size` and inherits `currentColor`, so the
 * replacement is a file swap, not a refactor.
 */

type IconProps = {
  size?: number
  strokeWidth?: number
}

function base(size: number, strokeWidth: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }
}

export function IconChart({ size = 20, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 14 3.5-4 3 2.5L20 7" />
    </svg>
  )
}

export function IconDocuments({ size = 20, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M8 3h6l4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 13h5M9.5 16.5h3" />
    </svg>
  )
}

export function IconUpload({ size = 20, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 16V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function IconBack({ size = 22, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="m14 6-6 6 6 6" />
    </svg>
  )
}

export function IconChevron({ size = 18, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function IconAlert({ size = 14, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </svg>
  )
}

export function IconInfo({ size = 16, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8v.1" />
    </svg>
  )
}

export function IconTrash({ size = 18, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M4 7h16" />
      <path d="M10 4h4" />
      <path d="M6.5 7 7 20h10l.5-13" />
    </svg>
  )
}

export function IconPen({ size = 18, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </svg>
  )
}
