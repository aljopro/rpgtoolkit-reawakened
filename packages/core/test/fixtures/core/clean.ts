// expect-rule: none
export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

export function magnitude(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}
