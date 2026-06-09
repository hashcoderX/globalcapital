export function chartStaggerDelay(index: number, stepMs = 0.18): string {
  return `${(index * stepMs).toFixed(2)}s`;
}
