export function formatCurrency(value: number, symbol = "$") {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${symbol}${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCurrencyCompact(value: number, symbol = "$") {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `${sign}${symbol}${(abs / 1000).toFixed(0)}k`;
  }
  return `${sign}${symbol}${abs}`;
}

export function formatPct(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

export function formatDelta(value: number) {
  const arrow = value >= 0 ? "↑" : "↓";
  const sign = value >= 0 ? "+" : "";
  return `${arrow} ${sign}${value.toFixed(2)}%`;
}
