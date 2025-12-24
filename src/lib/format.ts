export const formatMoney = (val: number | null, absolute = false): string => {
  if (val === null || val === undefined) return "—";
  const v = absolute ? Math.abs(val) : val;
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

// Use \uFE0E (variation selector-15) to force text rendering instead of emoji on iOS
export const getArrow = (val: number | null): string => {
  if (val === null || val === undefined) return "";
  return val > 0 ? "↗\uFE0E" : val < 0 ? "↘\uFE0E" : "→\uFE0E";
};

export const formatVariance = (val: number | null): string => {
  if (val === null || val === undefined) return "—";
  const arrow = val > 0 ? "↗\uFE0E" : val < 0 ? "↘\uFE0E" : "→\uFE0E";
  return `${arrow}${Math.abs(val).toFixed(1)}%`;
};
