// expect-rule: no-restricted-syntax
declare const pending: Promise<number>;

export const resolved = await pending;
