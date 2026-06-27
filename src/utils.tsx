export function rotationSortValue(rotation: string): number {
  if (rotation === "Base") {
    return 999;
  }

  const normalized = rotation.toUpperCase();
  if (/^[A-Z]$/.test(normalized)) {
    return normalized.charCodeAt(0) - 64;
  }

  return 500;
}
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}
export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
