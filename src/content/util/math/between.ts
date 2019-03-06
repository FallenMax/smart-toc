export const between = (min: number, value: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}
