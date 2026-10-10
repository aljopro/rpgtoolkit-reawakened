// expect-rule: no-restricted-syntax
declare const source: AsyncIterable<number>;

export const values: number[] = [];
for await (const value of source) {
  values.push(value);
}
