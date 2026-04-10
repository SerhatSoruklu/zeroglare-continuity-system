export function resolveTriState(override, fallback) {
  return override === null ? fallback : override;
}
