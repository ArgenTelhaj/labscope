/**
 * Renders a label that sets one stretch of itself apart, written `[[like this]]`
 * in the catalogue. The marked stretch is wrapped in `element`; everything else
 * is plain text.
 *
 * It is one label rather than three because emphasis does not land in the same
 * place in every language: a translator moves the brackets to wherever their
 * own grammar puts the phrase.
 */
export function Marked({
  text,
  element: Element = 'span',
  className,
}: {
  text: string
  element?: 'span' | 'strong' | 'em'
  className?: string
}) {
  const parts = text.split(/\[\[(.+?)\]\]/s)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Element key={i} className={className}>
            {part}
          </Element>
        ) : (
          part
        ),
      )}
    </>
  )
}
