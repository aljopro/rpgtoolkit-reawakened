/**
 * The RPGCode value and variable-reference family (AD-7, AD-8; docs/spec/engine/rpgcode-language.md#lexical-rules and docs/spec/engine/rpgcode-runtime.md.
 *
 * `Value` is a script value: a double or a string. `null` is "no value" — the
 * fourth member exists so a `Wait` result and a built-in's `done` have an
 * explicit "nothing" (AD-14's rule that an absent value is `null`, never an
 * omitted key or `undefined`); no `StepOp` ever stores `null`, because
 * docs/spec/engine/rpgcode-functions.md#rpgcode-built-in-commands lexes the `null` literal to the number `0`.
 *
 * `RefId` is a branded string naming a variable in one scope, so a by-reference
 * built-in output (AD-8's `Arg.ref`) can be written back after dispatch: the
 * brand is type-only and the underlying string stays plain data, mirroring the
 * id brands of `keys.ts` (AD-5).
 */

declare const refIdBrand: unique symbol;

/**
 * A variable reference: `"global:name"` or `"local:name"`, where `name` is the
 * variable name already ASCII case-folded per docs/spec/engine/rpgcode-functions.md#rpgcode-built-in-commands (LEX-10). The
 * brand is type-only, so a `RefId` is plain data.
 */
export type RefId = string & { readonly [refIdBrand]: "RefId" };

/** A live object handle (OOP-3; docs/spec/engine/rpgcode-modules-and-objects.md#objects). */
export type ObjectValue = {
  readonly kind: "object";
  readonly handle: number;
  readonly className: string;
};

/** A script value: a double, string, or a tagged live object handle. */
export type Value = number | string | ObjectValue | null;

/** Which variable table a `RefId` names (docs/spec/formats/rpgcode-program.md#text-form SEM-4). */
export type VarScope = "global" | "local";
