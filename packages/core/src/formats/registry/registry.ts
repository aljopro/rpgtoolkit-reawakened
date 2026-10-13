/**
 * The core format registry: dispatch from bytes to a decoder (AD-31).
 *
 * A registry holds decoders and answers two questions about a file: which
 * decoder claims its extension, and which decoder recognises its magic header.
 * That is AD-31's dispatch. Registration is explicit — the landed readers are
 * registered by `core-decoders.ts`, and a host or a test can register more — and
 * a duplicate id or extension is refused loudly, because two decoders claiming
 * one extension is a programmer error with no deterministic answer (AD-18:
 * `core` throws only for programmer errors).
 *
 * Pure (G2) and deterministic (G3): no file system, no clock, no new dependency.
 */

import type { AssetDecoder } from "./decoder.ts";
import { asciiLower } from "../main-file/layout.ts";

/**
 * How many leading bytes the magic-header test sees.
 *
 * The longest legacy magic is `"RPGTLKIT SPLMOVE"` plus its NUL and version, and
 * the PNG signature is eight bytes, so 32 bytes cover every landed decoder and
 * any plausible custom one.
 */
export const HEADER_BYTES = 32;

/** A set of decoders a file dispatches through (AD-31). */
export interface AssetRegistry {
  /** The registered decoders, in registration order. */
  readonly decoders: readonly AssetDecoder[];
  /**
   * Add a decoder. Throws when its id is taken, when an extension is not a
   * bare dotless name, or when it claims an extension another decoder already
   * claims — each a programmer error, not bad file data. Extensions are stored
   * ASCII-folded (`asciiLower`), matching `byExtension`'s lookup.
   */
  register(decoder: AssetDecoder): void;
  /** The decoder that claims `extension` (case-insensitive, no dot), or `undefined`. */
  byExtension(extension: string): AssetDecoder | undefined;
  /**
   * The first decoder whose `detect` accepts `bytes`' leading `HEADER_BYTES`
   * bytes, or `undefined`. The magic-header half of AD-31's dispatch.
   */
  byHeader(bytes: Uint8Array): AssetDecoder | undefined;
  /**
   * Dispatch by extension, falling back to the magic header when no decoder
   * claims the extension (AD-31).
   */
  resolve(extension: string, bytes: Uint8Array): AssetDecoder | undefined;
}

/**
 * Build a registry over `initial`, in order.
 *
 * Order matters only for the magic-header scan: the first decoder whose `detect`
 * accepts the bytes wins, so a more specific decoder should be registered first.
 * The landed magic strings do not overlap.
 */
export function createAssetRegistry(initial: readonly AssetDecoder[] = []): AssetRegistry {
  const decoders: AssetDecoder[] = [];
  const byId = new Map<string, AssetDecoder>();
  const byExtensionKey = new Map<string, AssetDecoder>();

  const register = (decoder: AssetDecoder): void => {
    if (byId.has(decoder.id)) {
      throw new Error(`asset decoder "${decoder.id}" is already registered`);
    }
    const keys: string[] = [];
    for (const extension of decoder.extensions) {
      if (extension.length === 0 || extension.includes(".")) {
        throw new Error(
          `decoder "${decoder.id}" declares extension "${extension}"; an extension is a bare, dotless name such as "png"`,
        );
      }
      const key = asciiLower(extension);
      const owner = byExtensionKey.get(key);
      if (owner !== undefined) {
        throw new Error(
          `decoder "${decoder.id}" claims extension "${key}", already claimed by "${owner.id}"`,
        );
      }
      keys.push(key);
    }
    decoders.push(decoder);
    byId.set(decoder.id, decoder);
    for (const key of keys) {
      byExtensionKey.set(key, decoder);
    }
  };

  for (const decoder of initial) {
    register(decoder);
  }

  const byExtension = (extension: string): AssetDecoder | undefined =>
    byExtensionKey.get(asciiLower(extension));

  const byHeader = (bytes: Uint8Array): AssetDecoder | undefined => {
    const header = bytes.subarray(0, HEADER_BYTES);
    for (const decoder of decoders) {
      if (decoder.detect(header)) {
        return decoder;
      }
    }
    return undefined;
  };

  return {
    get decoders() {
      return decoders;
    },
    register,
    byExtension,
    byHeader,
    resolve: (extension, bytes) => byExtension(extension) ?? byHeader(bytes),
  };
}
