// Availability heat scale. Five ordered levels — none / few / about half /
// most / everyone — mapped to a sequential yellow→green ramp (ColorBrewer
// YlGn), which stays ordered for all common color-vision deficiencies because
// lightness changes monotonically. Cells always pair color with a number, so
// color is never the only signal.

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function heatLevel(count: number, max: number): HeatLevel {
  if (count <= 0 || max <= 0) return 0;
  if (count >= max) return 4; // everyone
  const ratio = count / max;
  if (ratio <= 1 / 3) return 1;
  if (ratio <= 2 / 3) return 2;
  return 3;
}

export function heatVar(count: number, max: number): string {
  return `var(--heat-${heatLevel(count, max)})`;
}

/** Text color that stays readable on top of the given heat step (themed via CSS). */
export function heatTextVar(count: number, max: number): string {
  return `var(--heat-text-${heatLevel(count, max)})`;
}

export const HEAT_LABELS: Record<HeatLevel, string> = {
  0: "No one",
  1: "A few",
  2: "About half",
  3: "Most",
  4: "Everyone",
};

/**
 * Legend entries with the actual counts each color covers for this group size,
 * e.g. for 5 people: 0 · 1 · 2–3 · 4 · 5. Levels that can't occur (tiny groups)
 * are omitted.
 */
export function heatLegend(max: number): { level: HeatLevel; label: string; range: string }[] {
  const byLevel = new Map<HeatLevel, number[]>();
  for (let c = 0; c <= Math.max(max, 0); c++) {
    const lvl = heatLevel(c, max);
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(c);
  }
  const out: { level: HeatLevel; label: string; range: string }[] = [];
  for (const level of [0, 1, 2, 3, 4] as HeatLevel[]) {
    const counts = byLevel.get(level);
    if (!counts) continue;
    const lo = counts[0];
    const hi = counts[counts.length - 1];
    out.push({
      level,
      label: HEAT_LABELS[level],
      range: lo === hi ? `${lo}` : `${lo}–${hi}`,
    });
  }
  return out;
}
