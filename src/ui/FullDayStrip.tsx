/** §4.7 — a density view over the last N days, not a streak. Shared by the main and history screens. */
export function FullDayStrip({ strip }: { strip: readonly boolean[] }) {
  return (
    <div className="strip" aria-label={`Full Day density, last ${strip.length} days`}>
      {strip.map((filled, i) => (
        <span key={i} className={filled ? 'cell filled' : 'cell'} />
      ))}
    </div>
  );
}
