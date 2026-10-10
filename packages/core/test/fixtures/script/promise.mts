// expect-rule: no-restricted-globals
export const pending: Promise<unknown> = new Promise(() => {});
