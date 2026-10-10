// expect-rule: no-restricted-globals
export const pending = new globalThis.Promise(() => {});
