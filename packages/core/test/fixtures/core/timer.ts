// expect-rule: no-restricted-globals
export function schedule(task: () => void): void {
  setTimeout(task, 0);
}
