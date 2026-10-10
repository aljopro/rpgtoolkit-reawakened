// expect-rule: none
// expect-problem: has no effect because you have 'noInlineConfig'
// The guard-rail exception convention is
// `// eslint-disable-next-line <rule> -- guardrail-exception: Gx ADR-NNNN`.
// Inline configuration is refused (linterOptions.noInlineConfig), so a marked
// disable on a clean line is reported as ineffective instead of suppressing.
// eslint-disable-next-line no-restricted-globals -- guardrail-exception: G2 ADR-0002
export const ok = 1;
