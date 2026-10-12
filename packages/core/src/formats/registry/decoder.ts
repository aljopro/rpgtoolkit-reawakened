/**
 * The pluggable asset pipeline's decoder contract (AD-31).
 *
 * Format ingestion is not hardcoded to legacy files: a decoder declares the
 * extensions it answers for, recognises its own bytes from the file's magic
 * header, and turns the bytes into a model. The core format registry dispatches
 * to a decoder by file extension and by magic header (AD-31), and every landed
 * reader is wrapped as one (`core-decoders.ts`).
 *
 * A decoder never throws for bad data: like every reader (AD-18) it returns
 * `Result<T, FormatError>`.
 */

import type { Result } from "../result.ts";
import type { AssetIndex, AssetRoot } from "../resolver/model.ts";

/**
 * What a decoder is given besides the bytes (AD-31).
 *
 * AD-31 calls this the decode context. It is the landed `AssetIndex` and
 * `AssetRoot` (format-spec §1.5, AD-5) together, so a decoder that has to follow
 * a reference inside the file it is reading resolves it exactly as the runtime
 * would. A decoder that reads bytes alone ignores it.
 */
export interface AssetResolver {
  /** The paths the host can serve, as the resolver's lookup (AD-5). */
  readonly index: AssetIndex;
  /** Where the index's paths are rooted: a package, or a game folder (§13, §1.5). */
  readonly root: AssetRoot;
}

/**
 * One format's ingestion, dispatched by the core registry (AD-31).
 *
 * `id` names the decoder once and `section` cites the `docs/format-spec.md`
 * section it implements (G7); `extensions` are lowercase, without the dot.
 * `detect` is the magic-header test the registry's header dispatch uses, and
 * `decode` produces the model.
 */
export interface AssetDecoder<T = unknown> {
  /** The decoder's stable id, e.g. `"board"`. */
  readonly id: string;
  /** The format-spec section the decoder implements (G7), e.g. `"format-spec §4"`. */
  readonly section: string;
  /** The file extensions this decoder answers for, lowercase and without the dot. */
  readonly extensions: readonly string[];
  /** Whether the file's leading bytes are this format's magic header (AD-31). */
  detect(header: Uint8Array): boolean;
  /** Decode the whole file to its model; `ok: false` for bad data (AD-18). */
  decode(bytes: Uint8Array, context: AssetResolver): Result<T>;
}
