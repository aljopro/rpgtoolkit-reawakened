// expect-rule: no-restricted-globals
export function makeWorker(): Promise<void> {
  return new Promise(() => {});
}
