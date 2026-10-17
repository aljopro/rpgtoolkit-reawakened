/** Owner: core/engine; request sequencing and loading diagnostics only. */
export type EngineSection = {
  readonly nextRequestId?: number;
  readonly pending?: { readonly reqId: number; readonly key: string; readonly kind: "board" | "tile" }[];
  readonly failed?: boolean;
};
