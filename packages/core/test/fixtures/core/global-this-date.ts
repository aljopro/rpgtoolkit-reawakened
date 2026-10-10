// expect-rule: no-restricted-globals
export const now = globalThis.Date.now();
