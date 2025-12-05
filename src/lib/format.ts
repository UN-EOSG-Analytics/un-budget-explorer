export const formatMoney = (val: number | null, absolute = false): string => {
  if (val === null || val === undefined) return '—';
  const v = absolute ? Math.abs(val) : val;
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

export const getArrow = (val: number | null): string => {
  if (val === null || val === undefined) return '';
  return val > 0 ? '↗' : val < 0 ? '↘' : '→';
};

export const formatVariance = (val: number | null): string => {
  if (val === null || val === undefined) return '—';
  const arrow = val > 0 ? '↗' : val < 0 ? '↘' : '→';
  return `${arrow}${Math.abs(val).toFixed(1)}%`;
};

