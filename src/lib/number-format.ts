type CompactNumberOptions = {
  fallback?: string;
  maximumFractionDigits?: number;
};

const compactNumberUnits = [
  { value: 1_000_000_000_000, suffix: "T" },
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
  { value: 1_000, suffix: "k" },
] as const;

function normalizeNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function formatCompactNumber(
  value: number | string | null | undefined,
  options: CompactNumberOptions = {},
) {
  const fallback = options.fallback ?? "0";
  const maximumFractionDigits = options.maximumFractionDigits ?? 1;
  const numericValue = normalizeNumber(value);

  if (numericValue === null) {
    return fallback;
  }

  const absoluteValue = Math.abs(numericValue);

  if (absoluteValue < 1_000) {
    return new Intl.NumberFormat("en", {
      maximumFractionDigits: 0,
    }).format(numericValue);
  }

  const unit =
    compactNumberUnits.find((item) => absoluteValue >= item.value) ??
    compactNumberUnits[compactNumberUnits.length - 1];
  const compactValue = numericValue / unit.value;
  const formattedValue = new Intl.NumberFormat("en", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(compactValue);

  return `${formattedValue}${unit.suffix}`;
}
