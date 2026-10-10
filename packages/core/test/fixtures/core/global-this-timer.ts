// expect-rule: no-restricted-globals
export function schedule(task: () => void): void {
  globalThis.setTimeout(task, 0);
}
