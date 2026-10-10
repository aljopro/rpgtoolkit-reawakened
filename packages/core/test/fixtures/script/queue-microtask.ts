// expect-rule: no-restricted-globals
export function schedule(task: () => void): void {
  queueMicrotask(task);
}
