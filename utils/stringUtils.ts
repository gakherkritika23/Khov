export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "string") {
    return normalizeText(value).length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return true;
}

function parseNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed =
    typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatNumericRange(
  low: number | string | null | undefined,
  high: number | string | null | undefined,
  options: { zeroIsMissing?: boolean } = {},
): string | null {
  const parsedLow = parseNumber(low);
  const parsedHigh = parseNumber(high);

  if (parsedLow === null && parsedHigh === null) {
    return null;
  }

  if (options.zeroIsMissing === true) {
    const effectiveLow = parsedLow === 0 ? null : parsedLow;
    const effectiveHigh = parsedHigh === 0 ? null : parsedHigh;
    if (effectiveLow === null && effectiveHigh === null) {
      return null;
    }
    if (effectiveLow !== null && effectiveHigh !== null && effectiveLow !== effectiveHigh) {
      return `${formatNumber(effectiveLow)} - ${formatNumber(effectiveHigh)}`;
    }
    return formatNumber(effectiveLow ?? effectiveHigh!);
  }

  if (parsedLow !== null && parsedHigh !== null && parsedLow !== parsedHigh) {
    return `${formatNumber(parsedLow)} - ${formatNumber(parsedHigh)}`;
  }

  return formatNumber(parsedLow ?? parsedHigh!);
}

export function parseCurrency(value: string): number {
  return Number(value.replace(/[$,]/g, "").trim());
}

export function parsePriceValues(value: string): number[] {
  return [...value.matchAll(/\$([\d,]+)/g)].map((match) =>
    parseCurrency(match[1]),
  );
}
