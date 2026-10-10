// expect-rule: no-restricted-globals
export const format = new globalThis.Intl.NumberFormat();
