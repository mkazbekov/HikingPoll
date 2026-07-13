// Map an availability count to one of the 6 heat ramp CSS variables.
// Colorblind-safe by design: we always pair this with a number in the UI.

export function heatVar(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "var(--heat-0)";
  const ratio = count / max;
  if (ratio <= 0.001) return "var(--heat-0)";
  if (ratio <= 0.2) return "var(--heat-1)";
  if (ratio <= 0.4) return "var(--heat-2)";
  if (ratio <= 0.6) return "var(--heat-3)";
  if (ratio <= 0.8) return "var(--heat-4)";
  return "var(--heat-5)";
}

/** Text color that stays readable on top of the given heat step. */
export function heatTextVar(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 0;
  return ratio > 0.55 ? "var(--on-primary)" : "var(--fg-muted)";
}
