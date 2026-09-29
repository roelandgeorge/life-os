/**
 * The row actions, drawn rather than typed. `✎`, `✕` and `🗑` are whatever
 * the device's symbol or emoji font makes of them, at whatever weight and in
 * whatever colour, which is how the remove action ended up heavier and
 * redder than the row it removes. These inherit `currentColor` and one
 * stroke width, so every action on a row reads as the same kind of thing.
 *
 * Earned a file under src/ui/ once MainScreen and DomainCatalog both needed
 * them.
 */

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg className="glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function PencilGlyph() {
  return (
    <Glyph>
      <path d="M11.2 1.9a1.7 1.7 0 0 1 2.4 2.4l-8.3 8.3-3.1.9.9-3.1z" />
      <path d="M10.1 3.1l2.8 2.8" />
    </Glyph>
  );
}

export function TrashGlyph() {
  return (
    <Glyph>
      <path d="M2.8 4.2h10.4" />
      <path d="M6.2 4.2V2.8h3.6v1.4" />
      <path d="M4.2 4.2l.6 9h6.4l.6-9" />
      <path d="M6.7 6.6v4.2M9.3 6.6v4.2" />
    </Glyph>
  );
}

export function PlusGlyph() {
  return (
    <Glyph>
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </Glyph>
  );
}

export function CheckGlyph() {
  return (
    <Glyph>
      <path d="M3 8.6l3.4 3.4L13 4.6" />
    </Glyph>
  );
}

export function CrossGlyph() {
  return (
    <Glyph>
      <path d="M3.8 3.8l8.4 8.4M12.2 3.8l-8.4 8.4" />
    </Glyph>
  );
}
