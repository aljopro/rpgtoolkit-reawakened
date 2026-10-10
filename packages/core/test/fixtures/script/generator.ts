// expect-rule: no-restricted-syntax
export function* counter(): Generator<number> {
  yield 1;
}
