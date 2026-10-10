// Module-only declarations for the built-in test runner. core's tsconfig keeps
// `types: []` (G2), so @types/node is absent; these declare no globals.
declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export default test;
}
declare module "node:assert/strict" {
  export function equal(actual: unknown, expected: unknown, message?: string): void;
}
